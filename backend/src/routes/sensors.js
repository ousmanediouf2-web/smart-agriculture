const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Sensor = require('../models/Sensor');
const Parcel = require('../models/Parcel');
const { protect, adminOnly } = require('../middleware/auth');

// Un capteur qui envoie toutes les 3 s est considéré hors ligne après 45 s de silence.
// Calculé avec l'horloge du serveur : l'horloge d'un PC mal réglée ne fausse plus l'état.
const ONLINE_WINDOW_MS = 45 * 1000;
const withOnline = (sensor) => {
  const obj = typeof sensor.toObject === 'function' ? sensor.toObject() : sensor;
  const msSinceLastSeen = obj.lastSeen ? Date.now() - new Date(obj.lastSeen).getTime() : null;
  return { ...obj, msSinceLastSeen, isOnline: msSinceLastSeen !== null && msSinceLastSeen < ONLINE_WINDOW_MS };
};

// GET /api/sensors - Farmer voit seulement ses capteurs
router.get('/', protect, async (req, res) => {
  try {
    let sensors;
    if (req.user.role === 'admin') {
      sensors = await Sensor.find()
        .populate('parcelId', 'name cropType color userId')
        .populate('userId', 'name email');
    } else {
      // Trouver les parcelles de l'utilisateur
      const parcels = await Parcel.find({ userId: req.user._id }).select('_id');
      const parcelIds = parcels.map(p => p._id);
      sensors = await Sensor.find({ parcelId: { $in: parcelIds } })
        .populate('parcelId', 'name cropType color');
    }
    res.json({ success: true, data: sensors.map(withOnline) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/sensors
router.post('/', protect, async (req, res) => {
  // Bloquer si compte non validé par admin
  if (req.user.role === 'farmer' && !req.user.isValidated) {
    return res.status(403).json({ success: false, message: 'Votre compte est en attente de validation par un administrateur.' });
  }
  try {
    const { deviceId, name, parcelId } = req.body;
    if (!deviceId || !name) return res.status(400).json({ success: false, message: 'deviceId et name requis' });

    // Vérifier que la parcelle appartient à l'utilisateur
    if (parcelId && req.user.role !== 'admin') {
      const parcel = await Parcel.findOne({ _id: parcelId, userId: req.user._id });
      if (!parcel) return res.status(403).json({ success: false, message: 'Parcelle non autorisée' });
    }

    const apiKey = crypto.randomBytes(32).toString('hex');
    const sensor = await Sensor.create({ deviceId, name, parcelId, apiKey, userId: req.user._id });
    res.status(201).json({ success: true, data: sensor, apiKey });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'deviceId déjà existant' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/sensors/:id/pump
router.put('/:id/pump', protect, async (req, res) => {
  try {
    const { state, mode } = req.body;
    const filter = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, userId: req.user._id };
    const sensor = await Sensor.findOneAndUpdate(
      filter,
      { pumpState: state, pumpMode: mode || 'manual' },
      { new: true }
    );
    if (!sensor) return res.status(404).json({ success: false, message: 'Capteur introuvable ou non autorisé' });
    const { emitPumpState } = require('../socket/socketManager');
    emitPumpState(sensor._id, sensor.parcelId, state, 'manual');
    const PumpLog = require('../models/PumpLog');
    await PumpLog.create({ sensorId: sensor._id, parcelId: sensor.parcelId, action: state ? 'on' : 'off', trigger: 'manual', triggeredBy: req.user._id });
    res.json({ success: true, data: sensor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/sensors/:id/status
router.get('/:id/status', protect, async (req, res) => {
  try {
    const sensor = await Sensor.findById(req.params.id).populate('parcelId', 'name cropType');
    if (!sensor) return res.status(404).json({ success: false, message: 'Capteur introuvable' });
    res.json({ success: true, data: withOnline(sensor) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/sensors/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, userId: req.user._id };
    await Sensor.findOneAndDelete(filter);
    res.json({ success: true, message: 'Capteur supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
