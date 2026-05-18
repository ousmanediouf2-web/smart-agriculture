import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { parcelsAPI, cropsAPI } from '../api';
import { Plus, Trash2, Satellite, Map as MapIcon, Loader } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const CROP_COLORS = { tomate: '#ef4444', aubergine: '#8b5cf6', manioc: '#3b82f6' };

// Composant pour centrer la carte sur une position
function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 17);
  }, [position]);
  return null;
}

// Composant dessin polygone point par point
function DrawPolygon({ isDrawing, setIsDrawing, onDone }) {
  const map = useMap();
  const points = useRef([]);
  const markers = useRef([]);
  const polylineRef = useRef(null);
  const previewRef = useRef(null);

  useEffect(() => {
    if (!isDrawing) return;
    points.current = [];
    markers.current = [];

    const container = map.getContainer();
    container.style.cursor = 'crosshair';

    const onMouseMove = (e) => {
      if (points.current.length === 0) return;
      const last = points.current[points.current.length - 1];
      if (previewRef.current) map.removeLayer(previewRef.current);
      previewRef.current = L.polyline([
        [last[1], last[0]],
        [e.latlng.lat, e.latlng.lng]
      ], { color: '#22c55e', weight: 1.5, dashArray: '4,4', opacity: 0.7 }).addTo(map);
    };

    const onClick = (e) => {
      const { lat, lng } = e.latlng;
      points.current.push([lng, lat]);

      const marker = L.circleMarker([lat, lng], {
        radius: 5, color: '#22c55e', fillColor: '#22c55e', fillOpacity: 1, weight: 2
      }).addTo(map);
      markers.current.push(marker);

      if (polylineRef.current) map.removeLayer(polylineRef.current);
      if (points.current.length > 1) {
        const latlngs = points.current.map(([lng, lat]) => [lat, lng]);
        polylineRef.current = L.polyline(latlngs, { color: '#22c55e', weight: 2 }).addTo(map);
      }
    };

    const onDblClick = (e) => {
      e.originalEvent.preventDefault();
      if (points.current.length < 3) { toast.error('Minimum 3 points requis'); return; }
      const coords = [...points.current, points.current[0]];
      cleanup();
      onDone(coords);
    };

    const cleanup = () => {
      map.off('click', onClick);
      map.off('dblclick', onDblClick);
      map.off('mousemove', onMouseMove);
      container.style.cursor = '';
      markers.current.forEach(m => map.removeLayer(m));
      if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }
      if (previewRef.current) { map.removeLayer(previewRef.current); previewRef.current = null; }
      points.current = [];
      markers.current = [];
      setIsDrawing(false);
    };

    map.on('click', onClick);
    map.on('dblclick', onDblClick);
    map.on('mousemove', onMouseMove);

    return cleanup;
  }, [isDrawing]);

  return null;
}

// Modal confirmation parcelle
function CreateParcelModal({ coordinates, crops, onSave, onCancel }) {
  const [name, setName] = useState('');
  const [cropId, setCropId] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!name) { toast.error('Nom requis'); return; }
    if (!cropId) { toast.error('Culture requise'); return; }
    const selectedCrop = crops.find(c => c._id === cropId);
    onSave({
      name,
      cropId,
      cropType: selectedCrop?.name,
      color: CROP_COLORS[selectedCrop?.name] || '#22c55e',
      geometry: { type: 'Polygon', coordinates: [coordinates] },
      notes
    });
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold text-white mb-2">✅ Confirmer la parcelle</h2>
        <p className="text-xs text-gray-500 mb-4">📍 {coordinates.length - 1} points tracés sur la carte</p>
        <div className="space-y-4">
          <div>
            <label className="label">Nom de la parcelle *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Parcelle Nord" autoFocus />
          </div>
          <div>
            <label className="label">Culture *</label>
            <select className="input" value={cropId} onChange={e => setCropId(e.target.value)}>
              <option value="">Sélectionner une culture</option>
              {crops.map(crop => (
                <option key={crop._id} value={crop._id}>{crop.label} — {crop.waterNeed}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Notes (optionnel)</label>
            <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observations..." />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="btn-secondary flex-1">Annuler</button>
          <button onClick={handleSave} className="btn-primary flex-1">Créer la parcelle</button>
        </div>
      </div>
    </div>
  );
}

export default function MapPage() {
  const [parcels, setParcels] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnCoords, setDrawnCoords] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState([14.6928, -17.4467]);
  const [mapType, setMapType] = useState('satellite');
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    fetchData();
    // Géolocalisation automatique
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserPosition([latitude, longitude]);
          setMapCenter([latitude, longitude]);
          setGpsLoading(false);
          setMapReady(true);
          toast.success(`📍 Position GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        },
        (err) => {
          console.warn('GPS non disponible:', err.message);
          setGpsLoading(false);
          setMapReady(true);
          toast('📍 GPS non disponible, carte centrée sur Dakar', { duration: 3000 });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setGpsLoading(false);
      setMapReady(true);
    }
  }, []);

  const fetchData = async () => {
    try {
      const [p, c] = await Promise.all([parcelsAPI.getAll(), cropsAPI.getAll()]);
      setParcels(p.data || []);
      setCrops(c.data || []);
    } catch { toast.error('Erreur chargement carte'); }
    finally { setLoading(false); }
  };

  const handleSaveParcel = async (data) => {
    try {
      const res = await parcelsAPI.create(data);
      if (res.success) {
        toast.success('✅ Parcelle créée !');
        setDrawnCoords(null);
        fetchData();
      } else {
        toast.error(res.message || 'Erreur création');
      }
    } catch (err) {
      toast.error('Erreur: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette parcelle ?')) return;
    try {
      const res = await parcelsAPI.delete(id);
      if (res.success) { toast.success('Parcelle supprimée'); fetchData(); }
      else toast.error(res.message);
    } catch { toast.error('Erreur suppression'); }
  };

  const geoToLeaflet = (coords) => coords[0].map(([lng, lat]) => [lat, lng]);

  const userIcon = L.divIcon({
    html: `<div style="width:14px;height:14px;background:#22c55e;border:3px solid white;border-radius:50%;box-shadow:0 0 10px #22c55e"></div>`,
    className: '', iconSize: [14, 14], iconAnchor: [7, 7]
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Carte Satellite</h1>
          <p className="text-gray-500 text-sm mt-0.5">Tracez vos parcelles directement sur le terrain</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button onClick={() => setMapType('satellite')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mapType === 'satellite' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              <Satellite size={13} />Satellite
            </button>
            <button onClick={() => setMapType('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mapType === 'map' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              <MapIcon size={13} />Carte
            </button>
          </div>
          <button onClick={() => { setIsDrawing(true); toast('Cliquez pour tracer. Double-cliquez pour terminer.', { duration: 5000 }); }}
            disabled={isDrawing}
            className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            {isDrawing ? 'Tracé en cours...' : 'Nouvelle parcelle'}
          </button>
        </div>
      </div>

      {/* Statut GPS */}
      <div className="flex flex-wrap gap-2 items-center">
        {gpsLoading ? (
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5">
            <Loader size={12} className="animate-spin text-green-400" />
            <span className="text-xs text-gray-400">Récupération GPS en cours...</span>
          </div>
        ) : userPosition ? (
          <div className="flex items-center gap-2 bg-gray-900 border border-green-800/40 rounded-lg px-3 py-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-400">
              📍 GPS: {userPosition[0].toFixed(5)}, {userPosition[1].toFixed(5)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-gray-900 border border-yellow-800/40 rounded-lg px-3 py-1.5">
            <span className="text-xs text-yellow-400">⚠️ GPS non disponible</span>
          </div>
        )}

        {Object.entries(CROP_COLORS).map(([crop, color]) => (
          <div key={crop} className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-400 capitalize">{crop}</span>
          </div>
        ))}

        {isDrawing && (
          <div className="bg-yellow-900/30 border border-yellow-700/40 rounded-lg px-3 py-1.5">
            <span className="text-xs text-yellow-400 animate-pulse">✏️ Cliquez pour tracer — Double-cliquez pour terminer</span>
          </div>
        )}
      </div>

      {/* Carte */}
      <div className="rounded-xl overflow-hidden border border-gray-700" style={{ height: '560px' }}>
        {!mapReady ? (
          <div className="flex items-center justify-center h-full bg-gray-900">
            <div className="text-center">
              <Loader size={32} className="animate-spin text-green-500 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Récupération de votre position GPS...</p>
            </div>
          </div>
        ) : (
          <MapContainer center={mapCenter} zoom={17} style={{ height: '100%', width: '100%' }}>
            {/* Recentrer si GPS disponible */}
            {userPosition && <RecenterMap position={userPosition} />}

            {/* Satellite Google */}
            {mapType === 'satellite' && <>
              <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" attribution="© Google" maxZoom={21} />
              <TileLayer url="https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}" attribution="" maxZoom={21} opacity={0.5} />
            </>}

            {/* Carte normale */}
            {mapType === 'map' && (
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" maxZoom={19} />
            )}

            {/* Outil dessin */}
            <DrawPolygon isDrawing={isDrawing} setIsDrawing={setIsDrawing}
              onDone={(coords) => { setDrawnCoords(coords); setIsDrawing(false); }} />

            {/* Parcelles */}
            {parcels.map(parcel => {
              if (!parcel.geometry?.coordinates) return null;
              const color = parcel.color || CROP_COLORS[parcel.cropType] || '#22c55e';
              const positions = geoToLeaflet(parcel.geometry.coordinates);
              return (
                <Polygon key={parcel._id} positions={positions}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.3, weight: 2.5 }}>
                  <Popup>
                    <div className="min-w-[180px]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        <strong>{parcel.name}</strong>
                      </div>
                      <p className="text-sm text-gray-600 capitalize mb-2">🌱 {parcel.cropId?.label || parcel.cropType}</p>
                      <button onClick={() => handleDelete(parcel._id)} className="text-xs text-red-500 hover:text-red-700 font-medium">
                        🗑 Supprimer
                      </button>
                    </div>
                  </Popup>
                </Polygon>
              );
            })}

            {/* Marqueur GPS */}
            {userPosition && (
              <Marker position={userPosition} icon={userIcon}>
                <Popup>
                  <strong>📍 Ma position</strong><br />
                  <span className="text-xs">{userPosition[0].toFixed(6)}, {userPosition[1].toFixed(6)}</span>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        )}
      </div>

      {/* Modal confirmation */}
      {drawnCoords && (
        <CreateParcelModal coordinates={drawnCoords} crops={crops}
          onSave={handleSaveParcel} onCancel={() => setDrawnCoords(null)} />
      )}

      {/* Liste parcelles */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Mes parcelles ({parcels.length})</h2>
        {parcels.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6">Aucune parcelle — tracez-en une sur la carte ci-dessus</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {parcels.map(parcel => {
              const color = parcel.color || CROP_COLORS[parcel.cropType] || '#22c55e';
              return (
                <div key={parcel._id} className="bg-gray-800 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: color + '25', border: `1.5px solid ${color}50` }}>🌱</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{parcel.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{parcel.cropId?.label || parcel.cropType}</p>
                  </div>
                  <button onClick={() => handleDelete(parcel._id)} className="text-gray-600 hover:text-red-400 flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
