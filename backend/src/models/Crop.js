const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  name: { type: String, required: true, enum: ['tomate', 'aubergine', 'manioc'], unique: true },
  label: { type: String, required: true },
  color: { type: String, default: '#22c55e' },
  waterNeed: { type: String, enum: ['faible', 'moyen', 'élevé'] },
  description: String,
  soilHumidity: {
    min: { type: Number, default: 40 },
    optimal: { type: Number, default: 65 },
    max: { type: Number, default: 85 },
    critical: { type: Number, default: 25 }
  },
  temperature: {
    min: { type: Number, default: 15 },
    optimal: { type: Number, default: 25 },
    max: { type: Number, default: 35 },
    critical: { type: Number, default: 40 }
  },
  airHumidityFactor: { type: Number, default: 1.0 },
  irrigationDuration: { type: Number, default: 30 }
}, { timestamps: true });

module.exports = mongoose.model('Crop', cropSchema);
