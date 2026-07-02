import React, { useEffect, useState, useRef } from 'react';
import { Satellite, RefreshCw, Info, Plus, X, Save, Loader, MapPin, Navigation, Search } from 'lucide-react';
import { parcelsAPI, cropsAPI, BACKEND_URL } from '../api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';



// Modal création parcelle après dessin
const NewParcelModal = ({ drawnCoords, center, crops, onClose, onSave }) => {
  const [form, setForm] = useState({ name: '', cropId: '', color: '#2d7a3a', notes: '' });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!form.name || !form.cropId) { toast.error('Nom et culture requis'); return; }
    setLoading(true);
    try {
      const selectedCrop = crops.find(c => c._id === form.cropId);
      const geometry = { type: 'Polygon', coordinates: [drawnCoords] };
      const res = await parcelsAPI.create({
        name: form.name,
        cropId: form.cropId,
        cropType: selectedCrop?.name || 'manioc',
        geometry,
        color: form.color,
        notes: form.notes
      });
      if (res.success) { toast.success('Parcelle créée !'); onSave(); onClose(); }
      else toast.error(res.message);
    } catch { toast.error('Erreur création'); }
    setLoading(false);
  };

  const COLORS = ['#2d7a3a', '#dc2626', '#2563eb', '#7c3aed', '#d97706', '#0891b2', '#be185d'];

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 99999 }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--f-surface)', border: '1px solid var(--f-border)', boxShadow: 'var(--f-shadow-lg)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--f-text)' }}>Nouvelle parcelle</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--f-text3)' }}>{drawnCoords.length - 1} points tracés</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--f-text3)' }}><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Nom de la parcelle *</label>
            <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Parcelle Nord" />
          </div>
          <div>
            <label className="label">Culture *</label>
            <select className="input" value={form.cropId} onChange={e => setForm(p => ({ ...p, cropId: e.target.value }))}>
              <option value="">Sélectionner une culture</option>
              {crops.map(c => <option key={c._id} value={c._id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Couleur</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(color => (
                <button key={color} onClick={() => setForm(p => ({ ...p, color }))}
                  className="w-7 h-7 rounded-lg transition-all"
                  style={{ background: color, border: form.color === color ? '3px solid var(--f-text)' : '2px solid transparent', transform: form.color === color ? 'scale(1.15)' : 'scale(1)' }} />
              ))}
            </div>
          </div>
          <div>
            <label className="label">Notes (optionnel)</label>
            <input className="input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observations..." />
          </div>
          {center && (
            <div className="px-3 py-2 rounded-xl text-xs" style={{ background: 'var(--f-primary-light)', color: 'var(--f-primary)' }}>
              📍 Centre: {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-5">
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

// Panel coordonnées
const CoordsPanel = ({ onNavigate }) => {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const handleGo = () => {
    const la = parseFloat(lat);
    const lo = parseFloat(lng);
    if (isNaN(la) || isNaN(lo)) { toast.error('Coordonnées invalides'); return; }
    if (la < -90 || la > 90) { toast.error('Latitude doit être entre -90 et 90'); return; }
    if (lo < -180 || lo > 180) { toast.error('Longitude doit être entre -180 et 180'); return; }
    onNavigate(la, lo);
    toast.success(`Navigation vers ${la.toFixed(4)}, ${lo.toFixed(4)}`);
  };

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--f-surface)', border: '1px solid var(--f-border)', boxShadow: 'var(--f-shadow)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Navigation size={14} style={{ color: 'var(--f-primary)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--f-text)' }}>Aller aux coordonnées</h3>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--f-text3)' }}>
        Entrez les coordonnées GPS de votre parcelle pour zoomer dessus, puis tracez avec l'outil ✏️
      </p>
      <div className="space-y-2 mb-3">
        <div>
          <label className="label">Latitude</label>
          <input className="input" value={lat} onChange={e => setLat(e.target.value)}
            placeholder="Ex: 14.1515" type="number" step="any" min="-90" max="90" />
        </div>
        <div>
          <label className="label">Longitude</label>
          <input className="input" value={lng} onChange={e => setLng(e.target.value)}
            placeholder="Ex: -16.0726" type="number" step="any" min="-180" max="180" />
        </div>
      </div>
      <button onClick={handleGo} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
        <MapPin size={14} />Zoomer sur cette position
      </button>
      <div className="mt-3 px-3 py-2 rounded-xl text-xs" style={{ background: 'var(--f-primary-light)', color: 'var(--f-primary)' }}>
        💡 Après zoom, utilisez l'outil ✏️ (polygone) sur la carte pour dessiner votre parcelle
      </div>
    </div>
  );
};

export default function MapPage() {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const drawnItemsRef = useRef(null);
  const markerRef = useRef(null);
  const [parcels, setParcels] = useState([]);
  const [crops, setCrops] = useState([]);
  const [selected, setSelected] = useState(null);
  const [satellite, setSatellite] = useState(null);
  const [satLoading, setSatLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drawnCoords, setDrawnCoords] = useState(null);
  const [drawnCenter, setDrawnCenter] = useState(null);
  const [showNewParcelModal, setShowNewParcelModal] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const fetchParcels = async () => {
    const res = await parcelsAPI.getAll();
    if (res?.success) setParcels(res.data || []);
  };

  useEffect(() => {
    Promise.all([parcelsAPI.getAll(), cropsAPI.getAll()]).then(([p, c]) => {
      if (p?.success) setParcels(p.data || []);
      if (c?.success) setCrops(c.data || []);
      setLoading(false);
    });
  }, []);

  // Initialiser Leaflet
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

        const linkDraw = document.createElement('link');
        linkDraw.rel = 'stylesheet';
        linkDraw.href = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css';
        document.head.appendChild(linkDraw);

        await new Promise(resolve => {
          const scriptDraw = document.createElement('script');
          scriptDraw.src = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js';
          scriptDraw.onload = resolve;
          document.head.appendChild(scriptDraw);
        });
      }

      const L = window.L;
      const map = L.map(mapRef.current, { maxZoom: 21 }).setView([14.4974, -14.4524], 7);

      // Google Satellite - zoom max 21 (niveau sol comme Google Earth)
      const googleSat = L.tileLayer(
        'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        { attribution: '© Google', maxZoom: 21, subdomains: ['0','1','2','3'] }
      ).addTo(map);

      const googleHybrid = L.tileLayer(
        'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        { attribution: '© Google', maxZoom: 21, subdomains: ['0','1','2','3'] }
      );

      const osmLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { attribution: '© CARTO', maxZoom: 20 }
      );

      L.control.layers({
        '🛰️ Google Satellite': googleSat,
        '🌍 Google Hybrid': googleHybrid,
        '🗺️ Plan': osmLayer
      }).addTo(map);

      // Couche dessins
      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      drawnItemsRef.current = drawnItems;

      // Contrôle de dessin
      const drawControl = new L.Control.Draw({
        draw: {
          polygon: {
            allowIntersection: false,
            showArea: true,
            shapeOptions: { color: '#2d7a3a', weight: 3, fillOpacity: 0.2 }
          },
          polyline: false, circle: false, rectangle: false, marker: false, circlemarker: false
        },
        edit: { featureGroup: drawnItems }
      });
      map.addControl(drawControl);

      // Événement dessin terminé
      map.on(L.Draw.Event.CREATED, (e) => {
        const layer = e.layer;
        drawnItems.addLayer(layer);
        const latlngs = layer.getLatLngs()[0];
        const coords = latlngs.map(p => [p.lng, p.lat]);
        coords.push(coords[0]);

        // Calculer le centre
        const centerLat = latlngs.reduce((s, p) => s + p.lat, 0) / latlngs.length;
        const centerLng = latlngs.reduce((s, p) => s + p.lng, 0) / latlngs.length;

        setDrawnCoords(coords);
        setDrawnCenter({ lat: centerLat, lng: centerLng });
        setShowNewParcelModal(true);
      });

      // Afficher parcelles existantes
      parcels.forEach(parcel => {
        if (parcel.geometry?.coordinates) {
          const latlngs = parcel.geometry.coordinates[0].map(c => [c[1], c[0]]);
          L.polygon(latlngs, {
            color: parcel.color || '#2d7a3a',
            weight: 2,
            fillOpacity: 0.25
          }).addTo(map).bindPopup(`<b style="color:#1a2e1a">${parcel.name}</b><br/><span style="color:#4a6a4a;font-size:12px">${parcel.cropId?.label || parcel.cropType}</span>`);
        }
      });

      leafletMapRef.current = map;
      setMapReady(true);
    };

    loadLeaflet();
  }, [loading]);

  // Mettre à jour polygones quand parcelles changent
  useEffect(() => {
    if (!leafletMapRef.current || !mapReady) return;
    const L = window.L;
    const map = leafletMapRef.current;

    map.eachLayer(layer => {
      if (layer instanceof L.Polygon && layer !== drawnItemsRef.current) {
        map.removeLayer(layer);
      }
    });

    parcels.forEach(parcel => {
      if (parcel.geometry?.coordinates) {
        const latlngs = parcel.geometry.coordinates[0].map(c => [c[1], c[0]]);
        L.polygon(latlngs, {
          color: parcel.color || '#2d7a3a',
          weight: 2,
          fillOpacity: 0.25
        }).addTo(map).bindPopup(`<b style="color:#1a2e1a">${parcel.name}</b><br/><span style="color:#4a6a4a;font-size:12px">${parcel.cropId?.label || parcel.cropType}</span>`);
      }
    });
  }, [parcels, mapReady]);

  // Naviguer aux coordonnées saisies
  const handleNavigateToCoords = (lat, lng) => {
    if (!leafletMapRef.current) { toast.error('Carte non chargée'); return; }
    const L = window.L;
    const map = leafletMapRef.current;

    // Voler vers la position avec zoom 16
    map.flyTo([lat, lng], 16, { animate: true, duration: 1.5 });

    // Supprimer l'ancien marqueur
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    // Ajouter un marqueur pulsant à la position
    const pulsingIcon = L.divIcon({
      className: '',
      html: `<div style="
        width: 16px; height: 16px;
        background: #2d7a3a;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 0 4px rgba(45,122,58,0.3), 0 2px 8px rgba(0,0,0,0.3);
        animation: ping 1.5s infinite;
      "></div>
      <style>
        @keyframes ping {
          0% { box-shadow: 0 0 0 0 rgba(45,122,58,0.5); }
          70% { box-shadow: 0 0 0 12px rgba(45,122,58,0); }
          100% { box-shadow: 0 0 0 0 rgba(45,122,58,0); }
        }
      </style>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    markerRef.current = L.marker([lat, lng], { icon: pulsingIcon })
      .addTo(map)
      .bindPopup(`<b style="color:#1a2e1a">📍 Position saisie</b><br/><span style="color:#4a6a4a;font-size:11px">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>`)
      .openPopup();
  };

  const loadSatellite = async (parcel) => {
    setSatLoading(true);
    setSatellite(null);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/api/satellite/${parcel._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setSatellite(data.data);
      else toast.error('Erreur satellite');
    } catch { toast.error('Erreur satellite'); }
    setSatLoading(false);
  };

  const refreshSatellite = async () => {
    if (!selected) return;
    setSatLoading(true);
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    await fetch(`${BACKEND_URL}/api/satellite/${selected._id}/refresh`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    });
    await loadSatellite(selected);
    toast.success('Rafraîchi');
  };

  const handleSelectParcel = (parcel) => {
    setSelected(parcel);
    loadSatellite(parcel);
    if (leafletMapRef.current && parcel.center) {
      const lat = parcel.center.lat || parcel.center.coordinates?.[1] || 0;
      const lng = parcel.center.lng || parcel.center.coordinates?.[0] || 0;
      if (lat !== 0 || lng !== 0) {
        leafletMapRef.current.flyTo([lat, lng], 15, { animate: true, duration: 1.5 });
      }
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 rounded-full mx-auto mb-3"
          style={{ borderColor: 'var(--f-border)', borderTopColor: 'var(--f-primary)' }} />
        <p className="text-sm" style={{ color: 'var(--f-text3)' }}>Chargement de la carte...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between fade-up">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--f-text)', fontFamily: "'Playfair Display', serif" }}>Carte & Satellite</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--f-text3)' }}>Tracez vos parcelles et consultez les images satellitaires</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
          style={{ background: 'var(--f-primary-light)', color: 'var(--f-primary)', border: '1px solid rgba(45,122,58,0.2)' }}>
          <Plus size={13} />Utilisez ✏️ sur la carte pour tracer
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Carte */}
        <div className="lg:col-span-2 space-y-3">
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--f-border)', boxShadow: 'var(--f-shadow)' }}>
            <div ref={mapRef} style={{ height: '480px', width: '100%' }} />
          </div>
          {/* Panel coordonnées */}
          <CoordsPanel onNavigate={handleNavigateToCoords} />
        </div>

        {/* Panneau droit */}
        <div className="space-y-4">
          {/* Liste parcelles */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--f-surface)', border: '1px solid var(--f-border)', boxShadow: 'var(--f-shadow)' }}>
            <h2 className="text-xs font-semibold mb-3" style={{ color: 'var(--f-text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Mes parcelles ({parcels.length})
            </h2>
            {parcels.length === 0 ? (
              <div className="text-center py-6" style={{ color: 'var(--f-text3)' }}>
                <MapPin size={22} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Tracez votre première parcelle</p>
              </div>
            ) : parcels.map(parcel => (
              <button key={parcel._id} onClick={() => handleSelectParcel(parcel)}
                className="w-full text-left p-3 rounded-xl mb-2 transition-all card-hover"
                style={selected?._id === parcel._id
                  ? { background: 'var(--f-primary-light)', border: '1px solid rgba(45,122,58,0.25)' }
                  : { background: 'var(--f-surface2)', border: '1px solid var(--f-border)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: parcel.color || '#2d7a3a' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--f-text)' }}>{parcel.name}</p>
                    <p className="text-xs" style={{ color: 'var(--f-text3)' }}>{parcel.cropId?.label || parcel.cropType}</p>
                    {parcel.center?.lat && parcel.center.lat !== 0 && (
                      <p className="text-xs mono mt-0.5" style={{ color: 'var(--f-text3)' }}>
                        {parcel.center.lat.toFixed(4)}, {parcel.center.lng.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Satellite */}
          {selected && (
            <div className="rounded-2xl p-4" style={{ background: 'var(--f-surface)', border: '1px solid var(--f-border)', boxShadow: 'var(--f-shadow)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Satellite size={14} style={{ color: 'var(--f-primary)' }} />
                  <h2 className="text-xs font-semibold" style={{ color: 'var(--f-text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Satellite</h2>
                </div>
                <button onClick={refreshSatellite} disabled={satLoading}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all btn-secondary">
                  <RefreshCw size={11} className={satLoading ? 'animate-spin' : ''} />Rafraîchir
                </button>
              </div>

              {satLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 rounded-full"
                    style={{ borderColor: 'var(--f-border)', borderTopColor: 'var(--f-primary)' }} />
                </div>
              ) : satellite ? (
                <div className="space-y-3">
                  <div className="rounded-xl p-3 text-xs space-y-1.5" style={{ background: 'var(--f-surface2)', border: '1px solid var(--f-border)' }}>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--f-text3)' }}>Mise à jour</span>
                      <span className="font-medium" style={{ color: 'var(--f-text)' }}>{format(new Date(satellite.fetchedAt), 'dd/MM HH:mm', { locale: fr })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--f-text3)' }}>Source</span>
                      <span className="font-medium" style={{ color: 'var(--f-text)' }}>{satellite.source === 'sentinel-hub' ? '🛰️ Sentinel-2' : '🗺️ Mapbox'}</span>
                    </div>
                  </div>
                  {satellite.images?.trueColor && (
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--f-border)' }}>
                      <img src={satellite.images.trueColor} alt="Satellite" className="w-full" style={{ maxHeight: 160, objectFit: 'cover' }} />
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {showNewParcelModal && drawnCoords && (
        <NewParcelModal
          drawnCoords={drawnCoords}
          center={drawnCenter}
          crops={crops}
          onClose={() => { setShowNewParcelModal(false); setDrawnCoords(null); setDrawnCenter(null); }}
          onSave={fetchParcels}
        />
      )}
    </div>
  );
}
