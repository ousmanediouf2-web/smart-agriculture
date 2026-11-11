const express = require('express');
const router = express.Router();
const PumpLog = require('../models/PumpLog');
const Parcel = require('../models/Parcel');
const { protect } = require('../middleware/auth');

// GET /api/pump-history - Historique des arrosages isolé par utilisateur
router.get('/', protect, async (req, res) => {
  try {
    const { parcelId, sensorId, days = 7, limit = 100 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Filtre de base : par date
    const filter = { startedAt: { $gte: since } };

    // Isolation : farmer voit uniquement ses propres arrosages
    if (req.user.role !== 'admin') {
      const parcels = await Parcel.find({ userId: req.user._id }).select('_id');
      const parcelIds = parcels.map(p => p._id);
      filter.parcelId = { $in: parcelIds };
    }

    // Filtres optionnels
    if (parcelId) filter.parcelId = parcelId;
    if (sensorId) filter.sensorId = sensorId;

    const logs = await PumpLog.find(filter)
      .populate('sensorId', 'name deviceId')
      .populate('parcelId', 'name cropType color')
      .sort({ startedAt: -1 })
      .limit(parseInt(limit));

    // Stats
    const activations = logs.filter(l => l.action === 'on');
    const totalActivations = activations.length;

    // Grouper par jour
    const byDay = {};
    activations.forEach(log => {
      const day = new Date(log.startedAt).toLocaleDateString('fr-FR');
      byDay[day] = (byDay[day] || 0) + 1;
    });

    const dailySeries = Object.entries(byDay)
      .map(([date, count]) => ({ date, count }))
      .reverse();

    res.json({
      success: true,
      data: logs,
      stats: { totalActivations, dailySeries }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
