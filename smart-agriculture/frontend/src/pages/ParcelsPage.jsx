import React, { useEffect, useState } from 'react';
import { Layers, TrendingUp, Droplets, Thermometer } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { parcelsAPI, cropsAPI } from '../api';

const CROP_COLORS = { tomate: '#ef4444', aubergine: '#8b5cf6', manioc: '#3b82f6' };

function ParcelStatsModal({ parcel, onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parcelsAPI.getStats(parcel._id, { hours: 48 })
      .then(res => setStats(res.data.data))
      .catch(() => toast.error('Erreur stats'))
      .finally(() => setLoading(false));
  }, [parcel._id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">{parcel.name}</h2>
            <p className="text-sm text-gray-500 capitalize">{parcel.cropId?.label || parcel.cropType} — 48 dernières heures</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full" /></div>
        ) : !stats ? (
          <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Humidité Sol moy.', value: stats.avgSoilHumidity, unit: '%', color: 'text-blue-400' },
                { label: 'Température moy.', value: stats.avgTemperature, unit: '°C', color: 'text-orange-400' },
                { label: 'Humidité Air moy.', value: stats.avgAirHumidity, unit: '%', color: 'text-teal-400' },
                { label: 'Activations pompe', value: stats.pumpActivations, unit: 'fois', color: 'text-purple-400' }
              ].map(({ label, value, unit, color }) => (
                <div key={label} className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className={`text-xl font-bold ${color}`}>{value ?? '—'}<span className="text-sm font-normal text-gray-500"> {unit}</span></p>
                </div>
              ))}
            </div>

            {stats.series && stats.series.length > 0 && (
              <div>
                <p className="text-sm text-gray-400 mb-2">Évolution humidité sol</p>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={stats.series.map(d => ({
                    time: new Date(d.t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                    soil: d.soil, temp: d.temp
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="soil" stroke="#3b82f6" fill="#3b82f620" name="Sol %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {parcel.cropId && (
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-300 mb-2">Seuils pour {parcel.cropId.label}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <p className="text-gray-500">Humidité min: <span className="text-white">{parcel.cropId.soilHumidity?.min}%</span></p>
                  <p className="text-gray-500">Humidité optimale: <span className="text-white">{parcel.cropId.soilHumidity?.optimal}%</span></p>
                  <p className="text-gray-500">Humidité critique: <span className="text-red-400">{parcel.cropId.soilHumidity?.critical}%</span></p>
                  <p className="text-gray-500">Temp. optimale: <span className="text-white">{parcel.cropId.temperature?.optimal}°C</span></p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ParcelsPage() {
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedParcel, setSelectedParcel] = useState(null);

  useEffect(() => {
    parcelsAPI.getAll()
      .then(res => setParcels(res.data.data || []))
      .catch(() => toast.error('Erreur chargement parcelles'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette parcelle?')) return;
    try {
      await parcelsAPI.delete(id);
      toast.success('Parcelle supprimée');
      setParcels(prev => prev.filter(p => p._id !== id));
    } catch { toast.error('Erreur suppression'); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Parcelles</h1>
        <p className="text-gray-500 text-sm mt-0.5">{parcels.length} parcelle(s) — Gérez depuis la carte</p>
      </div>

      {parcels.length === 0 ? (
        <div className="card text-center py-16">
          <Layers size={40} className="mx-auto mb-3 text-gray-700" />
          <p className="text-gray-500 mb-2">Aucune parcelle</p>
          <p className="text-gray-600 text-sm">Rendez-vous sur la carte pour dessiner vos parcelles</p>
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
                      style={{ backgroundColor: color + '20', border: `1px solid ${color}40` }}>
                      🌱
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{parcel.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-xs text-gray-500 capitalize">
                          {parcel.cropId?.label || parcel.cropType}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`badge text-xs ${parcel.status === 'optimal' ? 'bg-green-900/30 text-green-400' : parcel.status === 'dry' ? 'bg-red-900/30 text-red-400' : 'bg-gray-800 text-gray-400'}`}>
                    {parcel.status}
                  </span>
                </div>

                {parcel.cropId && (
                  <div className="bg-gray-800 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-500 mb-2">Seuils culture</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Sol min: <span className="text-blue-400">{parcel.cropId.soilHumidity?.min}%</span></span>
                      <span className="text-gray-400">Optimal: <span className="text-green-400">{parcel.cropId.soilHumidity?.optimal}%</span></span>
                      <span className="text-gray-400">Critique: <span className="text-red-400">{parcel.cropId.soilHumidity?.critical}%</span></span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <span>📡 {parcel.sensors?.length || 0} capteur(s)</span>
                  {parcel.area > 0 && <span>· {parcel.area.toFixed(0)} m²</span>}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setSelectedParcel(parcel)} className="btn-secondary flex-1 text-xs py-1.5 flex items-center justify-center gap-1">
                    <TrendingUp size={12} />Statistiques
                  </button>
                  <button onClick={() => handleDelete(parcel._id)} className="px-3 py-1.5 text-xs bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg transition-colors">
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedParcel && (
        <ParcelStatsModal parcel={selectedParcel} onClose={() => setSelectedParcel(null)} />
      )}
    </div>
  );
}
