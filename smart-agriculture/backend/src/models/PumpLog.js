const mongoose = require('mongoose');

const pumpLogSchema = new mongoose.Schema({
  sensorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sensor', required: true },
  parcelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parcel' },
  action: { type: String, enum: ['on', 'off'], required: true },
  trigger: { type: String, enum: ['auto', 'manual'], default: 'auto' },
  triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: String,
  soilHumidityAtAction: Number,
  temperatureAtAction: Number,
  startedAt: { type: Date, default: Date.now },
  stoppedAt: Date,
  duration: Number // secondes
}, { timestamps: true });

pumpLogSchema.index({ sensorId: 1, createdAt: -1 });

module.exports = mongoose.model('PumpLog', pumpLogSchema);
