/**
 * Service NDVI — Sentinel-2 L2A
 *
 * Fournisseurs pris en charge (le premier configuré est utilisé) :
 *   1. Copernicus Data Space (GRATUIT)  → CDSE_CLIENT_ID + CDSE_CLIENT_SECRET
 *      Créer un compte sur https://dataspace.copernicus.eu puis un "OAuth client"
 *      dans le Dashboard Sentinel Hub (https://shapps.dataspace.copernicus.eu/dashboard).
 *   2. Sentinel Hub (essai gratuit puis payant) → SENTINEL_CLIENT_ID + SENTINEL_CLIENT_SECRET
 *
 * Sans identifiants, des valeurs NDVI SIMULÉES (stables, déterministes) sont
 * produites afin que l'interface reste utilisable en démonstration. Elles sont
 * toujours marquées source = 'simulated' et signalées comme telles dans l'UI.
 */
const Parcel = require('../models/Parcel');

const REFRESH_DAYS = 5;
const REFRESH_MS = REFRESH_DAYS * 24 * 60 * 60 * 1000;
const HISTORY_LENGTH = 12;

// ── Seuils NDVI (identiques côté frontend : utils/ndvi.js) ──────────────────
const NDVI_CLASSES = [
  { max: 0.1,  key: 'bare',      label: 'Sol nu ou eau' },
  { max: 0.2,  key: 'very_low',  label: 'Végétation très faible' },
  { max: 0.3,  key: 'low',       label: 'Végétation faible' },
  { max: 0.45, key: 'moderate',  label: 'Végétation modérée' },
  { max: 0.6,  key: 'good',      label: 'Bonne vigueur' },
  { max: 9,    key: 'dense',     label: 'Végétation dense' },
];

const classify = (v) => NDVI_CLASSES.find(c => v < c.max) || NDVI_CLASSES[NDVI_CLASSES.length - 1];

// ── Authentification ─────────────────────────────────────────────────────────
const getProvider = () => {
  if (process.env.CDSE_CLIENT_ID && process.env.CDSE_CLIENT_SECRET) {
    return {
      name: 'copernicus',
      clientId: process.env.CDSE_CLIENT_ID,
      clientSecret: process.env.CDSE_CLIENT_SECRET,
      tokenUrl: 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',
      api: 'https://sh.dataspace.copernicus.eu/api/v1'
    };
  }
  if (process.env.SENTINEL_CLIENT_ID && process.env.SENTINEL_CLIENT_SECRET) {
    return {
      name: 'sentinelhub',
      clientId: process.env.SENTINEL_CLIENT_ID,
      clientSecret: process.env.SENTINEL_CLIENT_SECRET,
      tokenUrl: 'https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token',
      api: 'https://services.sentinel-hub.com/api/v1'
    };
  }
  return null;
};

const isConfigured = () => !!getProvider();

let tokenCache = { token: null, expiresAt: 0, provider: null };

const getToken = async (provider) => {
  if (tokenCache.token && tokenCache.provider === provider.name && Date.now() < tokenCache.expiresAt - 30000) {
    return tokenCache.token;
  }
  const res = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: provider.clientId,
      client_secret: provider.clientSecret
    }),
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`Authentification Sentinel refusée (${res.status})`);
  const json = await res.json();
  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in || 300) * 1000,
    provider: provider.name
  };
  return tokenCache.token;
};

// ── Géométrie ────────────────────────────────────────────────────────────────
const getGeometry = (parcel) => ({
  type: 'Polygon',
  coordinates: JSON.parse(JSON.stringify(parcel.geometry.coordinates))
});

const getBounds = (parcel, padding = 0.08) => {
  const ring = parcel.geometry.coordinates[0];
  const lngs = ring.map(c => c[0]);
  const lats = ring.map(c => c[1]);
  let west = Math.min(...lngs), east = Math.max(...lngs);
  let south = Math.min(...lats), north = Math.max(...lats);
  const dx = Math.max((east - west) * padding, 0.0002);
  const dy = Math.max((north - south) * padding, 0.0002);
  west -= dx; east += dx; south -= dy; north += dy;
  return { west, south, east, north };
};

// ── Données simulées (déterministes) ─────────────────────────────────────────
const hashString = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
};

const simulateSeries = (parcel) => {
  const seed = hashString(String(parcel._id));
  const base = 0.32 + seed * 0.32;               // 0.32 → 0.64
  const phase = seed * Math.PI * 2;
  const now = Date.now();
  const series = [];
  for (let i = HISTORY_LENGTH - 1; i >= 0; i--) {
    const idx = HISTORY_LENGTH - 1 - i;
    const v = base + 0.07 * Math.sin(idx / 2.2 + phase) + 0.02 * Math.sin(idx * 1.7 + phase);
    series.push({
      date: new Date(now - i * REFRESH_MS),
      value: Math.max(0.05, Math.min(0.88, Number(v.toFixed(3))))
    });
  }
  return series;
};

// ── Statistiques NDVI sur le polygone (Statistics API) ───────────────────────
const STATS_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: [
      { id: "ndvi", bands: 1 },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(s) {
  // SCL : 4 végétation, 5 sol nu, 7 non classé (on exclut nuages, ombres, eau, neige)
  var ok = s.dataMask === 1 && (s.SCL === 4 || s.SCL === 5 || s.SCL === 7) ? 1 : 0;
  var ndvi = (s.B08 - s.B04) / (s.B08 + s.B04 + 0.000001);
  return { ndvi: [ndvi], dataMask: [ok] };
}`;

const fetchSentinelSeries = async (parcel, provider) => {
  const token = await getToken(provider);
  const to = new Date();
  const from = new Date(to.getTime() - (HISTORY_LENGTH + 2) * REFRESH_MS);

  const res = await fetch(`${provider.api}/statistics`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: {
        bounds: {
          geometry: getGeometry(parcel),
          properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' }
        },
        data: [{ type: 'sentinel-2-l2a', dataFilter: { maxCloudCoverage: 70 } }]
      },
      aggregation: {
        timeRange: { from: from.toISOString(), to: to.toISOString() },
        aggregationInterval: { of: `P${REFRESH_DAYS}D` },
        evalscript: STATS_EVALSCRIPT,
        resx: 0.0001,
        resy: 0.0001
      },
      calculations: { default: {} }
    }),
    signal: AbortSignal.timeout(25000)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Statistics API ${res.status} ${txt.slice(0, 160)}`);
  }

  const json = await res.json();
  const points = [];
  for (const d of json.data || []) {
    const st = d?.outputs?.ndvi?.bands?.B0?.stats;
    if (!st) continue;
    const valid = (st.sampleCount || 0) - (st.noDataCount || 0);
    const mean = Number(st.mean);
    if (valid > 0 && Number.isFinite(mean)) {
      points.push({ date: new Date(d.interval.to), value: Number(mean.toFixed(3)) });
    }
  }
  return points.slice(-HISTORY_LENGTH);
};

// ── Calcul + mise en base (avec dédoublonnage des appels simultanés) ─────────
const inFlight = new Map();

const computeParcelNdvi = async (parcel) => {
  const provider = getProvider();
  let series = [];
  let source = 'simulated';

  if (provider) {
    try {
      series = await fetchSentinelSeries(parcel, provider);
      if (series.length > 0) source = 'sentinel-2';
    } catch (err) {
      console.error(`NDVI Sentinel (${parcel.name}) :`, err.message);
    }
  }

  // Aucune image exploitable (nuages) ou pas d'identifiants → valeurs simulées
  if (series.length === 0) {
    series = simulateSeries(parcel);
    source = 'simulated';
  }

  const last = series[series.length - 1];
  const cls = classify(last.value);
  const ndvi = {
    value: last.value,
    status: cls.key,
    source,
    observedAt: last.date,
    updatedAt: new Date()
  };

  await Parcel.updateOne({ _id: parcel._id }, { $set: { ndvi, ndviHistory: series } });
  return { ...ndvi, history: series };
};

/**
 * Retourne le NDVI d'une parcelle (valeur + tendance), depuis la base si
 * récent (< 5 jours), sinon recalculé.
 */
const getParcelNdvi = async (parcel, { force = false } = {}) => {
  const key = String(parcel._id);
  const stored = parcel.ndvi;
  const fresh = stored?.value != null && stored.updatedAt &&
    (Date.now() - new Date(stored.updatedAt).getTime()) < REFRESH_MS;
  // Des données simulées déjà en base sont recalculées dès que des identifiants existent
  const staleSimulation = stored?.source === 'simulated' && isConfigured();

  if (!force && fresh && !staleSimulation) {
    return {
      value: stored.value,
      status: stored.status,
      source: stored.source,
      observedAt: stored.observedAt,
      updatedAt: stored.updatedAt,
      history: parcel.ndviHistory || []
    };
  }

  if (!inFlight.has(key)) {
    inFlight.set(key, computeParcelNdvi(parcel).finally(() => inFlight.delete(key)));
  }
  return inFlight.get(key);
};

// ── Image NDVI / vraie couleur découpée sur la parcelle (Process API) ────────
const imageCache = new Map();

const NDVI_IMAGE_EVALSCRIPT = `//VERSION=3
function setup() {
  return { input: ["B04", "B08", "SCL", "dataMask"], output: { bands: 4 } };
}
function evaluatePixel(s) {
  var ok = s.dataMask === 1 && (s.SCL === 4 || s.SCL === 5 || s.SCL === 7);
  if (!ok) return [0, 0, 0, 0];
  var v = (s.B08 - s.B04) / (s.B08 + s.B04 + 0.000001);
  if (v < 0.1)  return [0.66, 0.40, 0.18, 1];
  if (v < 0.2)  return [0.88, 0.65, 0.15, 1];
  if (v < 0.3)  return [0.77, 0.83, 0.29, 1];
  if (v < 0.45) return [0.52, 0.77, 0.25, 1];
  if (v < 0.6)  return [0.25, 0.64, 0.30, 1];
  return [0.08, 0.41, 0.23, 1];
}`;

const TRUE_COLOR_EVALSCRIPT = `//VERSION=3
function setup() { return { input: ["B04", "B03", "B02", "dataMask"], output: { bands: 4 } }; }
function evaluatePixel(s) { return [3.2 * s.B04, 3.2 * s.B03, 3.2 * s.B02, s.dataMask]; }`;

const fetchParcelImage = async (parcel, type = 'ndvi', { force = false } = {}) => {
  const provider = getProvider();
  if (!provider) return null;

  const key = `${parcel._id}:${type}`;
  const cached = imageCache.get(key);
  if (!force && cached && Date.now() - cached.at < REFRESH_MS) return cached.data;

  const b = getBounds(parcel);
  const midLat = (b.north + b.south) / 2;
  const wMeters = (b.east - b.west) * Math.cos(midLat * Math.PI / 180);
  const hMeters = (b.north - b.south);
  const ratio = wMeters / hMeters;
  const width = ratio >= 1 ? 512 : Math.max(64, Math.round(512 * ratio));
  const height = ratio >= 1 ? Math.max(64, Math.round(512 / ratio)) : 512;

  const token = await getToken(provider);
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  const res = await fetch(`${provider.api}/process`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'image/png' },
    body: JSON.stringify({
      input: {
        bounds: {
          bbox: [b.west, b.south, b.east, b.north],
          geometry: getGeometry(parcel),
          properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' }
        },
        data: [{
          type: 'sentinel-2-l2a',
          dataFilter: {
            timeRange: { from: from.toISOString(), to: to.toISOString() },
            maxCloudCoverage: 40,
            mosaickingOrder: 'leastCC'
          }
        }]
      },
      output: { width, height, responses: [{ identifier: 'default', format: { type: 'image/png' } }] },
      evalscript: type === 'truecolor' ? TRUE_COLOR_EVALSCRIPT : NDVI_IMAGE_EVALSCRIPT
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!res.ok) throw new Error(`Process API ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const data = {
    dataUrl: `data:image/png;base64,${buffer.toString('base64')}`,
    // Format Leaflet : [[sud, ouest], [nord, est]]
    bounds: [[b.south, b.west], [b.north, b.east]],
    fetchedAt: new Date().toISOString()
  };
  imageCache.set(key, { at: Date.now(), data });
  return data;
};

const clearImageCache = (parcelId) => {
  for (const k of imageCache.keys()) if (k.startsWith(`${parcelId}:`)) imageCache.delete(k);
};

module.exports = {
  REFRESH_DAYS,
  NDVI_CLASSES,
  classify,
  isConfigured,
  getParcelNdvi,
  fetchParcelImage,
  clearImageCache
};
