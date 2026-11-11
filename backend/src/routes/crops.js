const express = require('express');
const router = express.Router();
const Crop = require('../models/Crop');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/crops
router.get('/', protect, async (req, res) => {
  try {
    const crops = await Crop.find();
    res.json({ success: true, data: crops });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/crops/:id - Mettre à jour les seuils d'une culture (admin)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const crop = await Crop.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!crop) return res.status(404).json({ success: false, message: 'Culture introuvable' });
    res.json({ success: true, data: crop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
