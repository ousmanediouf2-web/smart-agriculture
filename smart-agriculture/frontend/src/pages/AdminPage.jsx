import React, { useEffect, useState } from 'react';
import { Users, Cpu, Layers, AlertTriangle, Trash2, Shield, RefreshCw, CheckCircle } from 'lucide-react';
import { BACKEND_URL } from '../api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const adminFetch = async (method, path, body = null) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : null
  });
  return res.json();
};

export default function AdminPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rediriger si pas admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Accès refusé');
      navigate('/dashboard');
    }
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sensorsRes, parcelsRes, alertsRes, statsRes] = await Promise.all([
        adminFetch('GET', '/sensors'),
        adminFetch('GET', '/parcels'),
        adminFetch('GET', '/alerts?limit=50'),
        adminFetch('GET', '/measures/stats?hours=24')
      ]);
      setSensors(sensorsRes.data || []);
      setParcels(parcelsRes.data || []);
      setAlerts(alertsRes.data || []);
      setStats(statsRes.data || null);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleDeleteSensor = async (id) => {
    if (!confirm('Supprimer ce capteur ?')) return;
    await adminFetch('DELETE', `/sensors/${id}`);
    toast.success('Capteur supprimé');
    fetchAll();
  };

  const handleDeleteParcel = async (id) => {
    if (!confirm('Supprimer cette parcelle ?')) return;
    await adminFetch('DELETE', `/parcels/${id}`);
    toast.success('Parcelle supprimée');
    fetchAll();
  };

  const handleAcknowledgeAll = async () => {
    await adminFetch('PUT', '/alerts/acknowledge-all');
    toast.success('Toutes les alertes acquittées');
    fetchAll();
  };

  const handlePump = async (sensorId, state) => {
    await adminFetch('PUT', `/sensors/${sensorId}/pump`, { state, mode: 'manual' });
    toast.success(`Pompe ${state ? 'activée' : 'arrêtée'}`);
    fetchAll();
  };

  const TABS = [
    { key: 'stats', label: 'Vue globale', icon: Shield },
    { key: 'sensors', label: `Capteurs (${sensors.length})`, icon: Cpu },
    { key: 'parcels', label: `Parcelles (${parcels.length})`, icon: Layers },
    { key: 'alerts', label: `Alertes (${alerts.filter(a => !a.acknowledged).length})`, icon: AlertTriangle },
  ];

  const PRIORITY_COLOR = { critical: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-blue-400' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield size={22} className="text-green-400" />
            <h1 className="text-2xl font-bold text-white">Panel Administrateur</h1>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">Gestion complète du système Smart Agriculture</p>
        </div>
        <button onClick={fetchAll} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} />Actualiser
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* VUE GLOBALE */}
          {tab === 'stats' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Capteurs actifs', value: sensors.filter(s => s.isActive).length, total: sensors.length, color: 'text-green-400' },
                  { label: 'Parcelles', value: parcels.length, total: null, color: 'text-blue-400' },
                  { label: 'Alertes non lues', value: alerts.filter(a => !a.acknowledged).length, total: alerts.length, color: 'text-red-400' },
                  { label: 'Mesures (24h)', value: stats?.totalMeasures || 0, total: null, color: 'text-purple-400' }
                ].map(({ label, value, total, color }) => (
                  <div key={label} className="card">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className={`text-3xl font-bold ${color}`}>{value}</p>
                    {total !== null && <p className="text-xs text-gray-600 mt-1">sur {total} total</p>}
                  </div>
                ))}
              </div>

              {stats && (
                <div className="card">
                  <h2 className="text-sm font-semibold text-gray-300 mb-4">Moyennes des 24 dernières heures</h2>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Humidité Sol</p>
                      <p className="text-2xl font-bold text-blue-400">{stats.avgSoilHumidity?.toFixed(1)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Température</p>
                      <p className="text-2xl font-bold text-orange-400">{stats.avgTemperature?.toFixed(1)}°C</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Activations pompe</p>
                      <p className="text-2xl font-bold text-purple-400">{stats.pumpActivations}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Capteurs hors ligne */}
              <div className="card">
                <h2 className="text-sm font-semibold text-gray-300 mb-3">État des capteurs</h2>
                <div className="space-y-2">
                  {sensors.map(sensor => {
                    const isOnline = sensor.lastSeen && (Date.now() - new Date(sensor.lastSeen).getTime()) < 5 * 60 * 1000;
                    return (
                      <div key={sensor._id} className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                        <div>
                          <p className="text-sm font-medium text-white">{sensor.name}</p>
                          <p className="text-xs text-gray-500">{sensor.deviceId}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {sensor.lastMeasure && (
                            <span className="text-xs text-gray-400">
                              Sol: {sensor.lastMeasure.soilHumidity?.toFixed(0)}% | {sensor.lastMeasure.temperature?.toFixed(0)}°C
                            </span>
                          )}
                          <span className={`badge text-xs ${isOnline ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                            {isOnline ? '● En ligne' : '● Hors ligne'}
                          </span>
                          <div className="flex gap-1">
                            <button onClick={() => handlePump(sensor._id, true)} className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded">ON</button>
                            <button onClick={() => handlePump(sensor._id, false)} className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded">OFF</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {sensors.length === 0 && <p className="text-gray-600 text-sm text-center py-4">Aucun capteur</p>}
                </div>
              </div>
            </div>
          )}

          {/* CAPTEURS */}
          {tab === 'sensors' && (
            <div className="space-y-3">
              {sensors.length === 0 ? (
                <div className="card text-center py-12 text-gray-500">Aucun capteur enregistré</div>
              ) : sensors.map(sensor => {
                const isOnline = sensor.lastSeen && (Date.now() - new Date(sensor.lastSeen).getTime()) < 5 * 60 * 1000;
                return (
                  <div key={sensor._id} className="card flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{sensor.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{sensor.deviceId}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Parcelle: {sensor.parcelId?.name || 'Non assigné'} |
                        Mode: {sensor.pumpMode} |
                        Pompe: {sensor.pumpState ? '💧 ON' : '⭕ OFF'}
                      </p>
                      {sensor.lastSeen && (
                        <p className="text-xs text-gray-600">
                          Dernière donnée: {format(new Date(sensor.lastSeen), 'dd/MM HH:mm', { locale: fr })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`badge ${isOnline ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                        {isOnline ? '● En ligne' : '● Hors ligne'}
                      </span>
                      <div className="flex gap-1">
                        <button onClick={() => handlePump(sensor._id, true)} className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded">ON</button>
                        <button onClick={() => handlePump(sensor._id, false)} className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded">OFF</button>
                      </div>
                      <button onClick={() => handleDeleteSensor(sensor._id)} className="text-red-400 hover:text-red-300">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PARCELLES */}
          {tab === 'parcels' && (
            <div className="space-y-3">
              {parcels.length === 0 ? (
                <div className="card text-center py-12 text-gray-500">Aucune parcelle</div>
              ) : parcels.map(parcel => (
                <div key={parcel._id} className="card flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: parcel.color || '#22c55e' }} />
                      <p className="font-semibold text-white">{parcel.name}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Culture: {parcel.cropId?.label || parcel.cropType} |
                      Statut: {parcel.status} |
                      Capteurs: {parcel.sensors?.length || 0}
                    </p>
                    <p className="text-xs text-gray-600">
                      Créée le {format(new Date(parcel.createdAt), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteParcel(parcel._id)} className="text-red-400 hover:text-red-300">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ALERTES */}
          {tab === 'alerts' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-gray-400 text-sm">{alerts.filter(a => !a.acknowledged).length} alerte(s) non lue(s)</p>
                <button onClick={handleAcknowledgeAll} className="btn-secondary flex items-center gap-2 text-sm">
                  <CheckCircle size={14} />Tout acquitter
                </button>
              </div>
              {alerts.length === 0 ? (
                <div className="card text-center py-12 text-gray-500">Aucune alerte</div>
              ) : alerts.map(alert => (
                <div key={alert._id} className={`card border ${alert.acknowledged ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold ${PRIORITY_COLOR[alert.priority]}`}>{alert.priority?.toUpperCase()}</span>
                        <span className="text-xs text-gray-500">{alert.type?.replace(/_/g, ' ')}</span>
                        {alert.smsSent && <span className="badge bg-green-900/20 text-green-500 text-xs">SMS ✓</span>}
                      </div>
                      <p className="text-sm text-gray-200">{alert.message}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {format(new Date(alert.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        {alert.parcelId && ` | ${alert.parcelId.name}`}
                      </p>
                    </div>
                    {alert.acknowledged && <CheckCircle size={16} className="text-green-500 flex-shrink-0" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
