import React, { useEffect, useState } from 'react';
import { BarChart2, Droplets, Thermometer, Activity, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BACKEND_URL } from '../../api';

const token = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const adminFetch = (path) =>
  fetch(`${BACKEND_URL}/api${path}`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json());

const S = {
  card: { background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 16, padding: 20, boxShadow: 'var(--a-shadow)' },
  text: { color: 'var(--a-text)' },
  text2: { color: 'var(--a-text2)' },
  text3: { color: 'var(--a-text3)' },
};

const StatBox = ({ icon: Icon, label, value, unit, color }) => (
  <div style={{ ...S.card, borderLeft: `4px solid ${color}` }}>
    <div className="flex items-center gap-2 mb-2">
      <Icon size={14} style={{ color }} />
      <span className="text-xs font-semibold uppercase tracking-wide" style={S.text3}>{label}</span>
    </div>
    <p className="text-2xl font-bold" style={S.text}>
      {value ?? '—'}<span className="text-sm font-normal ml-1" style={S.text3}>{unit}</span>
    </p>
  </div>
);

export default function AdminStats() {
  const [stats24h, setStats24h] = useState(null);
  const [stats7d, setStats7d] = useState(null);
  const [pumpHistory, setPumpHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminFetch('/measures/stats?hours=24'),
      adminFetch('/measures/stats?hours=168'),
      adminFetch('/pump-history?days=7')
    ]).then(([s24, s7d, ph]) => {
      if (s24.success) setStats24h(s24.data);
      if (s7d.success) setStats7d(s7d.data);
      if (ph.success) setPumpHistory(ph.stats?.dailySeries || []);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #1e3a5f, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", animation: "logo-spin 1.2s linear infinite", boxShadow: "0 4px 20px rgba(37,99,235,0.35)", padding: 10 }}>
          <img src="/logo.png" alt="chargement" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={S.text}>
          <BarChart2 size={18} style={{ color: 'var(--a-primary)' }} />
          Statistiques
        </h1>
        <p className="text-xs mt-0.5" style={S.text3}>Analyse des données de la plateforme</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={S.text3}>Dernières 24 heures</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatBox icon={Droplets} label="Humidité Sol" value={stats24h?.avgSoilHumidity} unit="%" color="#3b82f6" />
          <StatBox icon={Thermometer} label="Température" value={stats24h?.avgTemperature} unit="°C" color="#f97316" />
          <StatBox icon={Activity} label="Humidité Air" value={stats24h?.avgAirHumidity} unit="%" color="#14b8a6" />
          <StatBox icon={TrendingUp} label="Arrosages" value={stats24h?.pumpActivations} unit="fois" color="#8b5cf6" />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={S.text3}>Derniers 7 jours</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatBox icon={Droplets} label="Humidité Sol" value={stats7d?.avgSoilHumidity} unit="%" color="#3b82f6" />
          <StatBox icon={Thermometer} label="Température" value={stats7d?.avgTemperature} unit="°C" color="#f97316" />
          <StatBox icon={Activity} label="Total mesures" value={stats7d?.totalMeasures} unit="" color="#14b8a6" />
          <StatBox icon={TrendingUp} label="Arrosages" value={stats7d?.pumpActivations} unit="fois" color="#8b5cf6" />
        </div>
      </div>

      <div style={S.card}>
        <h2 className="text-sm font-semibold mb-4" style={S.text2}>Historique arrosages — 7 jours</h2>
        {pumpHistory.length === 0 ? (
          <p className="text-sm text-center py-8" style={S.text3}>Aucune donnée</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pumpHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--a-border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--a-text3)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--a-text3)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 8, fontSize: 11, color: 'var(--a-text)' }} />
              <Bar dataKey="count" name="Arrosages" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
