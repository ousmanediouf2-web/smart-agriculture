const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  sensorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sensor' },
  parcelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parcel' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['soil_dry', 'soil_wet', 'temp_critical', 'pump_on', 'pump_off',
           'sensor_offline', 'no_data', 'system_error', 'humidity_danger'],
    required: true
  },
  message: { type: String, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  smsSent: { type: Boolean, default: false },
  acknowledged: { type: Boolean, default: false },
  acknowledgedAt: Date,
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  data: mongoose.Schema.Types.Mixed
}, { timestamps: true });

alertSchema.index({ userId: 1, createdAt: -1 });
alertSchema.index({ priority: 1, acknowledged: 1 });
alertSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
