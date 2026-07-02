import React, { useEffect, useState } from 'react';
import { Users, Cpu, Layers, AlertTriangle, Activity, Wifi } from 'lucide-react';
import { BACKEND_URL } from '../../api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import UserFilterBar from '../../components/UI/UserFilterBar';
import { useAdminFilter } from '../../hooks/useAdminFilter';

const adminFetch = (path) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return fetch(`${BACKEND_URL}/api${path}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
};

const S = {
  card: { background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 16, padding: 20, boxShadow: 'var(--a-shadow)' },
  card2: { background: 'var(--a-surface2)', border: '1px solid var(--a-border)', borderRadius: 12, padding: 12 },
  text: { color: 'var(--a-text)' },
  text2: { color: 'var(--a-text2)' },
  text3: { color: 'var(--a-text3)' },
};

const StatCard = ({ icon: Icon, label, value, sub, color, delay = "" }) => (
  <div className={`card-pop lift ${delay}`} style={{ ...S.card, borderLeft: `4px solid ${color}` }}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold mb-1 uppercase tracking-wide" style={S.text3}>{label}</p>
        <p className="text-3xl font-bold" style={S.text}>{value ?? '—'}</p>
        {sub && <p className="text-xs mt-1" style={S.text3}>{sub}</p>}
      </div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: color + '18', border: `1px solid ${color}30` }}>
        <Icon size={18} style={{ color }} />
      </div>
    </div>
  </div>
);

export default function AdminDashboard() {
  const { users, selectedUserId, setSelectedUserId } = useAdminFilter();
  const [allData, setAllData] = useState({ sensors: [], parcels: [], alerts: [], stats: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminFetch('/sensors'),
      adminFetch('/parcels'),
      adminFetch('/alerts?limit=20'),
      adminFetch('/measures/stats?hours=24')
    ]).then(([s, p, a, st]) => {
      setAllData({
        sensors: s.data || [],
        parcels: p.data || [],
        alerts: a.data || [],
        stats: st.data
      });
      setLoading(false);
    });
  }, []);

  const filtered = {
    sensors: selectedUserId === 'all' ? allData.sensors
      : allData.sensors.filter(s => {
          const parcel = allData.parcels.find(p => p._id === (s.parcelId?._id || s.parcelId));
          return (parcel?.userId?._id || parcel?.userId) === selectedUserId;
        }),
    parcels: selectedUserId === 'all' ? allData.parcels
      : allData.parcels.filter(p => (p.userId?._id || p.userId) === selectedUserId),
    alerts: selectedUserId === 'all' ? allData.alerts
      : allData.alerts.filter(a => {
          const parcel = allData.parcels.find(p => p._id === (a.parcelId?._id || a.parcelId));
          return (parcel?.userId?._id || parcel?.userId) === selectedUserId;
        }),
  };

  const selectedUser = users.find(u => u._id === selectedUserId);
  const onlineSensors = filtered.sensors.filter(s => s.lastSeen && Date.now() - new Date(s.lastSeen).getTime() < 5 * 60 * 1000);
  const unreadAlerts = filtered.alerts.filter(a => !a.acknowledged);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #1e3a5f, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", animation: "logo-spin 1.2s linear infinite", boxShadow: "0 4px 20px rgba(37,99,235,0.35)", padding: 10 }}>
          <img src="/logo.png" alt="chargement" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Vue globale</h1>
        <p className="text-sm mt-0.5" style={S.text3}>
          {selectedUserId === 'all' ? 'Supervision complète de la plateforme' : `Données de ${selectedUser?.name}`}
        </p>
      </div>

      <UserFilterBar users={users} selectedUserId={selectedUserId} onChange={setSelectedUserId} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 page-enter">
        <StatCard icon={Users} label="Utilisateurs"
          value={selectedUserId === 'all' ? users.length : 1}
          sub={selectedUserId === 'all' ? `${users.filter(u => u.role === 'admin').length} admin(s)` : selectedUser?.email}
          color="#6366f1" />
        <StatCard icon={Cpu} label="Capteurs actifs"
          value={`${onlineSensors.length}/${filtered.sensors.length}`}
          sub="en ligne maintenant"
          color="#22c55e" delay="card-pop-2" />
        <StatCard icon={AlertTriangle} label="Alertes non lues"
          value={unreadAlerts.length}
          sub={`${filtered.alerts.length} total`}
          color="#ef4444" delay="card-pop-3" />
        <StatCard icon={Activity} label="Mesures 24h"
          value={selectedUserId === 'all' ? allData.stats?.totalMeasures || 0 : '—'}
          sub={`${selectedUserId === 'all' ? allData.stats?.pumpActivations || 0 : '—'} arrosages`}
          color="#f97316" delay="card-pop-4" />
      </div>

      {/* Parcelles filtrées si utilisateur sélectionné */}
      {selectedUserId !== 'all' && (
        <div style={S.card}>
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={S.text2}>
            <Layers size={14} style={{ color: 'var(--a-primary)' }} />
            Parcelles de {selectedUser?.name} ({filtered.parcels.length})
          </h2>
          {filtered.parcels.length === 0 ? (
            <p className="text-sm text-center py-4" style={S.text3}>Aucune parcelle</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.parcels.map(p => {
                const parcelSensorCount = filtered.sensors.filter(s => (s.parcelId?._id || s.parcelId) === p._id).length;
                return (
                <div key={p._id} className="flex items-center gap-3 p-3 rounded-xl" style={S.card2}>
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color || '#22c55e' }} />
                  <div>
                    <p className="text-sm font-semibold" style={S.text}>{p.name}</p>
                    <p className="text-xs" style={S.text3}>{p.cropId?.label || p.cropType} • {parcelSensorCount} capteur(s)</p>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Capteurs */}
      <div style={S.card}>
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={S.text2}>
          <Wifi size={14} style={{ color: 'var(--a-primary)' }} />
          {selectedUserId === 'all' ? 'État de tous les capteurs' : `Capteurs de ${selectedUser?.name}`}
          <span className="text-xs ml-1" style={S.text3}>({filtered.sensors.length})</span>
        </h2>
        {filtered.sensors.length === 0 ? (
          <p className="text-sm text-center py-6" style={S.text3}>Aucun capteur</p>
        ) : filtered.sensors.map(sensor => {
          const isOnline = sensor.lastSeen && Date.now() - new Date(sensor.lastSeen).getTime() < 5 * 60 * 1000;
          return (
            <div key={sensor._id} className="flex items-center justify-between p-3 rounded-xl mb-2" style={S.card2}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'animate-pulse' : ''}`}
                  style={{ background: isOnline ? '#22c55e' : '#ef4444' }} />
                <div>
                  <p className="text-sm font-medium" style={S.text}>{sensor.name}</p>
                  <p className="text-xs" style={S.text3}>{sensor.deviceId} • {sensor.parcelId?.name || 'Non assigné'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                {sensor.lastMeasure && (
                  <>
                    <span style={{ color: '#0ea5e9' }}>Sol: {sensor.lastMeasure.soilHumidity?.toFixed(0)}%</span>
                    <span style={{ color: '#f97316' }}>{sensor.lastMeasure.temperature?.toFixed(0)}°C</span>
                  </>
                )}
                <span style={{ color: isOnline ? '#22c55e' : '#ef4444' }}>
                  {isOnline ? '● En ligne' : '● Hors ligne'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alertes */}
      <div style={S.card}>
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={S.text2}>
          <AlertTriangle size={14} style={{ color: '#ef4444' }} />
          {selectedUserId === 'all' ? 'Dernières alertes' : `Alertes de ${selectedUser?.name}`}
          <span className="text-xs ml-1" style={S.text3}>({filtered.alerts.length})</span>
        </h2>
        {filtered.alerts.length === 0 ? (
          <p className="text-sm text-center py-6" style={S.text3}>Aucune alerte</p>
        ) : filtered.alerts.slice(0, 5).map(alert => (
          <div key={alert._id} className="flex items-start gap-3 p-3 rounded-xl mb-2"
            style={{ background: 'var(--a-danger-light)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 12 }}>
            <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
              style={{ background: alert.priority === 'critical' ? '#ef4444' : alert.priority === 'high' ? '#f97316' : '#eab308' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm" style={S.text}>{alert.message}</p>
              <p className="text-xs mt-0.5" style={S.text3}>
                {format(new Date(alert.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                {alert.parcelId && ` • ${alert.parcelId.name}`}
              </p>
            </div>
            {alert.acknowledged && <span className="text-xs" style={{ color: '#22c55e' }}>✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
