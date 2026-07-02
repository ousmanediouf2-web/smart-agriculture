const express = require('express');
const router = express.Router();
const Measure = require('../models/Measure');
const Sensor = require('../models/Sensor');
const Parcel = require('../models/Parcel');
const Alert = require('../models/Alert');
const PumpLog = require('../models/PumpLog');
const { protect, protectDevice } = require('../middleware/auth');
const { analyzeIrrigationNeed } = require('../services/irrigationEngine');
const { sendAlert } = require('../services/telegramService');
const { emitNewMeasure, emitPumpState, emitAlert } = require('../socket/socketManager');

// POST /api/measures - ESP32
router.post('/', protectDevice, async (req, res) => {
  try {
    const { soilHumidity, temperature, airHumidity, latitude, longitude, cropType } = req.body;
    const sensor = req.sensor;
    if (soilHumidity === undefined || temperature === undefined) {
      return res.status(400).json({ success: false, message: 'soilHumidity et temperature requis' });
    }
    const parcel = sensor.parcelId ? await Parcel.findById(sensor.parcelId).populate('cropId') : null;
    const effectiveCropType = cropType || parcel?.cropType || 'manioc';
    // Respecter le mode manuel : si l'utilisateur a forcé la pompe via Telegram/UI,
    // ne pas laisser le moteur automatique l'écraser à la prochaine mesure ESP32
    const isManualMode = sensor.pumpMode === 'manual';
    const decision = isManualMode
      ? { shouldIrrigate: sensor.pumpState, action: 'none', urgency: 'none', reason: 'Mode manuel actif', adjustedThreshold: null }
      : analyzeIrrigationNeed({ soilHumidity, temperature, airHumidity }, effectiveCropType, sensor.pumpState);
    const measure = await Measure.create({
      sensorId: sensor._id,
      parcelId: sensor.parcelId,
      userId: sensor.userId || parcel?.userId,
      cropType: effectiveCropType,
      soilHumidity, temperature, airHumidity,
      location: { type: 'Point', coordinates: [longitude || 0, latitude || 0] },
      pumpActivated: decision.shouldIrrigate,
      pumpAction: decision.action,
      decision: decision.reason,
      urgency: decision.urgency
    });
    const pumpChanged = decision.action !== 'none';
    const newPumpState = decision.action === 'on' ? true : decision.action === 'off' ? false : sensor.pumpState;
    await Sensor.findByIdAndUpdate(sensor._id, {
      lastSeen: new Date(),
      pumpState: newPumpState,
      lastMeasure: { soilHumidity, temperature, airHumidity, recordedAt: new Date() },
      isActive: true
    });
    emitNewMeasure({ ...measure.toObject(), sensorId: sensor._id, parcelId: sensor.parcelId });
    if (pumpChanged && decision.action !== 'none') {
      emitPumpState(sensor._id, sensor.parcelId, newPumpState, 'auto');
      await PumpLog.create({ sensorId: sensor._id, parcelId: sensor.parcelId, action: decision.action, trigger: 'auto', reason: decision.reason });
    }
    // Mettre à jour le statut de la parcelle selon les conditions réelles mesurées
    // (synchronise le badge affiché côté UI avec les vraies données capteur)
    if (parcel) {
      let newStatus = 'active';
      if (decision.urgency === 'critical' && soilHumidity < (decision.adjustedThreshold || 30)) newStatus = 'dry';
      else if (soilHumidity > 85) newStatus = 'wet';
      else if (decision.urgency === 'none' || decision.urgency === 'low') newStatus = 'optimal';
      if (parcel.status !== newStatus) {
        await Parcel.findByIdAndUpdate(parcel._id, { status: newStatus });
      }
    }
    // Alertes si nécessaire
    if (decision.urgency === 'critical' || decision.urgency === 'high') {
      const alertType = soilHumidity < 20 ? 'soil_dry' : 'temp_critical';
      // Anti-spam : tant que la situation reste critique, on ne recrée pas une
      // alerte + message Telegram à chaque mesure (toutes les 3s) — seulement
      // une fois toutes les 5 minutes par capteur/type. Sans ce verrou, une
      // sécheresse prolongée inonderait le Telegram de l'agriculteur.
      const ALERT_COOLDOWN_MS = 5 * 60 * 1000;
      const recentAlert = await Alert.findOne({
        sensorId: sensor._id, type: alertType,
        createdAt: { $gte: new Date(Date.now() - ALERT_COOLDOWN_MS) }
      }).sort({ createdAt: -1 });

      if (!recentAlert) {
        const alert = await Alert.create({
          sensorId: sensor._id,
          parcelId: sensor.parcelId,
          userId: sensor.userId || parcel?.userId,
          type: alertType,
          message: decision.reason,
          priority: decision.urgency,
          data: { soilHumidity, temperature, airHumidity }
        });
        emitAlert(alert);
        if (parcel?.userId) {
          const User = require('../models/User');
          const user = await User.findById(parcel.userId);
          if (user?.telegramChatId && user?.notificationPrefs?.critical) {
            await sendAlert(alertType, {
              parcelName: parcel.name, soilHumidity, temperature, threshold: 30, cropType: effectiveCropType, action: decision.reason
            }, user.telegramChatId);
          }
        }
      }
    }
    res.json({
      success: true,
      data: measure,
      pumpCommand: newPumpState,        // ← Champ lu par l'ESP32 pour piloter le relais
      decision: decision.reason,        // ← String attendue par l'ESP32 (pas l'objet complet)
      urgency: decision.urgency,
      action: decision.action,
      adjustedThreshold: decision.adjustedThreshold
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/measures - Farmer voit seulement ses mesures
router.get('/', protect, async (req, res) => {
  try {
    const { limit = 100, parcelId, sensorId } = req.query;
    let filter = {};
    if (req.user.role !== 'admin') {
      const parcels = await Parcel.find({ userId: req.user._id }).select('_id');
      filter.parcelId = { $in: parcels.map(p => p._id) };
    }
    if (parcelId) filter.parcelId = parcelId;
    if (sensorId) filter.sensorId = sensorId;
    const measures = await Measure.find(filter).sort({ recordedAt: -1 }).limit(parseInt(limit));
    res.json({ success: true, data: measures });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/measures/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const { hours = 24, parcelId, sensorId } = req.query;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    let filter = { recordedAt: { $gte: since } };
    if (req.user.role !== 'admin') {
      const parcels = await Parcel.find({ userId: req.user._id }).select('_id');
      filter.parcelId = { $in: parcels.map(p => p._id) };
    }
    if (parcelId) filter.parcelId = parcelId;
    if (sensorId) filter.sensorId = sensorId;
    const measures = await Measure.find(filter);
    if (!measures.length) return res.json({ success: true, data: null });
    const avg = (key) => measures.reduce((s, m) => s + (m[key] || 0), 0) / measures.length;
    res.json({
      success: true,
      data: {
        avgSoilHumidity: avg('soilHumidity').toFixed(1),
        avgTemperature: avg('temperature').toFixed(1),
        avgAirHumidity: avg('airHumidity').toFixed(1),
        pumpActivations: measures.filter(m => m.pumpAction === 'on').length,
        totalMeasures: measures.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
