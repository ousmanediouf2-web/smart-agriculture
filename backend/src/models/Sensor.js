const mongoose = require('mongoose');

const sensorSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  parcelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parcel' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // propriétaire
  apiKey: { type: String, required: true },
  type: { type: String, default: 'ESP32' },
  isActive: { type: Boolean, default: true },
  pumpState: { type: Boolean, default: false },
  pumpMode: { type: String, enum: ['auto', 'manual'], default: 'auto' },
  lastSeen: Date,
  lastMeasure: {
    soilHumidity: Number,
    temperature: Number,
    airHumidity: Number,
    recordedAt: Date
  }
}, { timestamps: true });

sensorSchema.index({ deviceId: 1 });
sensorSchema.index({ parcelId: 1 });
sensorSchema.index({ userId: 1 });

module.exports = mongoose.model('Sensor', sensorSchema);
