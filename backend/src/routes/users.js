const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/users
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, password, phone, role, isValidated } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nom, email et mot de passe requis' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email déjà utilisé' });
    const user = await User.create({
      name, email, password, phone,
      role: role || 'farmer',
      isValidated: isValidated !== undefined ? isValidated : true, // admin crée → validé par défaut
      notificationPrefs: { sms: true, critical: true, daily: false }
    });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, phone, role, isActive, isValidated, notificationPrefs } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, role, isActive, isValidated, notificationPrefs },
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/users/:id/validate
router.put('/:id/validate', protect, adminOnly, async (req, res) => {
  try {
    const { isValidated } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isValidated },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    res.json({ success: true, data: user, message: isValidated ? 'Compte validé ✓' : 'Validation retirée' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users/:id/notify-validated - Notifier par WhatsApp
router.post('/:id/notify-validated', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user || !user.phone) return res.json({ success: false, message: 'Utilisateur sans numéro' });
    const { sendWhatsApp } = require('../services/twilioService');
    const result = await sendWhatsApp(user.phone, 'account_validated', { name: user.name });
    res.json({ success: true, whatsapp: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users/:id/sensors - Clés API des capteurs (admin only)
router.get('/:id/sensors', protect, adminOnly, async (req, res) => {
  try {
    const Sensor = require('../models/Sensor');
    const Parcel = require('../models/Parcel');
    const parcels = await Parcel.find({ userId: req.params.id }).select('_id name');
    const sensors = await Sensor.find({ parcelId: { $in: parcels.map(p => p._id) } })
      .populate('parcelId', 'name');
    res.json({ success: true, data: sensors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/users/:id/password
router.put('/:id/password', protect, adminOnly, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mot de passe minimum 6 caractères' });
    }
    const hashed = await bcrypt.hash(password, 12);
    await User.findByIdAndUpdate(req.params.id, { password: hashed });
    res.json({ success: true, message: 'Mot de passe réinitialisé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Impossible de supprimer votre propre compte' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Utilisateur supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
