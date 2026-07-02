import React, { useState } from 'react';
import { Download, FileText, FileJson, AlertTriangle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportAPI } from '../api';
import useAuthStore from '../store/authStore';

export default function ExportPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState({});
  const [sending, setSending] = useState({});
  const [filters, setFilters] = useState({ from: '', to: '', cropType: '', parcelId: '' });

  const hasTelegram = !!user?.telegramChatId;

  const buildParams = () => {
    const params = {};
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.cropType) params.cropType = filters.cropType;
    if (filters.parcelId) params.parcelId = filters.parcelId;
    return params;
  };

  const handleExport = async (key) => {
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      const params = buildParams();
      if (key === 'measures_csv') await exportAPI.measuresCsv(params);
      else if (key === 'measures_json') await exportAPI.measuresJson(params);
      else if (key === 'alerts_csv') await exportAPI.alertsCsv();
      toast.success('Téléchargement démarré');
    } catch (err) {
      toast.error('Erreur lors de l\'export');
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleSendTelegram = async (key) => {
    if (!hasTelegram) {
      toast.error('Configurez votre Chat ID Telegram dans Paramètres');
      return;
    }
    setSending(prev => ({ ...prev, [key]: true }));
    try {
      const params = buildParams();
      let res;
      if (key === 'measures_csv') res = await exportAPI.sendMeasuresCsvToTelegram(params);
      else if (key === 'alerts_csv') res = await exportAPI.sendAlertsCsvToTelegram();

      if (res?.success) toast.success('📤 Fichier envoyé sur Telegram !');
      else toast.error(res?.message || 'Erreur lors de l\'envoi');
    } catch (err) {
      toast.error('Erreur lors de l\'envoi vers Telegram');
    } finally {
      setSending(prev => ({ ...prev, [key]: false }));
    }
  };

  const cards = [
    {
      key: 'measures_csv',
      icon: FileText,
      title: 'Mesures CSV',
      desc: 'Toutes les mesures des capteurs au format CSV (compatible Excel)',
      color: 'bg-green-900/20 border-green-800/40',
      iconColor: 'text-green-400',
      badge: 'CSV',
      canTelegram: true
    },
    {
      key: 'measures_json',
      icon: FileJson,
      title: 'Mesures JSON',
      desc: 'Toutes les mesures au format JSON (pour développeurs)',
      color: 'bg-blue-900/20 border-blue-800/40',
      iconColor: 'text-blue-400',
      badge: 'JSON',
      canTelegram: false
    },
    {
      key: 'alerts_csv',
      icon: AlertTriangle,
      title: 'Alertes CSV',
      desc: 'Historique complet des alertes au format CSV',
      color: 'bg-orange-900/20 border-orange-800/40',
      iconColor: 'text-orange-400',
      badge: 'CSV',
      canTelegram: true
    }
  ];

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Export des données</h1>
        <p className="text-gray-500 text-sm mt-0.5">Téléchargez vos données en CSV/JSON ou envoyez-les directement sur Telegram</p>
      </div>

      {!hasTelegram && (
        <div className="card bg-blue-900/10 border border-blue-800/30">
          <p className="text-xs text-blue-300">
            💡 Configurez votre <strong>Chat ID Telegram</strong> dans <strong>Paramètres</strong> pour pouvoir envoyer vos exports directement sur Telegram, sans téléchargement manuel.
          </p>
        </div>
      )}

      {/* Filtres */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Filtres (optionnel)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Date début</label>
            <input type="datetime-local" className="input" value={filters.from}
              onChange={e => setFilters(p => ({ ...p, from: e.target.value }))} />
          </div>
          <div>
            <label className="label">Date fin</label>
            <input type="datetime-local" className="input" value={filters.to}
              onChange={e => setFilters(p => ({ ...p, to: e.target.value }))} />
          </div>
          <div>
            <label className="label">Culture</label>
            <select className="input" value={filters.cropType}
              onChange={e => setFilters(p => ({ ...p, cropType: e.target.value }))}>
              <option value="">Toutes</option>
              <option value="tomate">Tomate</option>
              <option value="aubergine">Aubergine</option>
              <option value="manioc">Manioc</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => setFilters({ from: '', to: '', cropType: '', parcelId: '' })}
              className="btn-secondary w-full text-sm">Réinitialiser</button>
          </div>
        </div>
      </div>

      {/* Options d'export */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map(({ key, icon: Icon, title, desc, color, iconColor, badge, canTelegram }) => (
          <div key={key} className={`border rounded-xl p-5 ${color}`}>
            <div className="flex items-start justify-between mb-3">
              <Icon size={24} className={iconColor} />
              <span className="badge bg-gray-800 text-gray-400 text-xs">{badge}</span>
            </div>
            <h3 className="font-semibold text-white mb-1">{title}</h3>
            <p className="text-xs text-gray-500 mb-4">{desc}</p>

            <div className="space-y-2">
              <button
                onClick={() => handleExport(key)}
                disabled={loading[key]}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium bg-gray-800 hover:bg-gray-700 text-white transition-colors disabled:opacity-50"
              >
                {loading[key] ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Download size={14} />
                )}
                {loading[key] ? 'Export en cours...' : 'Télécharger'}
              </button>

              {canTelegram && (
                <button
                  onClick={() => handleSendTelegram(key)}
                  disabled={sending[key]}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(37,99,235,0.15)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.3)' }}
                >
                  {sending[key] ? (
                    <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full" />
                  ) : (
                    <Send size={14} />
                  )}
                  {sending[key] ? 'Envoi...' : 'Envoyer sur Telegram'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="card bg-gray-800/50">
        <p className="text-xs text-gray-500">
          💡 Les exports CSV sont encodés en UTF-8 avec BOM (pour compatibilité Excel).
          Les fichiers incluent jusqu'à 10 000 enregistrements. L'envoi Telegram livre le fichier directement dans votre conversation avec le bot.
        </p>
      </div>
    </div>
  );
}
