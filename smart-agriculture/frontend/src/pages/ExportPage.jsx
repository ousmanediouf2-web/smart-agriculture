import React, { useState } from 'react';
import { Download, FileText, FileJson, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportAPI } from '../api';

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function ExportPage() {
  const [loading, setLoading] = useState({});
  const [filters, setFilters] = useState({ from: '', to: '', cropType: '', parcelId: '' });

  const handleExport = async (type) => {
    setLoading(prev => ({ ...prev, [type]: true }));
    try {
      const params = {};
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.cropType) params.cropType = filters.cropType;
      if (filters.parcelId) params.parcelId = filters.parcelId;

      let res, filename;
      if (type === 'measures_csv') {
        res = await exportAPI.measuresCsv(params);
        filename = `mesures_${Date.now()}.csv`;
      } else if (type === 'measures_json') {
        res = await exportAPI.measuresJson(params);
        filename = `mesures_${Date.now()}.json`;
      } else if (type === 'alerts_csv') {
        res = await exportAPI.alertsCsv();
        filename = `alertes_${Date.now()}.csv`;
      }

      downloadBlob(res.data, filename);
      toast.success('Téléchargement démarré');
    } catch (err) {
      toast.error('Erreur lors de l\'export');
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Export des données</h1>
        <p className="text-gray-500 text-sm mt-0.5">Téléchargez vos données en CSV ou JSON</p>
      </div>

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
        {[
          {
            key: 'measures_csv',
            icon: FileText,
            title: 'Mesures CSV',
            desc: 'Toutes les mesures des capteurs au format CSV (compatible Excel)',
            color: 'bg-green-900/20 border-green-800/40',
            iconColor: 'text-green-400',
            badge: 'CSV'
          },
          {
            key: 'measures_json',
            icon: FileJson,
            title: 'Mesures JSON',
            desc: 'Toutes les mesures au format JSON (pour développeurs)',
            color: 'bg-blue-900/20 border-blue-800/40',
            iconColor: 'text-blue-400',
            badge: 'JSON'
          },
          {
            key: 'alerts_csv',
            icon: AlertTriangle,
            title: 'Alertes CSV',
            desc: 'Historique complet des alertes au format CSV',
            color: 'bg-orange-900/20 border-orange-800/40',
            iconColor: 'text-orange-400',
            badge: 'CSV'
          }
        ].map(({ key, icon: Icon, title, desc, color, iconColor, badge }) => (
          <div key={key} className={`border rounded-xl p-5 ${color}`}>
            <div className="flex items-start justify-between mb-3">
              <Icon size={24} className={iconColor} />
              <span className="badge bg-gray-800 text-gray-400 text-xs">{badge}</span>
            </div>
            <h3 className="font-semibold text-white mb-1">{title}</h3>
            <p className="text-xs text-gray-500 mb-4">{desc}</p>
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
          </div>
        ))}
      </div>

      <div className="card bg-gray-800/50">
        <p className="text-xs text-gray-500">
          💡 Les exports CSV sont encodés en UTF-8 avec BOM (pour compatibilité Excel).
          Les fichiers incluent jusqu'à 10 000 enregistrements. Pour des volumes plus importants, utilisez l'API directement.
        </p>
      </div>
    </div>
  );
}
