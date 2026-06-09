const express = require('express');
const router = express.Router();
const Measure = require('../models/Measure');
const Alert = require('../models/Alert');
const Parcel = require('../models/Parcel');
const { protect } = require('../middleware/auth');
const { exportMeasuresToCSV, exportAlertsToCSV } = require('../services/exportService');

// Helper: récupérer les parcelIds de l'utilisateur
const getUserParcelIds = async (userId) => {
  const parcels = await Parcel.find({ userId }).select('_id');
  return parcels.map(p => p._id);
};

// GET /api/export/measures/csv
router.get('/measures/csv', protect, async (req, res) => {
  try {
    const { parcelId, cropType, from, to } = req.query;
    const filter = {};

    // Isolation
    if (req.user.role !== 'admin') {
      const parcelIds = await getUserParcelIds(req.user._id);
      filter.parcelId = { $in: parcelIds };
    }

    if (parcelId) filter.parcelId = parcelId;
    if (cropType) filter.cropType = cropType;
    if (from || to) {
      filter.recordedAt = {};
      if (from) filter.recordedAt.$gte = new Date(from);
      if (to) filter.recordedAt.$lte = new Date(to);
    }

    const measures = await Measure.find(filter).sort({ recordedAt: -1 }).limit(10000);
    const csv = exportMeasuresToCSV(measures);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="mesures_${Date.now()}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/export/measures/json
router.get('/measures/json', protect, async (req, res) => {
  try {
    const { parcelId, cropType, from, to } = req.query;
    const filter = {};

    if (req.user.role !== 'admin') {
      const parcelIds = await getUserParcelIds(req.user._id);
      filter.parcelId = { $in: parcelIds };
    }

    if (parcelId) filter.parcelId = parcelId;
    if (cropType) filter.cropType = cropType;
    if (from || to) {
      filter.recordedAt = {};
      if (from) filter.recordedAt.$gte = new Date(from);
      if (to) filter.recordedAt.$lte = new Date(to);
    }

    const measures = await Measure.find(filter).sort({ recordedAt: -1 }).limit(10000);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="mesures_${Date.now()}.json"`);
    res.json({ exportedAt: new Date(), count: measures.length, data: measures });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/export/alerts/csv
router.get('/alerts/csv', protect, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role !== 'admin') {
      const parcelIds = await getUserParcelIds(req.user._id);
      filter.parcelId = { $in: parcelIds };
    }

    const alerts = await Alert.find(filter).sort({ createdAt: -1 }).limit(5000);
    const csv = exportAlertsToCSV(alerts);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="alertes_${Date.now()}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
