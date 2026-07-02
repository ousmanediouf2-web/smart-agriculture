import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Droplets, Thermometer, Wind, Activity, AlertTriangle, Cpu, MapPin, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { parcelsAPI } from '../api';

const CROP_COLORS = { tomate: '#ef4444', aubergine: '#8b5cf6', manioc: '#3b82f6' };
const PERIODS = [
  { label: '24h', hours: 24 },
  { label: '7 jours', hours: 168 },
  { label: '30 jours', hours: 720 },
];

export default function ParcelDetailPage() {
  const { parcelId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState(168); // 7 jours par défaut
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await parcelsAPI.getDetail(parcelId);
      if (res.success) setDetail(res.data);
      else toast.error(res.message || 'Erreur de chargement');
    } catch {
      toast.error('Erreur de chargement de la parcelle');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (hours) => {
    setStatsLoading(true);
    try {
      const res = await parcelsAPI.getStats(parcelId, { hours });
      if (res.success) setStats(res.data);
    } catch {
      toast.error('Erreur de chargement des statistiques');
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [parcelId]);
  useEffect(() => { fetchStats(period); }, [parcelId, period]);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #2e7d32, #43a047)", display: "flex", alignItems: "center", justifyContent: "center", animation: "logo-spin 1.2s linear infinite", padding: 10 }}>
        <img src="/logo.png" alt="chargement" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
    </div>
  );

  if (!detail) return (
    <div className="text-center py-16">
      <p style={{ color: 'var(--f-text3)' }}>Parcelle introuvable.</p>
      <button onClick={() => navigate('/parcels')} className="btn-primary mt-4">Retour aux parcelles</button>
    </div>
  );

  const { parcel, sensors, alerts, pumpLogs } = detail;
  const cropColor = CROP_COLORS[parcel.cropType] || 'var(--f-primary)';
  const unreadAlerts = alerts.filter(a => !a.acknowledged);

  // Choisir l'unité de temps des axes selon la période sélectionnée
  const formatTime = (t) => {
    const date = new Date(t);
    if (period <= 24) return format(date, 'HH:mm', { locale: fr });
    if (period <= 168) return format(date, 'dd/MM HH:mm', { locale: fr });
    return format(date, 'dd/MM', { locale: fr });
  };

  return (
    <div className="space-y-6 page-enter">
      {/* En-tête avec retour */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/parcels')}
          className="p-2 rounded-xl transition-colors flex-shrink-0"
          style={{ background: 'var(--f-surface)', border: '1px solid var(--f-border)', color: 'var(--f-text2)' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: parcel.color || cropColor }} />
            <h1 className="text-2xl font-bold" style={{ color: 'var(--f-text)', fontFamily: "'Playfair Display', serif" }}>{parcel.name}</h1>
          </div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--f-text3)' }}>
            {parcel.cropId?.label || parcel.cropType} • {parcel.area ? `${parcel.area} ha` : 'Surface non définie'}
          </p>
        </div>
        {unreadAlerts.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
            <AlertTriangle size={12} />{unreadAlerts.length} alerte(s)
          </div>
        )}
      </div>

      {/* Cartes capteurs associés */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sensors.length === 0 ? (
          <div className="card md:col-span-2 text-center py-8">
            <Cpu size={28} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--f-text3)' }} />
            <p className="text-sm" style={{ color: 'var(--f-text3)' }}>Aucun capteur associé à cette parcelle</p>
          </div>
        ) : sensors.map(sensor => {
          const isOnline = sensor.lastSeen && (Date.now() - new Date(sensor.lastSeen).getTime()) < 10 * 60 * 1000;
          return (
            <div key={sensor._id} className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: isOnline ? '#22c55e' : '#ef4444' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--f-text)' }}>{sensor.name}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: isOnline ? '#f0fdf4' : '#fef2f2', color: isOnline ? '#16a34a' : '#dc2626' }}>
                  {isOnline ? 'En ligne' : 'Hors ligne'}
                </span>
              </div>
              {sensor.lastMeasure ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg p-2 text-center" style={{ background: 'var(--f-surface2)' }}>
                    <p className="text-xs" style={{ color: 'var(--f-text3)' }}>Sol</p>
                    <p className="text-sm font-bold" style={{ color: '#0ea5e9' }}>{sensor.lastMeasure.soilHumidity?.toFixed(0)}%</p>
                  </div>
                  <div className="rounded-lg p-2 text-center" style={{ background: 'var(--f-surface2)' }}>
                    <p className="text-xs" style={{ color: 'var(--f-text3)' }}>Temp</p>
                    <p className="text-sm font-bold" style={{ color: '#f97316' }}>{sensor.lastMeasure.temperature?.toFixed(0)}°C</p>
                  </div>
                  <div className="rounded-lg p-2 text-center" style={{ background: 'var(--f-surface2)' }}>
                    <p className="text-xs" style={{ color: 'var(--f-text3)' }}>Air</p>
                    <p className="text-sm font-bold" style={{ color: '#14b8a6' }}>{sensor.lastMeasure.airHumidity?.toFixed(0)}%</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-center py-2" style={{ color: 'var(--f-text3)' }}>En attente de données...</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Graphique de tendance multi-jours */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--f-text2)' }}>
            <Activity size={14} style={{ color: 'var(--f-primary)' }} />
            Évolution {PERIODS.find(p => p.hours === period)?.label}
          </h2>
          <div className="flex gap-1.5">
            {PERIODS.map(p => (
              <button key={p.hours} onClick={() => setPeriod(p.hours)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={period === p.hours
                  ? { background: 'var(--f-primary)', color: 'white' }
                  : { background: 'var(--f-surface2)', color: 'var(--f-text3)', border: '1px solid var(--f-border)' }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {statsLoading ? (
          <div className="flex justify-center py-12">
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #2e7d32, #43a047)", display: "flex", alignItems: "center", justifyContent: "center", animation: "logo-spin 1.2s linear infinite", padding: 6 }}>
              <img src="/logo.png" alt="chargement" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
          </div>
        ) : !stats || stats.series.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color: 'var(--f-text3)' }}>
            Aucune donnée pour cette période.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Sol moyen', value: stats.avgSoilHumidity, unit: '%', icon: Droplets, color: '#0ea5e9' },
                { label: 'Temp. moyenne', value: stats.avgTemperature, unit: '°C', icon: Thermometer, color: '#f97316' },
                { label: 'Air moyen', value: stats.avgAirHumidity, unit: '%', icon: Wind, color: '#14b8a6' },
                { label: 'Arrosages', value: stats.pumpActivations, unit: 'fois', icon: Activity, color: '#8b5cf6' },
              ].map(({ label, value, unit, icon: Icon, color }) => (
                <div key={label} className="rounded-xl p-3" style={{ background: 'var(--f-surface2)' }}>
                  <Icon size={14} style={{ color }} className="mb-1" />
                  <p className="text-xs" style={{ color: 'var(--f-text3)' }}>{label}</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--f-text)' }}>{value}<span className="text-xs font-normal ml-1">{unit}</span></p>
                </div>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={stats.series.map(d => ({ ...d, time: formatTime(d.t) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--f-border)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--f-text3)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'var(--f-text3)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'var(--f-surface)', border: '1px solid var(--f-border)', borderRadius: 8, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="soil" stroke="#0ea5e9" fill="#0ea5e920" name="Sol %" strokeWidth={2} />
                <Area type="monotone" dataKey="temp" stroke="#f97316" fill="#f9731620" name="Temp °C" strokeWidth={2} />
                <Area type="monotone" dataKey="air" stroke="#14b8a6" fill="#14b8a620" name="Air %" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Seuils de la culture */}
        {parcel.cropId && (
          <div className="card">
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--f-text2)' }}>Seuils — {parcel.cropId.label}</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg p-2" style={{ background: 'var(--f-surface2)' }}>
                <p style={{ color: 'var(--f-text3)' }}>Minimum</p>
                <p className="font-bold" style={{ color: '#0ea5e9' }}>{parcel.cropId.soilHumidity?.min}%</p>
              </div>
              <div className="rounded-lg p-2" style={{ background: 'var(--f-surface2)' }}>
                <p style={{ color: 'var(--f-text3)' }}>Optimal</p>
                <p className="font-bold" style={{ color: '#16a34a' }}>{parcel.cropId.soilHumidity?.optimal}%</p>
              </div>
              <div className="rounded-lg p-2" style={{ background: 'var(--f-surface2)' }}>
                <p style={{ color: 'var(--f-text3)' }}>Critique</p>
                <p className="font-bold" style={{ color: '#dc2626' }}>{parcel.cropId.soilHumidity?.critical}%</p>
              </div>
              <div className="rounded-lg p-2" style={{ background: 'var(--f-surface2)' }}>
                <p style={{ color: 'var(--f-text3)' }}>Temp. optimale</p>
                <p className="font-bold" style={{ color: 'var(--f-text)' }}>{parcel.cropId.temperature?.optimal}°C</p>
              </div>
            </div>
          </div>
        )}

        {/* Alertes propres à cette parcelle */}
        <div className="card">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--f-text2)' }}>
            <AlertTriangle size={14} style={{ color: 'var(--f-primary)' }} />
            Alertes récentes ({alerts.length})
          </h2>
          {alerts.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: 'var(--f-text3)' }}>Aucune alerte pour cette parcelle</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {alerts.slice(0, 8).map(a => (
                <div key={a._id} className="rounded-lg p-2 text-xs"
                  style={{ background: a.acknowledged ? 'var(--f-surface2)' : '#fef2f2', color: a.acknowledged ? 'var(--f-text3)' : '#dc2626' }}>
                  <p className="font-medium">{a.message}</p>
                  <p className="opacity-70 mt-0.5">{format(new Date(a.createdAt), 'dd/MM HH:mm', { locale: fr })}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Historique d'arrosage */}
      <div className="card">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--f-text2)' }}>
          <Calendar size={14} style={{ color: 'var(--f-primary)' }} />
          Historique d'arrosage récent
        </h2>
        {pumpLogs.length === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: 'var(--f-text3)' }}>Aucun arrosage enregistré</p>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {pumpLogs.slice(0, 15).map(log => (
              <div key={log._id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg"
                style={{ background: 'var(--f-surface2)' }}>
                <span style={{ color: log.action === 'on' ? '#16a34a' : 'var(--f-text3)' }}>
                  {log.action === 'on' ? '💧 Pompe activée' : log.action === 'off' ? '⭕ Pompe arrêtée' : '🤖 Mode auto'}
                  {log.trigger === 'manual' ? ' (manuel)' : ' (auto)'}
                </span>
                <span style={{ color: 'var(--f-text3)' }}>{format(new Date(log.startedAt), 'dd/MM HH:mm', { locale: fr })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
