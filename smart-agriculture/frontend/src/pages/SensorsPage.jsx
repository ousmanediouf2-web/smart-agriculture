import React, { useEffect, useState } from 'react';
import { Plus, Cpu, Wifi, WifiOff, Trash2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { sensorsAPI, parcelsAPI } from '../api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function CreateSensorModal({ parcels, onSave, onClose }) {
  const [form, setForm] = useState({ deviceId: '', name: '', parcelId: '' });

  const handleSave = () => {
    if (!form.deviceId || !form.name) return toast.error('ID et nom requis');
    // Envoyer parcelId seulement s'il est sélectionné
    const data = { deviceId: form.deviceId, name: form.name };
    if (form.parcelId && form.parcelId !== '') data.parcelId = form.parcelId;
    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold text-white mb-4">Ajouter un capteur ESP32</h2>
        <div className="space-y-4">
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
              <p className="text-xs text-yellow-500 mt-1">⚠️ Aucune parcelle disponible — créez d'abord une parcelle sur la carte</p>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={handleSave} className="btn-primary flex-1">Créer</button>
        </div>
      </div>
    </div>
  );
}

export default function SensorsPage() {
  const [sensors, setSensors] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState(null);

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
    try {
      const res = await sensorsAPI.create(form);
      if (res.success) {
        setNewApiKey(res.apiKey);
        setShowModal(false);
        toast.success('Capteur créé !');
        fetchData();
      } else {
        toast.error(res.message || 'Erreur création');
      }
    } catch (err) {
      toast.error('Erreur: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce capteur ?')) return;
    try {
      await sensorsAPI.delete(id);
      toast.success('Capteur supprimé');
      fetchData();
    } catch { toast.error('Erreur suppression'); }
  };

  const handlePump = async (id, state) => {
    try {
      await sensorsAPI.setPump(id, state, 'manual');
      toast.success(`Pompe ${state ? 'activée' : 'arrêtée'}`);
      fetchData();
    } catch { toast.error('Erreur contrôle pompe'); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Capteurs</h1>
          <p className="text-gray-500 text-sm mt-0.5">{sensors.length} capteur(s) configuré(s)</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />Ajouter
        </button>
      </div>

      {/* Clé API */}
      {newApiKey && (
        <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4">
          <p className="text-green-400 font-semibold mb-2">✅ Capteur créé ! Copiez cette clé API :</p>
          <div className="flex items-center gap-3 bg-gray-900 rounded-lg p-3">
            <code className="text-green-300 text-sm font-mono flex-1 break-all">{newApiKey}</code>
            <button onClick={() => { navigator.clipboard.writeText(newApiKey); toast.success('Copié !'); }}
              className="text-gray-400 hover:text-white flex-shrink-0"><Copy size={16} /></button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Mettez cette clé dans le code ESP32 → variable API_KEY</p>
          <button onClick={() => setNewApiKey(null)} className="text-xs text-gray-500 hover:text-gray-300 mt-2">Fermer</button>
        </div>
      )}

      {sensors.length === 0 ? (
        <div className="card text-center py-16">
          <Cpu size={40} className="mx-auto mb-3 text-gray-700" />
          <p className="text-gray-500 mb-4">Aucun capteur configuré</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">Ajouter un ESP32</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sensors.map(sensor => {
            const isOnline = sensor.lastSeen && (Date.now() - new Date(sensor.lastSeen).getTime()) < 5 * 60 * 1000;
            return (
              <div key={sensor._id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white">{sensor.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">{sensor.deviceId}</p>
                    {sensor.parcelId && <p className="text-xs text-gray-400 mt-0.5">📍 {sensor.parcelId.name}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${isOnline ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                      {isOnline ? 'En ligne' : 'Hors ligne'}
                    </div>
                    <button onClick={() => handleDelete(sensor._id)} className="text-gray-600 hover:text-red-400">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {sensor.lastMeasure ? (
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-gray-800 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Sol</p>
                      <p className="text-lg font-bold text-blue-400">{sensor.lastMeasure.soilHumidity?.toFixed(0)}%</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Temp</p>
                      <p className="text-lg font-bold text-orange-400">{sensor.lastMeasure.temperature?.toFixed(0)}°C</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">Air</p>
                      <p className="text-lg font-bold text-teal-400">{sensor.lastMeasure.airHumidity?.toFixed(0)}%</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-lg p-4 text-center text-gray-600 text-sm mb-4">Aucune donnée reçue</div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Mode: <span className="text-gray-300">{sensor.pumpMode}</span></p>
                    {sensor.lastSeen && <p className="text-xs text-gray-600">{format(new Date(sensor.lastSeen), 'dd/MM HH:mm', { locale: fr })}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Pompe:</span>
                    <button onClick={() => handlePump(sensor._id, true)}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${sensor.pumpState ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-blue-600 hover:text-white'}`}>ON</button>
                    <button onClick={() => handlePump(sensor._id, false)}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${!sensor.pumpState ? 'bg-gray-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'}`}>OFF</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <CreateSensorModal parcels={parcels} onSave={handleCreate} onClose={() => setShowModal(false)} />}
    </div>
  );
}
