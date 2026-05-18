import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { parcelsAPI, cropsAPI } from '../api';
import { Plus, Trash2, Edit, Info } from 'lucide-react';

// Fix Leaflet icônes par défaut
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const CROP_COLORS = {
  tomate: '#ef4444',
  aubergine: '#8b5cf6',
  manioc: '#3b82f6'
};

// Composant pour activer le dessin de polygone
function DrawControl({ onPolygonDrawn, isDrawing }) {
  const map = useMap();
  const drawnLayerRef = useRef(null);

  useEffect(() => {
    if (!isDrawing) return;

    // Charger leaflet-draw dynamiquement
    import('leaflet-draw').then(() => {
      const drawHandler = new L.Draw.Polygon(map, {
        shapeOptions: {
          color: '#22c55e',
          fillColor: '#22c55e',
          fillOpacity: 0.3,
          weight: 2
        }
      });
      drawHandler.enable();

      const handleCreated = (e) => {
        if (drawnLayerRef.current) map.removeLayer(drawnLayerRef.current);
        drawnLayerRef.current = e.layer;
        map.addLayer(e.layer);
        const latLngs = e.layer.getLatLngs()[0];
        const coords = latLngs.map(ll => [ll.lng, ll.lat]);
        // Fermer le polygone
        if (coords[0] !== coords[coords.length - 1]) coords.push(coords[0]);
        onPolygonDrawn(coords);
        drawHandler.disable();
      };

      map.once(L.Draw.Event.CREATED, handleCreated);
      return () => {
        map.off(L.Draw.Event.CREATED, handleCreated);
        drawHandler.disable();
      };
    });
  }, [isDrawing, map]);

  return null;
}

// Modal création parcelle
function CreateParcelModal({ coordinates, crops, onSave, onCancel }) {
  const [name, setName] = useState('');
  const [cropId, setCropId] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!name || !cropId) return toast.error('Nom et culture requis');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold text-white mb-4">Créer une Parcelle</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Nom de la parcelle *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Parcelle Nord" />
          </div>
          <div>
            <label className="label">Culture *</label>
            <select className="input" value={cropId} onChange={e => setCropId(e.target.value)}>
              <option value="">Sélectionner une culture</option>
              {crops.map(crop => (
                <option key={crop._id} value={crop._id}>{crop.label} ({crop.waterNeed})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Notes (optionnel)</label>
            <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observations..." />
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-xs text-gray-400">
            <p>📍 Polygone: {coordinates.length - 1} points définis</p>
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
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnCoords, setDrawnCoords] = useState(null);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState([14.6928, -17.4467]); // Dakar par défaut

  useEffect(() => {
    fetchData();
    // Géolocalisation en temps réel
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserPosition([latitude, longitude]);
          setMapCenter([latitude, longitude]);
        },
        (err) => console.warn('GPS:', err.message),
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const fetchData = async () => {
    try {
      const [parcelsRes, cropsRes] = await Promise.all([
        parcelsAPI.getAll(),
        cropsAPI.getAll()
      ]);
      setParcels(parcelsRes.data.data || []);
      setCrops(cropsRes.data.data || []);
    } catch {
      toast.error('Erreur chargement carte');
    } finally {
      setLoading(false);
    }
  };

  const handlePolygonDrawn = (coords) => {
    setDrawnCoords(coords);
    setIsDrawing(false);
  };

  const handleSaveParcel = async (data) => {
    try {
      await parcelsAPI.create(data);
      toast.success('Parcelle créée!');
      setDrawnCoords(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur création');
    }
  };

  const handleDeleteParcel = async (parcelId) => {
    if (!confirm('Supprimer cette parcelle?')) return;
    try {
      await parcelsAPI.delete(parcelId);
      toast.success('Parcelle supprimée');
      setSelectedParcel(null);
      fetchData();
    } catch {
      toast.error('Erreur suppression');
    }
  };

  // Convertir coords GeoJSON [lng, lat] → Leaflet [lat, lng]
  const geoToLeaflet = (coords) => coords[0].map(([lng, lat]) => [lat, lng]);

  const userIcon = L.divIcon({
    html: `<div class="w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-lg animate-pulse"></div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Carte Interactive</h1>
          <p className="text-gray-500 text-sm mt-0.5">Dessinez et gérez vos parcelles agricoles</p>
        </div>
        <button
          onClick={() => { setIsDrawing(true); toast('Cliquez sur la carte pour dessiner votre parcelle. Double-cliquez pour terminer.', { duration: 4000 }); }}
          disabled={isDrawing}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          {isDrawing ? 'Dessin en cours...' : 'Nouvelle parcelle'}
        </button>
      </div>

      {/* Légende cultures */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(CROP_COLORS).map(([crop, color]) => (
          <div key={crop} className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-400 capitalize">{crop}</span>
          </div>
        ))}
        {userPosition && (
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">Ma position ({userPosition[0].toFixed(4)}, {userPosition[1].toFixed(4)})</span>
          </div>
        )}
      </div>

      {/* Carte Leaflet */}
      <div className="rounded-xl overflow-hidden border border-gray-800" style={{ height: '520px' }}>
        {!loading && (
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} key={mapCenter.join(',')}>
            <TileLayer
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Outil de dessin */}
            <DrawControl onPolygonDrawn={handlePolygonDrawn} isDrawing={isDrawing} />

            {/* Parcelles */}
            {parcels.map(parcel => {
              if (!parcel.geometry?.coordinates) return null;
              const color = parcel.color || CROP_COLORS[parcel.cropType] || '#22c55e';
              const positions = geoToLeaflet(parcel.geometry.coordinates);
              return (
                <Polygon
                  key={parcel._id}
                  positions={positions}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.25, weight: 2 }}
                  eventHandlers={{ click: () => setSelectedParcel(parcel) }}
                >
                  <Popup>
                    <div className="min-w-[180px]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        <strong className="text-gray-900">{parcel.name}</strong>
                      </div>
                      <p className="text-sm text-gray-600 capitalize mb-1">
                        🌱 {parcel.cropId?.label || parcel.cropType}
                      </p>
                      {parcel.sensors?.length > 0 && (
                        <p className="text-xs text-gray-500">📡 {parcel.sensors.length} capteur(s)</p>
                      )}
                      {parcel.notes && <p className="text-xs text-gray-500 mt-1">{parcel.notes}</p>}
                      <button
                        onClick={() => handleDeleteParcel(parcel._id)}
                        className="mt-2 text-xs text-red-500 hover:text-red-700"
                      >
                        Supprimer
                      </button>
                    </div>
                  </Popup>
                </Polygon>
              );
            })}

            {/* Position GPS de l'utilisateur */}
            {userPosition && (
              <Marker position={userPosition} icon={userIcon}>
                <Popup>
                  <div>
                    <strong>Ma position</strong>
                    <p className="text-xs text-gray-500">
                      {userPosition[0].toFixed(6)}, {userPosition[1].toFixed(6)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        )}
      </div>

      {/* Modal création parcelle */}
      {drawnCoords && (
        <CreateParcelModal
          coordinates={drawnCoords}
          crops={crops}
          onSave={handleSaveParcel}
          onCancel={() => setDrawnCoords(null)}
        />
      )}

      {/* Liste des parcelles */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Parcelles ({parcels.length})</h2>
        {parcels.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-4">Aucune parcelle. Cliquez sur "Nouvelle parcelle" pour commencer.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {parcels.map(parcel => (
              <div key={parcel._id} className="bg-gray-800 rounded-lg p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: (parcel.color || '#22c55e') + '33', border: `1px solid ${parcel.color || '#22c55e'}44` }}>
                  <span className="text-lg">🌱</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{parcel.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{parcel.cropId?.label || parcel.cropType}</p>
                </div>
                <button onClick={() => handleDeleteParcel(parcel._id)} className="text-gray-600 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
