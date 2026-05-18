const express = require('express');
const router = express.Router();
const Measure = require('../models/Measure');
const Sensor = require('../models/Sensor');
const Parcel = require('../models/Parcel');
const Alert = require('../models/Alert');
const PumpLog = require('../models/PumpLog');
const { protect, protectDevice } = require('../middleware/auth');
const { analyzeIrrigationNeed } = require('../services/irrigationEngine');
const { sendAlert } = require('../services/twilioService');
const { emitNewMeasure, emitPumpState, emitAlert } = require('../socket/socketManager');

// POST /api/measures - Reçoit les données de l'ESP32
router.post('/', protectDevice, async (req, res) => {
  try {
    const { soilHumidity, temperature, airHumidity, latitude, longitude, cropType } = req.body;
    const sensor = req.sensor;

    // Validation des données
    if (soilHumidity === undefined || temperature === undefined) {
      return res.status(400).json({ success: false, message: 'soilHumidity et temperature requis' });
    }

    // Récupérer la parcelle associée au capteur
    const parcel = sensor.parcelId ? await Parcel.findById(sensor.parcelId).populate('cropId') : null;
    const effectiveCropType = cropType || parcel?.cropType || 'manioc';

    // Analyser le besoin en irrigation
    const decision = analyzeIrrigationNeed(
      { soilHumidity, temperature, airHumidity },
      effectiveCropType,
      sensor.pumpState
    );

    // Créer la mesure
    const measure = await Measure.create({
      sensorId: sensor._id,
      parcelId: sensor.parcelId,
      cropType: effectiveCropType,
      soilHumidity,
      temperature,
      airHumidity,
      location: {
        type: 'Point',
        coordinates: [longitude || 0, latitude || 0]
      },
      pumpActivated: decision.shouldIrrigate,
      pumpAction: decision.action,
      decision: decision.reason,
      urgency: decision.urgency
    });

    // Mettre à jour le capteur
    const pumpChanged = decision.action !== 'none' && decision.action !== (sensor.pumpState ? 'on' : 'off');
    const newPumpState = decision.action === 'on' ? true : decision.action === 'off' ? false : sensor.pumpState;

    await Sensor.findByIdAndUpdate(sensor._id, {
      lastSeen: new Date(),
      pumpState: newPumpState,
      lastMeasure: { soilHumidity, temperature, airHumidity, recordedAt: new Date() },
      'location.coordinates': [longitude || 0, latitude || 0]
    });

    // Logger le changement de pompe
    if (pumpChanged) {
      await PumpLog.create({
        sensorId: sensor._id,
        parcelId: sensor.parcelId,
        action: decision.action,
        trigger: sensor.pumpMode === 'auto' ? 'auto' : 'manual',
        reason: decision.reason,
        soilHumidityAtAction: soilHumidity,
        temperatureAtAction: temperature,
        startedAt: new Date()
      });

      // Émettre le changement de pompe via Socket.IO
      emitPumpState(sensor._id, sensor.parcelId, newPumpState, 'auto');

      // Créer et envoyer une alerte SMS si critique
      if (decision.urgency === 'critical' || decision.urgency === 'high') {
        const alertType = decision.action === 'on' ? 'pump_on' : 'pump_off';
        const alert = await Alert.create({
          sensorId: sensor._id,
          parcelId: sensor.parcelId,
          type: alertType,
          message: decision.reason,
          priority: decision.urgency === 'critical' ? 'critical' : 'high',
          data: { soilHumidity, temperature, airHumidity, cropType: effectiveCropType }
        });

        emitAlert(alert);

        // Envoyer SMS si configuré
        if (parcel?.userId) {
          const User = require('../models/User');
          const user = await User.findById(parcel.userId);
          if (user?.phone && user?.notificationPrefs?.sms) {
            const smsResult = await sendAlert(alertType, {
              parcelName: parcel.name,
              cropType: effectiveCropType,
              soilHumidity: soilHumidity.toFixed(1),
              temperature: temperature.toFixed(1),
              threshold: decision.adjustedThreshold,
              trigger: 'automatique'
            }, user.phone);
            if (smsResult.success) {
              await Alert.findByIdAndUpdate(alert._id, { smsSent: true });
            }
          }
        }
      }
    }

    // Émettre la mesure en temps réel
    emitNewMeasure({ ...measure.toObject(), decision });

    // Répondre à l'ESP32 avec la commande pompe
    res.json({
      success: true,
      pumpCommand: newPumpState,
      pumpAction: decision.action,
      decision: decision.reason,
      urgency: decision.urgency,
      measureId: measure._id
    });

  } catch (err) {
    console.error('Erreur réception mesure:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/measures - Historique des mesures (protégé)
router.get('/', protect, async (req, res) => {
  try {
    const { parcelId, sensorId, cropType, from, to, limit = 100 } = req.query;
    const filter = {};

    if (parcelId) filter.parcelId = parcelId;
    if (sensorId) filter.sensorId = sensorId;
    if (cropType) filter.cropType = cropType;
    if (from || to) {
      filter.recordedAt = {};
      if (from) filter.recordedAt.$gte = new Date(from);
      if (to) filter.recordedAt.$lte = new Date(to);
    }

    const measures = await Measure.find(filter)
      .populate('sensorId', 'deviceId name')
      .populate('parcelId', 'name cropType')
      .sort({ recordedAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, count: measures.length, data: measures });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/measures/stats - Statistiques
router.get('/stats', protect, async (req, res) => {
  try {
    const { parcelId, cropType, hours = 24 } = req.query;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const filter = { recordedAt: { $gte: since } };
    if (parcelId) filter.parcelId = parcelId;
    if (cropType) filter.cropType = cropType;

    const stats = await Measure.aggregate([
      { $match: filter },
      { $group: {
        _id: null,
        avgSoilHumidity: { $avg: '$soilHumidity' },
        avgTemperature: { $avg: '$temperature' },
        avgAirHumidity: { $avg: '$airHumidity' },
        minSoilHumidity: { $min: '$soilHumidity' },
        maxSoilHumidity: { $max: '$soilHumidity' },
        pumpActivations: { $sum: { $cond: ['$pumpActivated', 1, 0] } },
        totalMeasures: { $sum: 1 }
      }}
    ]);

    res.json({ success: true, data: stats[0] || {}, period: `${hours}h` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
