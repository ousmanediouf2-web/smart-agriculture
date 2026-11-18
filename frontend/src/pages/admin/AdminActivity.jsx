import React, { useEffect, useState } from 'react';
import { Activity, Cpu, RefreshCw, ChevronDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BACKEND_URL } from '../../api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import useSocket from '../../hooks/useSocket';

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

export default function AdminActivity() {
  const [measures, setMeasures] = useState([]);       // série globale (tous capteurs mélangés)
  const [sensorSeries, setSensorSeries] = useState([]); // série du capteur sélectionné uniquement
  const [sensors, setSensors] = useState([]);
  const [selectedSensorId, setSelectedSensorId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const { lastMeasure, isConnected } = useSocket();

  const fetchData = async () => {
    const [mRes, sRes] = await Promise.all([
      adminFetch('/measures?limit=50'),
      adminFetch('/sensors')
    ]);
    if (mRes.success) {
      setMeasures((mRes.data || []).reverse().map(m => ({
        time: format(new Date(m.recordedAt), 'HH:mm'),
        Sol: m.soilHumidity,
        Temp: m.temperature,
        Air: m.airHumidity
      })));
    }
    if (sRes.success) setSensors(sRes.data || []);
    setLoading(false);
  };

  // Charge la série temps réel d'un capteur précis (isolée, pas mélangée aux autres)
  const fetchSensorSeries = async (sensorId) => {
    if (sensorId === 'all') { setSensorSeries([]); return; }
    setSeriesLoading(true);
    const res = await adminFetch(`/measures?sensorId=${sensorId}&limit=50`);
    if (res.success) {
      setSensorSeries((res.data || []).reverse().map(m => ({
        time: format(new Date(m.recordedAt), 'HH:mm'),
        Sol: m.soilHumidity,
        Temp: m.temperature,
        Air: m.airHumidity
      })));
    }
    setSeriesLoading(false);
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { fetchSensorSeries(selectedSensorId); }, [selectedSensorId]);

  // Flux global temps réel (vue "Tous les capteurs")
  useEffect(() => {
    if (!lastMeasure) return;
    setMeasures(prev => [...prev, {
      time: format(new Date(), 'HH:mm'),
      Sol: lastMeasure.soilHumidity,
      Temp: lastMeasure.temperature,
      Air: lastMeasure.airHumidity
    }].slice(-60));

    // Si la mesure temps réel concerne le capteur actuellement sélectionné,
    // on l'ajoute aussi à sa série isolée pour un vrai suivi en direct
    if (selectedSensorId !== 'all' && lastMeasure.sensorId === selectedSensorId) {
      setSensorSeries(prev => [...prev, {
        time: format(new Date(), 'HH:mm'),
        Sol: lastMeasure.soilHumidity,
        Temp: lastMeasure.temperature,
        Air: lastMeasure.airHumidity
      }].slice(-60));
    }
  }, [lastMeasure, selectedSensorId]);

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
            <Activity size={18} style={{ color: 'var(--a-primary)' }} />
            Activité temps réel
            <div className="w-2 h-2 rounded-full" style={{ background: isConnected ? '#22c55e' : '#ef4444' }} />
          </h1>
          <p className="text-xs mt-0.5" style={S.text3}>Données en direct de tous les capteurs</p>
        </div>
        <button onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
          style={{ background: 'var(--a-surface2)', border: '1px solid var(--a-border)', color: 'var(--a-text3)' }}>
          <RefreshCw size={12} />Actualiser
        </button>
      </div>

      {/* Sélecteur de capteur — permet d'isoler un seul capteur en temps réel */}
      <div style={S.card}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2" style={S.text2}>
            <Cpu size={14} style={{ color: 'var(--a-primary)' }} />
            {selectedSensorId === 'all' ? 'Évolution des capteurs — Vue globale' : `Évolution — ${selectedSensor?.name || 'Capteur'}`}
          </h2>
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

        {selectedSensorId === 'all' ? (
          measures.length === 0 ? (
            <p className="text-sm text-center py-12" style={S.text3}>En attente de données ESP32...</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={measures}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--a-border)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--a-text3)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--a-text3)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 8, fontSize: 11, color: 'var(--a-text)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Sol" stroke="#3b82f6" dot={false} strokeWidth={2} name="Sol %" />
                <Line type="monotone" dataKey="Temp" stroke="#f97316" dot={false} strokeWidth={2} name="Temp °C" />
                <Line type="monotone" dataKey="Air" stroke="#14b8a6" dot={false} strokeWidth={2} name="Air %" />
              </LineChart>
            </ResponsiveContainer>
          )
        ) : seriesLoading ? (
          <div className="flex justify-center py-12">
            <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--a-primary)' }} />
          </div>
        ) : sensorSeries.length === 0 ? (
          <p className="text-sm text-center py-12" style={S.text3}>Aucune mesure récente pour ce capteur.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={sensorSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--a-border)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--a-text3)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--a-text3)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 8, fontSize: 11, color: 'var(--a-text)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Sol" stroke="#3b82f6" dot={false} strokeWidth={2} name="Sol %" />
                <Line type="monotone" dataKey="Temp" stroke="#f97316" dot={false} strokeWidth={2} name="Temp °C" />
                <Line type="monotone" dataKey="Air" stroke="#14b8a6" dot={false} strokeWidth={2} name="Air %" />
              </LineChart>
            </ResponsiveContainer>
            {selectedSensor && (
              <p className="text-xs mt-3 text-center" style={S.text3}>
                📍 {selectedSensor.parcelId?.name || 'Non assigné'} • Propriétaire : {selectedSensor.userId?.name || 'N/A'}
              </p>
            )}
          </>
        )}
      </div>

      <div style={S.card}>
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={S.text2}>
          <Cpu size={14} style={{ color: 'var(--a-primary)' }} />
          État des capteurs ({sensors.length})
        </h2>
        {sensors.length === 0 ? (
          <p className="text-sm text-center py-8" style={S.text3}>Aucun capteur</p>
        ) : sensors.map(sensor => {
          const isOnline = sensor.lastSeen && Date.now() - new Date(sensor.lastSeen).getTime() < 5 * 60 * 1000;
          const isSelected = sensor._id === selectedSensorId;
          return (
            <div key={sensor._id}
              onClick={() => setSelectedSensorId(sensor._id)}
              style={{
                ...S.row,
                cursor: 'pointer',
                background: isSelected ? 'var(--a-primary-light)' : (isOnline ? '#f0fdf4' : '#fef2f2'),
                borderColor: isSelected ? 'var(--a-primary)' : (isOnline ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)')
              }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: isOnline ? '#22c55e' : '#ef4444' }} />
                  <div>
                    <p className="text-sm font-medium" style={S.text}>{sensor.name}</p>
                    <p className="text-xs" style={S.text3}>{sensor.deviceId} • {sensor.parcelId?.name || 'Non assigné'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  {sensor.lastMeasure ? (
                    <>
                      <span style={{ color: '#3b82f6' }}>💧 {sensor.lastMeasure.soilHumidity?.toFixed(0)}%</span>
                      <span style={{ color: '#f97316' }}>🌡️ {sensor.lastMeasure.temperature?.toFixed(0)}°C</span>
                      <span style={{ color: '#14b8a6' }}>💨 {sensor.lastMeasure.airHumidity?.toFixed(0)}%</span>
                    </>
                  ) : (
                    <span style={S.text3}>Pas de données</span>
                  )}
                  <span className="font-medium" style={{ color: isOnline ? '#22c55e' : '#ef4444' }}>
                    {isOnline ? '● En ligne' : '● Hors ligne'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <p className="text-xs mt-2 text-center" style={S.text3}>
          💡 Cliquez sur un capteur pour voir son évolution en temps réel isolée ci-dessus
        </p>
      </div>
    </div>
  );
}
