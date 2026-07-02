const mongoose = require('mongoose');

const measureSchema = new mongoose.Schema({
  sensorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sensor', required: true },
  parcelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parcel' },
  cropType: { type: String, enum: ['tomate', 'aubergine', 'manioc'] },
  soilHumidity: { type: Number, min: 0, max: 100 },
  temperature: { type: Number, min: -10, max: 60 },
  airHumidity: { type: Number, min: 0, max: 100 },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  pumpActivated: { type: Boolean, default: false },
  pumpAction: { type: String, enum: ['on', 'off', 'none'], default: 'none' },
  decision: { type: String },
  urgency: { type: String, enum: ['none', 'low', 'medium', 'high', 'critical'], default: 'none' },
  recordedAt: { type: Date, default: Date.now }
}, { timestamps: true });

measureSchema.index({ location: '2dsphere' });
measureSchema.index({ sensorId: 1, recordedAt: -1 });
measureSchema.index({ parcelId: 1, recordedAt: -1 });
measureSchema.index({ recordedAt: -1 });
// Purge automatique après 30 jours : à 3s/mesure, le volume est ~10x plus
// élevé qu'avant — sans cette limite, le quota gratuit MongoDB Atlas (512 Mo)
// serait vite saturé. Les graphiques 24h/7j/30j de l'app n'ont pas besoin de
// données plus anciennes.
measureSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('Measure', measureSchema);
