import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, Loader } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const { login, register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '', confirm: '', phone: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(loginForm.email, loginForm.password);
    if (res.success) navigate('/dashboard');
    else setError(res.message);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (regForm.password !== regForm.confirm) { setError('Mots de passe différents'); return; }
    if (regForm.password.length < 6) { setError('Mot de passe: minimum 6 caractères'); return; }
    const res = await register(regForm.name, regForm.email, regForm.password, regForm.phone);
    if (res.success) navigate('/dashboard');
    else setError(res.message);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-green-900/50">
            <Sprout size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Smart Agriculture</h1>
          <p className="text-gray-500 text-sm mt-1">Plateforme IoT Agricole</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-800 rounded-xl p-1 mb-6">
          <button onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'login' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            Connexion
          </button>
          <button onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'register' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            Créer un compte
          </button>
        </div>

        <div className="card">
          {error && (
            <div className="bg-red-900/30 border border-red-700/40 rounded-lg px-4 py-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={loginForm.email}
                  onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="votre@email.com" required />
              </div>
              <div>
                <label className="label">Mot de passe</label>
                <input type="password" className="input" value={loginForm.password}
                  onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••" required />
              </div>
              <button type="submit" disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                {isLoading ? <Loader size={16} className="animate-spin" /> : null}
                Se connecter
              </button>
              <p className="text-xs text-gray-600 text-center">
                Admin: admin@smartagri.com / admin123
              </p>
            </form>
          )}

          {/* REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="label">Nom complet *</label>
                <input type="text" className="input" value={regForm.name}
                  onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Votre nom complet" required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" value={regForm.email}
                  onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="votre@email.com" required />
              </div>
              <div>
                <label className="label">Téléphone (optionnel)</label>
                <input type="text" className="input" value={regForm.phone}
                  onChange={e => setRegForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+221771234567" />
              </div>
              <div>
                <label className="label">Mot de passe *</label>
                <input type="password" className="input" value={regForm.password}
                  onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Minimum 6 caractères" required />
              </div>
              <div>
                <label className="label">Confirmer le mot de passe *</label>
                <input type="password" className="input" value={regForm.confirm}
                  onChange={e => setRegForm(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="••••••••" required />
              </div>
              <button type="submit" disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                {isLoading ? <Loader size={16} className="animate-spin" /> : null}
                Créer mon compte
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
