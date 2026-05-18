const mongoose = require('mongoose');

const parcelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cropId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crop', required: true },
  cropType: { type: String, enum: ['tomate', 'aubergine', 'manioc'] },
  geometry: {
    type: { type: String, enum: ['Polygon'], required: true },
    coordinates: { type: [[[Number]]], required: true }
  },
  center: {
    lng: { type: Number, default: 0 },
    lat: { type: Number, default: 0 }
  },
  color: { type: String, default: '#22c55e' },
  area: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive', 'dry', 'optimal', 'wet'], default: 'active' },
  sensors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sensor' }],
  notes: String
}, { timestamps: true });

parcelSchema.index({ userId: 1 });

module.exports = mongoose.model('Parcel', parcelSchema);
