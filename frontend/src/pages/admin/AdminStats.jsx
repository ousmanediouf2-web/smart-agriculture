import React, { useEffect, useState } from 'react';
import { BarChart2, Droplets, Thermometer, Activity, TrendingUp, Cpu, ChevronDown } from 'lucide-react';
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
  const [sensors, setSensors] = useState([]);
  const [selectedSensorId, setSelectedSensorId] = useState('all');
  const [stats24h, setStats24h] = useState(null);
  const [stats7d, setStats7d] = useState(null);
  const [pumpHistory, setPumpHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  // Charge la liste des capteurs une seule fois au montage
  useEffect(() => {
    adminFetch('/sensors').then(res => {
      if (res.success) setSensors(res.data || []);
    });
  }, []);

  // Recharge les statistiques chaque fois que le capteur sélectionné change
  useEffect(() => {
    const sensorParam = selectedSensorId !== 'all' ? `&sensorId=${selectedSensorId}` : '';
    setStatsLoading(true);
    Promise.all([
      adminFetch(`/measures/stats?hours=24${sensorParam}`),
      adminFetch(`/measures/stats?hours=168${sensorParam}`),
      adminFetch(`/pump-history?days=7${selectedSensorId !== 'all' ? `&sensorId=${selectedSensorId}` : ''}`)
    ]).then(([s24, s7d, ph]) => {
      if (s24.success) setStats24h(s24.data);
      if (s7d.success) setStats7d(s7d.data);
      if (ph.success) setPumpHistory(ph.stats?.dailySeries || []);
      setLoading(false);
      setStatsLoading(false);
    });
  }, [selectedSensorId]);

  const selectedSensor = sensors.find(s => s._id === selectedSensorId);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #1e3a5f, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", animation: "logo-spin 1.2s linear infinite", boxShadow: "0 4px 20px rgba(37,99,235,0.35)", padding: 10 }}>
          <img src="/logo.png" alt="chargement" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={S.text}>
            <BarChart2 size={18} style={{ color: 'var(--a-primary)' }} />
            Statistiques
          </h1>
          <p className="text-xs mt-0.5" style={S.text3}>
            {selectedSensorId === 'all' ? 'Analyse globale de la plateforme' : `Analyse du capteur ${selectedSensor?.name || ''}`}
          </p>
        </div>
        <div className="relative">
          <select
            value={selectedSensorId}
            onChange={e => setSelectedSensorId(e.target.value)}
            className="text-xs px-3 py-2 pr-8 rounded-xl appearance-none cursor-pointer"
            style={{ background: 'var(--a-surface2)', border: '1px solid var(--a-border)', color: 'var(--a-text)' }}>
            <option value="all">Tous les capteurs</option>
            {sensors.map(s => (
              <option key={s._id} value={s._id}>{s.name} — {s.parcelId?.name || 'Non assigné'}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--a-text3)' }} />
        </div>
      </div>

      {statsLoading ? (
        <div className="flex justify-center py-12">
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #1e3a5f, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", animation: "logo-spin 1.2s linear infinite", padding: 7 }}>
            <img src="/logo.png" alt="chargement" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
        </div>
      ) : (
        <>
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
            <h2 className="text-sm font-semibold mb-4" style={S.text2}>
              Historique arrosages — 7 jours{selectedSensorId !== 'all' && selectedSensor ? ` — ${selectedSensor.name}` : ''}
            </h2>
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

          {/* Liste des capteurs avec accès rapide à leurs stats individuelles */}
          <div style={S.card}>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={S.text2}>
              <Cpu size={14} style={{ color: 'var(--a-primary)' }} />
              Voir les statistiques par capteur
            </h2>
            {sensors.length === 0 ? (
              <p className="text-sm text-center py-8" style={S.text3}>Aucun capteur</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {sensors.map(sensor => (
                  <button
                    key={sensor._id}
                    onClick={() => setSelectedSensorId(sensor._id)}
                    className="text-left p-3 rounded-xl transition-colors"
                    style={{
                      background: sensor._id === selectedSensorId ? 'var(--a-primary-light)' : 'var(--a-surface2)',
                      border: `1px solid ${sensor._id === selectedSensorId ? 'var(--a-primary)' : 'var(--a-border)'}`,
                      cursor: 'pointer'
                    }}>
                    <p className="text-xs font-semibold" style={S.text}>{sensor.name}</p>
                    <p className="text-xs" style={S.text3}>{sensor.parcelId?.name || 'Non assigné'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
