const express = require('express');
const router = express.Router();
const Parcel = require('../models/Parcel');
const Measure = require('../models/Measure');
const { protect } = require('../middleware/auth');

// GET /api/parcels
router.get('/', protect, async (req, res) => {
  try {
    const Sensor = require('../models/Sensor');
    const filter = req.user.role === 'admin' ? {} : { userId: req.user._id };
    const parcels = await Parcel.find(filter)
      .populate('cropId', 'name label color soilHumidity temperature');

    // Calculer le vrai nombre de capteurs par parcelle depuis la collection Sensor
    // (source de vérité unique — le tableau parcel.sensors[] n'est pas maintenu)
    const parcelIds = parcels.map(p => p._id);
    const sensorCounts = await Sensor.aggregate([
      { $match: { parcelId: { $in: parcelIds } } },
      { $group: { _id: '$parcelId', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    sensorCounts.forEach(s => { countMap[s._id.toString()] = s.count; });

    const enrichedParcels = parcels.map(p => {
      const obj = p.toObject();
      obj.sensorCount = countMap[p._id.toString()] || 0;
      return obj;
    });

    res.json({ success: true, data: enrichedParcels });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/parcels
router.post('/', protect, async (req, res) => {
  // Bloquer si compte non validé par admin
  if (req.user.role === 'farmer' && !req.user.isValidated) {
    return res.status(403).json({ success: false, message: 'Votre compte est en attente de validation par un administrateur.' });
  }
  try {
    const { name, cropId, cropType, geometry, color, area, notes } = req.body;
    if (!name || !cropId || !geometry) {
      return res.status(400).json({ success: false, message: 'name, cropId et geometry requis' });
    }

    // Calculer le centre depuis les coordonnées du polygone dessiné
    const coords = geometry.coordinates[0];
    const centerLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    const centerLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;

    // ✅ Sauvegarder le centre en { lng, lat } pour la carte satellite
    const parcel = await Parcel.create({
      name,
      userId: req.user._id,
      cropId,
      cropType,
      geometry,
      center: { lng: centerLng, lat: centerLat },
      color: color || '#22c55e',
      area: area || 0,
      notes
    });
    await parcel.populate('cropId', 'name label color soilHumidity temperature');
    res.status(201).json({ success: true, data: parcel });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/parcels/:id
router.put('/:id', protect, async (req, res) => {
  try {
    // Si la géométrie est modifiée, recalculer le centre
    if (req.body.geometry) {
      const coords = req.body.geometry.coordinates[0];
      const centerLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
      const centerLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
      req.body.center = { lng: centerLng, lat: centerLat };
    }

    const filter = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, userId: req.user._id };
    const parcel = await Parcel.findOneAndUpdate(filter, req.body, { new: true, runValidators: true })
      .populate('cropId', 'name label color soilHumidity');
    if (!parcel) return res.status(404).json({ success: false, message: 'Parcelle introuvable' });
    res.json({ success: true, data: parcel });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/parcels/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, userId: req.user._id };
    const parcel = await Parcel.findOneAndDelete(filter);
    if (!parcel) return res.status(404).json({ success: false, message: 'Parcelle introuvable' });
    res.json({ success: true, message: 'Parcelle supprimée' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/parcels/:id/stats
router.get('/:id/stats', protect, async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const hoursNum = parseInt(hours);
    const since = new Date(Date.now() - hoursNum * 60 * 60 * 1000);

    // On agrège toujours par intervalle de temps fixe plutôt que par nombre de
    // mesures brutes : avec des capteurs qui mesurent désormais toutes les 3s,
    // une limite en nombre de documents ne couvrirait plus la période demandée
    // (300 mesures à 3s ne représentent que 15 minutes, pas 24h).
    const measures = await Measure.find({ parcelId: req.params.id, recordedAt: { $gte: since } })
      .sort({ recordedAt: 1 }).limit(50000);

    if (measures.length === 0) return res.json({ success: true, data: null });

    const avg = (arr, key) => arr.reduce((s, m) => s + (m[key] || 0), 0) / arr.length;

    // Pas d'agrégation choisi selon la durée demandée, pour garder un nombre
    // de points raisonnable à l'affichage quelle que soit la fréquence capteur :
    // <= 24h  → moyenne par tranche de 5 minutes (jusqu'à ~288 points)
    // <= 7j   → moyenne par heure
    // > 7j    → moyenne par jour
    let bucketMs;
    if (hoursNum <= 24) bucketMs = 5 * 60 * 1000;
    else if (hoursNum <= 168) bucketMs = 60 * 60 * 1000;
    else bucketMs = 24 * 60 * 60 * 1000;

    let series;
    if (!bucketMs) {
      series = measures.slice(-100).map(m => ({
        t: m.recordedAt, soil: m.soilHumidity, temp: m.temperature, air: m.airHumidity, pump: m.pumpActivated
      }));
    } else {
      const buckets = {};
      measures.forEach(m => {
        const bucketKey = Math.floor(new Date(m.recordedAt).getTime() / bucketMs) * bucketMs;
        if (!buckets[bucketKey]) buckets[bucketKey] = [];
        buckets[bucketKey].push(m);
      });
      series = Object.keys(buckets).sort((a, b) => a - b).map(key => {
        const bucketMeasures = buckets[key];
        return {
          t: new Date(parseInt(key)),
          soil: parseFloat(avg(bucketMeasures, 'soilHumidity').toFixed(1)),
          temp: parseFloat(avg(bucketMeasures, 'temperature').toFixed(1)),
          air: parseFloat(avg(bucketMeasures, 'airHumidity').toFixed(1)),
          pump: bucketMeasures.some(m => m.pumpActivated)
        };
      });
    }

    const stats = {
      avgSoilHumidity: avg(measures, 'soilHumidity').toFixed(1),
      avgTemperature: avg(measures, 'temperature').toFixed(1),
      avgAirHumidity: avg(measures, 'airHumidity').toFixed(1),
      minSoilHumidity: Math.min(...measures.map(m => m.soilHumidity ?? 100)).toFixed(1),
      maxSoilHumidity: Math.max(...measures.map(m => m.soilHumidity ?? 0)).toFixed(1),
      pumpActivations: measures.filter(m => m.pumpAction === 'on').length,
      totalMeasures: measures.length,
      latest: measures[measures.length - 1],
      series
    };
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/parcels/:id/detail — Vue unifiée complète d'une parcelle
// Agrège en un seul appel : infos parcelle, capteur(s) associé(s),
// alertes propres à cette parcelle, et historique récent d'arrosage.
// Utilisé par la nouvelle page dédiée /parcels/:id côté frontend.
router.get('/:id/detail', protect, async (req, res) => {
  try {
    const Sensor = require('../models/Sensor');
    const Alert = require('../models/Alert');
    const PumpLog = require('../models/PumpLog');

    const parcel = await Parcel.findById(req.params.id).populate('cropId');
    if (!parcel) return res.status(404).json({ success: false, message: 'Parcelle introuvable' });

    // Vérifier que la parcelle appartient bien à l'utilisateur (sauf admin)
    if (req.user.role !== 'admin' && String(parcel.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette parcelle' });
    }

    const sensors = await Sensor.find({ parcelId: parcel._id });

    const alerts = await Alert.find({ parcelId: parcel._id })
      .sort({ createdAt: -1 })
      .limit(20);

    const pumpLogs = await PumpLog.find({ parcelId: parcel._id })
      .sort({ startedAt: -1 })
      .limit(30);

    res.json({
      success: true,
      data: { parcel, sensors, alerts, pumpLogs }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
