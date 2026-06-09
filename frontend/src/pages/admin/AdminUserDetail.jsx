import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, Cpu, AlertTriangle, Activity, Droplets, Thermometer, Wind } from 'lucide-react';
import { BACKEND_URL } from '../../api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const token = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const adminFetch = (path) =>
  fetch(`${BACKEND_URL}/api${path}`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json());

const S = {
  card: { background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 16, padding: 20, boxShadow: 'var(--a-shadow)' },
  row: { background: 'var(--a-surface2)', border: '1px solid var(--a-border)', borderRadius: 12, padding: 12, marginBottom: 8 },
  text: { color: 'var(--a-text)' },
  text2: { color: 'var(--a-text2)' },
  text3: { color: 'var(--a-text3)' },
};

const PRIORITY_COLOR = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6' };

export default function AdminUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [parcels, setParcels] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [measures, setMeasures] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    Promise.all([
      adminFetch('/users'),
      adminFetch('/parcels'),
      adminFetch('/sensors'),
      adminFetch('/alerts?limit=20'),
      adminFetch('/measures?limit=60')
    ]).then(([usersRes, pRes, sRes, aRes, mRes]) => {
      const found = (usersRes.data || []).find(u => u._id === userId);
      setUser(found);

      const userParcels = (pRes.data || []).filter(p => (p.userId?._id || p.userId) === userId);
      const parcelIds = userParcels.map(p => p._id);
      setParcels(userParcels);
      setSensors((sRes.data || []).filter(s => parcelIds.includes(s.parcelId?._id || s.parcelId)));
      setAlerts((aRes.data || []).filter(a => parcelIds.includes(a.parcelId?._id || a.parcelId)));

      const ms = (mRes.data || []).filter(m => parcelIds.includes(m.parcelId?._id || m.parcelId));
      setMeasures(ms.reverse().map(m => ({
        time: format(new Date(m.recordedAt), 'dd/MM HH:mm'),
        Sol: m.soilHumidity, Temp: m.temperature, Air: m.airHumidity
      })));

      if (ms.length > 0) {
        const avg = (key) => (ms.reduce((s, m) => s + (m[key] || 0), 0) / ms.length).toFixed(1);
        setStats({ avgSoil: avg('soilHumidity'), avgTemp: avg('temperature'), avgAir: avg('airHumidity'),
          total: ms.length, pumps: ms.filter(m => m.pumpAction === 'on').length });
      }
      setLoading(false);
    });
  }, [userId]);

  const TABS = [
    { key: 'overview', label: 'Vue globale' },
    { key: 'parcels', label: `Parcelles (${parcels.length})` },
    { key: 'sensors', label: `Capteurs (${sensors.length})` },
    { key: 'alerts', label: `Alertes (${alerts.length})` },
  ];

  if (loading) return (
    <div className="flex justify-center py-16">
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #1e3a5f, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", animation: "logo-spin 1.2s linear infinite", boxShadow: "0 4px 20px rgba(37,99,235,0.35)", padding: 10 }}>
          <img src="/logo.png" alt="chargement" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
    </div>
  );

  if (!user) return (
    <div className="text-center py-16" style={S.text3}>
      <p>Utilisateur introuvable</p>
      <button onClick={() => navigate('/admin/users')} className="mt-4 text-sm" style={{ color: 'var(--a-primary)' }}>
        ← Retour
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/users')}
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'var(--a-text3)' }}>
          <ArrowLeft size={16} />Retour
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
            {user.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold" style={S.text}>{user.name}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={user.role === 'admin'
                  ? { background: 'rgba(139,92,246,0.15)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.3)' }
                  : { background: '#f0fdf4', color: '#16a34a', border: '1px solid rgba(34,197,94,0.3)' }}>
                {user.role}
              </span>
              {!user.isActive && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                  Suspendu
                </span>
              )}
            </div>
            <p className="text-xs" style={S.text3}>{user.email}{user.phone ? ` • ${user.phone}` : ''}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={tab === key
              ? { background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white' }
              : { background: 'var(--a-surface2)', color: 'var(--a-text3)', border: '1px solid var(--a-border)' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          {stats ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { icon: Droplets, label: 'Sol moy.', value: stats.avgSoil, unit: '%', color: '#3b82f6' },
                { icon: Thermometer, label: 'Temp moy.', value: stats.avgTemp, unit: '°C', color: '#f97316' },
                { icon: Wind, label: 'Air moy.', value: stats.avgAir, unit: '%', color: '#14b8a6' },
                { icon: Activity, label: 'Mesures', value: stats.total, unit: '', color: '#8b5cf6' },
                { icon: Cpu, label: 'Arrosages', value: stats.pumps, unit: 'fois', color: '#22c55e' },
              ].map(({ icon: Icon, label, value, unit, color }) => (
                <div key={label} style={{ ...S.card, borderLeft: `4px solid ${color}` }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={12} style={{ color }} />
                    <span className="text-xs" style={S.text3}>{label}</span>
                  </div>
                  <p className="text-xl font-bold" style={S.text}>{value}<span className="text-xs ml-1" style={S.text3}>{unit}</span></p>
                </div>
              ))}
            </div>
          ) : (
            <div style={S.card} className="text-center py-6 text-sm">
              <span style={S.text3}>Aucune mesure enregistrée</span>
            </div>
          )}

          {measures.length > 0 && (
            <div style={S.card}>
              <h2 className="text-sm font-semibold mb-4" style={S.text2}>Évolution des capteurs</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={measures}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--a-border)" />
                  <XAxis dataKey="time" tick={{ fill: 'var(--a-text3)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--a-text3)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 8, fontSize: 11, color: 'var(--a-text)' }} />
                  <Line type="monotone" dataKey="Sol" stroke="#3b82f6" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="Temp" stroke="#f97316" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="Air" stroke="#14b8a6" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {tab === 'parcels' && (
        <div className="space-y-2">
          {parcels.length === 0 ? (
            <div className="text-center py-12 text-sm" style={S.text3}>Aucune parcelle</div>
          ) : parcels.map(p => (
            <div key={p._id} style={S.row}>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ background: p.color || '#22c55e' }} />
                <div>
                  <p className="font-semibold text-sm" style={S.text}>{p.name}</p>
                  <p className="text-xs" style={S.text3}>{p.cropId?.label || p.cropType} • {p.status} • {p.sensors?.length || 0} capteur(s)</p>
                  <p className="text-xs" style={S.text3}>Créée: {format(new Date(p.createdAt), 'dd/MM/yyyy', { locale: fr })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'sensors' && (
        <div className="space-y-2">
          {sensors.length === 0 ? (
            <div className="text-center py-12 text-sm" style={S.text3}>Aucun capteur</div>
          ) : sensors.map(s => {
            const isOnline = s.lastSeen && Date.now() - new Date(s.lastSeen).getTime() < 5 * 60 * 1000;
            return (
              <div key={s._id} style={S.row}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: isOnline ? '#22c55e' : '#ef4444' }} />
                    <div>
                      <p className="font-semibold text-sm" style={S.text}>{s.name}</p>
                      <p className="text-xs" style={{ ...S.text3, fontFamily: 'monospace' }}>{s.deviceId}</p>
                    </div>
                  </div>
                  {s.lastMeasure && (
                    <div className="text-xs text-right">
                      <p style={{ color: '#3b82f6' }}>Sol: {s.lastMeasure.soilHumidity?.toFixed(0)}%</p>
                      <p style={{ color: '#f97316' }}>{s.lastMeasure.temperature?.toFixed(0)}°C</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'alerts' && (
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <div className="text-center py-12 text-sm" style={S.text3}>Aucune alerte</div>
          ) : alerts.map(a => (
            <div key={a._id} style={{ ...S.row, opacity: a.acknowledged ? 0.6 : 1 }}>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full mt-1.5" style={{ background: PRIORITY_COLOR[a.priority] || '#6b7280' }} />
                <div>
                  <p className="text-sm" style={S.text}>{a.message}</p>
                  <p className="text-xs mt-0.5" style={S.text3}>
                    {format(new Date(a.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    {a.parcelId && ` • ${a.parcelId.name}`}
                    {a.acknowledged && ' • ✓ Acquittée'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
