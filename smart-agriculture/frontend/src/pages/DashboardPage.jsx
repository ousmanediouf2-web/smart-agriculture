import React, { useEffect, useState } from 'react';
import { Droplets, Thermometer, Wind, Activity, Zap, AlertTriangle, TrendingUp, Cpu } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { measuresAPI, sensorsAPI, alertsAPI } from '../api';
import useSocket from '../hooks/useSocket';

const StatCard = ({ icon: Icon, label, value, unit, color, trend }) => (
  <div className="stat-card">
    <div className="flex items-center justify-between">
      <span className="text-gray-500 text-xs font-medium">{label}</span>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={16} className="text-white" />
      </div>
    </div>
    <div className="flex items-end gap-1 mt-2">
      <span className="text-2xl font-bold text-white">{value ?? '—'}</span>
      <span className="text-gray-400 text-sm mb-0.5">{unit}</span>
    </div>
    {trend && <p className="text-xs text-gray-600 mt-1">{trend}</p>}
  </div>
);

const CROP_COLORS = { tomate: '#ef4444', aubergine: '#8b5cf6', manioc: '#3b82f6' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value?.toFixed(1)}{p.name === 'Température' ? '°C' : '%'}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [series, setSeries] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { lastMeasure, isConnected, pumpState } = useSocket();

  const fetchData = async () => {
    try {
      const [statsRes, sensorsRes, alertsRes] = await Promise.all([
        measuresAPI.getStats({ hours: 24 }),
        sensorsAPI.getAll(),
        alertsAPI.getAll({ limit: 5, acknowledged: false })
      ]);
      setStats(statsRes.data.data);
      setSensors(sensorsRes.data.data || []);
      setAlerts(alertsRes.data.data || []);
    } catch (err) {
      toast.error('Erreur chargement dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchSeries = async () => {
    try {
      const res = await measuresAPI.getAll({ limit: 60 });
      const data = (res.data.data || []).reverse().map(m => ({
        time: format(new Date(m.recordedAt), 'HH:mm', { locale: fr }),
        'Humidité Sol': m.soilHumidity,
        'Température': m.temperature,
        'Humidité Air': m.airHumidity,
        pump: m.pumpActivated
      }));
      setSeries(data);
    } catch {}
  };

  useEffect(() => {
    fetchData();
    fetchSeries();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Mise à jour temps réel
  useEffect(() => {
    if (!lastMeasure) return;
    setSeries(prev => {
      const newPoint = {
        time: format(new Date(lastMeasure.recordedAt || Date.now()), 'HH:mm'),
        'Humidité Sol': lastMeasure.soilHumidity,
        'Température': lastMeasure.temperature,
        'Humidité Air': lastMeasure.airHumidity,
        pump: lastMeasure.pumpActivated
      };
      const updated = [...prev, newPoint].slice(-60);
      return updated;
    });
  }, [lastMeasure]);

  const handlePump = async (sensorId, state) => {
    try {
      await sensorsAPI.setPump(sensorId, state, 'manual');
      toast.success(`Pompe ${state ? 'activée' : 'arrêtée'}`);
      setSensors(prev => prev.map(s => s._id === sensorId ? { ...s, pumpState: state } : s));
    } catch {
      toast.error('Erreur contrôle pompe');
    }
  };

  const PRIORITY_COLOR = { critical: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-blue-400' };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Vue d'ensemble en temps réel</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
          isConnected ? 'bg-green-900/20 border-green-700/40 text-green-400' : 'bg-red-900/20 border-red-700/40 text-red-400'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          {isConnected ? 'Temps réel actif' : 'Déconnecté'}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Droplets} label="Humidité Sol moy." value={stats?.avgSoilHumidity?.toFixed(1)} unit="%" color="bg-blue-600" trend="24 dernières heures" />
        <StatCard icon={Thermometer} label="Température moy." value={stats?.avgTemperature?.toFixed(1)} unit="°C" color="bg-orange-600" trend="24 dernières heures" />
        <StatCard icon={Wind} label="Humidité Air moy." value={stats?.avgAirHumidity?.toFixed(1)} unit="%" color="bg-teal-600" trend="24 dernières heures" />
        <StatCard icon={Activity} label="Activations pompe" value={stats?.pumpActivations} unit="fois" color="bg-purple-600" trend={`Sur ${stats?.totalMeasures} mesures`} />
      </div>

      {/* Graphique + Capteurs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Graphique principal */}
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Évolution des capteurs (temps réel)</h2>
          {series.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-600 text-sm">Aucune donnée disponible</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                <Line type="monotone" dataKey="Humidité Sol" stroke="#3b82f6" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="Température" stroke="#f97316" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="Humidité Air" stroke="#14b8a6" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Alertes récentes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300">Alertes récentes</h2>
            {alerts.length > 0 && (
              <span className="badge bg-red-900/30 text-red-400 border border-red-800/40">{alerts.length}</span>
            )}
          </div>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-sm">
              <AlertTriangle size={24} className="mx-auto mb-2 opacity-30" />
              Aucune alerte active
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map(alert => (
                <div key={alert._id} className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className={`mt-0.5 flex-shrink-0 ${PRIORITY_COLOR[alert.priority]}`} />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-300 leading-snug">{alert.message}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {format(new Date(alert.createdAt), 'dd/MM HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Capteurs */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Capteurs & Contrôle Pompes</h2>
        {sensors.length === 0 ? (
          <div className="text-center py-8 text-gray-600 text-sm">
            <Cpu size={24} className="mx-auto mb-2 opacity-30" />
            Aucun capteur configuré
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sensors.map(sensor => {
              const currentPump = pumpState[sensor._id] ?? sensor.pumpState;
              const isOnline = sensor.lastSeen && (Date.now() - new Date(sensor.lastSeen).getTime()) < 5 * 60 * 1000;
              const crop = sensor.parcelId?.cropType || 'manioc';
              return (
                <div key={sensor._id} className="bg-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{sensor.name}</p>
                      <p className="text-xs text-gray-500">{sensor.deviceId}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`badge ${isOnline ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                        {isOnline ? '● En ligne' : '● Hors ligne'}
                      </span>
                      {sensor.parcelId && (
                        <span className="text-xs text-gray-600">{sensor.parcelId.name}</span>
                      )}
                    </div>
                  </div>

                  {sensor.lastMeasure && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Sol</p>
                        <p className="text-sm font-bold text-blue-400">{sensor.lastMeasure.soilHumidity?.toFixed(0)}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Temp</p>
                        <p className="text-sm font-bold text-orange-400">{sensor.lastMeasure.temperature?.toFixed(0)}°C</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Air</p>
                        <p className="text-sm font-bold text-teal-400">{sensor.lastMeasure.airHumidity?.toFixed(0)}%</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${currentPump ? 'bg-blue-400 animate-pulse' : 'bg-gray-600'}`} />
                      <span className="text-xs text-gray-400">Pompe {currentPump ? 'active' : 'arrêtée'}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handlePump(sensor._id, true)}
                        disabled={currentPump}
                        className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded transition-colors"
                      >
                        ON
                      </button>
                      <button
                        onClick={() => handlePump(sensor._id, false)}
                        disabled={!currentPump}
                        className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded transition-colors"
                      >
                        OFF
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
