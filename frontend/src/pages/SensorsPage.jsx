import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Cpu, Wifi, WifiOff, Trash2, X, Save, Loader, AlertCircle, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { sensorsAPI, parcelsAPI } from '../api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import useAuthStore from '../store/authStore';
import useSocket from '../hooks/useSocket';
import { getPumpModeLabel } from '../utils/status';

function CreateSensorModal({ parcels, onSave, onClose }) {
  const [form, setForm] = useState({ deviceId: '', name: '', parcelId: '' });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!form.deviceId || !form.name) { toast.error('ID et nom requis'); return; }
    setLoading(true);
    const data = { deviceId: form.deviceId, name: form.name };
    if (form.parcelId) data.parcelId = form.parcelId;
    await onSave(data);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl p-6"
        style={{ background: 'var(--f-surface)', border: '1px solid var(--f-border)', boxShadow: 'var(--f-shadow-lg)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--f-text)' }}>Ajouter un capteur ESP32</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--f-text3)' }}>Configurez votre appareil IoT</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--f-text3)' }}><X size={18} /></button>
        </div>
        <div className="space-y-4 page-enter">
          <div>
            <label className="label">ID de l'appareil *</label>
            <input className="input" placeholder="ex: ESP32_001" value={form.deviceId}
              onChange={e => setForm(p => ({ ...p, deviceId: e.target.value }))} />
          </div>
          <div>
            <label className="label">Nom *</label>
            <input className="input" placeholder="ex: Capteur Tomate Nord" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Parcelle associée (optionnel)</label>
            <select className="input" value={form.parcelId}
              onChange={e => setForm(p => ({ ...p, parcelId: e.target.value }))}>
              <option value="">-- Aucune parcelle --</option>
              {parcels.map(p => <option key={p._id} value={p._id}>{p.name} ({p.cropType})</option>)}
            </select>
            {parcels.length === 0 && (
              <p className="text-xs mt-1" style={{ color: 'var(--f-accent)' }}>
                ⚠️ Créez d'abord une parcelle sur la carte
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={handleSave} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SensorsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [sensors, setSensors] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sensorCreated, setSensorCreated] = useState(false);
  // Mesures et état pompe en temps réel, par capteur — chaque carte se met
  // à jour seule dès qu'une nouvelle mesure arrive, sans recharger la page.
  const { measuresBySensor, pumpState: livePumpState } = useSocket();

  const isValidated = user?.isValidated || user?.role === 'admin';

  const fetchData = async () => {
    try {
      const [sRes, pRes] = await Promise.all([sensorsAPI.getAll(), parcelsAPI.getAll()]);
      setSensors(sRes.data || []);
      setParcels(pRes.data || []);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (form) => {
    const res = await sensorsAPI.create(form);
    if (res.success) {
      setSensorCreated(true);
      setShowModal(false);
      toast.success('Capteur créé ! Contactez l\'admin pour la clé API.');
      fetchData();
    } else {
      toast.error(res.message || 'Erreur création');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce capteur ?')) return;
    await sensorsAPI.delete(id);
    toast.success('Capteur supprimé');
    fetchData();
  };

  const handlePump = async (id, state) => {
    await sensorsAPI.setPump(id, state, 'manual');
    toast.success(`Pompe ${state ? 'activée' : 'arrêtée'}`);
    fetchData();
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--f-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'logo-spin 1s linear infinite', boxShadow: '0 4px 16px rgba(45,122,58,0.2)', padding: 9 }}>
              <img src="/logo.png" alt="chargement" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
    </div>
  );

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between fade-up">
        <div>
          <h1 className="text-2xl font-bold gradient-text" >Capteurs</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--f-text3)' }}>{sensors.length} capteur(s) configuré(s)</p>
        </div>
        {isValidated ? (
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} />Ajouter un capteur
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
            style={{ background: '#fff7ed', border: '1px solid rgba(217,119,6,0.3)', color: '#d97706' }}>
            <AlertCircle size={14} />
            Compte en attente de validation
          </div>
        )}
      </div>

      {/* Compte non validé - message */}
      {!isValidated && (
        <div className="rounded-2xl p-5 fade-up"
          style={{ background: '#fff7ed', border: '1px solid rgba(217,119,6,0.25)' }}>
          <div className="flex items-start gap-3">
            <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: '#92400e' }}>Compte en attente de validation</p>
              <p className="text-xs mt-1" style={{ color: '#b45309' }}>
                Votre compte doit être validé par un administrateur avant de pouvoir créer des capteurs et des parcelles.
                Contactez l'administrateur de la plateforme.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Message après création capteur */}
      {sensorCreated && (
        <div className="rounded-2xl p-4 fade-up"
          style={{ background: '#f0fdf4', border: '1px solid rgba(45,122,58,0.25)' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-sm" style={{ color: '#2d7a3a' }}>✅ Capteur créé avec succès !</p>
              <p className="text-xs mt-1" style={{ color: '#4a6a4a' }}>
                🔑 La clé API de ce capteur est disponible <strong>uniquement auprès de votre administrateur</strong>.
                Contactez-le pour obtenir la clé à intégrer dans votre code ESP32.
              </p>
            </div>
            <button onClick={() => setSensorCreated(false)}
              className="flex-shrink-0 text-xs px-2 py-1 rounded-lg"
              style={{ background: 'var(--f-primary-light)', color: 'var(--f-primary)' }}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* Liste capteurs */}
      {sensors.length === 0 ? (
        <div className="card text-center py-16 fade-up">
          <Cpu size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--f-text3)' }} />
          <p className="text-sm mb-4" style={{ color: 'var(--f-text3)' }}>Aucun capteur configuré</p>
          {isValidated && (
            <button onClick={() => setShowModal(true)} className="btn-primary">Ajouter un ESP32</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sensors.map(sensor => {
            const liveMeasure = measuresBySensor[sensor._id];
            const displayMeasure = liveMeasure || sensor.lastMeasure;
            const livePump = livePumpState[sensor._id];
            const displayPumpState = livePump !== undefined ? livePump : sensor.pumpState;
            const isOnline = !!liveMeasure || (sensor.lastSeen && (Date.now() - new Date(sensor.lastSeen).getTime()) < 5 * 60 * 1000);
            const lastSeenDisplay = liveMeasure ? new Date() : (sensor.lastSeen ? new Date(sensor.lastSeen) : null);
            return (
              <div key={sensor._id} className="card card-hover fade-up" onClick={() => navigate(`/sensors/${sensor._id}`)} style={{ cursor: 'pointer' }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--f-text)' }}>{sensor.name}</h3>
                    <p className="text-xs mono mt-0.5" style={{ color: 'var(--f-text3)' }}>{sensor.deviceId}</p>
                    {sensor.parcelId && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--f-primary)' }}>
                        📍 {sensor.parcelId.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
                      style={isOnline
                        ? { background: 'var(--f-primary-light)', color: 'var(--f-primary)' }
                        : { background: 'var(--f-danger-light)', color: 'var(--f-danger)' }}>
                      {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                      {isOnline ? 'En ligne' : 'Hors ligne'}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(sensor._id); }}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--f-text3)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--f-danger)'; e.currentTarget.style.background = 'var(--f-danger-light)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--f-text3)'; e.currentTarget.style.background = 'transparent'; }}>
                      <Trash2 size={15} />
                    </button>
                    <ChevronRight size={16} style={{ color: 'var(--f-text3)' }} />
                  </div>
                </div>

                {displayMeasure ? (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: 'Sol', value: `${displayMeasure.soilHumidity?.toFixed(0)}%`, color: '#0ea5e9' },
                      { label: 'Temp', value: `${displayMeasure.temperature?.toFixed(0)}°C`, color: '#f97316' },
                      { label: 'Air', value: `${displayMeasure.airHumidity?.toFixed(0)}%`, color: '#14b8a6' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="rounded-xl p-3 text-center"
                        style={{ background: 'var(--f-surface2)', border: '1px solid var(--f-border)' }}>
                        <p className="text-xs mb-1" style={{ color: 'var(--f-text3)' }}>{label}</p>
                        <p className="text-lg font-bold" style={{ color }}>{value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl p-4 text-center text-sm mb-4"
                    style={{ background: 'var(--f-surface2)', color: 'var(--f-text3)' }}>
                    En attente de données ESP32...
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--f-text3)' }}>
                      Mode: <span style={{ color: 'var(--f-text)', fontWeight: 600 }}>{getPumpModeLabel(sensor.pumpMode)}</span>
                    </p>
                    {lastSeenDisplay && (
                      <p className="text-xs" style={{ color: 'var(--f-text3)' }}>
                        {format(lastSeenDisplay, 'dd/MM HH:mm', { locale: fr })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--f-text3)' }}>Pompe:</span>
                    <button onClick={(e) => { e.stopPropagation(); handlePump(sensor._id, true); }}
                      className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all"
                      style={displayPumpState
                        ? { background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd' }
                        : { background: 'var(--f-surface2)', color: 'var(--f-text3)', border: '1px solid var(--f-border)' }}>
                      ON
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handlePump(sensor._id, false); }}
                      className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all"
                      style={!displayPumpState
                        ? { background: 'var(--f-surface2)', color: 'var(--f-text)', border: '1px solid var(--f-border)', fontWeight: 600 }
                        : { background: 'var(--f-surface2)', color: 'var(--f-text3)', border: '1px solid var(--f-border)' }}>
                      OFF
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <CreateSensorModal parcels={parcels} onSave={handleCreate} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
