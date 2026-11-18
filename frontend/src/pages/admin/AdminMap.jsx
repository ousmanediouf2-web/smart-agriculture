import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Eye, Loader, Info } from 'lucide-react';
import { BACKEND_URL } from '../../api';
import { useAdminFilter } from '../../hooks/useAdminFilter';
import UserFilterBar from '../../components/UI/UserFilterBar';
import NdviBadge from '../../components/ndvi/NdviBadge';
import NdviLegend from '../../components/ndvi/NdviLegend';
import { loadLeaflet, BASE_LAYERS, esc } from '../../utils/leafletLoader';
import { renderParcelLayers } from '../../utils/ndviLayers';
import { ndviColor, formatNdvi, getNdviClass, ndviSourceLabel } from '../../utils/ndvi';

const token = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const adminFetch = (path) =>
  fetch(`${BACKEND_URL}/api${path}`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json());

export default function AdminMap() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const storeRef = useRef({ layers: {}, labels: {} });
  const { users, selectedUserId, setSelectedUserId } = useAdminFilter();
  const [allParcels, setAllParcels] = useState([]);
  const [ndviMap, setNdviMap] = useState({});
  const [ndviLoading, setNdviLoading] = useState(false);
  const [mode, setMode] = useState('ndvi');
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const loadNdvi = useCallback(async () => {
    setNdviLoading(true);
    try {
      const res = await adminFetch('/satellite/ndvi/summary');
      if (res.success) {
        const m = {};
        (res.data || []).forEach(d => { m[d.parcelId] = d; });
        setNdviMap(m);
      }
    } catch { /* NDVI facultatif pour l'affichage de la carte */ }
    setNdviLoading(false);
  }, []);

  const fetchParcels = useCallback(async () => {
    const res = await adminFetch('/parcels');
    if (res.success) setAllParcels(res.data || []);
    setLoading(false);
    loadNdvi();
  }, [loadNdvi]);

  useEffect(() => { fetchParcels(); }, [fetchParcels]);

  const parcels = useMemo(() => selectedUserId === 'all' ? allParcels
    : allParcels.filter(p => (p.userId?._id || p.userId) === selectedUserId), [allParcels, selectedUserId]);

  // Initialisation de la carte
  useEffect(() => {
    if (loading || !mapRef.current || leafletMapRef.current) return;
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !mapRef.current) return;
      const map = L.map(mapRef.current, { maxZoom: 21 }).setView([14.4974, -14.4524], 7);
      const bases = BASE_LAYERS(L);
      bases['Satellite'].addTo(map);
      L.control.layers(bases, null, { position: 'topright' }).addTo(map);
      leafletMapRef.current = map;
      setMapReady(true);
    }).catch(() => setMapError(true));
    return () => { cancelled = true; };
  }, [loading]);

  useEffect(() => () => {
    if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; }
    delete window.__adminViewParcel;
  }, []);

  const ownerOf = useCallback((parcel) => users.find(u => u._id === (parcel.userId?._id || parcel.userId)), [users]);

  useEffect(() => {
    window.__adminViewParcel = (parcelId) => {
      const parcel = allParcels.find(p => p._id === parcelId);
      if (parcel) navigate(`/admin/users/${parcel.userId?._id || parcel.userId}`);
    };
  }, [allParcels, navigate]);

  const popupHtml = useCallback((parcel, n) => {
    const owner = ownerOf(parcel);
    const cls = n ? getNdviClass(n.ndvi) : null;
    const ndviBlock = n && n.ndvi != null ? `
      <div style="display:flex;align-items:center;gap:10px;margin:10px 0 4px">
        <span style="width:12px;height:12px;border-radius:4px;background:${ndviColor(n.ndvi)}"></span>
        <span style="font-size:20px;font-weight:800;color:#17212f">${esc(formatNdvi(n.ndvi))}</span>
        <span style="font-size:12px;color:#4a5b72">${esc(cls?.label || '')}</span>
      </div>
      <p style="font-size:11px;color:#7b8aa0;margin:0">${esc(ndviSourceLabel(n.source))}</p>` : '';
    return `
      <div style="padding:14px 16px;font-family:var(--font-ui)">
        <p style="font-size:14px;font-weight:700;color:#17212f;margin:0">${esc(parcel.name)}</p>
        <p style="font-size:12px;color:#4a5b72;margin:2px 0 0">${esc(parcel.cropId?.label || parcel.cropType || '')} · ${esc(owner?.name || 'Propriétaire inconnu')}</p>
        ${ndviBlock}
        <button onclick="window.__adminViewParcel('${esc(parcel._id)}')"
          style="margin-top:12px;width:100%;padding:8px;border-radius:9px;border:none;background:#2b57c4;color:#fff;font:600 12.5px var(--font-ui);cursor:pointer">
          Voir l’utilisateur
        </button>
      </div>`;
  }, [ownerOf]);

  // Dessin des parcelles + cadrage
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    const bounds = renderParcelLayers({
      L: window.L, map: leafletMapRef.current, store: storeRef.current,
      parcels, ndviMap, mode, selectedId, popupHtml, onSelect: (p) => setSelectedId(p._id)
    });
    // Le cadrage ne change qu'avec le filtre ou la liste de parcelles, pas à chaque mise à jour NDVI
  }, [parcels, ndviMap, mode, selectedId, mapReady, popupHtml]);

  useEffect(() => {
    if (!mapReady || !leafletMapRef.current || parcels.length === 0) return;
    const pts = parcels.flatMap(p => (p.geometry?.coordinates?.[0] || []).map(c => [c[1], c[0]]));
    if (pts.length) leafletMapRef.current.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
  }, [mapReady, parcels]);

  const focusParcel = (parcel) => {
    setSelectedId(parcel._id);
    const layer = storeRef.current.layers[parcel._id];
    if (layer && leafletMapRef.current) {
      leafletMapRef.current.flyToBounds(layer.getBounds(), { padding: [70, 70], maxZoom: 18, duration: 1 });
      layer.openPopup();
    }
  };

  const mean = useMemo(() => {
    const vals = parcels.map(p => ndviMap[p._id]?.ndvi).filter(v => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }, [parcels, ndviMap]);

  const anySimulated = parcels.some(p => ndviMap[p._id]?.source === 'simulated');

  return (
    <div className="space-y-5 page-enter">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--a-text)' }}>Carte & NDVI</h1>
          <p style={{ fontSize: 13.5, color: 'var(--a-text3)', marginTop: 2 }}>
            {parcels.length} parcelle{parcels.length > 1 ? 's' : ''} {selectedUserId !== 'all' ? 'de cet utilisateur' : 'au total'}
            {mean != null && <> · NDVI moyen <strong style={{ color: 'var(--a-text)' }}>{formatNdvi(mean)}</strong></>}
          </p>
        </div>
        <button onClick={fetchParcels} className="flex items-center gap-2"
          style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, background: 'var(--a-surface)', border: '1px solid var(--a-border)', color: 'var(--a-text2)' }}>
          <RefreshCw size={14} />Actualiser
        </button>
      </div>

      <UserFilterBar users={users} selectedUserId={selectedUserId} onChange={setSelectedUserId} />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5">
        <div className="acard" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="flex items-center justify-between flex-wrap gap-2" style={{ padding: '12px 16px', borderBottom: '1px solid var(--a-border)' }}>
            <div role="tablist" className="flex" style={{ background: 'var(--a-surface2)', border: '1px solid var(--a-border)', borderRadius: 9, padding: 3 }}>
              {[['ndvi', 'Vigueur (NDVI)'], ['culture', 'Contours']].map(([key, label]) => (
                <button key={key} role="tab" aria-selected={mode === key} onClick={() => setMode(key)}
                  style={{
                    padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                    background: mode === key ? 'var(--a-surface)' : 'transparent',
                    color: mode === key ? 'var(--a-text)' : 'var(--a-text3)',
                    boxShadow: mode === key ? 'var(--a-shadow)' : 'none'
                  }}>{label}</button>
              ))}
            </div>
            <div className="flex items-center gap-2" style={{ fontSize: 12.5, color: 'var(--a-text3)' }}>
              {ndviLoading && (<><Loader size={13} className="animate-spin" />Calcul du NDVI…</>)}
              {!ndviLoading && anySimulated && mode === 'ndvi' && (
                <span className="badge" style={{ background: 'var(--a-warning-light)', color: 'var(--a-warning)' }}>Valeurs simulées (contour en tirets)</span>
              )}
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            {loading ? (
              <div className="flex items-center justify-center" style={{ height: 560, background: 'var(--a-surface2)' }}>
                <div className="animate-spin" style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--a-border)', borderTopColor: 'var(--a-primary)' }} />
              </div>
            ) : mapError ? (
              <div className="flex items-center justify-center text-center" style={{ height: 560, color: 'var(--a-text3)' }}>
                <div><Info size={24} className="mx-auto mb-2" /><p style={{ fontSize: 14 }}>La carte n’a pas pu être chargée. Rechargez la page.</p></div>
              </div>
            ) : (
              <div ref={mapRef} style={{ height: 560, width: '100%' }} />
            )}
            {mode === 'ndvi' && !loading && !mapError && (
              <div style={{ position: 'absolute', left: 12, bottom: 12, zIndex: 500, width: 210, background: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: '10px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--a-text)', marginBottom: 8 }}>Indice NDVI</p>
                <NdviLegend compact />
              </div>
            )}
          </div>
        </div>

        <div className="acard">
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--a-text)' }}>Parcelles</h2>
            <span className="badge" style={{ background: 'var(--a-surface2)', color: 'var(--a-text2)' }}>{parcels.length}</span>
          </div>
          {parcels.length === 0 ? (
            <p className="text-center py-6" style={{ fontSize: 13, color: 'var(--a-text3)' }}>Aucune parcelle</p>
          ) : (
            <ul className="space-y-1.5" style={{ maxHeight: 470, overflowY: 'auto' }}>
              {parcels.map(parcel => {
                const owner = ownerOf(parcel);
                const n = ndviMap[parcel._id];
                const active = selectedId === parcel._id;
                return (
                  <li key={parcel._id}>
                    <div role="button" tabIndex={0} onClick={() => focusParcel(parcel)}
                      onKeyDown={e => { if (e.key === 'Enter') focusParcel(parcel); }}
                      className="flex items-center gap-3" style={{
                        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                        background: active ? 'var(--a-primary-light)' : 'var(--a-surface)',
                        border: `1px solid ${active ? 'rgba(43,87,196,0.35)' : 'var(--a-border)'}`
                      }}>
                      <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: n ? ndviColor(n.ndvi) : 'var(--a-border)' }} />
                      <span className="flex-1 min-w-0">
                        <span className="block truncate" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--a-text)' }}>{parcel.name}</span>
                        <span className="block truncate" style={{ fontSize: 12, color: 'var(--a-text3)' }}>
                          {parcel.cropId?.label || parcel.cropType}{owner ? ` · ${owner.name}` : ''}
                        </span>
                      </span>
                      {n && <NdviBadge value={n.ndvi} size="sm" />}
                      <button onClick={e => { e.stopPropagation(); navigate(`/admin/users/${parcel.userId?._id || parcel.userId}`); }}
                        aria-label="Voir l’utilisateur" title="Voir l’utilisateur" style={{ color: 'var(--a-text3)', padding: 4 }}>
                        <Eye size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
