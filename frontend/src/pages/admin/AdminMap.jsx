import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, RefreshCw, Eye, Users, Layers } from 'lucide-react';
import { BACKEND_URL } from '../../api';
import { useAdminFilter } from '../../hooks/useAdminFilter';
import UserFilterBar from '../../components/UI/UserFilterBar';

const token = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const adminFetch = (path) =>
  fetch(`${BACKEND_URL}/api${path}`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json());

const S = {
  card: { background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 16, padding: 16, boxShadow: 'var(--a-shadow)' },
  row: { background: 'var(--a-surface2)', border: '1px solid var(--a-border)', borderRadius: 12, padding: 12, marginBottom: 6, cursor: 'pointer', transition: 'all 0.15s' },
  text: { color: 'var(--a-text)' },
  text2: { color: 'var(--a-text2)' },
  text3: { color: 'var(--a-text3)' },
};

export default function AdminMap() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const layersRef = useRef({});
  const { users, selectedUserId, setSelectedUserId } = useAdminFilter();
  const [allParcels, setAllParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState(null);

  const fetchParcels = async () => {
    const res = await adminFetch('/parcels');
    if (res.success) setAllParcels(res.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchParcels(); }, []);

  // Parcelles filtrées selon utilisateur sélectionné
  const parcels = selectedUserId === 'all' ? allParcels
    : allParcels.filter(p => (p.userId?._id || p.userId) === selectedUserId);

  // Init Leaflet
  useEffect(() => {
    if (loading || !mapRef.current || leafletMapRef.current) return;

    const loadLeaflet = async () => {
      if (!window.L) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
        await new Promise(resolve => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      const L = window.L;
      const map = L.map(mapRef.current, { maxZoom: 21 }).setView([14.4974, -14.4524], 7);

      const googleSat = L.tileLayer(
        'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        { attribution: '© Google', maxZoom: 21, subdomains: ['0','1','2','3'] }
      ).addTo(map);

      const googleHybrid = L.tileLayer(
        'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        { attribution: '© Google', maxZoom: 21, subdomains: ['0','1','2','3'] }
      );

      const osm = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { attribution: '© CARTO', maxZoom: 20 }
      );

      L.control.layers({ '🛰️ Google Satellite': googleSat, '🌍 Google Hybrid': googleHybrid, '🗺️ Plan': osm }).addTo(map);

      leafletMapRef.current = map;
      setMapReady(true);
    };

    loadLeaflet();
  }, [loading]);

  // Mettre à jour les polygones quand parcelles ou filtre changent
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    const L = window.L;
    const map = leafletMapRef.current;

    // Supprimer les anciens polygones
    Object.values(layersRef.current).forEach(layer => {
      try { map.removeLayer(layer); } catch {}
    });
    layersRef.current = {};

    // Ajouter les nouvelles parcelles
    parcels.forEach(parcel => {
      if (!parcel.geometry?.coordinates) return;

      const owner = users.find(u => u._id === (parcel.userId?._id || parcel.userId));
      const latlngs = parcel.geometry.coordinates[0].map(c => [c[1], c[0]]);

      const polygon = L.polygon(latlngs, {
        color: parcel.color || '#2563eb',
        weight: 2.5,
        fillOpacity: 0.2,
        fillColor: parcel.color || '#2563eb'
      }).addTo(map);

      // Popup au clic
      polygon.bindPopup(`
        <div style="font-family:'DM Sans',sans-serif;min-width:180px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <div style="width:10px;height:10px;border-radius:50%;background:${parcel.color || '#2563eb'};flex-shrink:0"></div>
            <strong style="color:#1a2535;font-size:13px">${parcel.name}</strong>
          </div>
          <p style="color:#4a6080;font-size:12px;margin:2px 0">🌱 ${parcel.cropId?.label || parcel.cropType}</p>
          <p style="color:#4a6080;font-size:12px;margin:2px 0">👤 ${owner?.name || 'Inconnu'}</p>
          <p style="color:#4a6080;font-size:12px;margin:2px 0">📡 ${parcel.sensors?.length || 0} capteur(s)</p>
          <button onclick="window.__adminViewParcel('${parcel._id}')"
            style="margin-top:8px;width:100%;padding:6px;border-radius:8px;border:none;
            background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;font-size:12px;
            font-weight:600;cursor:pointer;font-family:inherit">
            👁️ Voir les données
          </button>
        </div>
      `);

      polygon.on('click', () => {
        setSelectedParcel(parcel);
      });

      layersRef.current[parcel._id] = polygon;
    });

    // Fonction globale pour le bouton dans le popup
    window.__adminViewParcel = (parcelId) => {
      const parcel = parcels.find(p => p._id === parcelId);
      if (parcel) {
        const userId = parcel.userId?._id || parcel.userId;
        navigate(`/admin/users/${userId}`);
      }
    };

    // Zoomer sur les parcelles si filtre actif
    if (selectedUserId !== 'all' && parcels.length > 0) {
      const validParcels = parcels.filter(p => p.geometry?.coordinates);
      if (validParcels.length > 0) {
        const bounds = L.latLngBounds(
          validParcels.flatMap(p => p.geometry.coordinates[0].map(c => [c[1], c[0]]))
        );
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      }
    }

  }, [parcels, mapReady, users]);

  // Clic sur parcelle dans la liste → flyTo
  const handleSelectParcel = (parcel) => {
    setSelectedParcel(parcel);
    if (!leafletMapRef.current || !parcel.center) return;
    const lat = parcel.center.lat || parcel.center.coordinates?.[1] || 0;
    const lng = parcel.center.lng || parcel.center.coordinates?.[0] || 0;
    if (lat !== 0 || lng !== 0) {
      leafletMapRef.current.flyTo([lat, lng], 15, { animate: true, duration: 1.5 });
      // Ouvrir le popup
      const layer = layersRef.current[parcel._id];
      if (layer) layer.openPopup();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={S.text}>
            <Map size={18} style={{ color: 'var(--a-primary)' }} />
            Carte des parcelles
          </h1>
          <p className="text-xs mt-0.5" style={S.text3}>
            {parcels.length} parcelle(s) {selectedUserId !== 'all' ? 'de cet utilisateur' : 'au total'}
          </p>
        </div>
        <button onClick={fetchParcels}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
          style={{ background: 'var(--a-surface2)', border: '1px solid var(--a-border)', color: 'var(--a-text3)' }}>
          <RefreshCw size={12} />Actualiser
        </button>
      </div>

      <UserFilterBar users={users} selectedUserId={selectedUserId} onChange={setSelectedUserId} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Carte */}
        <div className="lg:col-span-3">
          <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--a-border)', boxShadow: 'var(--a-shadow)' }}>
            {loading ? (
              <div className="flex items-center justify-center" style={{ height: 500, background: 'var(--a-surface2)' }}>
                <div className="animate-spin w-8 h-8 border-2 rounded-full"
                  style={{ borderColor: 'var(--a-border)', borderTopColor: 'var(--a-primary)' }} />
              </div>
            ) : (
              <div ref={mapRef} style={{ height: 500, width: '100%' }} />
            )}
          </div>
          <p className="text-xs mt-2 text-center" style={S.text3}>
            Cliquez sur une parcelle pour voir ses détails — le bouton "Voir les données" redirige vers le profil utilisateur
          </p>
        </div>

        {/* Liste parcelles */}
        <div>
          <div style={S.card}>
            <div className="flex items-center gap-2 mb-3">
              <Layers size={13} style={{ color: 'var(--a-primary)' }} />
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={S.text3}>
                Parcelles ({parcels.length})
              </h2>
            </div>

            {parcels.length === 0 ? (
              <p className="text-xs text-center py-6" style={S.text3}>Aucune parcelle</p>
            ) : (
              <div style={{ maxHeight: 430, overflowY: 'auto' }}>
                {parcels.map(parcel => {
                  const owner = users.find(u => u._id === (parcel.userId?._id || parcel.userId));
                  const isSelected = selectedParcel?._id === parcel._id;
                  return (
                    <div key={parcel._id}
                      onClick={() => handleSelectParcel(parcel)}
                      style={{
                        ...S.row,
                        background: isSelected ? 'var(--a-primary-light)' : 'var(--a-surface2)',
                        border: `1px solid ${isSelected ? 'rgba(37,99,235,0.3)' : 'var(--a-border)'}`,
                      }}>
                      <div className="flex items-start gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                          style={{ background: parcel.color || '#2563eb' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={S.text}>{parcel.name}</p>
                          <p className="text-xs truncate" style={S.text3}>{parcel.cropId?.label || parcel.cropType}</p>
                          {owner && (
                            <p className="text-xs truncate" style={{ color: 'var(--a-primary)' }}>
                              👤 {owner.name}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/admin/users/${parcel.userId?._id || parcel.userId}`); }}
                          className="flex-shrink-0 p-1 rounded-lg transition-colors"
                          style={{ color: 'var(--a-text3)' }}
                          title="Voir données utilisateur">
                          <Eye size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stats rapides */}
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--a-border)' }}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span style={S.text3}>Total parcelles</span>
                <span className="font-semibold" style={S.text}>{allParcels.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={S.text3}>Utilisateurs</span>
                <span className="font-semibold" style={S.text}>{users.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
