import React, { useState } from 'react';
import { Save, User, Bell, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI, cropsAPI } from '../api';
import useAuthStore from '../store/authStore';

export default function SettingsPage() {
  const { user, fetchMe } = useAuthStore();
  const [profile, setProfile] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    notificationPrefs: user?.notificationPrefs || { sms: true, critical: true, daily: false }
  });
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile(profile);
      await fetchMe();
      toast.success('Profil mis à jour');
    } catch {
      toast.error('Erreur mise à jour profil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
        <p className="text-gray-500 text-sm mt-0.5">Gérez votre compte et vos préférences</p>
      </div>

      {/* Profil */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-green-400" />
          <h2 className="text-sm font-semibold text-gray-300">Profil</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Nom complet</label>
            <input className="input" value={profile.name}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={user?.email} disabled className="input opacity-50 cursor-not-allowed" />
          </div>
          <div>
            <label className="label">Numéro de téléphone (SMS Twilio)</label>
            <input className="input" placeholder="+221771234567" value={profile.phone}
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div>
            <label className="label">Rôle</label>
            <input className="input" value={user?.role} disabled className="input opacity-50 cursor-not-allowed" />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={18} className="text-green-400" />
          <h2 className="text-sm font-semibold text-gray-300">Notifications</h2>
        </div>
        <div className="space-y-3">
          {[
            { key: 'sms', label: 'Alertes SMS (Twilio)', desc: 'Recevoir les alertes par SMS' },
            { key: 'critical', label: 'Alertes critiques uniquement', desc: 'Filtrer aux niveaux high et critical' },
            { key: 'daily', label: 'Rapport quotidien', desc: 'Résumé journalier par SMS' }
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm text-gray-200">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              <button
                onClick={() => setProfile(p => ({
                  ...p,
                  notificationPrefs: { ...p.notificationPrefs, [key]: !p.notificationPrefs[key] }
                }))}
                className={`w-10 h-5 rounded-full transition-colors ${profile.notificationPrefs[key] ? 'bg-green-600' : 'bg-gray-600'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-0.5 ${profile.notificationPrefs[key] ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Info système */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-green-400" />
          <h2 className="text-sm font-semibold text-gray-300">Informations système</h2>
        </div>
        <div className="space-y-2 text-xs text-gray-500">
          <p>Version: <span className="text-gray-300">1.0.0</span></p>
          <p>Backend: <span className="text-gray-300">Node.js + Express + Socket.IO</span></p>
          <p>Base de données: <span className="text-gray-300">MongoDB Atlas</span></p>
          <p>Carte: <span className="text-gray-300">Leaflet.js + OpenStreetMap</span></p>
          <p>Notifications: <span className="text-gray-300">Twilio SMS</span></p>
        </div>
      </div>

      <button onClick={handleSaveProfile} disabled={saving}
        className="btn-primary flex items-center gap-2">
        {saving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Save size={16} />}
        Sauvegarder
      </button>
    </div>
  );
}
