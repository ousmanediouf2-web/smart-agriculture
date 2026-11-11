const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');

const missions = new Map();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join('/tmp', 'drone_uploads', req.user._id.toString());
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 300 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Images uniquement'));
  }
});

router.get('/missions', protect, (req, res) => {
  const list = Array.from(missions.values())
    .filter(m => m.userId === req.user._id.toString())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, data: list });
});

router.get('/missions/:id', protect, (req, res) => {
  const m = missions.get(req.params.id);
  if (!m || m.userId !== req.user._id.toString())
    return res.status(404).json({ success: false, message: 'Mission introuvable' });
  res.json({ success: true, data: m });
});

router.post('/upload', protect, upload.array('photos', 300), async (req, res) => {
  const { parcelId, parcelName, altitude } = req.body;
  const files = req.files;

  if (!files || files.length < 3)
    return res.status(400).json({ success: false, message: 'Minimum 3 photos requises' });

  const missionId = `m_${Date.now()}_${req.user._id.toString().slice(-6)}`;
  const mission = {
    _id: missionId,
    userId: req.user._id.toString(),
    parcelId, parcelName: parcelName || 'Parcelle',
    altitude: parseInt(altitude) || 60,
    photoCount: files.length,
    status: 'processing',
    progress: 0,
    statusMessage: 'Démarrage du traitement...',
    createdAt: new Date().toISOString(),
    files: files.map(f => f.path),
    orthophotoUrl: null,
    ndviUrl: null,
    view3dUrl: null,
    stats: null,
    error: null
  };

  missions.set(missionId, mission);

  processPhotos(missionId).catch(err => {
    console.error(`[${missionId}] Erreur:`, err.message);
    const m = missions.get(missionId);
    if (m) { m.status = 'error'; m.error = err.message; missions.set(missionId, m); }
  });

  res.json({ success: true, missionId, message: 'Upload réussi, traitement en cours' });
});

const updateMission = (id, msg, progress) => {
  const m = missions.get(id);
  if (m) { m.statusMessage = msg; m.progress = progress; missions.set(id, m); }
  console.log(`[${id}] ${progress}% - ${msg}`);
};

const processPhotos = async (missionId) => {
  const mission = missions.get(missionId);
  if (!mission) return;

  const { execSync } = require('child_process');
  const outputDir = '/tmp/drone_outputs';
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath  = path.join(outputDir, `${missionId}_ortho.jpg`);
  const ndviPath    = path.join(outputDir, `${missionId}_ndvi.jpg`);
  const view3dPath  = path.join(outputDir, `${missionId}_3d.jpg`);
  const statsPath   = path.join(outputDir, `${missionId}_stats.json`);
  const processorScript = path.join(__dirname, '../services/droneProcessor.py');

  // Auto-installer les dépendances Python si absentes
  updateMission(missionId, 'Vérification des outils...', 5);
  try {
    execSync('python3 -c "import PIL, numpy"', { timeout: 5000 });
  } catch {
    updateMission(missionId, 'Installation des outils Python...', 8);
    try {
      execSync('pip3 install Pillow numpy opencv-python-headless --break-system-packages -q', { timeout: 180000 });
    } catch {
      try { execSync('pip install Pillow numpy opencv-python-headless -q', { timeout: 180000 }); } catch {}
    }
  }

  updateMission(missionId, 'Assemblage des photos...', 20);

  const photoList = mission.files.map(f => `"${f}"`).join(' ');
  const cmd = `python3 "${processorScript}" --photos ${photoList} --output "${outputPath}" --ndvi "${ndviPath}" --view3d "${view3dPath}" --stats "${statsPath}" --altitude ${mission.altitude}`;  // date gérée dans le script Python

  const result = execSync(cmd, { timeout: 300000, maxBuffer: 50 * 1024 * 1024 }).toString();
  console.log(`[${missionId}]`, result.split('\n').slice(-6).join(' | '));

  if (!result.includes('DONE')) throw new Error('Traitement incomplet');

  updateMission(missionId, 'Finalisation...', 90);

  let stats = {};
  try { stats = JSON.parse(fs.readFileSync(statsPath, 'utf8')); } catch {}

  mission.files.forEach(f => { try { fs.unlinkSync(f); } catch {} });

  mission.status = 'done';
  mission.progress = 100;
  mission.statusMessage = `✅ ${stats.processingMethod || 'Terminé'} — ${stats.photoCount} photos`;
  mission.orthophotoUrl = `/api/drone/result/${missionId}/ortho`;
  mission.ndviUrl       = `/api/drone/result/${missionId}/ndvi`;
  mission.view3dUrl     = `/api/drone/result/${missionId}/3d`;
  mission.stats = stats;
  missions.set(missionId, mission);
  console.log(`✅ Mission ${missionId} terminée`);
};

router.get('/result/:id/ortho', protect, (req, res) => {
  const m = missions.get(req.params.id);
  if (!m || m.userId !== req.user._id.toString())
    return res.status(404).json({ success: false });
  const fp = `/tmp/drone_outputs/${req.params.id}_ortho.jpg`;
  if (!fs.existsSync(fp)) return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Disposition', `attachment; filename="orthophoto_${m.parcelName}.jpg"`);
  res.sendFile(path.resolve(fp));
});

router.get('/result/:id/ndvi', protect, (req, res) => {
  const m = missions.get(req.params.id);
  if (!m || m.userId !== req.user._id.toString())
    return res.status(404).json({ success: false });
  const fp = `/tmp/drone_outputs/${req.params.id}_ndvi.jpg`;
  if (!fs.existsSync(fp)) return res.status(404).json({ success: false, message: 'NDVI non disponible' });
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Disposition', `attachment; filename="ndvi_${m.parcelName}.jpg"`);
  res.sendFile(path.resolve(fp));
});

router.get('/result/:id/3d', protect, (req, res) => {
  const m = missions.get(req.params.id);
  if (!m || m.userId !== req.user._id.toString())
    return res.status(404).json({ success: false });
  const fp = `/tmp/drone_outputs/${req.params.id}_3d.jpg`;
  if (!fs.existsSync(fp)) return res.status(404).json({ success: false, message: 'Vue 3D non disponible' });
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Disposition', `attachment; filename="vue3d_${m.parcelName}.jpg"`);
  res.sendFile(path.resolve(fp));
});

module.exports = router;
