import React, { useState } from 'react';
import { User, Phone, Bell, Lock, Save, Loader, MessageCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { BACKEND_URL } from '../api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, fetchMe } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const [profile, setProfile] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    notificationPrefs: user?.notificationPrefs || { sms: true, critical: true, daily: false }
  });

  const [passwords, setPasswords] = useState({ current: '', newPwd: '', confirm: '' });

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profile)
      });
      const data = await res.json();
      if (data.success) {
        await fetchMe();
        toast.success('Profil mis à jour');
      } else toast.error(data.message);
    } catch { toast.error('Erreur serveur'); }
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (passwords.newPwd !== passwords.confirm) { toast.error('Mots de passe différents'); return; }
    if (passwords.newPwd.length < 6) { toast.error('Minimum 6 caractères'); return; }
    setPwdLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/api/auth/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.newPwd })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Mot de passe modifié');
        setPasswords({ current: '', newPwd: '', confirm: '' });
      } else toast.error(data.message || 'Erreur');
    } catch { toast.error('Erreur serveur'); }
    setPwdLoading(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
        <p className="text-gray-500 text-sm mt-0.5">Gérez votre profil et vos préférences</p>
      </div>

      {/* Profil */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <User size={16} className="text-green-400" />
          <h2 className="text-sm font-semibold text-gray-300">Informations personnelles</h2>
        </div>
        <div className="space-y-4 page-enter">
          <div>
            <label className="label">Nom complet</label>
            <input className="input" value={profile.name}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="label flex items-center gap-1.5">
              <MessageCircle size={13} className="text-green-500" />
              Numéro WhatsApp
            </label>
            <input className="input" value={profile.phone}
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
              placeholder="+221771234567" />
            <p className="text-xs text-gray-500 mt-1">
              📱 Les alertes et rapports seront envoyés sur ce numéro WhatsApp. Format international obligatoire.
            </p>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input opacity-50 cursor-not-allowed" value={user?.email || ''} disabled />
          </div>
          <button onClick={handleSaveProfile} disabled={loading}
            className="btn-primary flex items-center gap-2">
            {loading ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            Enregistrer les modifications
          </button>
        </div>
      </div>

      {/* Notifications WhatsApp */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <Bell size={16} className="text-green-400" />
          <h2 className="text-sm font-semibold text-gray-300">Notifications WhatsApp</h2>
        </div>
        <div className="space-y-3">
          {[
            { key: 'sms', label: 'Alertes générales', desc: 'Pompe activée, sécheresse, excès eau' },
            { key: 'critical', label: 'Alertes critiques uniquement', desc: 'Capteur hors ligne, température critique' },
            { key: 'daily', label: 'Rapport journalier', desc: 'Résumé envoyé tous les matins à 7h00' }
          ].map(({ key, label, desc }) => (
            <label key={key} className="flex items-start gap-3 p-3 rounded-lg bg-gray-800 cursor-pointer hover:bg-gray-750">
              <input type="checkbox" className="w-4 h-4 mt-0.5 accent-green-500"
                checked={profile.notificationPrefs?.[key] || false}
                onChange={e => setProfile(p => ({
                  ...p,
                  notificationPrefs: { ...p.notificationPrefs, [key]: e.target.checked }
                }))} />
              <div>
                <p className="text-sm font-medium text-gray-200">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </label>
          ))}
        </div>
        {!profile.phone && (
          <div className="mt-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3">
            <p className="text-xs text-yellow-400">⚠️ Ajoutez votre numéro WhatsApp ci-dessus pour recevoir les notifications.</p>
          </div>
        )}
      </div>

      {/* Changer mot de passe */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <Lock size={16} className="text-green-400" />
          <h2 className="text-sm font-semibold text-gray-300">Changer le mot de passe</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Mot de passe actuel</label>
            <input type="password" className="input" value={passwords.current}
              onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} />
          </div>
          <div>
            <label className="label">Nouveau mot de passe</label>
            <input type="password" className="input" value={passwords.newPwd}
              onChange={e => setPasswords(p => ({ ...p, newPwd: e.target.value }))}
              placeholder="Minimum 6 caractères" />
          </div>
          <div>
            <label className="label">Confirmer le nouveau mot de passe</label>
            <input type="password" className="input" value={passwords.confirm}
              onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
          </div>
          <button onClick={handleChangePassword} disabled={pwdLoading}
            className="btn-primary flex items-center gap-2">
            {pwdLoading ? <Loader size={14} className="animate-spin" /> : <Lock size={14} />}
            Changer le mot de passe
          </button>
        </div>
      </div>

      {/* Info utilisateur */}
      <div className="card bg-gray-900/50">
        <p className="text-xs text-gray-500">Rôle: <span className="text-gray-300 font-medium">{user?.role}</span></p>
        <p className="text-xs text-gray-500 mt-1">Compte créé le: <span className="text-gray-300">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '—'}</span></p>
      </div>
    </div>
  );
}
