const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Parcel = require('../models/Parcel');
const ndviService = require('../services/ndviService');

const label = (key) => ndviService.NDVI_CLASSES.find(c => c.key === key)?.label || '—';

const serialize = (parcel, n) => ({
  parcelId: parcel._id,
  parcelName: parcel.name,
  ndvi: n.value,
  status: n.status,
  statusLabel: label(n.status),
  source: n.source,                      // 'sentinel-2' | 'simulated'
  observedAt: n.observedAt,
  updatedAt: n.updatedAt,
  nextUpdateAt: new Date(new Date(n.updatedAt).getTime() + ndviService.REFRESH_DAYS * 86400000),
  refreshIntervalDays: ndviService.REFRESH_DAYS,
  history: (n.history || []).map(h => ({ date: h.date, value: h.value }))
});

// Restreint l'accès : un agriculteur ne voit que ses parcelles
const findAllowedParcel = async (req, id) => {
  const filter = req.user.role === 'admin' ? { _id: id } : { _id: id, userId: req.user._id };
  return Parcel.findOne(filter);
};

// Traitement avec concurrence limitée (évite de saturer l'API Sentinel)
const mapLimit = async (items, limit, fn) => {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]).catch(() => null);
    }
  });
  await Promise.all(workers);
  return out;
};

// GET /api/satellite/ndvi/summary  → NDVI de toutes les parcelles visibles
router.get('/ndvi/summary', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { userId: req.user._id };
    const parcels = await Parcel.find(filter);
    const results = await mapLimit(parcels, 3, async (p) => serialize(p, await ndviService.getParcelNdvi(p)));
    res.json({
      success: true,
      configured: ndviService.isConfigured(),
      data: results.filter(Boolean)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/satellite/:parcelId  → NDVI + tendance d'une parcelle
router.get('/:parcelId', protect, async (req, res) => {
  try {
    const parcel = await findAllowedParcel(req, req.params.parcelId);
    if (!parcel) return res.status(404).json({ success: false, message: 'Parcelle introuvable' });
    const n = await ndviService.getParcelNdvi(parcel);
    res.json({ success: true, configured: ndviService.isConfigured(), data: serialize(parcel, n) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/satellite/:parcelId/image?type=ndvi|truecolor  → image Sentinel-2 découpée sur la parcelle
router.get('/:parcelId/image', protect, async (req, res) => {
  try {
    const parcel = await findAllowedParcel(req, req.params.parcelId);
    if (!parcel) return res.status(404).json({ success: false, message: 'Parcelle introuvable' });
    if (!ndviService.isConfigured()) {
      return res.json({ success: true, available: false, reason: 'Identifiants Sentinel non configurés' });
    }
    const type = req.query.type === 'truecolor' ? 'truecolor' : 'ndvi';
    const image = await ndviService.fetchParcelImage(parcel, type);
    res.json({ success: true, available: !!image, data: image });
  } catch (err) {
    res.json({ success: true, available: false, reason: err.message });
  }
});

// POST /api/satellite/:parcelId/refresh  → recalcul immédiat
router.post('/:parcelId/refresh', protect, async (req, res) => {
  try {
    const parcel = await findAllowedParcel(req, req.params.parcelId);
    if (!parcel) return res.status(404).json({ success: false, message: 'Parcelle introuvable' });
    ndviService.clearImageCache(parcel._id);
    const n = await ndviService.getParcelNdvi(parcel, { force: true });
    res.json({ success: true, data: serialize(parcel, n) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
