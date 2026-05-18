const express = require('express');
const router = express.Router();
const Measure = require('../models/Measure');
const Alert = require('../models/Alert');
const { protect } = require('../middleware/auth');
const { exportMeasuresToCSV, exportAlertsToCSV } = require('../services/exportService');

// GET /api/export/measures/csv
router.get('/measures/csv', protect, async (req, res) => {
  try {
    const { parcelId, cropType, from, to } = req.query;
    const filter = {};
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
    res.send('\uFEFF' + csv); // BOM pour Excel
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/export/measures/json
router.get('/measures/json', protect, async (req, res) => {
  try {
    const { parcelId, cropType, from, to } = req.query;
    const filter = {};
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
    const alerts = await Alert.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(5000);
    const csv = exportAlertsToCSV(alerts);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="alertes_${Date.now()}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
