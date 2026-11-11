import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, Eye, EyeOff, Satellite, Droplets, Bell, AlertCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { NDVI_CLASSES } from '../utils/ndvi';
import { BrandLogo } from '../components/UI/Brand';

// Aperçu de la carte NDVI : parcelles colorées selon l'échelle de vigueur
const NdviPreview = () => {
  const parcels = [
    { d: 'M60 70 L190 52 L214 150 L84 176 Z', v: 0.64, name: 'Parcelle Nord', x: 135, y: 112 },
    { d: 'M214 150 L190 52 L322 40 L346 128 Z', v: 0.41, name: 'Parcelle Est', x: 268, y: 90 },
    { d: 'M84 176 L214 150 L238 246 L102 268 Z', v: 0.27, name: 'Parcelle Sud', x: 160, y: 210 },
    { d: 'M214 150 L346 128 L368 222 L238 246 Z', v: 0.52, name: 'Parcelle Ouest', x: 292, y: 186 },
  ];
  const color = (v) => (NDVI_CLASSES.find(c => v < c.max) || NDVI_CLASSES[5]).color;
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', background: '#16382a', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="flex items-center justify-between" style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2" style={{ color: '#d6e8dc', fontSize: 13, fontWeight: 600 }}>
          <Satellite size={15} /> Indice de végétation NDVI
        </div>
        <span style={{ fontSize: 11.5, color: '#9fc0ad' }}>Sentinel-2 · Kaolack</span>
      </div>
      <svg viewBox="0 0 420 300" style={{ display: 'block', width: '100%' }} role="img"
        aria-label="Aperçu de quatre parcelles colorées selon leur NDVI">
        <rect width="420" height="300" fill="#1b4331" />
        <g stroke="rgba(255,255,255,0.05)" strokeWidth="1">
          {[50, 100, 150, 200, 250].map(y => <line key={y} x1="0" x2="420" y1={y} y2={y} />)}
          {[70, 140, 210, 280, 350].map(x => <line key={x} y1="0" y2="300" x1={x} x2={x} />)}
        </g>
        {parcels.map(p => (
          <g key={p.name}>
            <path d={p.d} fill={color(p.v)} fillOpacity="0.88" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
            <g transform={`translate(${p.x - 26}, ${p.y - 11})`}>
              <rect width="52" height="22" rx="11" fill="#ffffff" fillOpacity="0.94" />
              <text x="26" y="15" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f2418"
                style={{ fontVariantNumeric: 'tabular-nums' }}>{p.v.toFixed(2)}</text>
            </g>
          </g>
        ))}
      </svg>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden' }}>
          {NDVI_CLASSES.map(c => <div key={c.key} style={{ flex: 1, background: c.color }} />)}
        </div>
        <div className="flex justify-between" style={{ marginTop: 6, fontSize: 11, color: '#9fc0ad' }}>
          <span>Sol nu</span><span>Végétation dense</span>
        </div>
      </div>
    </div>
  );
};

const FEATURES = [
  { icon: Satellite, title: 'Santé des cultures par satellite', text: 'Un indice NDVI calculé pour chaque parcelle, actualisé tous les 5 jours.' },
  { icon: Droplets, title: 'Irrigation pilotée par capteurs', text: 'Humidité du sol et température mesurées en continu, pompes automatisées.' },
  { icon: Bell, title: 'Alertes immédiates', text: 'Sol trop sec, capteur hors ligne : l’information arrive sur Telegram.' },
];

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const { login, register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '', telegramChatId: '', password: '', confirm: '' });

  const switchMode = (m) => { setMode(m); setError(''); };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(loginForm.email, loginForm.password);
    if (res.success) navigate(res.role === 'admin' ? '/admin' : '/dashboard');
    else setError(res.message);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (regForm.password !== regForm.confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    if (regForm.password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    const res = await register(regForm.name, regForm.email, regForm.password, regForm.phone, regForm.telegramChatId);
    if (res.success) navigate(res.role === 'admin' ? '/admin' : '/dashboard');
    else setError(res.message);
  };

  const setReg = (key) => (e) => setRegForm(p => ({ ...p, [key]: e.target.value }));

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]" style={{ background: 'var(--f-surface)' }}>
      {/* Panneau de présentation */}
      <section className="hidden lg:flex flex-col justify-between" style={{ background: 'var(--side-bg)', padding: '40px 56px', gap: 32 }}>
        <div><BrandLogo height={64} /></div>

        <div style={{ maxWidth: 520 }}>
          <h1 style={{ color: '#fff', fontSize: 34, lineHeight: 1.15, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 14 }}>
            Irriguer au bon moment, surveiller chaque parcelle depuis l’espace.
          </h1>
          <p style={{ color: '#b9cfc2', fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
            Une seule plateforme pour suivre l’humidité du sol, piloter les pompes et mesurer la vigueur
            de vos cultures avec les images Sentinel-2.
          </p>
          <NdviPreview />
        </div>

        <ul className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <Icon size={18} style={{ color: '#5fd18f', marginBottom: 8 }} />
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{title}</p>
              <p style={{ color: '#9fc0ad', fontSize: 12.5, lineHeight: 1.5 }}>{text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Formulaire */}
      <section className="flex items-center justify-center" style={{ padding: '32px 24px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <img src="/logo-brand.png" alt="AgroSmart" style={{ height: 96, width: 'auto', maxWidth: '100%', objectFit: 'contain', marginBottom: 28 }} />

          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--f-text)' }}>
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--f-text3)', marginTop: 4, marginBottom: 24 }}>
            {mode === 'login'
              ? 'Accédez à votre espace de suivi agricole.'
              : 'Votre compte sera activé après validation par un administrateur.'}
          </p>

          <div role="tablist" className="flex" style={{ background: 'var(--f-surface2)', border: '1px solid var(--f-border)', borderRadius: 10, padding: 3, marginBottom: 22 }}>
            {[['login', 'Se connecter'], ['register', 'S’inscrire']].map(([key, label]) => (
              <button key={key} role="tab" aria-selected={mode === key} onClick={() => switchMode(key)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                  background: mode === key ? 'var(--f-surface)' : 'transparent',
                  color: mode === key ? 'var(--f-text)' : 'var(--f-text3)',
                  boxShadow: mode === key ? 'var(--f-shadow)' : 'none'
                }}>{label}</button>
            ))}
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2" style={{
              background: 'var(--f-danger-light)', color: 'var(--f-danger)', borderRadius: 10,
              padding: '10px 12px', fontSize: 13, fontWeight: 500, marginBottom: 16
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label" htmlFor="login-email">Adresse e-mail</label>
                <input id="login-email" type="email" className="input" autoComplete="email" value={loginForm.email}
                  onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} placeholder="vous@exemple.com" required />
              </div>
              <div>
                <label className="label" htmlFor="login-password">Mot de passe</label>
                <div className="relative">
                  <input id="login-password" type={showPwd ? 'text' : 'password'} className="input" style={{ paddingRight: 44 }}
                    autoComplete="current-password" value={loginForm.password}
                    onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} placeholder="Votre mot de passe" required />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2"
                    aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    style={{ color: 'var(--f-text3)' }} onClick={() => setShowPwd(!showPwd)}>
                    {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2" style={{ padding: '11px 16px', fontSize: 14.5 }}>
                {isLoading && <Loader size={16} className="animate-spin" />}
                {isLoading ? 'Connexion en cours…' : 'Se connecter'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              {[
                { label: 'Nom complet', key: 'name', type: 'text', placeholder: 'Mamadou Diallo', required: true, ac: 'name' },
                { label: 'Adresse e-mail', key: 'email', type: 'email', placeholder: 'vous@exemple.com', required: true, ac: 'email' },
                { label: 'Téléphone (facultatif)', key: 'phone', type: 'tel', placeholder: '+221 77 000 00 00', ac: 'tel' },
                { label: 'Chat ID Telegram (facultatif)', key: 'telegramChatId', type: 'text', placeholder: '123456789' },
                { label: 'Mot de passe', key: 'password', type: 'password', placeholder: '6 caractères minimum', required: true, ac: 'new-password' },
                { label: 'Confirmer le mot de passe', key: 'confirm', type: 'password', placeholder: 'Répétez le mot de passe', required: true, ac: 'new-password' },
              ].map(({ label, key, type, placeholder, required, ac }) => (
                <div key={key}>
                  <label className="label" htmlFor={`reg-${key}`}>{label}</label>
                  <input id={`reg-${key}`} type={type} className="input" autoComplete={ac} value={regForm[key]}
                    onChange={setReg(key)} placeholder={placeholder} required={!!required} />
                </div>
              ))}
              <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2" style={{ padding: '11px 16px', fontSize: 14.5, marginTop: 8 }}>
                {isLoading && <Loader size={16} className="animate-spin" />}
                {isLoading ? 'Création en cours…' : 'Créer mon compte'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
