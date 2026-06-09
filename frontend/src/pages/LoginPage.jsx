import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, Loader, Eye, EyeOff, Droplets, Thermometer, Wind, Activity, Wifi } from 'lucide-react';
import useAuthStore from '../store/authStore';

// ── Mini Dashboard animé ──────────────────────────────────────────────────
const AnimatedDashboard = () => {
  const [tick, setTick] = useState(0);
  const [pump, setPump] = useState(false);
  const [alert, setAlert] = useState(false);

  // Données simulées qui changent
  const data = {
    soil: Math.round(42 + Math.sin(tick * 0.3) * 18),
    temp: Math.round(28 + Math.sin(tick * 0.2) * 4),
    air: Math.round(65 + Math.cos(tick * 0.25) * 12),
    ndvi: (0.58 + Math.sin(tick * 0.1) * 0.08).toFixed(2),
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setPump(data.soil < 38);
    setAlert(data.temp > 30);
  }, [tick]);

  // Graphique miniature (sparkline)
  const points = Array.from({ length: 12 }, (_, i) =>
    Math.round(42 + Math.sin((tick - 11 + i) * 0.3) * 18)
  );
  const maxP = Math.max(...points);
  const minP = Math.min(...points);
  const sparkPath = points.map((v, i) => {
    const x = (i / 11) * 180;
    const y = 40 - ((v - minP) / (maxP - minP + 1)) * 36;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div className="relative w-full select-none" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Fenêtre browser simulée */}
      <div className="rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#f0f4f0', border: '1px solid rgba(255,255,255,0.2)' }}>

        {/* Barre de titre */}
        <div className="flex items-center gap-2 px-4 py-2.5"
          style={{ background: 'rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
            <div className="w-3 h-3 rounded-full bg-green-400/70" />
          </div>
          <div className="flex-1 mx-3 px-3 py-1 rounded-lg text-xs"
            style={{ background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}>
            agrosmart.onrender.com/dashboard
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
            <Wifi size={10} />
            <span>En direct</span>
          </div>
        </div>

        {/* Contenu dashboard */}
        <div className="p-3" style={{ background: '#f0f4f0' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold" style={{ color: '#1a2e1a', fontFamily: "'Playfair Display', serif" }}>Tableau de bord</p>
              <p className="text-xs" style={{ color: '#7a9a7a' }}>Temps réel · Parcelle 1</p>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
              style={{ background: '#e8f5ea', color: '#2d7a3a' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {[
              { icon: Droplets, label: 'Sol', value: data.soil, unit: '%', color: '#0ea5e9', bg: '#e0f2fe' },
              { icon: Thermometer, label: 'Temp', value: data.temp, unit: '°C', color: '#f97316', bg: '#fff7ed' },
              { icon: Wind, label: 'Air', value: data.air, unit: '%', color: '#14b8a6', bg: '#f0fdfa' },
              { icon: Activity, label: 'NDVI', value: data.ndvi, unit: '', color: '#16a34a', bg: '#f0fdf4' },
            ].map(({ icon: Icon, label, value, unit, color, bg }) => (
              <div key={label} className="rounded-xl p-2 text-center transition-all duration-700"
                style={{ background: 'white', border: `1px solid ${bg}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div className="w-5 h-5 rounded-lg flex items-center justify-center mx-auto mb-1"
                  style={{ background: bg }}>
                  <Icon size={11} style={{ color }} />
                </div>
                <p className="text-xs font-bold tabular-nums transition-all duration-700" style={{ color }}>
                  {value}{unit}
                </p>
                <p className="text-xs" style={{ color: '#7a9a7a', fontSize: 9 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Graphique sparkline */}
          <div className="rounded-xl p-3 mb-2" style={{ background: 'white', border: '1px solid #d8e8d8' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold" style={{ color: '#4a6a4a' }}>Humidité Sol — 12 dernières mesures</p>
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#e8f5ea', color: '#2d7a3a', fontSize: 10 }}>
                ↑ Temps réel
              </span>
            </div>
            <svg width="100%" height="44" viewBox="0 0 180 44">
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2d7a3a" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#2d7a3a" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={sparkPath + ` L 180 44 L 0 44 Z`} fill="url(#sparkGrad)" />
              <path d={sparkPath} fill="none" stroke="#2d7a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {/* Point actuel animé */}
              <circle
                cx={(11 / 11) * 180}
                cy={40 - ((points[11] - minP) / (maxP - minP + 1)) * 36}
                r="3" fill="#2d7a3a" stroke="white" strokeWidth="2">
                <animate attributeName="r" values="3;5;3" dur="1.2s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>

          {/* Pompe + Alerte */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-xl p-2.5 flex items-center gap-2 transition-all duration-700"
              style={{
                background: pump ? '#dbeafe' : '#f7faf7',
                border: `1px solid ${pump ? '#93c5fd' : '#d8e8d8'}`
              }}>
              <div className="w-5 h-5 rounded-lg flex items-center justify-center"
                style={{ background: pump ? '#3b82f6' : '#e8f0e8' }}>
                <Droplets size={11} style={{ color: pump ? 'white' : '#7a9a7a' }} />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: pump ? '#1d4ed8' : '#4a6a4a', fontSize: 10 }}>Pompe</p>
                <p className="text-xs" style={{ color: pump ? '#3b82f6' : '#7a9a7a', fontSize: 9 }}>
                  {pump ? '● Active' : '○ Arrêtée'}
                </p>
              </div>
            </div>

            <div className="rounded-xl p-2.5 flex items-center gap-2 transition-all duration-700"
              style={{
                background: alert ? '#fff7ed' : '#f0fdf4',
                border: `1px solid ${alert ? '#fed7aa' : '#bbf7d0'}`
              }}>
              <div className="w-5 h-5 rounded-lg flex items-center justify-center"
                style={{ background: alert ? '#f97316' : '#16a34a' }}>
                <Activity size={11} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: alert ? '#c2410c' : '#15803d', fontSize: 10 }}>Statut</p>
                <p className="text-xs" style={{ color: alert ? '#f97316' : '#16a34a', fontSize: 9 }}>
                  {alert ? '⚠ Chaleur' : '✓ Normal'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Badge "Live" flottant */}
      <div className="absolute -top-2 -right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold shadow-lg"
        style={{ background: 'linear-gradient(135deg, #2d7a3a, #3d9e4e)', color: 'white' }}>
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        En direct
      </div>
    </div>
  );
};

// ── Page Login ────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { login, register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '', confirm: '', phone: '' });

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

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
    if (regForm.password !== regForm.confirm) { setError('Mots de passe différents'); return; }
    if (regForm.password.length < 6) { setError('Mot de passe: minimum 6 caractères'); return; }
    const res = await register(regForm.name, regForm.email, regForm.password, regForm.phone);
    if (res.success) navigate(res.role === 'admin' ? '/admin' : '/dashboard');
    else setError(res.message);
  };

  const particles = [
    { width: 80, height: 80, top: '8%', left: '5%', animation: 'float1 8s ease-in-out infinite' },
    { width: 50, height: 50, top: '30%', left: '70%', animation: 'float2 10s ease-in-out infinite' },
    { width: 100, height: 100, top: '60%', left: '10%', animation: 'float1 12s ease-in-out infinite reverse' },
    { width: 35, height: 35, top: '75%', left: '55%', animation: 'float2 7s ease-in-out infinite' },
    { width: 60, height: 60, top: '45%', left: '85%', animation: 'float1 9s ease-in-out infinite 2s' },
  ];

  return (
    <>
      <style>{`
        @keyframes float1 {
          0%,100%{transform:translateY(0) rotate(0deg)}
          50%{transform:translateY(-20px) rotate(5deg)}
        }
        @keyframes float2 {
          0%,100%{transform:translateY(0) rotate(0deg)}
          33%{transform:translateY(-15px) rotate(-3deg)}
          66%{transform:translateY(8px) rotate(3deg)}
        }
        @keyframes slideUp {
          from{opacity:0;transform:translateY(24px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes slideRight {
          from{opacity:0;transform:translateX(-24px)}
          to{opacity:1;transform:translateX(0)}
        }
        @keyframes slideLeft {
          from{opacity:0;transform:translateX(24px)}
          to{opacity:1;transform:translateX(0)}
        }
        @keyframes pulse-ring {
          0%{transform:scale(1);opacity:0.4}
          100%{transform:scale(1.6);opacity:0}
        }
        .anim-slide-up{animation:slideUp 0.5s ease forwards}
        .anim-slide-right{animation:slideRight 0.6s ease forwards}
        .anim-slide-left{animation:slideLeft 0.6s ease forwards}
        .d1{animation-delay:0.1s;opacity:0}
        .d2{animation-delay:0.2s;opacity:0}
        .d3{animation-delay:0.3s;opacity:0}
        .input-f{
          width:100%;padding:11px 14px;border-radius:11px;font-size:13.5px;
          outline:none;transition:all 0.2s;
          background:#f7faf7;border:1.5px solid #d8e8d8;color:#1a2e1a;
          font-family:'DM Sans',sans-serif;
        }
        .input-f:focus{border-color:#2d7a3a;background:white;box-shadow:0 0 0 3px rgba(45,122,58,0.1)}
        .input-f::placeholder{color:#7a9a7a}
        .btn-f{
          width:100%;padding:12px;border-radius:11px;font-size:14px;font-weight:700;
          color:white;cursor:pointer;transition:all 0.2s;border:none;
          background:linear-gradient(135deg,#2d7a3a,#3d9e4e);
          box-shadow:0 4px 15px rgba(45,122,58,0.35);letter-spacing:0.01em;
          font-family:'DM Sans',sans-serif;
        }
        .btn-f:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 25px rgba(45,122,58,0.45)}
        .btn-f:active{transform:translateY(0)}
        .btn-f:disabled{opacity:0.7;cursor:not-allowed}
      `}</style>

      <div className="min-h-screen flex" style={{ background: 'var(--f-bg)' }}>

        {/* ── Panneau gauche ── */}
        <div className="hidden lg:flex flex-col w-1/2 p-10 relative overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #1a4f25 0%, #2d7a3a 55%, #3d9e4e 100%)' }}>

          {/* Particules */}
          {particles.map((p, i) => (
            <div key={i} className="absolute rounded-full pointer-events-none"
              style={{ ...p, background: 'rgba(255,255,255,0.05)', position: 'absolute' }} />
          ))}

          {/* Cercles décoratifs */}
          <div className="absolute" style={{ top: '5%', right: '-15%', width: 350, height: 350, border: '1px solid rgba(255,255,255,0.07)', borderRadius: '50%' }} />
          <div className="absolute" style={{ top: '8%', right: '-10%', width: 260, height: 260, border: '1px solid rgba(255,255,255,0.05)', borderRadius: '50%' }} />

          <div className="relative z-10 flex flex-col h-full">
            {/* Logo */}
            <div className={mounted ? 'anim-slide-right' : 'opacity-0'}>
              <div className="mb-8" style={{ width: '100%' }}>
                <img src="/logo.png" alt="AgroSmart"
                  style={{
                    width: '100%', maxWidth: 340, height: 130,
                    objectFit: 'contain', display: 'block',
                    filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.4)) brightness(1.05)'
                  }} />
              </div>

              <h2 className="text-white text-3xl font-bold leading-tight mb-3"
                style={{ fontFamily: "'Playfair Display', serif", textShadow: '0 2px 20px rgba(0,0,0,0.2)' }}>
                Cultivez l'avenir<br />avec l'IoT
              </h2>
              <p className="text-green-200/75 text-sm leading-relaxed mb-8">
                Surveillance en temps réel, irrigation automatique<br />et analyses satellitaires.
              </p>
            </div>

            {/* ✨ Mini dashboard animé */}
            <div className={`flex-1 flex items-center ${mounted ? 'anim-slide-up d2' : 'opacity-0'}`}>
              <div className="w-full" style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))' }}>
                <AnimatedDashboard />
              </div>
            </div>

            {/* Équipe étudiante */}
            <div className="relative z-10 mt-6">
              <div className="px-4 py-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
                <p className="text-white/90 text-xs font-semibold mb-1">Projet réalisé par</p>
                <p className="text-green-200/80 text-xs mb-3">Licence AgroTIC · Université Sine Saloum Elhadj Ibrahima Niass</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {['Ousmane Diouf', 'Thierno Seye', 'Marieme Dieng', 'Baye Demba Ndiaye', 'Codou Niang', 'Mbaye Dieng', 'Fatoumata M. Diallo', 'Sokhna Arame Faye', 'Sofia Diop'].map(name => (
                    <div key={name} className="flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.5)' }} />
                      <span className="text-white/70 text-xs truncate">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-green-200/40 text-xs mt-3">© 2026 AgroSmart — Plateforme IoT Agricole</p>
            </div>
          </div>
        </div>

        {/* ── Panneau droit — Formulaire ── */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className={`w-full max-w-sm ${mounted ? 'anim-slide-left' : 'opacity-0'}`}>

            {/* Mobile logo */}
            <div className="lg:hidden flex flex-col items-center mb-6">
              <img src="/logo.png" alt="AgroSmart"
                style={{ height: 100, objectFit: 'contain',
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }} />
            </div>

            <div className="hidden lg:block mb-7">
              <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--f-text)', fontFamily: "'Playfair Display', serif" }}>
                {mode === 'login' ? 'Bienvenue 👋' : 'Créer un compte'}
              </h1>
              <p className="text-sm" style={{ color: 'var(--f-text3)' }}>
                {mode === 'login' ? 'Connectez-vous à votre espace agricole' : 'Rejoignez la plateforme AgroSmart'}
              </p>
            </div>

            {/* Toggle */}
            <div className="flex p-1 rounded-xl mb-5"
              style={{ background: 'var(--f-surface)', border: '1px solid var(--f-border)', boxShadow: 'var(--f-shadow)' }}>
              {[['login', 'Connexion'], ['register', 'Créer un compte']].map(([key, label]) => (
                <button key={key} onClick={() => { setMode(key); setError(''); }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={mode === key
                    ? { background: 'linear-gradient(135deg, #2d7a3a, #3d9e4e)', color: 'white', boxShadow: '0 4px 12px rgba(45,122,58,0.3)' }
                    : { color: 'var(--f-text3)' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Card formulaire */}
            <div style={{ background: 'var(--f-surface)', border: '1px solid var(--f-border)', borderRadius: 20, padding: 26, boxShadow: '0 8px 40px rgba(45,122,58,0.08)' }}>
              {error && (
                <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm"
                  style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                  ⚠️ {error}
                </div>
              )}

              {mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="label">Adresse email</label>
                    <input type="email" className="input-f" value={loginForm.email}
                      onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="votre@email.com" required />
                  </div>
                  <div>
                    <label className="label">Mot de passe</label>
                    <div className="relative">
                      <input type={showPwd ? 'text' : 'password'} className="input-f" style={{ paddingRight: 44 }}
                        value={loginForm.password}
                        onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                        placeholder="••••••••" required />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--f-text3)' }} onClick={() => setShowPwd(!showPwd)}>
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading} className="btn-f flex items-center justify-center gap-2">
                    {isLoading && <Loader size={15} className="animate-spin" />}
                    {isLoading ? 'Connexion...' : 'Se connecter'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-3">
                  {[
                    { label: 'Nom complet *', key: 'name', type: 'text', placeholder: 'Mamadou Diallo' },
                    { label: 'Email *', key: 'email', type: 'email', placeholder: 'votre@email.com' },
                    { label: 'Téléphone WhatsApp', key: 'phone', type: 'text', placeholder: '+221771234567' },
                    { label: 'Mot de passe *', key: 'password', type: 'password', placeholder: 'Min. 6 caractères' },
                    { label: 'Confirmer *', key: 'confirm', type: 'password', placeholder: '••••••••' },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key}>
                      <label className="label">{label}</label>
                      <input type={type} className="input-f" value={regForm[key]}
                        onChange={e => setRegForm(p => ({ ...p, [key]: e.target.value }))}
                        placeholder={placeholder} required={label.includes('*')} />
                    </div>
                  ))}
                  <button type="submit" disabled={isLoading} className="btn-f flex items-center justify-center gap-2 mt-1">
                    {isLoading ? <Loader size={15} className="animate-spin" /> : null}
                    {isLoading ? 'Création...' : 'Créer mon compte'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
