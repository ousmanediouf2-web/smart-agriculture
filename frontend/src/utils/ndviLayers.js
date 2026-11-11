import { ndviColor, formatNdvi } from './ndvi';
import { esc } from './leafletLoader';

/**
 * Dessine les parcelles sur une carte Leaflet.
 *  - mode 'ndvi'    : remplissage coloré selon le NDVI + pastille de valeur
 *  - mode 'culture' : couleur choisie pour la parcelle
 * `store` conserve les couches pour pouvoir les remplacer à chaque rendu.
 */
export function renderParcelLayers({ L, map, store, parcels, ndviMap, mode, selectedId, popupHtml, onSelect }) {
  Object.values(store.layers || {}).forEach(l => { try { map.removeLayer(l); } catch {} });
  Object.values(store.labels || {}).forEach(l => { try { map.removeLayer(l); } catch {} });
  store.layers = {};
  store.labels = {};

  const bounds = [];

  parcels.forEach(parcel => {
    const ring = parcel.geometry?.coordinates?.[0];
    if (!ring || ring.length < 3) return;

    const latlngs = ring.map(c => [c[1], c[0]]);
    latlngs.forEach(p => bounds.push(p));

    const n = ndviMap?.[parcel._id];
    const hasNdvi = mode === 'ndvi' && n && n.ndvi != null;
    const isSelected = selectedId === parcel._id;
    const base = parcel.color || '#1f7a4d';

    const polygon = L.polygon(latlngs, {
      color: isSelected ? '#ffffff' : (hasNdvi ? 'rgba(255,255,255,0.9)' : base),
      weight: isSelected ? 3.5 : 2,
      fillColor: hasNdvi ? ndviColor(n.ndvi) : base,
      fillOpacity: hasNdvi ? 0.62 : 0.28,
      dashArray: hasNdvi && n.source === 'simulated' ? '6 4' : null
    }).addTo(map);

    if (popupHtml) polygon.bindPopup(popupHtml(parcel, n), { maxWidth: 260, minWidth: 220 });
    polygon.on('click', () => onSelect && onSelect(parcel));
    store.layers[parcel._id] = polygon;

    if (hasNdvi) {
      const c = polygon.getBounds().getCenter();
      store.labels[parcel._id] = L.marker(c, {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: 'ndvi-label',
          html: `<span>${esc(formatNdvi(n.ndvi))}</span>`,
          iconSize: [0, 0]
        })
      }).addTo(map);
    }
  });

  return bounds;
}
