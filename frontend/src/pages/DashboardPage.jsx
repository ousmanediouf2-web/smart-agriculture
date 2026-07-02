import React, { useEffect, useState } from 'react';
import { Droplets, Thermometer, Wind, Activity, AlertTriangle, Cpu, Cloud, Bell, BellOff, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import useSocket, { requestNotificationPermission } from '../hooks/useSocket';
import { BACKEND_URL } from '../api';

const apiFetch = async (path) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const res = await fetch(`${BACKEND_URL}/api${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
};

const SENEGAL_CITIES = [
  { id: 'kaolack', name: 'Kaolack', lat: 14.1515, lng: -16.0726 },
  { id: 'dakar', name: 'Dakar', lat: 14.7167, lng: -17.4677 },
  { id: 'thies', name: 'Thiès', lat: 14.7833, lng: -16.9167 },
  { id: 'ziguinchor', name: 'Ziguinchor', lat: 12.5833, lng: -16.2719 },
  { id: 'saint-louis', name: 'Saint-Louis', lat: 16.0333, lng: -16.5000 },
  { id: 'touba', name: 'Touba', lat: 14.8500, lng: -15.8833 },
  { id: 'tambacounda', name: 'Tambacounda', lat: 13.7667, lng: -13.6667 },
  { id: 'fatick', name: 'Fatick', lat: 14.3333, lng: -16.4000 },
  { id: 'kolda', name: 'Kolda', lat: 12.8833, lng: -14.9500 },
  { id: 'matam', name: 'Matam', lat: 15.6557, lng: -13.2557 },
  { id: 'kaffrine', name: 'Kaffrine', lat: 14.1000, lng: -15.5500 },
  { id: 'kedougou', name: 'Kédougou', lat: 12.5500, lng: -12.1833 },
  { id: 'sedhiou', name: 'Sédhiou', lat: 12.7080, lng: -15.5570 },
  { id: 'diourbel', name: 'Diourbel', lat: 14.6500, lng: -16.2333 },
  { id: 'louga', name: 'Louga', lat: 15.6167, lng: -16.2333 },
];

const StatCard = ({ icon: Icon, label, value, unit, iconBg, trend, delay = "" }) => (
  <div className={`stat-card lift card-pop ${delay}`}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold" style={{ color: 'var(--f-text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center stat-icon" style={{ background: iconBg, boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
        <Icon size={22} className="text-white" />
      </div>
    </div>
    <div className="flex items-end gap-2">
      <span className="text-3xl font-bold" style={{ color: 'var(--f-text)', fontVariantNumeric: 'tabular-nums' }}>
        {value !== undefined && value !== null && !isNaN(value) ? Number(value).toFixed(1) : '—'}
      </span>
      <span className="text-sm mb-1" style={{ color: 'var(--f-text3)' }}>{unit}</span>
    </div>
  </div>
);

const WeatherCard = ({ weather, selectedCity, onCityChange }) => {
  if (!weather) return (
    <div className="card h-full flex items-center justify-center" style={{ minHeight: 180 }}>
      <div className="text-center">
        <div className="animate-spin w-6 h-6 border-2 rounded-full mx-auto mb-2" style={{ borderColor: 'var(--f-border)', borderTopColor: 'var(--f-primary)' }} />
        <p className="text-xs" style={{ color: 'var(--f-text3)' }}>Chargement météo...</p>
      </div>
    </div>
  );

  const weatherIcons = { '01': '☀️', '02': '⛅', '03': '☁️', '04': '☁️', '09': '🌧️', '10': '🌦️', '11': '⛈️', '13': '❄️', '50': '🌫️' };
  const iconCode = weather.icon?.substring(0, 2) || '01';
  const weatherEmoji = weatherIcons[iconCode] || '🌤️';

  return (
    <div className="card fade-up" style={{ background: 'linear-gradient(145deg, #e8f5ea, #ffffff)' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cloud size={14} style={{ color: 'var(--f-primary)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--f-text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Météo — {SENEGAL_CITIES.find(c => c.id === selectedCity)?.name || weather.city}
            </span>
            {weather.simulated && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--f-accent-light)', color: 'var(--f-accent)' }}>Simulé</span>}
          </div>
          <select value={selectedCity} onChange={e => onCityChange(e.target.value)}
            className="text-xs rounded-lg px-2 py-1 mt-1"
            style={{ background: 'var(--f-surface2)', border: '1px solid var(--f-border)', color: 'var(--f-text2)' }}>
            {SENEGAL_CITIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="text-right">
          <div className="text-3xl">{weatherEmoji}</div>
          <p className="text-2xl font-bold" style={{ color: 'var(--f-text)' }}>{weather.temp}°C</p>
          <p className="text-xs capitalize" style={{ color: 'var(--f-text3)' }}>{weather.description}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'Ressenti', value: `${weather.feelsLike}°C` },
          { label: 'Humidité', value: `${weather.humidity}%` },
          { label: 'Vent', value: `${weather.windSpeed} km/h` },
        ].map(({ label, value }) => (
          <div key={label} className="text-center py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid var(--f-border)' }}>
            <p className="text-xs" style={{ color: 'var(--f-text3)' }}>{label}</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--f-text)' }}>{value}</p>
          </div>
        ))}
      </div>
      {weather.forecast && (
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {weather.forecast.map((f, i) => (
            <div key={i} className="text-center py-2 rounded-xl" style={{ background: 'rgba(45,122,58,0.06)', border: '1px solid rgba(45,122,58,0.12)' }}>
              <p className="text-xs truncate" style={{ color: 'var(--f-text3)' }}>{f.day}</p>
              <p className="text-xs font-bold" style={{ color: 'var(--f-text)' }}>{f.tempMax}°/{f.tempMin}°</p>
              {f.rain > 0 && <p className="text-xs" style={{ color: 'var(--f-info)' }}>🌧 {f.rain}%</p>}
            </div>
          ))}
        </div>
      )}
      <div className="px-3 py-2 rounded-xl" style={{ background: 'var(--f-primary-light)', border: '1px solid rgba(45,122,58,0.15)' }}>
        <p className="text-xs" style={{ color: 'var(--f-primary)' }}>{weather.irrigationAdvice}</p>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 shadow-lg text-xs" style={{ background: 'var(--f-surface)', border: '1px solid var(--f-border)' }}>
      <p className="font-medium mb-2" style={{ color: 'var(--f-text3)' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} className="font-semibold" style={{ color: p.color }}>
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
  const [weather, setWeather] = useState(null);
  const [pumpHistory, setPumpHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(Notification.permission === 'granted');
  const [selectedCity, setSelectedCity] = useState(localStorage.getItem('weatherCity') || 'kaolack');
  const { lastMeasure, isConnected, pumpState } = useSocket();

  // Valeur actuelle = dernière mesure temps réel (socket) > dernière mesure série > moyenne 24h (fallback)
  const latestSeriesMeasure = series.length > 0 ? series[series.length - 1] : null;
  const currentSoil = lastMeasure?.soilHumidity ?? latestSeriesMeasure?.['Humidité Sol'] ?? stats?.avgSoilHumidity;
  const currentTemp = lastMeasure?.temperature ?? latestSeriesMeasure?.['Température'] ?? stats?.avgTemperature;
  const currentAir = lastMeasure?.airHumidity ?? latestSeriesMeasure?.['Humidité Air'] ?? stats?.avgAirHumidity;

  const fetchData = async () => {
    try {
      const [statsRes, sensorsRes, alertsRes] = await Promise.all([
        apiFetch('/measures/stats?hours=24'),
        apiFetch('/sensors'),
        apiFetch('/alerts?limit=5&acknowledged=false')
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (sensorsRes.success) setSensors(sensorsRes.data || []);
      if (alertsRes.success) setAlerts(alertsRes.data || []);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  const fetchWeather = async (cityId) => {
    try {
      const city = SENEGAL_CITIES.find(c => c.id === cityId) || SENEGAL_CITIES[0];
      const res = await apiFetch(`/weather?lat=${city.lat}&lng=${city.lng}`);
      if (res.success) setWeather(res.data);
    } catch {}
  };

  const fetchPumpHistory = async () => {
    try {
      const res = await apiFetch('/pump-history?days=7');
      if (res.success) setPumpHistory(res.stats?.dailySeries || []);
    } catch {}
  };

  const fetchSeries = async () => {
    try {
      const res = await apiFetch('/measures?limit=600');
      if (res.success) {
        const data = (res.data || []).reverse().map(m => ({
          time: format(new Date(m.recordedAt), 'HH:mm'),
          'Humidité Sol': m.soilHumidity,
          'Température': m.temperature,
          'Humidité Air': m.airHumidity,
        }));
        setSeries(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchData();
    fetchSeries();
    fetchPumpHistory();
    fetchWeather(selectedCity);
    const interval = setInterval(() => {
      fetchData();
      fetchSeries();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!lastMeasure) return;
    setSeries(prev => [...prev, {
      time: format(new Date(), 'HH:mm'),
      'Humidité Sol': lastMeasure.soilHumidity,
      'Température': lastMeasure.temperature,
      'Humidité Air': lastMeasure.airHumidity,
    }].slice(-600));
  }, [lastMeasure]);

  const handleCityChange = (cityId) => {
    setSelectedCity(cityId);
    localStorage.setItem('weatherCity', cityId);
    fetchWeather(cityId);
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotifEnabled(granted);
    if (granted) toast.success('Notifications activées !');
    else toast.error('Notifications refusées');
  };

  const handlePump = async (sensorId, state) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/api/sensors/${sensorId}/pump`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ state, mode: 'manual' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Pompe ${state ? 'activée' : 'arrêtée'}`);
        setSensors(prev => prev.map(s => s._id === sensorId ? { ...s, pumpState: state } : s));
      }
    } catch { toast.error('Erreur'); }
  };

  const PRIORITY_BG = {
    critical: { bg: 'var(--f-danger-light)', color: 'var(--f-danger)', border: 'rgba(220,38,38,0.2)' },
    high: { bg: '#fff7ed', color: '#c2410c', border: 'rgba(194,65,12,0.2)' },
    medium: { bg: '#fefce8', color: '#92400e', border: 'rgba(146,64,14,0.15)' },
    low: { bg: 'var(--f-info-light)', color: 'var(--f-info)', border: 'rgba(8,145,178,0.2)' }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #1b4332, #2e7d32)", display: "flex", alignItems: "center", justifyContent: "center", animation: "logo-spin 1.2s linear infinite", boxShadow: "0 4px 20px rgba(46,125,50,0.4)", padding: 10, marginBottom: 8 }}>
          <img src="/logo.png" alt="chargement" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <p className="text-sm" style={{ color: 'var(--f-text3)' }}>Chargement du tableau de bord...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between fade-up">
        <div>
          <h1 className="text-2xl font-bold gradient-text" style={{ fontFamily: "'Playfair Display', serif" }}>Tableau de bord</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--f-text3)' }}>Vue d'ensemble de vos cultures en temps réel</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleEnableNotifications}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={notifEnabled
              ? { background: 'var(--f-primary-light)', color: 'var(--f-primary)', border: '1px solid rgba(45,122,58,0.2)' }
              : { background: 'var(--f-surface)', color: 'var(--f-text3)', border: '1px solid var(--f-border)' }}>
            {notifEnabled ? <Bell size={12} /> : <BellOff size={12} />}
            {notifEnabled ? 'Notifs ON' : 'Activer'}
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={isConnected
              ? { background: 'var(--f-primary-light)', color: 'var(--f-primary)', border: '1px solid rgba(45,122,58,0.2)' }
              : { background: 'var(--f-danger-light)', color: 'var(--f-danger)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <div className={`w-1.5 h-1.5 rounded-full pulse-dot`}
              style={{ background: isConnected ? 'var(--f-primary)' : 'var(--f-danger)' }} />
            {isConnected ? 'En direct' : 'Hors ligne'}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 page-enter">
        <StatCard icon={Droplets} label="Humidité Sol" value={currentSoil} unit="%" iconBg="linear-gradient(135deg, #0ea5e9, #38bdf8)" delay="card-pop-1" />
        <StatCard icon={Thermometer} label="Température" value={currentTemp} unit="°C" iconBg="linear-gradient(135deg, #f97316, #fb923c)" delay="card-pop-2" />
        <StatCard icon={Wind} label="Humidité Air" value={currentAir} unit="%" iconBg="linear-gradient(135deg, #14b8a6, #2dd4bf)" delay="card-pop-3" />
        <StatCard icon={Activity} label="Arrosages (24h)" value={stats?.pumpActivations} unit="fois" iconBg="linear-gradient(135deg, #8b5cf6, #a78bfa)" delay="card-pop-4" />
      </div>

      {/* Météo + Graphique */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <WeatherCard weather={weather} selectedCity={selectedCity} onCityChange={handleCityChange} />
        <div className="card lg:col-span-2 fade-up stagger-1">
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--f-text2)' }}>Évolution des capteurs — Temps réel</h2>
          {series.length === 0 ? (
            <div className="flex items-center justify-center h-48" style={{ color: 'var(--f-text3)' }}>
              <div className="text-center">
                <Cpu size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Branchez votre ESP32 pour voir les données</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--f-border)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--f-text3)', fontSize: 11 }} tickLine={false}
                  interval={Math.max(0, Math.ceil(series.length / 12) - 1)} />
                <YAxis tick={{ fill: 'var(--f-text3)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--f-text3)' }} />
                <Line type="monotone" dataKey="Humidité Sol" stroke="#0ea5e9" dot={false} strokeWidth={2.5} />
                <Line type="monotone" dataKey="Température" stroke="#f97316" dot={false} strokeWidth={2.5} />
                <Line type="monotone" dataKey="Humidité Air" stroke="#14b8a6" dot={false} strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Historique arrosages + Alertes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2 fade-up stagger-2">
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--f-text2)' }}>Historique arrosages — 7 derniers jours</h2>
          {pumpHistory.length === 0 ? (
            <div className="flex items-center justify-center h-32" style={{ color: 'var(--f-text3)' }}>
              <p className="text-sm">Aucun arrosage enregistré</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={pumpHistory} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--f-border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--f-text3)', fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fill: 'var(--f-text3)', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--f-surface)', border: '1px solid var(--f-border)', borderRadius: 10, fontSize: 11, color: 'var(--f-text)' }} />
                <Bar dataKey="count" name="Arrosages" fill="var(--f-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card fade-up stagger-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--f-text2)' }}>Alertes récentes</h2>
            {alerts.length > 0 && (
              <span className="badge text-xs" style={{ background: 'var(--f-danger-light)', color: 'var(--f-danger)' }}>
                {alerts.length}
              </span>
            )}
          </div>
          {alerts.length === 0 ? (
            <div className="flex items-center justify-center h-32 flex-col gap-2" style={{ color: 'var(--f-text3)' }}>
              <AlertTriangle size={22} className="opacity-30" />
              <p className="text-sm">Aucune alerte active</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map(alert => {
                const style = PRIORITY_BG[alert.priority] || PRIORITY_BG.low;
                return (
                  <div key={alert._id} className="rounded-xl p-3" style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" style={{ color: style.color }} />
                      <div className="min-w-0">
                        <p className="text-xs leading-snug" style={{ color: 'var(--f-text)' }}>{alert.message}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--f-text3)' }}>
                          {format(new Date(alert.createdAt), 'dd/MM HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Capteurs */}
      <div className="card fade-up stagger-4">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--f-text2)' }}>Capteurs & Contrôle des pompes</h2>
        {sensors.length === 0 ? (
          <div className="text-center py-10 flex flex-col items-center gap-2" style={{ color: 'var(--f-text3)' }}>
            <Cpu size={28} className="opacity-30" />
            <p className="text-sm">Aucun capteur configuré</p>
            <p className="text-xs">Allez dans <span className="font-semibold" style={{ color: 'var(--f-primary)' }}>Capteurs</span> pour en ajouter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sensors.map((sensor, idx) => {
              const currentPump = pumpState[sensor._id] ?? sensor.pumpState;
              const isOnline = sensor.lastSeen && (Date.now() - new Date(sensor.lastSeen).getTime()) < 5 * 60 * 1000;
              return (
                <div key={sensor._id} className={`rounded-xl p-4 card-hover wave-in wave-in-${Math.min(idx+1,5)}`} style={{ background: 'var(--f-surface2)', border: '1px solid var(--f-border)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--f-text)' }}>{sensor.name}</p>
                      <p className="text-xs mono" style={{ color: 'var(--f-text3)' }}>{sensor.deviceId}</p>
                    </div>
                    <span className="badge text-xs"
                      style={isOnline
                        ? { background: 'var(--f-primary-light)', color: 'var(--f-primary)' }
                        : { background: 'var(--f-danger-light)', color: 'var(--f-danger)' }}>
                      {isOnline ? '● En ligne' : '● Hors ligne'}
                    </span>
                  </div>
                  {sensor.lastMeasure ? (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: 'Sol', value: `${sensor.lastMeasure.soilHumidity?.toFixed(0)}%`, color: '#0ea5e9' },
                        { label: 'Temp', value: `${sensor.lastMeasure.temperature?.toFixed(0)}°C`, color: '#f97316' },
                        { label: 'Air', value: `${sensor.lastMeasure.airHumidity?.toFixed(0)}%`, color: '#14b8a6' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="text-center py-2 rounded-lg" style={{ background: 'var(--f-surface)', border: '1px solid var(--f-border)' }}>
                          <p className="text-xs" style={{ color: 'var(--f-text3)' }}>{label}</p>
                          <p className="text-sm font-bold mt-0.5" style={{ color }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg p-3 text-center text-xs mb-3" style={{ background: 'var(--f-surface)', color: 'var(--f-text3)' }}>
                      En attente de données...
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${currentPump ? 'pump-on' : ''}`}
                        style={{ background: currentPump ? '#0ea5e9' : 'var(--f-border)' }} />
                      <span className="text-xs" style={{ color: 'var(--f-text3)' }}>Pompe {currentPump ? 'active' : 'arrêtée'}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handlePump(sensor._id, true)} disabled={currentPump}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg transition-all disabled:opacity-40"
                        style={{ background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>ON</button>
                      <button onClick={() => handlePump(sensor._id, false)} disabled={!currentPump}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg transition-all disabled:opacity-40"
                        style={{ background: 'var(--f-surface2)', color: 'var(--f-text3)', border: '1px solid var(--f-border)' }}>OFF</button>
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
