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

// POST /api/export/measures/csv/telegram - Envoyer le CSV des mesures vers Telegram
router.post('/measures/csv/telegram', protect, async (req, res) => {
  try {
    if (!req.user.telegramChatId) {
      return res.status(400).json({ success: false, message: 'Configurez votre Chat ID Telegram dans Paramètres avant d\'envoyer un fichier.' });
    }

    const { parcelId, cropType, from, to } = req.body;
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
    const csv = exportMeasuresToCSV(measures);
    const buffer = Buffer.from('\uFEFF' + csv, 'utf-8');
    const filename = `mesures_AgroSmart_${Date.now()}.csv`;

    const { sendDocument } = require('../services/telegramService');
    const result = await sendDocument(
      req.user.telegramChatId,
      buffer,
      filename,
      `📊 *Export Mesures AgroSmart*\n${measures.length} mesure(s) exportée(s)`
    );

    if (result.success) {
      res.json({ success: true, message: 'Fichier envoyé sur Telegram ✓' });
    } else {
      res.status(500).json({ success: false, message: result.error || 'Échec de l\'envoi Telegram' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/export/alerts/csv/telegram - Envoyer le CSV des alertes vers Telegram
router.post('/alerts/csv/telegram', protect, async (req, res) => {
  try {
    if (!req.user.telegramChatId) {
      return res.status(400).json({ success: false, message: 'Configurez votre Chat ID Telegram dans Paramètres avant d\'envoyer un fichier.' });
    }

    let filter = {};
    if (req.user.role !== 'admin') {
      const parcelIds = await getUserParcelIds(req.user._id);
      filter.parcelId = { $in: parcelIds };
    }

    const alerts = await Alert.find(filter).sort({ createdAt: -1 }).limit(5000);
    const csv = exportAlertsToCSV(alerts);
    const buffer = Buffer.from('\uFEFF' + csv, 'utf-8');
    const filename = `alertes_AgroSmart_${Date.now()}.csv`;

    const { sendDocument } = require('../services/telegramService');
    const result = await sendDocument(
      req.user.telegramChatId,
      buffer,
      filename,
      `⚠️ *Export Alertes AgroSmart*\n${alerts.length} alerte(s) exportée(s)`
    );

    if (result.success) {
      res.json({ success: true, message: 'Fichier envoyé sur Telegram ✓' });
    } else {
      res.status(500).json({ success: false, message: result.error || 'Échec de l\'envoi Telegram' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
