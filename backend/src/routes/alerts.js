const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const Parcel = require('../models/Parcel');
const { protect } = require('../middleware/auth');

// GET /api/alerts
router.get('/', protect, async (req, res) => {
  try {
    const { priority, acknowledged, limit = 50 } = req.query;
    let filter = {};

    // Isolation : farmer voit uniquement ses alertes
    if (req.user.role !== 'admin') {
      const parcels = await Parcel.find({ userId: req.user._id }).select('_id');
      filter.parcelId = { $in: parcels.map(p => p._id) };
    }

    if (priority) filter.priority = priority;
    if (acknowledged !== undefined) filter.acknowledged = acknowledged === 'true';

    const alerts = await Alert.find(filter)
      .populate('sensorId', 'deviceId name')
      .populate('parcelId', 'name cropType')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const unreadCount = await Alert.countDocuments({ ...filter, acknowledged: false });
    res.json({ success: true, data: alerts, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/alerts/:id/acknowledge
router.put('/:id/acknowledge', protect, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { acknowledged: true, acknowledgedAt: new Date(), acknowledgedBy: req.user._id },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, message: 'Alerte introuvable' });
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/alerts/acknowledge-all
router.put('/acknowledge-all', protect, async (req, res) => {
  try {
    let filter = { acknowledged: false };
    if (req.user.role !== 'admin') {
      const parcels = await Parcel.find({ userId: req.user._id }).select('_id');
      filter.parcelId = { $in: parcels.map(p => p._id) };
    }
    await Alert.updateMany(filter, { acknowledged: true, acknowledgedAt: new Date(), acknowledgedBy: req.user._id });
    res.json({ success: true, message: 'Toutes les alertes acquittées' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
