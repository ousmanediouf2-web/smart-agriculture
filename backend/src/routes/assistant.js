const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { detectAndReply, detectIntent } = require('../services/assistantLogic');

router.post('/chat', protect, async (req, res) => {
  try {
    const { message } = req.body;
    const reply = await detectAndReply(req.user, message);
    const intent = message ? detectIntent(message) : 'greeting';
    res.json({ success: true, reply, intent });
  } catch (err) {
    console.error('Erreur assistant:', err.message);
    res.status(500).json({ success: false, message: 'Erreur de traitement de la question' });
  }
});

module.exports = router;
