const mongoose = require('mongoose');

const sensorSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  parcelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parcel' },
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
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  }
}, { timestamps: true });

sensorSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Sensor', sensorSchema);
