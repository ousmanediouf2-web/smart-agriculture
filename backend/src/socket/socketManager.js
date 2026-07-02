let io = null;

const initSocket = (socketIo) => {
  io = socketIo;

  // Configurer les options de ping/pong pour éviter les déconnexions
  // Ces options sont définies dans server.js sur le new Server()

  // Valider le token JWT à la connexion — évite que n'importe qui se
  // connecte au socket sans être un utilisateur authentifié réel
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Token manquant'));
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id || decoded._id;
      next();
    } catch (err) {
      next(new Error('Token invalide'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connecté: ${socket.id}`);

    socket.on('join_parcel', (parcelId) => {
      socket.join(`parcel_${parcelId}`);
    });

    socket.on('leave_parcel', (parcelId) => {
      socket.leave(`parcel_${parcelId}`);
    });

    socket.on('join_dashboard', () => {
      socket.join('dashboard');
      // Confirmer la connexion au dashboard
      socket.emit('dashboard_joined', { timestamp: new Date() });
    });

    // Répondre aux heartbeats pour garder la connexion vivante
    socket.on('ping_heartbeat', () => {
      socket.emit('pong_heartbeat', { timestamp: new Date() });
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client déconnecté: ${socket.id} — Raison: ${reason}`);
    });

    socket.on('error', (err) => {
      console.error(`❌ Socket erreur ${socket.id}:`, err.message);
    });
  });
};

const emitNewMeasure = (measure) => {
  if (!io) return;
  io.to('dashboard').emit('new_measure', measure);
  if (measure.parcelId) io.to(`parcel_${measure.parcelId}`).emit('parcel_measure', measure);
};

const emitPumpState = (sensorId, parcelId, state, trigger) => {
  if (!io) return;
  const payload = { sensorId, parcelId, state, trigger, timestamp: new Date() };
  io.to('dashboard').emit('pump_state_changed', payload);
  if (parcelId) io.to(`parcel_${parcelId}`).emit('pump_state_changed', payload);
};

const emitAlert = (alert) => {
  if (!io) return;
  io.to('dashboard').emit('new_alert', alert);
};

const emitGPSUpdate = (sensorId, parcelId, coordinates) => {
  if (!io) return;
  io.to('dashboard').emit('gps_update', { sensorId, parcelId, coordinates, timestamp: new Date() });
};

const sendCommandToDevice = (deviceId, command) => {
  if (!io) return false;
  io.to(`device_${deviceId}`).emit('command', command);
  return true;
};

module.exports = { initSocket, emitNewMeasure, emitPumpState, emitAlert, emitGPSUpdate, sendCommandToDevice };
