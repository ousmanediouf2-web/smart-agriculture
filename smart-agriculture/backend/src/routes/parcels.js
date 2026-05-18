const express = require('express');
const router = express.Router();
const Parcel = require('../models/Parcel');
const Measure = require('../models/Measure');
const { protect } = require('../middleware/auth');

// GET /api/parcels
router.get('/', protect, async (req, res) => {
  try {
    const parcels = await Parcel.find({ userId: req.user._id })
      .populate('cropId', 'name label color soilHumidity temperature')
      .populate('sensors', 'deviceId name isActive pumpState lastSeen lastMeasure');
    res.json({ success: true, data: parcels });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/parcels - Créer une parcelle avec polygon GeoJSON
router.post('/', protect, async (req, res) => {
  try {
    const { name, cropId, cropType, geometry, color, area, notes } = req.body;

    if (!name || !cropId || !geometry) {
      return res.status(400).json({ success: false, message: 'name, cropId et geometry requis' });
    }

    // Calculer le centre du polygone
    const coords = geometry.coordinates[0];
    const centerLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    const centerLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;

    const parcel = await Parcel.create({
      name,
      userId: req.user._id,
      cropId,
      cropType,
      geometry,
      center: { type: 'Point', coordinates: [centerLng, centerLat] },
      color: color || '#22c55e',
      area: area || 0,
      notes
    });

    await parcel.populate('cropId', 'name label color soilHumidity temperature');
    res.status(201).json({ success: true, data: parcel });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/parcels/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const parcel = await Parcel.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('cropId', 'name label color soilHumidity');

    if (!parcel) return res.status(404).json({ success: false, message: 'Parcelle introuvable' });
    res.json({ success: true, data: parcel });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/parcels/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const parcel = await Parcel.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!parcel) return res.status(404).json({ success: false, message: 'Parcelle introuvable' });
    res.json({ success: true, message: 'Parcelle supprimée' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/parcels/:id/stats
router.get('/:id/stats', protect, async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const measures = await Measure.find({ parcelId: req.params.id, recordedAt: { $gte: since } })
      .sort({ recordedAt: -1 })
      .limit(200);

    if (measures.length === 0) return res.json({ success: true, data: null, message: 'Aucune donnée' });

    const avg = (arr, key) => arr.reduce((s, m) => s + (m[key] || 0), 0) / arr.length;

    const stats = {
      avgSoilHumidity: avg(measures, 'soilHumidity').toFixed(1),
      avgTemperature: avg(measures, 'temperature').toFixed(1),
      avgAirHumidity: avg(measures, 'airHumidity').toFixed(1),
      minSoilHumidity: Math.min(...measures.map(m => m.soilHumidity || 100)).toFixed(1),
      maxSoilHumidity: Math.max(...measures.map(m => m.soilHumidity || 0)).toFixed(1),
      pumpActivations: measures.filter(m => m.pumpAction === 'on').length,
      totalMeasures: measures.length,
      latest: measures[0],
      series: measures.slice(0, 50).reverse().map(m => ({
        t: m.recordedAt,
        soil: m.soilHumidity,
        temp: m.temperature,
        air: m.airHumidity,
        pump: m.pumpActivated
      }))
    };

    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/parcels/nearby - Parcelles à proximité (géospatial)
router.get('/nearby', protect, async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat et lng requis' });

    const parcels = await Parcel.find({
      center: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius)
        }
      }
    }).populate('cropId', 'name label color');

    res.json({ success: true, data: parcels });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
