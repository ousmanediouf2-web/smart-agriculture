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
const { initTwilio } = require('./services/twilioService');

// Routes
const authRoutes = require('./routes/auth');
const sensorsRoutes = require('./routes/sensors');
const measuresRoutes = require('./routes/measures');
const parcelsRoutes = require('./routes/parcels');
const cropsRoutes = require('./routes/crops');
const alertsRoutes = require('./routes/alerts');
const exportRoutes = require('./routes/export');

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
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
const esp32Limiter = rateLimit({ windowMs: 60 * 1000, max: 120 }); // 2 req/sec pour ESP32
app.use('/api/', limiter);
app.use('/api/measures', esp32Limiter);

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/sensors', sensorsRoutes);
app.use('/api/measures', measuresRoutes);
app.use('/api/parcels', parcelsRoutes);
app.use('/api/crops', cropsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/export', exportRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), version: '1.0.0' });
});

// Route init-db - initialise la base de données
app.get('/api/init-db', async (req, res) => {
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
    await User.create({ name: 'Administrateur', email: 'admin@gmail.com', password: hashedPassword, role: 'admin', phone: '+221771234567' });
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

// Cron: Vérifier les capteurs hors ligne toutes les 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const Sensor = require('./models/Sensor');
    const Alert = require('./models/Alert');
    const { emitAlert } = require('./socket/socketManager');

    const threshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes
    const offlineSensors = await Sensor.find({ lastSeen: { $lt: threshold }, isActive: true });

    for (const sensor of offlineSensors) {
      const recentAlert = await Alert.findOne({
        sensorId: sensor._id,
        type: 'sensor_offline',
        createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }
      });

      if (!recentAlert) {
        const alert = await Alert.create({
          sensorId: sensor._id,
          parcelId: sensor.parcelId,
          type: 'sensor_offline',
          message: `Capteur ${sensor.deviceId} hors ligne depuis ${Math.round((Date.now() - new Date(sensor.lastSeen).getTime()) / 60000)} minutes`,
          priority: 'high'
        });
        emitAlert(alert);
        console.warn(`⚠️  Capteur hors ligne: ${sensor.deviceId}`);
      }
    }
  } catch (err) {
    console.error('Erreur cron capteurs:', err.message);
  }
});

// Démarrage
const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  initTwilio();
  server.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📡 Socket.IO prêt`);
    console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
  });
};

start();
