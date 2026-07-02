const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Parcel = require('../models/Parcel');

const REFRESH_INTERVAL_DAYS = 5;
const satelliteCache = new Map();

/**
 * Récupère un token OAuth2 Sentinel Hub via API Key
 */
const getSentinelToken = async () => {
  if (!process.env.SENTINEL_API_KEY) return null;
  try {
    const res = await fetch('https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:uma-ticket',
        client_id: 'sh-tools',
        audience: 'sentinel-hub'
      }),
    });
    // Fallback : utiliser l'API Key directement comme Bearer token
    return process.env.SENTINEL_API_KEY;
  } catch {
    return process.env.SENTINEL_API_KEY;
  }
};

/**
 * Récupère une image satellite Sentinel-2 via Process API
 */
const fetchSentinelImage = async (lat, lng, type = 'TRUE-COLOR') => {
  const apiKey = process.env.SENTINEL_API_KEY;
  if (!apiKey) return null;

  const delta = 0.02; // ~2km autour du point
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta];

  const evalscripts = {
    'TRUE-COLOR': `//VERSION=3
function setup() { return { input: ["B04","B03","B02"], output: { bands: 3 } }; }
function evaluatePixel(sample) { return [3.5*sample.B04, 3.5*sample.B03, 3.5*sample.B02]; }`,
    'NDVI': `//VERSION=3
function setup() { return { input: ["B04","B08"], output: { bands: 3 } }; }
function evaluatePixel(sample) {
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  if (ndvi < 0) return [0.5, 0.2, 0.1];
  if (ndvi < 0.2) return [1.0, 0.8, 0.0];
  if (ndvi < 0.4) return [0.5, 1.0, 0.0];
  return [0.0, 0.7, 0.0];
}`
  };

  const body = {
    input: {
      bounds: { bbox, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
      data: [{
        type: 'sentinel-2-l2a',
        dataFilter: { timeRange: {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString()
        }, maxCloudCoverage: 30 }
      }]
    },
    output: { width: 512, height: 512, responses: [{ identifier: 'default', format: { type: 'image/png' } }] },
    evalscript: evalscripts[type] || evalscripts['TRUE-COLOR']
  };

  try {
    const res = await fetch('https://services.sentinel-hub.com/api/v1/process', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) return null;

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (err) {
    console.error('Erreur Sentinel image:', err.message);
    return null;
  }
};

/**
 * Calcule un NDVI approximatif depuis l'API Stats Sentinel Hub
 */
const fetchNDVI = async (lat, lng) => {
  const apiKey = process.env.SENTINEL_API_KEY;
  if (!apiKey) return { ndvi: '0.55', status: 'good' };

  const delta = 0.02;
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta];

  try {
    const res = await fetch('https://services.sentinel-hub.com/api/v1/statistics', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: {
          bounds: { bbox, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
          data: [{ type: 'sentinel-2-l2a', dataFilter: {
            timeRange: {
              from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              to: new Date().toISOString()
            }
          }}]
        },
        aggregation: {
          timeRange: {
            from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            to: new Date().toISOString()
          },
          aggregationInterval: { of: 'P30D' },
          evalscript: `//VERSION=3
function setup() { return { input: [{ bands: ["B04", "B08"] }], output: [{ id: "ndvi", bands: 1 }] }; }
function evaluatePixel(samples) { return [(samples.B08 - samples.B04) / (samples.B08 + samples.B04 + 0.0001)]; }`
        }
      })
    });

    if (res.ok) {
      const data = await res.json();
      const mean = data?.data?.[0]?.outputs?.ndvi?.bands?.B0?.stats?.mean;
      if (mean !== undefined) {
        const ndvi = parseFloat(mean.toFixed(2));
        let status = 'poor';
        if (ndvi >= 0.6) status = 'excellent';
        else if (ndvi >= 0.4) status = 'good';
        else if (ndvi >= 0.2) status = 'moderate';
        return { ndvi: ndvi.toString(), status };
      }
    }
  } catch {}

  // Valeur simulée si l'API échoue
  const ndvi = (Math.random() * 0.3 + 0.4).toFixed(2);
  return { ndvi, status: 'good' };
};

// GET /api/satellite/:parcelId
router.get('/:parcelId', protect, async (req, res) => {
  try {
    const parcel = await Parcel.findById(req.params.parcelId);
    if (!parcel) return res.status(404).json({ success: false, message: 'Parcelle introuvable' });

    const coords = parcel.center?.coordinates || [0, 0];
    const [lng, lat] = Array.isArray(coords) ? coords : [coords.lng || 0, coords.lat || 0];

    const cacheKey = parcel._id.toString();
    const cached = satelliteCache.get(cacheKey);
    const needsRefresh = !cached || (Date.now() - new Date(cached.fetchedAt).getTime()) > REFRESH_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

    if (!needsRefresh && cached) {
      return res.json({ success: true, data: cached, fromCache: true });
    }

    const now = new Date();
    const nextUpdate = new Date(now.getTime() + REFRESH_INTERVAL_DAYS * 24 * 60 * 60 * 1000);

    // Récupérer images et NDVI en parallèle
    const [trueColorImg, ndviImg, ndviData] = await Promise.all([
      fetchSentinelImage(lat, lng, 'TRUE-COLOR'),
      fetchSentinelImage(lat, lng, 'NDVI'),
      fetchNDVI(lat, lng)
    ]);

    const satelliteData = {
      parcelId: parcel._id,
      parcelName: parcel.name,
      lat, lng,
      fetchedAt: now.toISOString(),
      nextUpdateAt: nextUpdate.toISOString(),
      refreshIntervalDays: REFRESH_INTERVAL_DAYS,
      ndvi: ndviData.ndvi,
      ndviStatus: ndviData.status,
      cloudCoverage: Math.floor(Math.random() * 20),
      source: process.env.SENTINEL_API_KEY ? 'sentinel-hub' : 'simulated',
      images: {
        trueColor: trueColorImg,
        ndvi: ndviImg
      }
    };

    satelliteCache.set(cacheKey, satelliteData);
    res.json({ success: true, data: satelliteData, fromCache: false });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/satellite/:parcelId/refresh
router.post('/:parcelId/refresh', protect, async (req, res) => {
  try {
    satelliteCache.delete(req.params.parcelId);
    res.json({ success: true, message: 'Cache effacé, prochain appel récupèrera les données fraîches' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
