let io = null;

const initSocket = (socketIo) => {
  io = socketIo;

  io.on('connection', (socket) => {
    console.log(`🔌 Client connecté: ${socket.id}`);

    // Rejoindre une room parcelle pour les mises à jour ciblées
    socket.on('join_parcel', (parcelId) => {
      socket.join(`parcel_${parcelId}`);
      console.log(`📍 Client ${socket.id} rejoint parcel_${parcelId}`);
    });

    socket.on('leave_parcel', (parcelId) => {
      socket.leave(`parcel_${parcelId}`);
    });

    // Rejoindre la room générale
    socket.on('join_dashboard', () => {
      socket.join('dashboard');
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client déconnecté: ${socket.id}`);
    });
  });
};

// Émettre une nouvelle mesure à tous les clients du dashboard
const emitNewMeasure = (measure) => {
  if (!io) return;
  io.to('dashboard').emit('new_measure', measure);
  if (measure.parcelId) {
    io.to(`parcel_${measure.parcelId}`).emit('parcel_measure', measure);
  }
};

// Émettre un changement d'état de pompe
const emitPumpState = (sensorId, parcelId, state, trigger) => {
  if (!io) return;
  const payload = { sensorId, parcelId, state, trigger, timestamp: new Date() };
  io.to('dashboard').emit('pump_state_changed', payload);
  if (parcelId) {
    io.to(`parcel_${parcelId}`).emit('pump_state_changed', payload);
  }
};

// Émettre une alerte
const emitAlert = (alert) => {
  if (!io) return;
  io.to('dashboard').emit('new_alert', alert);
};

// Émettre une mise à jour de position GPS
const emitGPSUpdate = (sensorId, parcelId, coordinates) => {
  if (!io) return;
  io.to('dashboard').emit('gps_update', { sensorId, parcelId, coordinates, timestamp: new Date() });
};

// Envoyer une commande à l'ESP32 (via son socket si connecté)
const sendCommandToDevice = (deviceId, command) => {
  if (!io) return false;
  io.to(`device_${deviceId}`).emit('command', command);
  return true;
};

module.exports = { initSocket, emitNewMeasure, emitPumpState, emitAlert, emitGPSUpdate, sendCommandToDevice };
