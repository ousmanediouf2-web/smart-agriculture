import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
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

const PRIORITY = {
  critical: { color: '#ef4444', bg: '#fee2e2', border: 'rgba(220,38,38,0.2)', label: 'Critique' },
  high:     { color: '#f97316', bg: '#fff7ed', border: 'rgba(249,115,22,0.2)', label: 'Haute' },
  medium:   { color: '#eab308', bg: '#fefce8', border: 'rgba(234,179,8,0.15)', label: 'Moyenne' },
  low:      { color: '#3b82f6', bg: '#eff6ff', border: 'rgba(59,130,246,0.2)', label: 'Faible' },
};

const S = {
  text: { color: 'var(--a-text)' },
  text3: { color: 'var(--a-text3)' },
};

export default function AdminAlerts() {
  const { users, selectedUserId, setSelectedUserId } = useAdminFilter();
  const [allAlerts, setAllAlerts] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchData = async () => {
    const [aRes, pRes] = await Promise.all([
      adminFetch('GET', '/alerts?limit=100'),
      adminFetch('GET', '/parcels')
    ]);
    if (aRes.success) setAllAlerts(aRes.data || []);
    if (pRes.success) setParcels(pRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const byUser = selectedUserId === 'all' ? allAlerts
    : allAlerts.filter(a => {
        const parcel = parcels.find(p => p._id === (a.parcelId?._id || a.parcelId));
        return (parcel?.userId?._id || parcel?.userId) === selectedUserId;
      });

  const alerts = byUser.filter(a => {
    if (filter === 'unread') return !a.acknowledged;
    if (filter === 'critical') return a.priority === 'critical';
    return true;
  });

  const unread = byUser.filter(a => !a.acknowledged).length;

  const handleAck = async (id) => {
    const res = await adminFetch('PUT', `/alerts/${id}/acknowledge`);
    if (res.success) { toast.success('Acquittée'); fetchData(); }
  };

  const handleAckAll = async () => {
    await adminFetch('PUT', '/alerts/acknowledge-all');
    toast.success('Toutes acquittées');
    fetchData();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={S.text}>
            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
            Alertes
            {unread > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid rgba(220,38,38,0.2)' }}>
                {unread}
              </span>
            )}
          </h1>
          <p className="text-xs mt-0.5" style={S.text3}>
            {alerts.length} alerte(s) {selectedUserId !== 'all' ? 'de cet utilisateur' : 'au total'}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={handleAckAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: '#ecfdf5', border: '1px solid rgba(5,150,105,0.3)', color: '#059669' }}>
            <CheckCircle size={14} />Tout acquitter
          </button>
        )}
      </div>

      <UserFilterBar users={users} selectedUserId={selectedUserId} onChange={setSelectedUserId} />

      <div className="flex gap-2">
        {[['all', 'Toutes'], ['unread', 'Non lues'], ['critical', 'Critiques']].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={filter === key
              ? { background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white' }
              : { background: 'var(--a-surface2)', color: 'var(--a-text3)', border: '1px solid var(--a-border)' }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 rounded-full"
            style={{ borderColor: 'var(--a-border)', borderTopColor: 'var(--a-primary)' }} />
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12 text-sm" style={S.text3}>Aucune alerte</div>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => {
            const p = PRIORITY[alert.priority] || PRIORITY.low;
            const parcel = parcels.find(pa => pa._id === (alert.parcelId?._id || alert.parcelId));
            const owner = users.find(u => u._id === (parcel?.userId?._id || parcel?.userId));
            return (
              <div key={alert._id}
                style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 14, padding: 14, opacity: alert.acknowledged ? 0.6 : 1 }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: p.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-xs font-bold" style={{ color: p.color }}>{p.label.toUpperCase()}</span>
                        <span className="text-xs" style={S.text3}>{alert.type?.replace(/_/g, ' ')}</span>
                        {alert.smsSent && <span className="text-xs" style={{ color: '#059669' }}>📱 WhatsApp ✓</span>}
                        {selectedUserId === 'all' && owner && (
                          <span className="text-xs" style={{ color: 'var(--a-primary)' }}>👤 {owner.name}</span>
                        )}
                      </div>
                      <p className="text-sm" style={S.text}>{alert.message}</p>
                      <p className="text-xs mt-1" style={S.text3}>
                        {format(new Date(alert.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        {alert.parcelId && ` • ${alert.parcelId.name || parcel?.name}`}
                      </p>
                    </div>
                  </div>
                  {!alert.acknowledged && (
                    <button onClick={() => handleAck(alert._id)}
                      className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
                      style={{ color: '#059669' }}>
                      <CheckCircle size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
