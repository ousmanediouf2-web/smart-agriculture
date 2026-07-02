import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Droplets, Thermometer, Wind, Wifi, WifiOff, MapPin, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { sensorsAPI, measuresAPI } from '../api';
import useSocket from '../hooks/useSocket';
import { getPumpModeLabel } from '../utils/status';

// Page de détail d'un capteur : reprend le principe du Dashboard (résumé +
// graphique alimenté en direct par Socket.IO) mais centré sur UN seul
// capteur, accessible en cliquant sur sa carte depuis /sensors.
export default function SensorDetailPage() {
  const { sensorId } = useParams();
  const navigate = useNavigate();
  const [sensor, setSensor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState([]);
  const { measuresBySensor, pumpState: livePumpState, isConnected } = useSocket();

  const fetchSensor = async () => {
    try {
      const res = await sensorsAPI.getStatus(sensorId);
      if (res.success) setSensor(res.data);
      else toast.error(res.message || 'Capteur introuvable');
    } catch {
      toast.error('Erreur de chargement du capteur');
    } finally {
      setLoading(false);
    }
  };

  // Historique récent pour amorcer le graphique au chargement — ensuite
  // les nouveaux points arrivent en direct via Socket.IO (voir useEffect plus bas)
  const fetchSeries = async () => {
    try {
      const res = await measuresAPI.getAll({ sensorId, limit: 600 });
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
    fetchSensor();
    fetchSeries();
    // Filet de sécurité si le socket est déconnecté un moment
    const interval = setInterval(fetchSensor, 30000);
    return () => clearInterval(interval);
  }, [sensorId]);

  // Mesure live reçue pour CE capteur précis → ajoutée au graphique et
  // utilisée comme valeur affichée en priorité sur les cartes ci-dessous
  const liveMeasure = measuresBySensor[sensorId];

  useEffect(() => {
    if (!liveMeasure) return;
    setSeries(prev => [...prev, {
      time: format(new Date(), 'HH:mm'),
      'Humidité Sol': liveMeasure.soilHumidity,
      'Température': liveMeasure.temperature,
      'Humidité Air': liveMeasure.airHumidity,
    }].slice(-600));
  }, [liveMeasure]);

  const handlePump = async (state) => {
    try {
      await sensorsAPI.setPump(sensorId, state, 'manual');
      toast.success(`Pompe ${state ? 'activée' : 'arrêtée'}`);
      fetchSensor();
    } catch {
      toast.error('Erreur commande pompe');
    }
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #2e7d32, #43a047)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'logo-spin 1.2s linear infinite', padding: 10 }}>
        <img src="/logo.png" alt="chargement" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
    </div>
  );

  if (!sensor) return (
    <div className="text-center py-16">
      <p style={{ color: 'var(--f-text3)' }}>Capteur introuvable.</p>
      <button onClick={() => navigate('/sensors')} className="btn-primary mt-4">Retour aux capteurs</button>
    </div>
  );

  const displayMeasure = liveMeasure || sensor.lastMeasure;
  const livePump = livePumpState[sensorId];
  const displayPumpState = livePump !== undefined ? livePump : sensor.pumpState;
  const isOnline = !!liveMeasure || sensor.isOnline;
  const lastSeenDisplay = liveMeasure ? new Date() : (sensor.lastSeen ? new Date(sensor.lastSeen) : null);

  return (
    <div className="space-y-6 page-enter">
      {/* En-tête avec retour */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/sensors')}
          className="p-2 rounded-xl transition-colors flex-shrink-0"
          style={{ background: 'var(--f-surface)', border: '1px solid var(--f-border)', color: 'var(--f-text2)' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--f-text)', fontFamily: "'Playfair Display', serif" }}>{sensor.name}</h1>
          <p className="text-sm mt-0.5 mono" style={{ color: 'var(--f-text3)' }}>
            {sensor.deviceId}
            {sensor.parcelId?.name && (
              <span> · <MapPin size={11} style={{ display: 'inline', marginBottom: 2 }} /> {sensor.parcelId.name}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium flex-shrink-0"
          style={isOnline
            ? { background: 'var(--f-primary-light)', color: 'var(--f-primary)' }
            : { background: 'var(--f-danger-light)', color: 'var(--f-danger)' }}>
          {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
          {isOnline ? 'En ligne' : 'Hors ligne'}
        </div>
      </div>

      {!isConnected && (
        <p className="text-xs text-center" style={{ color: 'var(--f-text3)' }}>
          ⚠️ Connexion temps réel en cours... (rafraîchissement automatique toutes les 30s en attendant)
        </p>
      )}

      {/* Cartes mesures en direct */}
      {displayMeasure ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Humidité du sol', value: displayMeasure.soilHumidity, unit: '%', icon: Droplets, color: '#0ea5e9' },
            { label: 'Température', value: displayMeasure.temperature, unit: '°C', icon: Thermometer, color: '#f97316' },
            { label: 'Humidité de l\'air', value: displayMeasure.airHumidity, unit: '%', icon: Wind, color: '#14b8a6' },
          ].map(({ label, value, unit, icon: Icon, color }) => (
            <div key={label} className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--f-text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
                  <Icon size={18} style={{ color }} />
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--f-text)' }}>
                {value?.toFixed(1)}<span className="text-sm font-normal ml-1" style={{ color: 'var(--f-text3)' }}>{unit}</span>
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-10">
          <p className="text-sm" style={{ color: 'var(--f-text3)' }}>En attente de données ESP32...</p>
        </div>
      )}

      {/* Graphique temps réel */}
      <div className="card">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--f-text2)' }}>Évolution en direct</h2>
        {series.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color: 'var(--f-text3)' }}>Pas encore assez de données pour ce capteur.</p>
        ) : (
          <ResponsiveContainer width="100%" height={440}>
            <LineChart data={series} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--f-border)" />
              <XAxis dataKey="time" tick={{ fill: 'var(--f-text3)', fontSize: 11 }}
                interval={Math.max(0, Math.ceil(series.length / 12) - 1)} />
              <YAxis tick={{ fill: 'var(--f-text3)', fontSize: 11 }} width={36} />
              <Tooltip contentStyle={{ background: 'var(--f-surface)', border: '1px solid var(--f-border)', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Humidité Sol" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Température" stroke="#f97316" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Humidité Air" stroke="#14b8a6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Contrôle pompe */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--f-text2)' }}>Pompe</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--f-text3)' }}>
              Mode : <span style={{ color: 'var(--f-text)', fontWeight: 600 }}>{getPumpModeLabel(sensor.pumpMode)}</span>
              {lastSeenDisplay && (
                <span> · <Clock size={11} style={{ display: 'inline', marginBottom: 2 }} /> {format(lastSeenDisplay, 'dd/MM HH:mm', { locale: fr })}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handlePump(true)}
              className="px-4 py-2 text-xs rounded-lg font-medium transition-all"
              style={displayPumpState
                ? { background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd' }
                : { background: 'var(--f-surface2)', color: 'var(--f-text3)', border: '1px solid var(--f-border)' }}>
              💧 ON
            </button>
            <button onClick={() => handlePump(false)}
              className="px-4 py-2 text-xs rounded-lg font-medium transition-all"
              style={!displayPumpState
                ? { background: 'var(--f-surface2)', color: 'var(--f-text)', border: '1px solid var(--f-border)', fontWeight: 600 }
                : { background: 'var(--f-surface2)', color: 'var(--f-text3)', border: '1px solid var(--f-border)' }}>
              ⭕ OFF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
