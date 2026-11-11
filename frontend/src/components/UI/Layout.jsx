import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Map, Layers, Cpu, Bell,
  Download, Settings, LogOut, Menu, X, Plane
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useSocket from '../../hooks/useSocket';
import AssistantChat from './AssistantChat';
import Brand from './Brand';

const NAV_GROUPS = [
  { title: 'Pilotage', items: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/map',       icon: Map,             label: 'Carte & NDVI' },
    { to: '/parcels',   icon: Layers,          label: 'Mes parcelles' },
    { to: '/sensors',   icon: Cpu,             label: 'Capteurs' },
    { to: '/alerts',    icon: Bell,            label: 'Alertes' },
  ]},
  { title: 'Outils', items: [
    { to: '/drone',  icon: Plane,    label: 'Mission drone' },
    { to: '/export', icon: Download, label: 'Exports' },
  ]},
  { title: 'Compte', items: [
    { to: '/settings', icon: Settings, label: 'Paramètres' },
  ]},
];

const PAGE_TITLES = [
  ['/parcels/', 'Détail de la parcelle'],
  ['/sensors/', 'Détail du capteur'],
  ['/dashboard', 'Tableau de bord'],
  ['/map', 'Carte & NDVI'],
  ['/parcels', 'Mes parcelles'],
  ['/sensors', 'Capteurs'],
  ['/alerts', 'Alertes'],
  ['/export', 'Exports'],
  ['/drone', 'Mission drone'],
  ['/settings', 'Paramètres'],
];

const SideLink = ({ to, icon: Icon, label, onClick }) => (
  <NavLink to={to} onClick={onClick} style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
    {({ isActive }) => (
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 11,
        padding: '9px 12px', borderRadius: 9,
        background: isActive ? 'var(--side-active)' : 'transparent',
        color: isActive ? 'var(--side-text-strong)' : 'var(--side-text)',
        fontSize: 13.5, fontWeight: isActive ? 700 : 500,
        transition: 'background .15s, color .15s'
      }}
        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--side-hover)'; e.currentTarget.style.color = '#fff'; } }}
        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--side-text)'; } }}>
        {isActive && <span style={{ position: 'absolute', left: -12, top: 8, bottom: 8, width: 3, borderRadius: 3, background: '#5fd18f' }} />}
        <Icon size={17} strokeWidth={isActive ? 2.3 : 2} />
        <span>{label}</span>
      </div>
    )}
  </NavLink>
);

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const handleLogout = () => { logout(); navigate('/login'); };

  const pageTitle = (PAGE_TITLES.find(([p]) => location.pathname.startsWith(p)) || [null, 'AgroSmart'])[1];
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--f-bg)' }}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 lg:hidden" style={{ background: 'rgba(8,20,14,0.5)' }}
          onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-[248px] flex-shrink-0 flex flex-col transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ background: 'var(--side-bg)' }}>

        <div className="flex items-center justify-between" style={{ padding: '20px 18px 18px' }}>
          <Brand />
          <button className="lg:hidden p-1.5 rounded-lg" aria-label="Fermer le menu"
            style={{ color: 'var(--side-text)' }} onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto sidebar-scroll" style={{ padding: '6px 12px 12px' }}>
          {NAV_GROUPS.map(group => (
            <div key={group.title} style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(185,207,194,0.55)', padding: '0 12px', marginBottom: 6 }}>
                {group.title}
              </p>
              {group.items.map(item => (
                <SideLink key={item.to} {...item} onClick={() => setSidebarOpen(false)} />
              ))}
            </div>
          ))}
        </nav>

        <div style={{ padding: 12, borderTop: '1px solid var(--side-border)' }}>
          <div className="flex items-center gap-3" style={{ padding: '8px 10px' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: 'rgba(255,255,255,0.1)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700
            }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{user?.name}</p>
              <p className="truncate" style={{ fontSize: 11.5, color: 'var(--side-text)' }}>{user?.email}</p>
            </div>
            <button onClick={handleLogout} title="Déconnexion" aria-label="Déconnexion"
              style={{ color: 'var(--side-text)', padding: 6, borderRadius: 8 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--side-hover)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--side-text)'; }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="flex items-center justify-between flex-shrink-0"
          style={{ height: 58, padding: '0 20px', background: 'var(--f-surface)', borderBottom: '1px solid var(--f-border)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden" aria-label="Ouvrir le menu" style={{ color: 'var(--f-text2)' }}
              onClick={() => setSidebarOpen(true)}>
              <Menu size={22} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate" style={{ fontSize: 15, fontWeight: 700, color: 'var(--f-text)', letterSpacing: '-0.01em' }}>{pageTitle}</h1>
              <p className="hidden sm:block capitalize" style={{ fontSize: 11.5, color: 'var(--f-text3)' }}>{today}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              fontSize: 12, fontWeight: 600,
              background: isConnected ? 'var(--f-primary-light)' : 'var(--f-danger-light)',
              color: isConnected ? 'var(--f-primary)' : 'var(--f-danger)'
            }}>
            <span className={isConnected ? 'pulse-dot' : ''}
              style={{ width: 7, height: 7, borderRadius: 99, background: isConnected ? 'var(--f-primary)' : 'var(--f-danger)' }} />
            {isConnected ? 'Temps réel actif' : 'Connexion perdue'}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <Outlet />
          </div>
        </div>
      </main>
      <AssistantChat />
    </div>
  );
}
