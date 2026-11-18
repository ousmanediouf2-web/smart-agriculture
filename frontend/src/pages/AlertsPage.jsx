import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Bell, BellOff } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { alertsAPI } from '../api';
import useSocket from '../hooks/useSocket';
import { getAlertTypeLabel, getAlertPriorityLabel } from '../utils/status';

const PRIORITY_STYLES = {
  critical: 'border-red-200 bg-red-50',
  high: 'border-orange-200 bg-orange-50',
  medium: 'border-amber-200 bg-amber-50',
  low: 'border-sky-200 bg-sky-50'
};
const PRIORITY_BADGE = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-sky-100 text-sky-800'
};
const ALERT_ICONS = {
  soil_dry: '🌵', soil_wet: '💧', temp_critical: '🌡️',
  pump_on: '💧', pump_off: '✅', sensor_offline: '📡',
  no_data: '📊', system_error: '⚠️', humidity_danger: '🌫️'
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const { newAlert } = useSocket();

  const fetchAlerts = async () => {
    try {
      const params = {};
      if (filter === 'unread') params.acknowledged = false;
      if (filter === 'critical') params.priority = 'critical';
      const res = await alertsAPI.getAll({ ...params, limit: 100 });
      setAlerts(res.data || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      toast.error('Erreur chargement alertes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, [filter]);

  useEffect(() => {
    if (newAlert) {
      setAlerts(prev => [newAlert, ...prev]);
      setUnreadCount(prev => prev + 1);
      toast.error(newAlert.message, { duration: 5000 });
    }
  }, [newAlert]);

  const handleAcknowledge = async (id) => {
    try {
      await alertsAPI.acknowledge(id);
      setAlerts(prev => prev.map(a => a._id === id ? { ...a, acknowledged: true } : a));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      toast.error('Erreur acquittement');
    }
  };

  const handleAcknowledgeAll = async () => {
    try {
      await alertsAPI.acknowledgeAll();
      setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true })));
      setUnreadCount(0);
      toast.success('Toutes les alertes acquittées');
    } catch {
      toast.error('Erreur');
    }
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Alertes</h1>
          <p className="text-gray-500 text-sm mt-0.5">{unreadCount} alerte(s) non lue(s)</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleAcknowledgeAll} className="btn-secondary flex items-center gap-2 text-sm">
            <CheckCircle size={16} />
            Tout acquitter
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        {['all', 'unread', 'critical'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-green-700 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:text-gray-900'
            }`}
          >
            {f === 'all' ? 'Toutes' : f === 'unread' ? 'Non lues' : 'Critiques'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="card text-center py-16">
          <Bell size={40} className="mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500">Aucune alerte</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => (
            <div
              key={alert._id}
              className={`border rounded-xl p-4 transition-opacity ${PRIORITY_STYLES[alert.priority]} ${alert.acknowledged ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{ALERT_ICONS[alert.type] || '⚠️'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`badge ${PRIORITY_BADGE[alert.priority]}`}>{getAlertPriorityLabel(alert.priority)}</span>
                    <span className="text-xs text-gray-500">{getAlertTypeLabel(alert.type)}</span>
                    {alert.smsSent && <span className="badge bg-green-100 text-green-700">Telegram envoyé</span>}
                  </div>
                  <p className="text-sm text-gray-800">{alert.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-xs text-gray-600">
                      {format(new Date(alert.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                    </p>
                    {alert.parcelId && <p className="text-xs text-gray-600">{alert.parcelId.name}</p>}
                  </div>
                </div>
                {!alert.acknowledged && (
                  <button
                    onClick={() => handleAcknowledge(alert._id)}
                    className="flex-shrink-0 text-gray-500 hover:text-green-700 transition-colors"
                    title="Acquitter"
                  >
                    <CheckCircle size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
