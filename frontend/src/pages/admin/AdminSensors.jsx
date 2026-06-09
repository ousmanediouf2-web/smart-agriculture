import React, { useEffect, useState } from 'react';
import { Cpu, Trash2, RefreshCw } from 'lucide-react';
import { BACKEND_URL } from '../../api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import UserFilterBar from '../../components/UI/UserFilterBar';
import { useAdminFilter } from '../../hooks/useAdminFilter';

const token = () => localStorage.getItem('token') || sessionStorage.getItem('token');

const adminFetch = (method, path, body = null) =>
  fetch(`${BACKEND_URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    body: body ? JSON.stringify(body) : null
  }).then(r => r.json());

const ApiKeyModal = ({ sensor, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  const copy = () => {
    if (!sensor.apiKey) return;
    navigator.clipboard.writeText(sensor.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl p-6"
        style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', boxShadow: 'var(--a-shadow-lg)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--a-text)' }}>
              🔑 Clé API — {sensor.name}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--a-text3)' }}>
              {sensor.deviceId} • {sensor.parcelId?.name || 'Non assigné'}
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--a-text3)' }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>×</span>
          </button>
        </div>

        {/* Clé API */}
        <div className="rounded-xl p-4 mb-4"
          style={{ background: 'var(--a-surface2)', border: '1px solid var(--a-border)' }}>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--a-text3)' }}>
            Clé API ESP32
          </p>
          {sensor.apiKey ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs break-all select-all"
                style={{ color: 'var(--a-primary)', fontFamily: 'monospace', lineHeight: 1.6 }}>
                {sensor.apiKey}
              </code>
              <button onClick={copy}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={copied
                  ? { background: '#f0fdf4', color: '#16a34a', border: '1px solid rgba(34,197,94,0.3)' }
                  : { background: 'var(--a-primary-light)', color: 'var(--a-primary)', border: '1px solid rgba(37,99,235,0.2)', cursor: 'pointer' }}>
                {copied ? '✓ Copié' : 'Copier'}
              </button>
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--a-text3)' }}>
              Clé API non disponible — le capteur a peut-être été créé avant cette version.
            </p>
          )}
        </div>

        {/* Instructions ESP32 */}
        <div className="rounded-xl p-3 mb-4"
          style={{ background: '#fffbeb', border: '1px solid rgba(217,119,6,0.2)' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#92400e' }}>
            📋 Intégration dans le code ESP32
          </p>
          <code className="text-xs block" style={{ color: '#b45309', fontFamily: 'monospace' }}>
            {'const char* API_KEY = "'}
            <span style={{ color: '#d97706' }}>{sensor.apiKey || 'VOTRE_CLE_ICI'}</span>
            {'";'}
          </code>
        </div>

        {/* Infos capteur */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            ['Statut', sensor.isActive ? '✅ Actif' : '⭕ Inactif'],
            ['Pompe', sensor.pumpState ? '💧 ON' : '⭕ OFF'],
            ['Mode', sensor.pumpMode || 'auto'],
            ['Dernière vue', sensor.lastSeen ? new Date(sensor.lastSeen).toLocaleDateString('fr-FR') : 'Jamais'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg p-2"
              style={{ background: 'var(--a-surface2)', border: '1px solid var(--a-border)' }}>
              <p className="text-xs" style={{ color: 'var(--a-text3)' }}>{label}</p>
              <p className="text-xs font-semibold" style={{ color: 'var(--a-text)' }}>{value}</p>
            </div>
          ))}
        </div>

        <button onClick={onClose}
          className="w-full py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white', cursor: 'pointer' }}>
          Fermer
        </button>
      </div>
    </div>
  );
};

const S = {
  card: { background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 16, padding: 20, boxShadow: 'var(--a-shadow)' },
  row: { background: 'var(--a-surface2)', border: '1px solid var(--a-border)', borderRadius: 12, padding: 14, marginBottom: 8 },
  text: { color: 'var(--a-text)' },
  text3: { color: 'var(--a-text3)' },
};

export default function AdminSensors() {
  const { users, selectedUserId, setSelectedUserId } = useAdminFilter();
  const [allSensors, setAllSensors] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSensor, setSelectedSensor] = React.useState(null);

  const fetchData = async () => {
    const [sRes, pRes] = await Promise.all([
      adminFetch('GET', '/sensors'),
      adminFetch('GET', '/parcels')
    ]);
    if (sRes.success) setAllSensors(sRes.data || []);
    if (pRes.success) setParcels(pRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const sensors = selectedUserId === 'all' ? allSensors
    : allSensors.filter(s => {
        const parcel = parcels.find(p => p._id === (s.parcelId?._id || s.parcelId));
        return (parcel?.userId?._id || parcel?.userId) === selectedUserId;
      });

  const handlePump = async (id, state) => {
    const res = await adminFetch('PUT', `/sensors/${id}/pump`, { state, mode: 'manual' });
    if (res.success) { toast.success(`Pompe ${state ? 'activée' : 'arrêtée'}`); fetchData(); }
    else toast.error(res.message);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce capteur ?')) return;
    await adminFetch('DELETE', `/sensors/${id}`);
    toast.success('Capteur supprimé');
    fetchData();
  };

  return (
    <div className="space-y-5">
      {selectedSensor && <ApiKeyModal sensor={selectedSensor} onClose={() => setSelectedSensor(null)} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={S.text}>
            <Cpu size={18} style={{ color: 'var(--a-primary)' }} />
            Capteurs
          </h1>
          <p className="text-xs mt-0.5" style={S.text3}>
            {sensors.length} capteur(s) {selectedUserId !== 'all' ? 'de cet utilisateur' : 'au total'}
          </p>
        </div>
        <button onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-colors"
          style={{ background: 'var(--a-surface2)', border: '1px solid var(--a-border)', color: 'var(--a-text3)' }}>
          <RefreshCw size={12} />Actualiser
        </button>
      </div>

      <UserFilterBar users={users} selectedUserId={selectedUserId} onChange={setSelectedUserId} />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 rounded-full"
            style={{ borderColor: 'var(--a-border)', borderTopColor: 'var(--a-primary)' }} />
        </div>
      ) : sensors.length === 0 ? (
        <div className="text-center py-12 text-sm" style={S.text3}>
          Aucun capteur{selectedUserId !== 'all' ? ' pour cet utilisateur' : ''}
        </div>
      ) : (
        <div className="space-y-2">
          {sensors.map(sensor => {
            const isOnline = sensor.lastSeen && Date.now() - new Date(sensor.lastSeen).getTime() < 5 * 60 * 1000;
            const parcel = parcels.find(p => p._id === (sensor.parcelId?._id || sensor.parcelId));
            return (
              <div key={sensor._id} style={{ ...S.row, cursor: 'pointer' }}
                onClick={() => setSelectedSensor(sensor)}
                onMouseEnter={e => { e.currentTarget.style.border = '1px solid var(--a-primary)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.border = '1px solid var(--a-border)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: isOnline ? '#22c55e' : '#ef4444' }} />
                    <div>
                      <p className="font-semibold text-sm" style={S.text}>{sensor.name}</p>
                      <p className="text-xs" style={{ ...S.text3, fontFamily: 'monospace' }}>{sensor.deviceId}</p>
                      <p className="text-xs" style={S.text3}>
                        Parcelle: {sensor.parcelId?.name || parcel?.name || 'Non assigné'}
                        {selectedUserId === 'all' && parcel && (() => {
                          const owner = users.find(u => u._id === (parcel.userId?._id || parcel.userId));
                          return owner ? ` • ${owner.name}` : '';
                        })()}
                      </p>
                      {sensor.lastSeen && (
                        <p className="text-xs" style={S.text3}>
                          Vu: {format(new Date(sensor.lastSeen), 'dd/MM HH:mm', { locale: fr })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {sensor.lastMeasure && (
                      <div className="text-xs text-right hidden sm:block">
                        <p style={{ color: '#0ea5e9' }}>Sol: {sensor.lastMeasure.soilHumidity?.toFixed(0)}%</p>
                        <p style={{ color: '#f97316' }}>{sensor.lastMeasure.temperature?.toFixed(0)}°C</p>
                      </div>
                    )}
                    <div className="flex gap-1">
                      <button
                        onClick={() => handlePump(sensor._id, true)}
                        disabled={sensor.pumpState}
                        className="px-2.5 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-30"
                        style={{ background: 'rgba(59,130,246,0.3)', border: '1px solid rgba(59,130,246,0.4)' }}>
                        ON
                      </button>
                      <button
                        onClick={() => handlePump(sensor._id, false)}
                        disabled={!sensor.pumpState}
                        className="px-2.5 py-1.5 text-xs font-medium rounded-lg disabled:opacity-30"
                        style={{ background: 'var(--a-surface)', border: '1px solid var(--a-border)', color: 'var(--a-text3)' }}>
                        OFF
                      </button>
                    </div>
                    <button
                      onClick={() => handleDelete(sensor._id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--a-text3)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fee2e2'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--a-text3)'; e.currentTarget.style.background = 'transparent'; }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
