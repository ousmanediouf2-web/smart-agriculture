const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Sensor = require('../models/Sensor');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/sensors
router.get('/', protect, async (req, res) => {
  try {
    const sensors = await Sensor.find().populate('parcelId', 'name cropType color');
    res.json({ success: true, data: sensors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sensors - Créer un nouveau capteur ESP32
router.post('/', protect, async (req, res) => {
  try {
    const { deviceId, name, parcelId } = req.body;
    if (!deviceId || !name) return res.status(400).json({ success: false, message: 'deviceId et name requis' });

    const apiKey = crypto.randomBytes(32).toString('hex');
    const sensor = await Sensor.create({ deviceId, name, parcelId, apiKey });

    res.status(201).json({ success: true, data: sensor, apiKey });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'deviceId déjà existant' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/sensors/:id/pump - Contrôle manuel de la pompe
router.put('/:id/pump', protect, async (req, res) => {
  try {
    const { state, mode } = req.body;
    const sensor = await Sensor.findByIdAndUpdate(
      req.params.id,
      { pumpState: state, pumpMode: mode || 'manual' },
      { new: true }
    );

    if (!sensor) return res.status(404).json({ success: false, message: 'Capteur introuvable' });

    const { emitPumpState } = require('../socket/socketManager');
    emitPumpState(sensor._id, sensor.parcelId, state, 'manual');

    const PumpLog = require('../models/PumpLog');
    await PumpLog.create({
      sensorId: sensor._id,
      parcelId: sensor.parcelId,
      action: state ? 'on' : 'off',
      trigger: 'manual',
      triggeredBy: req.user._id,
      reason: `Contrôle manuel par ${req.user.name}`
    });

    res.json({ success: true, data: sensor, message: `Pompe ${state ? 'activée' : 'désactivée'} manuellement` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/sensors/:id/status - Statut temps réel d'un capteur
router.get('/:id/status', protect, async (req, res) => {
  try {
    const sensor = await Sensor.findById(req.params.id).populate('parcelId', 'name cropType');
    if (!sensor) return res.status(404).json({ success: false, message: 'Capteur introuvable' });

    const isOnline = sensor.lastSeen && (Date.now() - new Date(sensor.lastSeen).getTime()) < 5 * 60 * 1000;

    res.json({ success: true, data: { ...sensor.toObject(), isOnline } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/sensors/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Sensor.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Capteur supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
