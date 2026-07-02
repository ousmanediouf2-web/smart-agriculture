import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Map, Layers, Cpu, Bell,
  Download, Settings, LogOut, Menu, X,
  Wifi, WifiOff, Plane
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useSocket from '../../hooks/useSocket';
import AssistantChat from './AssistantChat';

// ── Illustration animée ───────────────────────────────────────────────────
const FarmIllustration = () => (
  <>
    <style>{`
      @keyframes walk1 {
        0%,100%{transform:translateX(0)}
        50%{transform:translateX(6px)}
      }
      @keyframes walk2 {
        0%,100%{transform:translateX(0)}
        50%{transform:translateX(-5px)}
      }
      @keyframes dig {
        0%,100%{transform:rotate(0deg)}
        40%{transform:rotate(-25deg)}
        80%{transform:rotate(10deg)}
      }
      @keyframes water {
        0%,100%{transform:rotate(0deg) translateX(0)}
        50%{transform:rotate(-15deg) translateX(3px)}
      }
      @keyframes cloud-move {
        0%,100%{transform:translateX(0)}
        50%{transform:translateX(8px)}
      }
      @keyframes sun-pulse {
        0%,100%{r:11;opacity:0.9}
        50%{r:13;opacity:1}
      }
      @keyframes arm-dig {
        0%,100%{transform-origin:top center;transform:rotate(0deg)}
        40%{transform-origin:top center;transform:rotate(-30deg)}
        80%{transform-origin:top center;transform:rotate(15deg)}
      }
      @keyframes drop {
        0%{opacity:0;transform:translateY(0)}
        50%{opacity:1}
        100%{opacity:0;transform:translateY(8px)}
      }
      @keyframes plant-grow {
        0%,100%{transform:scaleY(1)}
        50%{transform:scaleY(1.08)}
      }
      @keyframes tractor-move {
        0%,100%{transform:translateX(0)}
        50%{transform:translateX(-12px)}
      }
      @keyframes wheel-spin {
        from{transform:rotate(0deg)}
        to{transform:rotate(360deg)}
      }
      @keyframes leg-left {
        0%,100%{transform:rotate(0deg)}
        50%{transform:rotate(15deg)}
      }
      @keyframes leg-right {
        0%,100%{transform:rotate(0deg)}
        50%{transform:rotate(-15deg)}
      }
      .person1{animation:walk1 1.2s ease-in-out infinite}
      .person2{animation:walk2 1.4s ease-in-out infinite 0.3s}
      .person3{animation:water 1.6s ease-in-out infinite 0.6s}
      .cloud1{animation:cloud-move 4s ease-in-out infinite}
      .cloud2{animation:cloud-move 5s ease-in-out infinite 1s}
      .tractor{animation:tractor-move 3s ease-in-out infinite}
      .wheel{animation:wheel-spin 1s linear infinite}
      .plant{animation:plant-grow 2s ease-in-out infinite}
      .drop1{animation:drop 1s ease-in-out infinite}
      .drop2{animation:drop 1s ease-in-out infinite 0.33s}
      .drop3{animation:drop 1s ease-in-out infinite 0.66s}
    `}</style>
    <svg viewBox="0 0 256 110" xmlns="http://www.w3.org/2000/svg"
      style={{ width:'100%', height:110, display:'block' }}>

      {/* Dégradés */}
      <defs>
        <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#87ceeb"/>
          <stop offset="100%" stopColor="#c8e6c9"/>
        </linearGradient>
        <linearGradient id="soilG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#795548"/>
          <stop offset="100%" stopColor="#4e342e"/>
        </linearGradient>
      </defs>

      {/* CIEL - haut */}
      <rect x="0" y="0" width="256" height="70" fill="url(#skyG)"/>

      {/* Soleil - haut droite */}
      <circle cx="228" cy="20" r="14" fill="#fdd835">
        <animate attributeName="r" values="14;16;14" dur="3s" repeatCount="indefinite"/>
      </circle>
      <g stroke="#fdd835" strokeWidth="2" strokeLinecap="round" opacity="0.5">
        <line x1="228" y1="1" x2="228" y2="-2"/>
        <line x1="228" y1="39" x2="228" y2="43"/>
        <line x1="209" y1="20" x2="205" y2="20"/>
        <line x1="247" y1="20" x2="251" y2="20"/>
        <line x1="215" y1="7" x2="212" y2="4"/>
        <line x1="241" y1="33" x2="244" y2="36"/>
        <line x1="215" y1="33" x2="212" y2="36"/>
        <line x1="241" y1="7" x2="244" y2="4"/>
      </g>

      {/* Nuages */}
      <g style={{animation:'cloud-move 5s ease-in-out infinite'}}>
        <ellipse cx="55" cy="18" rx="22" ry="11" fill="white" opacity="0.92"/>
        <ellipse cx="72" cy="20" rx="16" ry="10" fill="white" opacity="0.92"/>
        <ellipse cx="38" cy="21" rx="14" ry="8" fill="white" opacity="0.85"/>
      </g>
      <g style={{animation:'cloud-move 6s ease-in-out infinite 2s'}}>
        <ellipse cx="155" cy="14" rx="17" ry="9" fill="white" opacity="0.75"/>
        <ellipse cx="169" cy="16" rx="13" ry="7" fill="white" opacity="0.75"/>
      </g>

      {/* Collines vertes */}
      <ellipse cx="60" cy="72" rx="80" ry="25" fill="#66bb6a" opacity="0.5"/>
      <ellipse cx="190" cy="74" rx="90" ry="22" fill="#81c784" opacity="0.4"/>

      {/* SOL - bas */}
      <rect x="0" y="70" width="256" height="40" fill="url(#soilG)"/>
      {/* Sillons */}
      <g stroke="#6d4c41" strokeWidth="1" opacity="0.45">
        <line x1="0" y1="75" x2="256" y2="75"/>
        <line x1="0" y1="80" x2="256" y2="80"/>
        <line x1="0" y1="85" x2="256" y2="85"/>
        <line x1="0" y1="90" x2="256" y2="90"/>
        <line x1="0" y1="95" x2="256" y2="95"/>
        <line x1="0" y1="100" x2="256" y2="100"/>
      </g>

      {/* Herbe horizon */}
      <path d="M0 70 Q40 64 80 69 Q120 74 160 68 Q200 62 256 67 L256 76 L0 76Z" fill="#4caf61" opacity="0.95"/>

      {/* Plantes sur le sol */}
      {[14, 52, 88, 130, 170, 210, 245].map((x,i) => (
        <g key={x} style={{animation:'plant-grow 2s ease-in-out infinite', animationDelay:`${i*0.3}s`, transformOrigin:`${x}px 70px`}}>
          <line x1={x} y1="70" x2={x} y2={58-i%2*4} stroke="#2e7d32" strokeWidth="2" strokeLinecap="round"/>
          <ellipse cx={x} cy={56-i%2*4} rx={4+i%3} ry={6+i%2*2} fill={i%2===0?'#43a047':'#66bb6a'}/>
          {i%3===0 && <ellipse cx={x-5} cy={62} rx="3" ry="4" fill="#81c784" opacity="0.7"/>}
        </g>
      ))}

      {/* === TRACTEUR - se déplace sur le sol === */}
      <g style={{animation:'tractor-move 4s ease-in-out infinite', transformOrigin:'195px 58px'}}>
        {/* Roue arrière */}
        <g style={{animation:'wheel-spin 1.2s linear infinite', transformOrigin:'180px 63px'}}>
          <circle cx="180" cy="63" r="13" fill="#1a1a1a" stroke="#424242" strokeWidth="1.5"/>
          <circle cx="180" cy="63" r="8" fill="#2a2a2a"/>
          <circle cx="180" cy="63" r="3.5" fill="#555"/>
          <line x1="180" y1="52" x2="180" y2="50" stroke="#757575" strokeWidth="1.5"/>
          <line x1="180" y1="74" x2="180" y2="76" stroke="#757575" strokeWidth="1.5"/>
          <line x1="169" y1="63" x2="167" y2="63" stroke="#757575" strokeWidth="1.5"/>
          <line x1="191" y1="63" x2="193" y2="63" stroke="#757575" strokeWidth="1.5"/>
          <line x1="172" y1="55" x2="170" y2="53" stroke="#757575" strokeWidth="1.2"/>
          <line x1="188" y1="71" x2="190" y2="73" stroke="#757575" strokeWidth="1.2"/>
          <line x1="172" y1="71" x2="170" y2="73" stroke="#757575" strokeWidth="1.2"/>
          <line x1="188" y1="55" x2="190" y2="53" stroke="#757575" strokeWidth="1.2"/>
        </g>
        {/* Corps rouge du tracteur */}
        <rect x="183" y="48" width="40" height="22" rx="4" fill="#e53935"/>
        {/* Capot moteur */}
        <rect x="208" y="52" width="18" height="16" rx="3" fill="#c62828"/>
        {/* Cabine avec vitre */}
        <rect x="185" y="50" width="18" height="14" rx="2" fill="#80deea" opacity="0.85"/>
        <line x1="194" y1="50" x2="194" y2="64" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8"/>
        <line x1="185" y1="57" x2="203" y2="57" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8"/>
        {/* Toit cabine */}
        <rect x="183" y="43" width="22" height="7" rx="3" fill="#b71c1c"/>
        {/* Cheminée */}
        <rect x="213" y="46" width="4" height="8" rx="1.5" fill="#424242"/>
        {/* Fumée animée */}
        <circle cx="215" cy="43" r="3" fill="#e0e0e0" opacity="0.6">
          <animate attributeName="cy" values="43;36;29" dur="1.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0.3;0" dur="1.8s" repeatCount="indefinite"/>
          <animate attributeName="r" values="3;4;5" dur="1.8s" repeatCount="indefinite"/>
        </circle>
        <circle cx="215" cy="43" r="2.5" fill="#e0e0e0" opacity="0.4">
          <animate attributeName="cy" values="43;38;33" dur="1.8s" repeatCount="indefinite" begin="0.6s"/>
          <animate attributeName="opacity" values="0.4;0.2;0" dur="1.8s" repeatCount="indefinite" begin="0.6s"/>
        </circle>
        {/* Roue avant */}
        <g style={{animation:'wheel-spin 1.2s linear infinite', transformOrigin:'218px 65px'}}>
          <circle cx="218" cy="65" r="9" fill="#1a1a1a" stroke="#424242" strokeWidth="1.5"/>
          <circle cx="218" cy="65" r="5.5" fill="#2a2a2a"/>
          <circle cx="218" cy="65" r="2" fill="#555"/>
          <line x1="218" y1="57" x2="218" y2="55" stroke="#757575" strokeWidth="1.2"/>
          <line x1="218" y1="73" x2="218" y2="75" stroke="#757575" strokeWidth="1.2"/>
          <line x1="210" y1="65" x2="208" y2="65" stroke="#757575" strokeWidth="1.2"/>
          <line x1="226" y1="65" x2="228" y2="65" stroke="#757575" strokeWidth="1.2"/>
        </g>
        {/* Pilote dans la cabine */}
        <circle cx="192" cy="54" r="3.5" fill="#5d4037"/>
        <rect x="189" y="57" width="7" height="6" rx="1.5" fill="#1565c0"/>
      </g>

      {/* === PERSONNE 1 - creuse avec pioche (gauche) === */}
      <g style={{animation:'walk1 1.4s ease-in-out infinite'}}>
        {/* Tête + chapeau */}
        <circle cx="32" cy="50" r="6" fill="#5d4037"/>
        <ellipse cx="32" cy="44" rx="8" ry="3" fill="#33691e"/>
        <rect cx="28" cy="39" width="8" height="6" rx="2" fill="#33691e"/>
        {/* Corps bleu */}
        <rect x="28" y="56" width="9" height="13" rx="2" fill="#1976d2"/>
        {/* Bras + pioche animés */}
        <g style={{animation:'dig 1.2s ease-in-out infinite', transformOrigin:'28px 58px'}}>
          <line x1="28" y1="58" x2="18" y2="47" stroke="#5d4037" strokeWidth="2.5" strokeLinecap="round"/>
          <rect x="12" y="43" width="10" height="4" rx="2" fill="#6d4c41"/>
          <line x1="17" y1="45" x2="24" y2="58" stroke="#795548" strokeWidth="2" strokeLinecap="round"/>
        </g>
        {/* Bras droit */}
        <line x1="37" y1="59" x2="42" y2="65" stroke="#5d4037" strokeWidth="2.5" strokeLinecap="round"/>
        {/* Jambes alternées */}
        <g style={{animation:'leg-left 0.9s ease-in-out infinite'}}>
          <line x1="30" y1="69" x2="26" y2="80" stroke="#5d4037" strokeWidth="2.5" strokeLinecap="round"/>
          <rect x="22" y="79" width="7" height="3" rx="1.5" fill="#4e342e"/>
        </g>
        <g style={{animation:'leg-right 0.9s ease-in-out infinite 0.45s'}}>
          <line x1="34" y1="69" x2="37" y2="80" stroke="#5d4037" strokeWidth="2.5" strokeLinecap="round"/>
          <rect x="34" y="79" width="7" height="3" rx="1.5" fill="#4e342e"/>
        </g>
      </g>

      {/* === PERSONNE 2 - porte panier (milieu-gauche) === */}
      <g style={{animation:'walk2 1.6s ease-in-out infinite 0.3s'}}>
        <circle cx="95" cy="49" r="6" fill="#795548"/>
        <ellipse cx="95" cy="43" rx="9" ry="3" fill="#f57f17"/>
        <rect x="90" y="38" width="10" height="6" rx="2" fill="#ef6c00"/>
        <rect x="91" y="55" width="9" height="13" rx="2" fill="#e53935"/>
        {/* Bras avec panier */}
        <line x1="100" y1="58" x2="110" y2="63" stroke="#795548" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M108 62 Q116 61 117 66 Q118 73 111 73 Q108 73 107 67 Q106 61 108 62Z" fill="#8d6e63"/>
        <ellipse cx="112" cy="61" rx="5" ry="2" fill="#6d4c41"/>
        <circle cx="112" cy="67" r="2" fill="#e53935" opacity="0.8"/>
        <circle cx="114" cy="69" r="1.5" fill="#ff7043" opacity="0.8"/>
        {/* Bras gauche */}
        <line x1="91" y1="58" x2="85" y2="64" stroke="#795548" strokeWidth="2.5" strokeLinecap="round"/>
        {/* Jambes */}
        <g style={{animation:'leg-left 1s ease-in-out infinite 0.1s'}}>
          <line x1="93" y1="68" x2="88" y2="80" stroke="#795548" strokeWidth="2.5" strokeLinecap="round"/>
          <rect x="84" y="79" width="7" height="3" rx="1.5" fill="#5d4037"/>
        </g>
        <g style={{animation:'leg-right 1s ease-in-out infinite 0.6s'}}>
          <line x1="97" y1="68" x2="100" y2="80" stroke="#795548" strokeWidth="2.5" strokeLinecap="round"/>
          <rect x="97" y="79" width="7" height="3" rx="1.5" fill="#5d4037"/>
        </g>
      </g>

      {/* === PERSONNE 3 - arrose (milieu) === */}
      <g style={{animation:'walk1 1.5s ease-in-out infinite 0.7s'}}>
        <circle cx="142" cy="50" r="6" fill="#4e342e"/>
        <rect x="138" y="56" width="9" height="13" rx="2" fill="#2e7d32"/>
        {/* Bras + arrosoir */}
        <line x1="147" y1="59" x2="156" y2="64" stroke="#4e342e" strokeWidth="2.5" strokeLinecap="round"/>
        <rect x="155" y="61" width="11" height="7" rx="2.5" fill="#546e7a"/>
        <rect x="166" y="63" width="8" height="2" rx="1" fill="#546e7a"/>
        <line x1="158" y1="61" x2="160" y2="56" stroke="#78909c" strokeWidth="1.8" strokeLinecap="round"/>
        {/* Gouttes animées */}
        <circle cx="175" cy="67" r="1.5" fill="#29b6f6">
          <animate attributeName="cy" values="67;75;83" dur="0.9s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1;0.5;0" dur="0.9s" repeatCount="indefinite"/>
        </circle>
        <circle cx="177" cy="68" r="1.5" fill="#29b6f6">
          <animate attributeName="cy" values="68;76;84" dur="0.9s" repeatCount="indefinite" begin="0.3s"/>
          <animate attributeName="opacity" values="1;0.5;0" dur="0.9s" repeatCount="indefinite" begin="0.3s"/>
        </circle>
        <circle cx="173" cy="69" r="1.2" fill="#29b6f6">
          <animate attributeName="cy" values="69;77;85" dur="0.9s" repeatCount="indefinite" begin="0.6s"/>
          <animate attributeName="opacity" values="1;0.5;0" dur="0.9s" repeatCount="indefinite" begin="0.6s"/>
        </circle>
        <line x1="138" y1="59" x2="133" y2="65" stroke="#4e342e" strokeWidth="2.5" strokeLinecap="round"/>
        {/* Jambes */}
        <g style={{animation:'leg-left 1.1s ease-in-out infinite 0.2s'}}>
          <line x1="140" y1="69" x2="136" y2="80" stroke="#4e342e" strokeWidth="2.5" strokeLinecap="round"/>
          <rect x="132" y="79" width="7" height="3" rx="1.5" fill="#3e2723"/>
        </g>
        <g style={{animation:'leg-right 1.1s ease-in-out infinite 0.7s'}}>
          <line x1="144" y1="69" x2="147" y2="80" stroke="#4e342e" strokeWidth="2.5" strokeLinecap="round"/>
          <rect x="144" y="79" width="7" height="3" rx="1.5" fill="#3e2723"/>
        </g>
      </g>

      {/* Capteur IoT */}
      <g transform="translate(70, 65)">
        <rect x="-2" y="-5" width="4" height="12" rx="1.5" fill="#9e9e9e"/>
        <rect x="-6" y="-13" width="12" height="9" rx="3" fill="#37474f"/>
        <rect x="-4" y="-11" width="8" height="5" rx="1.5" fill="#1b5e20"/>
        <rect x="-3" y="-10" width="2" height="2" rx="0.5" fill="#4caf61"/>
        <rect x="0" y="-10.5" width="2" height="2.5" rx="0.5" fill="#4caf61"/>
        <line x1="5" y1="-13" x2="9" y2="-19" stroke="#bdbdbd" strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="9" cy="-19" r="2" fill="#f44336">
          <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite"/>
        </circle>
      </g>
    </svg>
  </>
);

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord',  color: '#2e7d32' },
  { to: '/map',       icon: Map,             label: 'Carte & Satellite', color: '#0288d1' },
  { to: '/parcels',   icon: Layers,          label: 'Mes Parcelles',     color: '#388e3c' },
  { to: '/sensors',   icon: Cpu,             label: 'Capteurs',          color: '#7b1fa2' },
  { to: '/alerts',    icon: Bell,            label: 'Alertes',           color: '#d32f2f' },
  { to: '/export',    icon: Download,        label: 'Exporter',          color: '#f57c00' },
  { to: '/drone',     icon: Plane,           label: 'Mission Drone',     color: '#0097a7' },
  { to: '/settings',  icon: Settings,        label: 'Paramètres',        color: '#546e7a' },
];

const AnimatedNavLink = ({ to, icon: Icon, label, color, onClick }) => (
  <NavLink to={to} onClick={onClick} style={{ textDecoration: 'none', display: 'block', marginBottom: 3 }}>
    {({ isActive }) => (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 10px', borderRadius: 12, cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        background: isActive ? `${color}15` : 'transparent',
        border: `1px solid ${isActive ? color + '35' : 'transparent'}`,
        transform: isActive ? 'translateX(5px) scale(1.01)' : 'translateX(0) scale(1)',
        boxShadow: isActive ? `0 3px 12px ${color}20` : 'none',
      }}
      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = `${color}0d`; e.currentTarget.style.transform = 'translateX(4px)'; }}}
      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateX(0)'; }}}>
        <div style={{
          width: 36, height: 36, borderRadius: 11,
          background: isActive ? color : `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.25s ease',
          boxShadow: isActive ? `0 4px 12px ${color}50` : 'none',
          transform: isActive ? 'scale(1.1)' : 'scale(1)',
        }}>
          <Icon size={17} style={{ color: isActive ? 'white' : color }} />
        </div>
        <span style={{
          fontSize: 13.5, fontWeight: isActive ? 700 : 500, flex: 1,
          color: isActive ? color : 'var(--f-text2)',
          transition: 'all 0.2s ease',
          letterSpacing: isActive ? '0.01em' : '0',
        }}>{label}</span>
        {isActive && (
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: color,
            flexShrink: 0, animation: 'pulse-dot 1.5s ease-in-out infinite',
            boxShadow: `0 0 6px ${color}80` }} />
        )}
      </div>
    )}
  </NavLink>
);

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--f-bg)' }}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 flex-shrink-0 flex flex-col transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ background: 'var(--f-surface)', borderRight: '1px solid var(--f-border)' }}>

        {/* Logo — PLEINE LARGEUR */}
        <div style={{ padding: '10px 12px 0', borderBottom: '1px solid var(--f-border)', background: 'white' }}>
          <img src="/logo.png" alt="AgroSmart"
            style={{
              width: '100%', height: 80, objectFit: 'contain',
              display: 'block',
              filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.15))'
            }} />
          <button className="lg:hidden absolute top-3 right-3 p-1.5 rounded-lg"
            style={{ color: 'var(--f-text3)' }} onClick={() => setSidebarOpen(false)}>
            <X size={16} />
          </button>
        </div>

        {/* Illustration animée */}
        <div style={{ borderBottom: '1px solid var(--f-border)', overflow: 'hidden' }}>
          <FarmIllustration />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--f-text3)',
            letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 10px', marginBottom: 6 }}>
            Navigation
          </p>
          {NAV_ITEMS.map(({ to, icon, label, color }) => (
            <AnimatedNavLink key={to} to={to} icon={icon} label={label} color={color}
              onClick={() => setSidebarOpen(false)} />
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: 10, borderTop: '1px solid var(--f-border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 10px', borderRadius: 10, marginBottom: 6,
            background: isConnected ? '#e8f5e9' : '#fee2e2',
            border: `1px solid ${isConnected ? 'rgba(46,125,50,0.2)' : 'rgba(220,38,38,0.2)'}`
          }}>
            {isConnected
              ? <Wifi size={12} style={{ color: '#2e7d32' }} />
              : <WifiOff size={12} style={{ color: '#dc2626' }} />}
            <span style={{ fontSize: 11, fontWeight: 600,
              color: isConnected ? '#2e7d32' : '#dc2626' }}>
              {isConnected ? '● Temps réel actif' : '● Connexion perdue'}
            </span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 10, marginBottom: 6,
            background: 'var(--f-surface2)', border: '1px solid var(--f-border)'
          }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg,#2e7d32,#43a047)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: 'white' }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--f-text)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
              <p style={{ fontSize: 11, color: 'var(--f-text3)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: 'var(--f-text3)', width: '100%',
              padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
              background: 'transparent', border: 'none', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--f-text3)'; }}>
            <LogOut size={14} />Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden flex items-center justify-between px-4"
          style={{ borderBottom: '1px solid var(--f-border)', background: 'var(--f-surface)', height: 56 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ color: 'var(--f-text2)' }}>
            <Menu size={22} />
          </button>
          <img src="/logo.png" alt="AgroSmart"
            style={{ height: 50, objectFit: 'contain', maxWidth: 170 }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%',
            background: isConnected ? '#2e7d32' : '#dc2626',
            boxShadow: `0 0 8px ${isConnected ? 'rgba(46,125,50,0.6)' : 'rgba(220,38,38,0.6)'}` }} />
        </div>
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
      <AssistantChat />
    </div>
  );
}
