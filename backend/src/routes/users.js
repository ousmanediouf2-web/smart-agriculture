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
    const { name, email, password, phone, telegramChatId, role, isValidated } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nom, email et mot de passe requis' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email déjà utilisé' });
    const user = await User.create({
      name, email, password, phone, telegramChatId,
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
    const { name, email, phone, telegramChatId, role, isActive, isValidated, notificationPrefs } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, telegramChatId, role, isActive, isValidated, notificationPrefs },
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

// POST /api/users/:id/notify-validated - Notifier par Telegram
router.post('/:id/notify-validated', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user || !user.telegramChatId) return res.json({ success: false, message: 'Utilisateur sans chat Telegram configuré' });
    const { sendTelegram } = require('../services/telegramService');
    const result = await sendTelegram(user.telegramChatId, 'account_validated', { name: user.name });
    res.json({ success: true, telegram: result });
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

// POST /api/users/me/test-telegram - Tester sa propre configuration Telegram
router.post('/me/test-telegram', protect, async (req, res) => {
  try {
    if (!req.user.telegramChatId) {
      return res.status(400).json({ success: false, message: 'Configurez votre Chat ID Telegram dans Paramètres avant de tester.' });
    }
    const { sendTelegram } = require('../services/telegramService');
    const result = await sendTelegram(req.user.telegramChatId, 'raw', {
      message: `✅ *Test réussi !*\n\nBonjour *${req.user.name}*, ce message confirme que ta configuration Telegram fonctionne correctement.\n\nTu recevras désormais tes alertes${req.user.notificationPrefs?.daily ? ' et rapports journaliers' : ''} sur ce chat.`
    });
    if (result.success) {
      res.json({ success: true, message: 'Message de test envoyé sur Telegram !' });
    } else {
      res.status(500).json({ success: false, message: result.error || result.reason || 'Échec de l\'envoi. Vérifiez le token du bot côté serveur.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users/admin/trigger-daily-report - Déclencher manuellement le rapport journalier (test)
router.post('/admin/trigger-daily-report', protect, adminOnly, async (req, res) => {
  try {
    const { sendDailyReports } = require('../services/telegramService');
    await sendDailyReports();
    res.json({ success: true, message: 'Rapport journalier déclenché — consultez les logs serveur pour le détail.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
