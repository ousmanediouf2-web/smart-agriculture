// Échelle NDVI — mêmes seuils que le backend (services/ndviService.js)
export const NDVI_CLASSES = [
  { max: 0.1,  key: 'bare',     color: '#a8662e', label: 'Sol nu ou eau',          range: '< 0,10' },
  { max: 0.2,  key: 'very_low', color: '#e0a526', label: 'Végétation très faible', range: '0,10 – 0,20' },
  { max: 0.3,  key: 'low',      color: '#c5d34a', label: 'Végétation faible',      range: '0,20 – 0,30' },
  { max: 0.45, key: 'moderate', color: '#84c441', label: 'Végétation modérée',     range: '0,30 – 0,45' },
  { max: 0.6,  key: 'good',     color: '#40a34d', label: 'Bonne vigueur',          range: '0,45 – 0,60' },
  { max: 9,    key: 'dense',    color: '#14683a', label: 'Végétation dense',       range: '> 0,60' },
];

export const getNdviClass = (v) =>
  v == null || Number.isNaN(Number(v))
    ? null
    : NDVI_CLASSES.find(c => Number(v) < c.max) || NDVI_CLASSES[NDVI_CLASSES.length - 1];

export const ndviColor = (v) => getNdviClass(v)?.color || '#9aa59b';
export const ndviLabel = (v) => getNdviClass(v)?.label || 'Non disponible';
export const formatNdvi = (v) => (v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(2));

export const ndviSourceLabel = (source) =>
  source === 'sentinel-2' ? 'Sentinel-2 (ESA)' : source === 'simulated' ? 'Données simulées' : '—';
