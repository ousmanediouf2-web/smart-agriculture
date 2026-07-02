import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, TrendingUp, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { parcelsAPI } from '../api';
import { getParcelStatusLabel } from '../utils/status';


export default function ParcelsPage() {
  const navigate = useNavigate();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchParcels = async () => {
    setLoading(true);
    try {
      const data = await parcelsAPI.getAll();
      if (data.success) setParcels(data.data || []);
      else toast.error('Erreur: ' + data.message);
    } catch (err) {
      toast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchParcels(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette parcelle ?')) return;
    try {
      const data = await parcelsAPI.delete(id);
      if (data.success) { toast.success('Supprimée'); fetchParcels(); }
      else toast.error(data.message);
    } catch { toast.error('Erreur suppression'); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Parcelles</h1>
        <p className="text-gray-500 text-sm mt-0.5">{parcels.length} parcelle(s)</p>
      </div>

      {parcels.length === 0 ? (
        <div className="card text-center py-16">
          <Layers size={40} className="mx-auto mb-3 text-gray-700" />
          <p className="text-gray-500 mb-2">Aucune parcelle</p>
          <p className="text-gray-600 text-sm">Allez sur la <strong className="text-green-400">Carte</strong> pour dessiner vos parcelles</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {parcels.map(parcel => {
            const color = parcel.color || CROP_COLORS[parcel.cropType] || '#22c55e';
            return (
              <div key={parcel._id} className="card hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: color + '20', border: `1px solid ${color}40` }}>🌱</div>
                    <div>
                      <h3 className="font-semibold text-white">{parcel.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-xs text-gray-500 capitalize">{parcel.cropId?.label || parcel.cropType}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`badge text-xs ${parcel.status === 'optimal' ? 'bg-green-900/30 text-green-400' : parcel.status === 'dry' ? 'bg-red-900/30 text-red-400' : 'bg-gray-800 text-gray-400'}`}>
                    {getParcelStatusLabel(parcel.status)}
                  </span>
                </div>

                {parcel.cropId && (
                  <div className="bg-gray-800 rounded-lg p-3 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Min: <span className="text-blue-400">{parcel.cropId.soilHumidity?.min}%</span></span>
                      <span className="text-gray-400">Optimal: <span className="text-green-400">{parcel.cropId.soilHumidity?.optimal}%</span></span>
                      <span className="text-gray-400">Critique: <span className="text-red-400">{parcel.cropId.soilHumidity?.critical}%</span></span>
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500 mb-3">📡 {parcel.sensorCount ?? 0} capteur(s)</div>

                <div className="flex gap-2">
                  <button onClick={() => navigate(`/parcels/${parcel._id}`)} className="btn-secondary flex-1 text-xs py-1.5 flex items-center justify-center gap-1">
                    <TrendingUp size={12} />Voir détails
                  </button>
                  <button onClick={() => handleDelete(parcel._id)} className="px-3 py-1.5 text-xs bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
