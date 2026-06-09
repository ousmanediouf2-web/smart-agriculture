require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const connectDB = require('./config/db');
const { initSocket } = require('./socket/socketManager');
const { initTwilio, sendDailyReports } = require('./services/twilioService');

// Routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const sensorsRoutes = require('./routes/sensors');
const measuresRoutes = require('./routes/measures');
const parcelsRoutes = require('./routes/parcels');
const cropsRoutes = require('./routes/crops');
const alertsRoutes = require('./routes/alerts');
const exportRoutes = require('./routes/export');
const satelliteRoutes = require('./routes/satellite');
const droneRoutes = require('./routes/drone');
const weatherRoutes = require('./routes/weather');
const pumpHistoryRoutes = require('./routes/pump_history');

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  // Garder la connexion vivante même si Render est en veille
  pingTimeout: 60000,       // 60s avant de considérer le client mort
  pingInterval: 25000,      // Envoyer un ping toutes les 25s
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  // Permettre plusieurs tentatives de reconnexion
  connectTimeout: 45000,
});
initSocket(io);

// Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
const esp32Limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use('/api/', limiter);
app.use('/api/measures', esp32Limiter);

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/sensors', sensorsRoutes);
app.use('/api/measures', measuresRoutes);
app.use('/api/parcels', parcelsRoutes);
app.use('/api/crops', cropsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/satellite', satelliteRoutes);
app.use('/api/drone', droneRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/pump-history', pumpHistoryRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), version: '2.0.0' });
});

// Route init-db - PROTÉGÉE par secret header
app.get('/api/init-db', async (req, res) => {
  // Protection par secret header
  const secret = req.headers['x-init-secret'] || req.query.secret;
  if (!process.env.INIT_SECRET || secret !== process.env.INIT_SECRET) {
    return res.status(403).json({ success: false, message: 'Accès refusé. Secret requis.' });
  }

  try {
    const Crop = require('./models/Crop');
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    await Crop.deleteMany({});
    await User.deleteMany({});
    await Crop.insertMany([
      { name: 'tomate', label: 'Tomate', color: '#ef4444', waterNeed: 'élevé', soilHumidity: { min: 50, optimal: 70, max: 85, critical: 30 }, temperature: { min: 15, optimal: 25, max: 35, critical: 40 }, airHumidityFactor: 0.85, irrigationDuration: 40 },
      { name: 'aubergine', label: 'Aubergine', color: '#8b5cf6', waterNeed: 'moyen', soilHumidity: { min: 40, optimal: 60, max: 80, critical: 25 }, temperature: { min: 18, optimal: 28, max: 38, critical: 42 }, airHumidityFactor: 0.9, irrigationDuration: 30 },
      { name: 'manioc', label: 'Manioc', color: '#3b82f6', waterNeed: 'faible', soilHumidity: { min: 25, optimal: 45, max: 70, critical: 15 }, temperature: { min: 20, optimal: 30, max: 40, critical: 45 }, airHumidityFactor: 1.0, irrigationDuration: 20 }
    ]);
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await User.create({ name: 'Administrateur', email: 'admin@gmail.com', password: hashedPassword, role: 'admin', phone: '+221771234567', isValidated: true });
    res.json({ success: true, message: '✅ BD initialisée! Admin: admin@gmail.com / admin123' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Route 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Erreur serveur interne' });
});

// ─── CRON JOBS ──────────────────────────────────────────────────────────────

// Vérifier les capteurs hors ligne toutes les 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const Sensor = require('./models/Sensor');
    const Alert = require('./models/Alert');
    const { emitAlert } = require('./socket/socketManager');
    const { sendAlert } = require('./services/twilioService');

    const threshold = new Date(Date.now() - 10 * 60 * 1000);
    const offlineSensors = await Sensor.find({ lastSeen: { $lt: threshold }, isActive: true }).populate('parcelId', 'name userId');

    for (const sensor of offlineSensors) {
      const recentAlert = await Alert.findOne({
        sensorId: sensor._id,
        type: 'sensor_offline',
        createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }
      });

      if (!recentAlert) {
        const minutesOffline = Math.round((Date.now() - new Date(sensor.lastSeen).getTime()) / 60000);
        const alert = await Alert.create({
          sensorId: sensor._id,
          parcelId: sensor.parcelId,
          type: 'sensor_offline',
          message: `Capteur ${sensor.deviceId} hors ligne depuis ${minutesOffline} minutes`,
          priority: 'high'
        });
        emitAlert(alert);

        // Notifier l'agriculteur par WhatsApp
        if (sensor.parcelId?.userId) {
          const User = require('./models/User');
          const user = await User.findById(sensor.parcelId.userId);
          if (user?.phone && user?.notificationPrefs?.critical) {
            await sendAlert('sensor_offline', {
              deviceId: sensor.deviceId,
              parcelName: sensor.parcelId?.name || 'Inconnue',
              lastSeen: new Date(sensor.lastSeen).toLocaleString('fr-FR')
            }, user.phone);
          }
        }
        console.warn(`⚠️  Capteur hors ligne: ${sensor.deviceId}`);
      }
    }
  } catch (err) {
    console.error('Erreur cron capteurs:', err.message);
  }
});

// Rapport journalier WhatsApp à 7h00 chaque matin
cron.schedule('0 7 * * *', async () => {
  console.log('📱 Envoi des rapports journaliers WhatsApp...');
  await sendDailyReports();
});

// Notification satellite toutes les 5 jours à 8h00
cron.schedule('0 8 */5 * *', async () => {
  try {
    console.log('🛰️ Vérification des mises à jour satellites...');
    const Parcel = require('./models/Parcel');
    const User = require('./models/User');
    const { sendWhatsApp } = require('./services/twilioService');

    const parcels = await Parcel.find({ status: 'active' }).populate('userId', 'name phone notificationPrefs');
    for (const parcel of parcels) {
      const user = parcel.userId;
      if (!user?.phone || !user?.notificationPrefs?.sms) continue;

      await sendWhatsApp(user.phone, 'satellite_update', {
        parcelName: parcel.name,
        date: new Date().toLocaleDateString('fr-FR'),
        ndvi: (Math.random() * 0.4 + 0.4).toFixed(2)
      });
    }
  } catch (err) {
    console.error('Erreur cron satellite:', err.message);
  }
});

// ── KEEP-ALIVE pour Render Free ─────────────────────────────────────────────
// Render Free met le serveur en veille après 15 min d'inactivité
// Ce ping toutes les 10 min évite la mise en veille
if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
  const SELF_URL = process.env.RENDER_EXTERNAL_URL || `https://smart-agriculture-5n9j.onrender.com`;
  setInterval(async () => {
    try {
      const https = require('https');
      https.get(`${SELF_URL}/health`, (res) => {
        console.log(`🏓 Keep-alive ping: ${res.statusCode}`);
      }).on('error', () => {});
    } catch {}
  }, 10 * 60 * 1000); // toutes les 10 minutes
  console.log('🏓 Keep-alive activé pour Render');
}

// Démarrage
const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  initTwilio();
  server.listen(PORT, () => {
    console.log(`🚀 Serveur v2.0 démarré sur le port ${PORT}`);
    console.log(`📡 Socket.IO prêt`);
    console.log(`📱 WhatsApp Twilio: ${process.env.TWILIO_ACCOUNT_SID ? '✅' : '⚠️  non configuré'}`);
    console.log(`🛰️  Sentinel Hub: ${process.env.SENTINEL_INSTANCE_ID ? '✅' : '⚠️  mode démo'}`);
    console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
  });
};

start();
