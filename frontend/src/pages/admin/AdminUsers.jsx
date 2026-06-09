import React, { useEffect, useState } from 'react';
import { Users, Plus, Edit2, Trash2, Key, Phone, Search, X, Save, Loader, Eye, UserX, UserCheck, CheckCircle, XCircle, Cpu } from 'lucide-react';
import { BACKEND_URL } from '../../api';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

const token = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const adminFetch = (method, path, body = null) =>
  fetch(`${BACKEND_URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    body: body ? JSON.stringify(body) : null
  }).then(r => r.json());

const S = {
  card: { background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 16, padding: 20, boxShadow: 'var(--a-shadow)' },
  text: { color: 'var(--a-text)' },
  text2: { color: 'var(--a-text2)' },
  text3: { color: 'var(--a-text3)' },
};

const ROLE_COLORS = {
  admin: { bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.35)', text: '#7c3aed' },
  farmer: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', text: '#16a34a' },
  viewer: { bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.3)', text: '#6b7280' }
};

const UserModal = ({ user, onClose, onSave }) => {
  const [form, setForm] = useState(user || {
    name: '', email: '', password: '', phone: '', role: 'farmer',
    notificationPrefs: { sms: true, critical: true, daily: false }
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.email) { toast.error('Nom et email requis'); return; }
    if (!user && (!form.password || form.password.length < 6)) { toast.error('Mot de passe min. 6 caractères'); return; }
    setLoading(true);
    const res = user
      ? await adminFetch('PUT', `/users/${user._id}`, { name: form.name, email: form.email, phone: form.phone, role: form.role, isActive: form.isActive, isValidated: form.isValidated, notificationPrefs: form.notificationPrefs })
      : await adminFetch('POST', '/users', { ...form, isValidated: true }); // admin crée → validé auto
    if (res.success) { toast.success(user ? 'Modifié ✓' : 'Créé ✓'); onSave(); onClose(); }
    else toast.error(res.message);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={S.card}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={S.text}>{user ? 'Modifier utilisateur' : 'Nouvel utilisateur'}</h2>
          <button onClick={onClose} style={S.text3}><X size={18} /></button>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Nom complet *', key: 'name', type: 'text', placeholder: 'Mamadou Diallo' },
            { label: 'Email *', key: 'email', type: 'email', placeholder: 'email@example.com' },
            { label: 'Téléphone WhatsApp', key: 'phone', type: 'text', placeholder: '+221771234567' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={S.text3}>{label}</label>
              <input type={type} className="ainput" value={form[key] || ''}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={S.text3}>Rôle</label>
            <select className="ainput" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="farmer">Agriculteur</option>
              <option value="viewer">Observateur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          {!user && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={S.text3}>Mot de passe *</label>
              <input type="password" className="ainput" value={form.password || ''}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min. 6 caractères" />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={S.text3}>Notifications WhatsApp</label>
            {[['sms', 'Alertes générales'], ['critical', 'Alertes critiques'], ['daily', 'Rapport journalier 7h']].map(([k, lbl]) => (
              <label key={k} className="flex items-center gap-2 mb-1.5 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 accent-blue-500"
                  checked={form.notificationPrefs?.[k] || false}
                  onChange={e => setForm(p => ({ ...p, notificationPrefs: { ...p.notificationPrefs, [k]: e.target.checked } }))} />
                <span className="text-xs" style={S.text3}>{lbl}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: 'var(--a-surface2)', border: '1px solid var(--a-border)', color: 'var(--a-text3)', cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', cursor: 'pointer' }}>
            {loading ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal API Keys du capteur
const ApiKeysModal = ({ userId, userName, onClose }) => {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    adminFetch('GET', `/users/${userId}/sensors`).then(res => {
      if (res.success) setSensors(res.data || []);
      setLoading(false);
    });
  }, [userId]);

  const copyKey = (key, id) => {
    navigator.clipboard.writeText(key);
    setCopied(id);
    toast.success('Clé API copiée !');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6" style={S.card}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2" style={S.text}>
              <Cpu size={16} style={{ color: 'var(--a-primary)' }} />
              Clés API — {userName}
            </h2>
            <p className="text-xs mt-0.5" style={S.text3}>Ces clés sont à configurer dans le code ESP32</p>
          </div>
          <button onClick={onClose} style={S.text3}><X size={18} /></button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 rounded-full" style={{ borderColor: 'var(--a-border)', borderTopColor: 'var(--a-primary)' }} />
          </div>
        ) : sensors.length === 0 ? (
          <p className="text-center py-8 text-sm" style={S.text3}>Aucun capteur créé par cet utilisateur</p>
        ) : (
          <div className="space-y-3">
            {sensors.map(sensor => (
              <div key={sensor._id} className="rounded-xl p-4" style={{ background: 'var(--a-surface2)', border: '1px solid var(--a-border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold" style={S.text}>{sensor.name}</p>
                    <p className="text-xs" style={S.text3}>{sensor.deviceId} • {sensor.parcelId?.name || 'Non assigné'}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)' }}>
                    {sensor.pumpState ? '💧 ON' : '⭕ OFF'}
                  </span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--a-surface)' }}>
                  <code className="flex-1 text-xs break-all" style={{ color: 'var(--a-primary)', fontFamily: 'monospace' }}>
                    {sensor.apiKey || 'Clé non disponible'}
                  </code>
                  <button
                    onClick={() => sensor.apiKey && copyKey(sensor.apiKey, sensor._id)}
                    className="text-xs px-2 py-1 rounded-lg flex-shrink-0 transition-colors"
                    style={{ background: copied === sensor._id ? '#f0fdf4' : 'var(--a-primary-light)', color: copied === sensor._id ? '#16a34a' : 'var(--a-primary)', cursor: 'pointer' }}>
                    {copied === sensor._id ? '✓ Copié' : 'Copier'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 p-3 rounded-xl text-xs" style={{ background: '#fffbeb', border: '1px solid rgba(217,119,6,0.2)', color: '#92400e' }}>
          ⚠️ Ces clés permettent à l'ESP32 d'envoyer des données. Ne les partagez qu'avec l'agriculteur propriétaire.
        </div>
      </div>
    </div>
  );
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [modal, setModal] = useState(null);
  const [resetModal, setResetModal] = useState(null);
  const [apiModal, setApiModal] = useState(null);
  const [newPwd, setNewPwd] = useState('');

  const fetchUsers = async () => {
    const res = await adminFetch('GET', '/users');
    if (res.success) setUsers(res.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Supprimer définitivement cet utilisateur ?')) return;
    const res = await adminFetch('DELETE', `/users/${id}`);
    if (res.success) { toast.success('Supprimé'); fetchUsers(); }
    else toast.error(res.message);
  };

  const handleToggleActive = async (user) => {
    if (!confirm(`${user.isActive ? 'Suspendre' : 'Réactiver'} le compte de ${user.name} ?`)) return;
    const res = await adminFetch('PUT', `/users/${user._id}`, { isActive: !user.isActive });
    if (res.success) { toast.success(user.isActive ? 'Compte suspendu' : 'Compte réactivé'); fetchUsers(); }
    else toast.error(res.message);
  };

  const handleValidate = async (user) => {
    const res = await adminFetch('PUT', `/users/${user._id}/validate`, { isValidated: !user.isValidated });
    if (res.success) {
      toast.success(user.isValidated ? 'Validation retirée' : 'Compte validé ✓');
      // Notifier par WhatsApp si validation
      if (!user.isValidated && user.phone) {
        await adminFetch('POST', `/users/${user._id}/notify-validated`, {});
      }
      fetchUsers();
    } else toast.error(res.message);
  };

  const handleResetPwd = async () => {
    if (!newPwd || newPwd.length < 6) { toast.error('Min. 6 caractères'); return; }
    const res = await adminFetch('PUT', `/users/${resetModal._id}/password`, { password: newPwd });
    if (res.success) { toast.success('Mot de passe réinitialisé'); setResetModal(null); setNewPwd(''); }
    else toast.error(res.message);
  };

  const filtered = users.filter(u => {
    const matchSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    if (filterTab === 'pending') return matchSearch && !u.isValidated && u.role !== 'admin';
    if (filterTab === 'validated') return matchSearch && u.isValidated;
    if (filterTab === 'suspended') return matchSearch && !u.isActive;
    return matchSearch;
  });

  const pendingCount = users.filter(u => !u.isValidated && u.role !== 'admin').length;

  return (
    <div className="space-y-5">
      {modal && <UserModal user={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={fetchUsers} />}
      {apiModal && <ApiKeysModal userId={apiModal._id} userName={apiModal.name} onClose={() => setApiModal(null)} />}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={S.card}>
            <h2 className="text-base font-bold mb-1" style={S.text}>Réinitialiser mot de passe</h2>
            <p className="text-xs mb-4" style={S.text3}>{resetModal.name}</p>
            <input type="password" className="ainput mb-4" placeholder="Nouveau mot de passe"
              value={newPwd} onChange={e => setNewPwd(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => { setResetModal(null); setNewPwd(''); }}
                className="flex-1 py-2 rounded-xl text-sm" style={{ background: 'var(--a-surface2)', border: '1px solid var(--a-border)', color: 'var(--a-text3)', cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleResetPwd}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', cursor: 'pointer' }}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={S.text}>
            <Users size={18} style={{ color: 'var(--a-primary)' }} />
            Utilisateurs
            {pendingCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#fff7ed', color: '#d97706', border: '1px solid rgba(217,119,6,0.3)' }}>
                {pendingCount} en attente
              </span>
            )}
          </h1>
          <p className="text-xs mt-0.5" style={S.text3}>{users.length} compte(s) · {users.filter(u => !u.isActive).length} suspendu(s)</p>
        </div>
        <button onClick={() => setModal('new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', cursor: 'pointer' }}>
          <Plus size={14} />Nouvel utilisateur
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {[['all', 'Tous'], ['pending', `En attente (${pendingCount})`], ['validated', 'Validés'], ['suspended', 'Suspendus']].map(([key, label]) => (
          <button key={key} onClick={() => setFilterTab(key)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={filterTab === key
              ? { background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white' }
              : { background: 'var(--a-surface2)', color: 'var(--a-text3)', border: '1px solid var(--a-border)' }}>
            {label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={S.text3} />
        <input className="ainput pl-9" placeholder="Rechercher par nom ou email..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 rounded-full" style={{ borderColor: 'var(--a-border)', borderTopColor: 'var(--a-primary)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm" style={S.text3}>Aucun utilisateur trouvé</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(u => {
            const roleStyle = ROLE_COLORS[u.role] || ROLE_COLORS.viewer;
            return (
              <div key={u._id} style={{ ...S.card, opacity: u.isActive ? 1 : 0.65 }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${roleStyle.text}44, ${roleStyle.text}22)`, border: `1px solid ${roleStyle.border}` }}>
                      <span style={{ color: roleStyle.text }}>{u.name?.[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm" style={S.text}>{u.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: roleStyle.bg, border: `1px solid ${roleStyle.border}`, color: roleStyle.text }}>
                          {u.role}
                        </span>
                        {/* Badge validation */}
                        {u.role !== 'admin' && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={u.isValidated
                              ? { background: '#f0fdf4', color: '#16a34a', border: '1px solid rgba(34,197,94,0.3)' }
                              : { background: '#fff7ed', color: '#d97706', border: '1px solid rgba(217,119,6,0.3)' }}>
                            {u.isValidated ? '✓ Validé' : '⏳ En attente'}
                          </span>
                        )}
                        {!u.isActive && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                            🔒 Suspendu
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={S.text3}>{u.email}</p>
                      {u.phone && <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: '#16a34a' }}><Phone size={9} />{u.phone}</p>}
                      {u.lastLogin && <p className="text-xs mt-0.5" style={S.text3}>Connexion: {format(new Date(u.lastLogin), 'dd/MM/yy HH:mm', { locale: fr })}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Voir données */}
                    <button onClick={() => navigate(`/admin/users/${u._id}`)}
                      className="p-2 rounded-lg transition-colors" style={{ color: 'var(--a-text3)', cursor: 'pointer' }}
                      title="Voir les données">
                      <Eye size={13} />
                    </button>
                    {/* Clés API */}
                    <button onClick={() => setApiModal(u)}
                      className="p-2 rounded-lg transition-colors" style={{ color: 'var(--a-text3)', cursor: 'pointer' }}
                      title="Voir les clés API des capteurs">
                      <Cpu size={13} />
                    </button>
                    {/* Modifier */}
                    <button onClick={() => setModal(u)}
                      className="p-2 rounded-lg transition-colors" style={{ color: 'var(--a-text3)', cursor: 'pointer' }}
                      title="Modifier">
                      <Edit2 size={13} />
                    </button>
                    {/* Valider/Invalider */}
                    {u.role !== 'admin' && (
                      <button onClick={() => handleValidate(u)}
                        className="p-2 rounded-lg transition-colors" style={{ color: u.isValidated ? '#d97706' : '#16a34a', cursor: 'pointer' }}
                        title={u.isValidated ? 'Retirer la validation' : 'Valider le compte'}>
                        {u.isValidated ? <XCircle size={13} /> : <CheckCircle size={13} />}
                      </button>
                    )}
                    {/* Reset mot de passe */}
                    <button onClick={() => setResetModal(u)}
                      className="p-2 rounded-lg transition-colors" style={{ color: 'var(--a-text3)', cursor: 'pointer' }}
                      title="Réinitialiser mot de passe">
                      <Key size={13} />
                    </button>
                    {/* Suspendre/Réactiver */}
                    <button onClick={() => handleToggleActive(u)}
                      className="p-2 rounded-lg transition-colors" style={{ color: u.isActive ? 'var(--a-text3)' : '#16a34a', cursor: 'pointer' }}
                      title={u.isActive ? 'Suspendre' : 'Réactiver'}>
                      {u.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                    </button>
                    {/* Supprimer */}
                    <button onClick={() => handleDelete(u._id)}
                      className="p-2 rounded-lg transition-colors" style={{ color: 'var(--a-text3)', cursor: 'pointer' }}
                      title="Supprimer">
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
