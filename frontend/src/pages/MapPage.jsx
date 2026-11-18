import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, X, Save, Loader, MapPin, Navigation, Layers, ExternalLink, Info, Satellite } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { parcelsAPI, cropsAPI, satelliteAPI } from '../api';
import { loadLeaflet, BASE_LAYERS, esc } from '../utils/leafletLoader';
import { renderParcelLayers } from '../utils/ndviLayers';
import { polygonAreaHa } from '../utils/geo';
import { getNdviClass, ndviColor, formatNdvi, ndviSourceLabel } from '../utils/ndvi';
import NdviBadge from '../components/ndvi/NdviBadge';
import NdviLegend from '../components/ndvi/NdviLegend';
import NdviTrend from '../components/ndvi/NdviTrend';

const COLORS = ['#1f7a4d', '#c0392b', '#2b57c4', '#6d3fc0', '#b7791f', '#0e7490', '#b0245f'];

// ── Fenêtre de création d'une parcelle après tracé ──────────────────────────
const NewParcelModal = ({ drawnCoords, center, crops, onClose, onSave }) => {
  const [form, setForm] = useState({ name: '', cropId: '', color: COLORS[0], notes: '' });
  const [loading, setLoading] = useState(false);
  const areaHa = useMemo(() => polygonAreaHa(drawnCoords), [drawnCoords]);

  const handleSave = async () => {
    if (!form.name || !form.cropId) { toast.error('Le nom et la culture sont obligatoires'); return; }
    setLoading(true);
    try {
      const selectedCrop = crops.find(c => c._id === form.cropId);
      const res = await parcelsAPI.create({
        name: form.name,
        cropId: form.cropId,
        cropType: selectedCrop?.name || 'manioc',
        geometry: { type: 'Polygon', coordinates: [drawnCoords] },
        color: form.color,
        area: Number(areaHa.toFixed(2)),
        notes: form.notes
      });
      if (res.success) { toast.success('Parcelle créée'); onSave(); onClose(); }
      else toast.error(res.message);
    } catch { toast.error('Impossible de créer la parcelle'); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(8,20,14,0.55)', zIndex: 99999 }} role="dialog" aria-modal="true" aria-label="Nouvelle parcelle">
      <div className="w-full max-w-sm card" style={{ padding: 24, boxShadow: 'var(--f-shadow-lg)' }}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--f-text)' }}>Nouvelle parcelle</h2>
            <p className="page-sub">{drawnCoords.length - 1} points · environ {areaHa.toFixed(2)} ha</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ color: 'var(--f-text3)' }}><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="np-name">Nom de la parcelle</label>
            <input id="np-name" className="input" value={form.name} autoFocus
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex. Parcelle Nord" />
          </div>
          <div>
            <label className="label" htmlFor="np-crop">Culture</label>
            <select id="np-crop" className="input" value={form.cropId} onChange={e => setForm(p => ({ ...p, cropId: e.target.value }))}>
              <option value="">Choisir une culture</option>
              {crops.map(c => <option key={c._id} value={c._id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <span className="label">Couleur du contour</span>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(color => (
                <button key={color} onClick={() => setForm(p => ({ ...p, color }))} aria-label={`Couleur ${color}`}
                  style={{
                    width: 28, height: 28, borderRadius: 8, background: color,
                    outline: form.color === color ? '2px solid var(--f-text)' : 'none', outlineOffset: 2
                  }} />
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="np-notes">Notes (facultatif)</label>
            <input id="np-notes" className="input" value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observations" />
          </div>
          {center && (
            <p className="mono" style={{ fontSize: 12, color: 'var(--f-text3)' }}>
              Centre : {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
            </p>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={handleSave} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Recherche par coordonnées ───────────────────────────────────────────────
const CoordsPanel = ({ onNavigate }) => {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const handleGo = (e) => {
    e.preventDefault();
    const la = parseFloat(lat);
    const lo = parseFloat(lng);
    if (isNaN(la) || isNaN(lo)) { toast.error('Coordonnées invalides'); return; }
    if (la < -90 || la > 90) { toast.error('La latitude doit être comprise entre -90 et 90'); return; }
    if (lo < -180 || lo > 180) { toast.error('La longitude doit être comprise entre -180 et 180'); return; }
    onNavigate(la, lo);
  };

  return (
    <form className="card" onSubmit={handleGo}>
      <div className="flex items-center gap-2 mb-1">
        <Navigation size={15} style={{ color: 'var(--f-primary)' }} />
        <h3 className="section-title">Aller à des coordonnées</h3>
      </div>
      <p className="page-sub mb-4">Zoomez sur votre terrain, puis tracez la parcelle avec l’outil polygone de la carte.</p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="label" htmlFor="c-lat">Latitude</label>
          <input id="c-lat" className="input" value={lat} onChange={e => setLat(e.target.value)} placeholder="14.1515" type="number" step="any" />
        </div>
        <div>
          <label className="label" htmlFor="c-lng">Longitude</label>
          <input id="c-lng" className="input" value={lng} onChange={e => setLng(e.target.value)} placeholder="-16.0726" type="number" step="any" />
        </div>
      </div>
      <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
        <MapPin size={14} />Zoomer sur cette position
      </button>
    </form>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────
export default function MapPage() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const drawnItemsRef = useRef(null);
  const markerRef = useRef(null);
  const overlayRef = useRef(null);
  const storeRef = useRef({ layers: {}, labels: {} });
  const fittedRef = useRef(false);

  const [parcels, setParcels] = useState([]);
  const [crops, setCrops] = useState([]);
  const [ndviMap, setNdviMap] = useState({});
  const [ndviConfigured, setNdviConfigured] = useState(false);
  const [ndviLoading, setNdviLoading] = useState(false);
  const [mode, setMode] = useState('ndvi');            // 'ndvi' | 'culture'
  const [selectedId, setSelectedId] = useState(null);
  const [imageType, setImageType] = useState('off');   // 'off' | 'ndvi' | 'truecolor'
  const [imageLoading, setImageLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [drawnCoords, setDrawnCoords] = useState(null);
  const [drawnCenter, setDrawnCenter] = useState(null);

  const selected = parcels.find(p => p._id === selectedId) || null;
  const selectedNdvi = selectedId ? ndviMap[selectedId] : null;

  const loadNdvi = useCallback(async () => {
    setNdviLoading(true);
    try {
      const res = await satelliteAPI.getSummary();
      if (res?.success) {
        setNdviConfigured(!!res.configured);
        const map = {};
        (res.data || []).forEach(d => { map[d.parcelId] = d; });
        setNdviMap(map);
      }
    } catch { toast.error('Le NDVI n’a pas pu être chargé'); }
    setNdviLoading(false);
  }, []);

  const fetchParcels = useCallback(async () => {
    const res = await parcelsAPI.getAll();
    if (res?.success) setParcels(res.data || []);
    loadNdvi();
  }, [loadNdvi]);

  useEffect(() => {
    Promise.all([parcelsAPI.getAll(), cropsAPI.getAll()]).then(([p, c]) => {
      if (p?.success) setParcels(p.data || []);
      if (c?.success) setCrops(c.data || []);
      setLoading(false);
      loadNdvi();
    });
  }, [loadNdvi]);

  // ── Initialisation de la carte ──
  useEffect(() => {
    if (loading || !mapRef.current || leafletMapRef.current) return;
    let cancelled = false;

    loadLeaflet().then((L) => {
      if (cancelled || !mapRef.current) return;
      const map = L.map(mapRef.current, { maxZoom: 21, zoomControl: true }).setView([14.4974, -14.4524], 7);

      const bases = BASE_LAYERS(L);
      bases['Satellite'].addTo(map);
      L.control.layers(bases, null, { position: 'topright' }).addTo(map);

      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      drawnItemsRef.current = drawnItems;

      map.addControl(new L.Control.Draw({
        position: 'topleft',
        draw: {
          polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: '#ffffff', weight: 3, fillColor: '#1f7a4d', fillOpacity: 0.3 } },
          polyline: false, circle: false, rectangle: false, marker: false, circlemarker: false
        },
        edit: { featureGroup: drawnItems }
      }));

      map.on(L.Draw.Event.CREATED, (e) => {
        drawnItems.addLayer(e.layer);
        const latlngs = e.layer.getLatLngs()[0];
        const coords = latlngs.map(p => [p.lng, p.lat]);
        coords.push(coords[0]);
        setDrawnCoords(coords);
        setDrawnCenter({
          lat: latlngs.reduce((s, p) => s + p.lat, 0) / latlngs.length,
          lng: latlngs.reduce((s, p) => s + p.lng, 0) / latlngs.length
        });
      });

      leafletMapRef.current = map;
      setMapReady(true);
    }).catch(() => setMapError(true));

    return () => { cancelled = true; };
  }, [loading]);

  // Nettoyage à la sortie de la page
  useEffect(() => () => {
    if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; }
    delete window.__mapOpenParcel;
  }, []);

  const handleSelect = useCallback((parcel) => {
    setSelectedId(parcel._id);
    setImageType('off');
  }, []);

  // Passerelle pour le bouton des popups Leaflet
  useEffect(() => {
    window.__mapOpenParcel = (id) => navigate(`/parcels/${id}`);
  }, [navigate]);

  const popupHtml = useCallback((parcel, n) => {
    const cls = n ? getNdviClass(n.ndvi) : null;
    const ndviBlock = n && n.ndvi != null ? `
      <div style="display:flex;align-items:center;gap:10px;margin:10px 0 4px">
        <span style="width:12px;height:12px;border-radius:4px;background:${ndviColor(n.ndvi)}"></span>
        <span style="font-size:20px;font-weight:800;color:#14231a;font-variant-numeric:tabular-nums">${esc(formatNdvi(n.ndvi))}</span>
        <span style="font-size:12px;color:#475a4d">${esc(cls?.label || '')}</span>
      </div>
      <p style="font-size:11px;color:#7a897e;margin:0">${esc(ndviSourceLabel(n.source))}</p>`
      : `<p style="font-size:12px;color:#7a897e;margin:8px 0 0">NDVI en cours de calcul…</p>`;
    return `
      <div style="padding:14px 16px;font-family:var(--font-ui)">
        <p style="font-size:14px;font-weight:700;color:#14231a;margin:0">${esc(parcel.name)}</p>
        <p style="font-size:12px;color:#475a4d;margin:2px 0 0">${esc(parcel.cropId?.label || parcel.cropType || '')}${parcel.area ? ` · ${esc(parcel.area)} ha` : ''}</p>
        ${ndviBlock}
        <button onclick="window.__mapOpenParcel('${esc(parcel._id)}')"
          style="margin-top:12px;width:100%;padding:8px;border-radius:9px;border:none;background:#1f7a4d;color:#fff;font:600 12.5px var(--font-ui);cursor:pointer">
          Ouvrir la fiche
        </button>
      </div>`;
  }, []);

  // ── Dessin des parcelles ──
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    const L = window.L;
    const map = leafletMapRef.current;
    const bounds = renderParcelLayers({
      L, map, store: storeRef.current, parcels, ndviMap, mode, selectedId,
      popupHtml, onSelect: handleSelect
    });
    if (!fittedRef.current && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
      fittedRef.current = true;
    }
  }, [parcels, ndviMap, mode, selectedId, mapReady, popupHtml, handleSelect]);

  // ── Image Sentinel-2 découpée sur la parcelle sélectionnée ──
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    const L = window.L;
    const map = leafletMapRef.current;
    if (overlayRef.current) { map.removeLayer(overlayRef.current); overlayRef.current = null; }
    if (imageType === 'off' || !selectedId) return;

    let cancelled = false;
    setImageLoading(true);
    satelliteAPI.getImage(selectedId, imageType).then(res => {
      if (cancelled) return;
      if (res?.available && res.data?.dataUrl) {
        overlayRef.current = L.imageOverlay(res.data.dataUrl, res.data.bounds, { opacity: 0.92, interactive: false }).addTo(map);
        map.flyToBounds(res.data.bounds, { padding: [60, 60], maxZoom: 19, duration: 1 });
      } else {
        toast.error(res?.reason || 'Aucune image Sentinel-2 exploitable pour le moment');
        setImageType('off');
      }
    }).catch(() => { if (!cancelled) { toast.error('Image indisponible'); setImageType('off'); } })
      .finally(() => { if (!cancelled) setImageLoading(false); });

    return () => { cancelled = true; };
  }, [imageType, selectedId, mapReady]);

  const focusParcel = (parcel) => {
    handleSelect(parcel);
    const layer = storeRef.current.layers[parcel._id];
    if (layer && leafletMapRef.current) {
      leafletMapRef.current.flyToBounds(layer.getBounds(), { padding: [70, 70], maxZoom: 18, duration: 1 });
    }
  };

  const closeModal = () => {
    setDrawnCoords(null);
    setDrawnCenter(null);
    drawnItemsRef.current?.clearLayers();
  };

  const handleNavigateToCoords = (lat, lng) => {
    const map = leafletMapRef.current;
    if (!map) { toast.error('La carte n’est pas encore chargée'); return; }
    const L = window.L;
    map.flyTo([lat, lng], 17, { duration: 1.4 });
    if (markerRef.current) map.removeLayer(markerRef.current);
    markerRef.current = L.circleMarker([lat, lng], {
      radius: 8, color: '#ffffff', weight: 3, fillColor: '#1f7a4d', fillOpacity: 1
    }).addTo(map).bindPopup(`<div style="padding:10px 14px;font-size:12px;color:#14231a">Position saisie<br/><span style="color:#7a897e">${lat.toFixed(5)}, ${lng.toFixed(5)}</span></div>`).openPopup();
  };

  const refreshNdvi = async () => {
    if (!selectedId) return;
    setRefreshing(true);
    try {
      const res = await satelliteAPI.refresh(selectedId);
      if (res?.success) {
        setNdviMap(prev => ({ ...prev, [selectedId]: res.data }));
        toast.success('NDVI actualisé');
      } else toast.error(res?.message || 'Actualisation impossible');
    } catch { toast.error('Actualisation impossible'); }
    setRefreshing(false);
  };

  const ndviStats = useMemo(() => {
    const vals = Object.values(ndviMap).map(d => d.ndvi).filter(v => v != null);
    if (!vals.length) return null;
    return { mean: vals.reduce((a, b) => a + b, 0) / vals.length, count: vals.length };
  }, [ndviMap]);

  const anySimulated = Object.values(ndviMap).some(d => d.source === 'simulated');

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin" style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--f-border)', borderTopColor: 'var(--f-primary)' }} />
    </div>
  );

  return (
    <div className="space-y-5 page-enter">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Carte & NDVI</h1>
          <p className="page-sub">Suivez la vigueur de vos cultures parcelle par parcelle et tracez de nouvelles parcelles.</p>
        </div>
        {ndviStats && (
          <div className="flex items-center gap-3 card" style={{ padding: '10px 16px' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: ndviColor(ndviStats.mean) }} />
            <div>
              <p className="eyebrow">NDVI moyen · {ndviStats.count} parcelle{ndviStats.count > 1 ? 's' : ''}</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--f-text)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                {formatNdvi(ndviStats.mean)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
        {/* Colonne carte */}
        <div className="space-y-5 min-w-0">
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="flex items-center justify-between flex-wrap gap-2" style={{ padding: '12px 16px', borderBottom: '1px solid var(--f-border)' }}>
              <div role="tablist" aria-label="Affichage des parcelles" className="flex" style={{ background: 'var(--f-surface2)', border: '1px solid var(--f-border)', borderRadius: 9, padding: 3 }}>
                {[['ndvi', 'Vigueur (NDVI)'], ['culture', 'Contours']].map(([key, label]) => (
                  <button key={key} role="tab" aria-selected={mode === key} onClick={() => setMode(key)}
                    style={{
                      padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                      background: mode === key ? 'var(--f-surface)' : 'transparent',
                      color: mode === key ? 'var(--f-text)' : 'var(--f-text3)',
                      boxShadow: mode === key ? 'var(--f-shadow)' : 'none'
                    }}>{label}</button>
                ))}
              </div>
              <div className="flex items-center gap-2" style={{ fontSize: 12.5, color: 'var(--f-text3)' }}>
                {ndviLoading && (<><Loader size={13} className="animate-spin" />Calcul du NDVI…</>)}
                {!ndviLoading && anySimulated && mode === 'ndvi' && (
                  <span className="badge" style={{ background: 'var(--f-accent-light)', color: 'var(--f-accent)' }}>Valeurs simulées (contour en tirets)</span>
                )}
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              {mapError ? (
                <div className="flex items-center justify-center text-center" style={{ height: 560, color: 'var(--f-text3)', padding: 24 }}>
                  <div>
                    <Info size={24} className="mx-auto mb-2" />
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--f-text2)' }}>La carte n’a pas pu être chargée</p>
                    <p style={{ fontSize: 13, marginTop: 4 }}>Vérifiez la connexion Internet puis rechargez la page.</p>
                  </div>
                </div>
              ) : (
                <div ref={mapRef} style={{ height: 560, width: '100%' }} />
              )}

              {mode === 'ndvi' && !mapError && (
                <div style={{
                  position: 'absolute', left: 12, bottom: 12, zIndex: 500, width: 210,
                  background: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: '10px 12px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)'
                }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--f-text)', marginBottom: 8 }}>Indice NDVI</p>
                  <NdviLegend compact />
                </div>
              )}
              {imageLoading && (
                <div className="flex items-center gap-2" style={{
                  position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 500,
                  background: 'rgba(255,255,255,0.96)', borderRadius: 999, padding: '7px 14px', fontSize: 12.5, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.25)'
                }}>
                  <Loader size={14} className="animate-spin" />Chargement de l’image Sentinel-2…
                </div>
              )}
            </div>
          </div>

          <CoordsPanel onNavigate={handleNavigateToCoords} />
        </div>

        {/* Colonne latérale */}
        <div className="space-y-5 min-w-0">
          {/* Détail de la parcelle sélectionnée */}
          {selected ? (
            <div className="card">
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="min-w-0">
                  <h2 className="truncate" style={{ fontSize: 16, fontWeight: 800, color: 'var(--f-text)' }}>{selected.name}</h2>
                  <p className="page-sub">{selected.cropId?.label || selected.cropType}{selected.area ? ` · ${selected.area} ha` : ''}</p>
                </div>
                <button onClick={() => setSelectedId(null)} aria-label="Fermer le détail" style={{ color: 'var(--f-text3)' }}><X size={16} /></button>
              </div>

              {selectedNdvi ? (
                <>
                  <div className="flex items-end gap-3 mb-1">
                    <span style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--f-text)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatNdvi(selectedNdvi.ndvi)}
                    </span>
                    <span style={{ paddingBottom: 4 }}><NdviBadge value={selectedNdvi.ndvi} size="sm" showLabel /></span>
                  </div>
                  <p className="page-sub mb-3">
                    {ndviSourceLabel(selectedNdvi.source)}
                    {selectedNdvi.observedAt && ` · image du ${format(new Date(selectedNdvi.observedAt), 'd MMM yyyy', { locale: fr })}`}
                  </p>
                  <NdviTrend history={selectedNdvi.history} height={150} />
                  <p className="page-sub mt-1">Prochaine actualisation automatique tous les {selectedNdvi.refreshIntervalDays} jours.</p>

                  {ndviConfigured && (
                    <div className="mt-4">
                      <span className="label">Image Sentinel-2 sur la carte</span>
                      <div className="flex" style={{ background: 'var(--f-surface2)', border: '1px solid var(--f-border)', borderRadius: 9, padding: 3 }}>
                        {[['off', 'Aucune'], ['ndvi', 'NDVI'], ['truecolor', 'Couleur']].map(([key, label]) => (
                          <button key={key} onClick={() => setImageType(key)} aria-pressed={imageType === key}
                            style={{
                              flex: 1, padding: '6px 0', borderRadius: 7, fontSize: 12.5, fontWeight: 600,
                              background: imageType === key ? 'var(--f-surface)' : 'transparent',
                              color: imageType === key ? 'var(--f-text)' : 'var(--f-text3)',
                              boxShadow: imageType === key ? 'var(--f-shadow)' : 'none'
                            }}>{label}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="page-sub">{ndviLoading ? 'Calcul du NDVI en cours…' : 'NDVI indisponible pour cette parcelle.'}</p>
              )}

              <div className="flex gap-2 mt-4">
                <button onClick={refreshNdvi} disabled={refreshing} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                  <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />Actualiser
                </button>
                <button onClick={() => navigate(`/parcels/${selected._id}`)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <ExternalLink size={13} />Fiche parcelle
                </button>
              </div>
            </div>
          ) : (
            <div className="card flex items-start gap-3" style={{ background: 'var(--f-primary-light)', borderColor: 'transparent' }}>
              <Satellite size={18} style={{ color: 'var(--f-primary)', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 13, color: 'var(--f-text2)', lineHeight: 1.55 }}>
                Cliquez sur une parcelle pour voir son NDVI, son évolution et afficher l’image Sentinel-2.
              </p>
            </div>
          )}

          {/* Liste des parcelles */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">Mes parcelles</h2>
              <span className="badge" style={{ background: 'var(--f-surface2)', color: 'var(--f-text2)' }}>{parcels.length}</span>
            </div>
            {parcels.length === 0 ? (
              <div className="text-center py-6" style={{ color: 'var(--f-text3)' }}>
                <Layers size={22} className="mx-auto mb-2" />
                <p style={{ fontSize: 13 }}>Aucune parcelle pour l’instant.</p>
                <p style={{ fontSize: 12.5, marginTop: 2 }}>Utilisez l’outil polygone sur la carte pour tracer la première.</p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {parcels.map(parcel => {
                  const n = ndviMap[parcel._id];
                  const active = selectedId === parcel._id;
                  return (
                    <li key={parcel._id}>
                      <button onClick={() => focusParcel(parcel)} className="w-full text-left flex items-center gap-3"
                        style={{
                          padding: '10px 12px', borderRadius: 10,
                          background: active ? 'var(--f-primary-light)' : 'var(--f-surface)',
                          border: `1px solid ${active ? 'rgba(31,122,77,0.35)' : 'var(--f-border)'}`
                        }}>
                        <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: n ? ndviColor(n.ndvi) : 'var(--f-border)' }} />
                        <span className="flex-1 min-w-0">
                          <span className="block truncate" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--f-text)' }}>{parcel.name}</span>
                          <span className="block truncate" style={{ fontSize: 12, color: 'var(--f-text3)' }}>{parcel.cropId?.label || parcel.cropType}</span>
                        </span>
                        {n ? <NdviBadge value={n.ndvi} size="sm" /> : <span style={{ fontSize: 11.5, color: 'var(--f-text3)' }}>…</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Légende détaillée */}
          <div className="card">
            <h2 className="section-title mb-1">Comment lire le NDVI</h2>
            <p className="page-sub mb-3">Plus l’indice est élevé, plus la végétation est dense et vigoureuse.</p>
            <NdviLegend />
          </div>
        </div>
      </div>

      {drawnCoords && (
        <NewParcelModal drawnCoords={drawnCoords} center={drawnCenter} crops={crops} onClose={closeModal} onSave={fetchParcels} />
      )}
    </div>
  );
}
