import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Cpu, Layers, AlertTriangle,
  LogOut, Menu, BarChart2, Settings, Activity, X, Map
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useSocket from '../../hooks/useSocket';
import Brand from './Brand';

const ADMIN_NAV = [
  { section: 'Supervision', items: [
    { to: '/admin',          icon: LayoutDashboard, label: 'Vue globale', exact: true },
    { to: '/admin/stats',    icon: BarChart2,       label: 'Statistiques' },
    { to: '/admin/activity', icon: Activity,        label: 'Activité temps réel' },
    { to: '/admin/map',      icon: Map,             label: 'Carte & NDVI' },
  ]},
  { section: 'Gestion', items: [
    { to: '/admin/users',   icon: Users,         label: 'Utilisateurs' },
    { to: '/admin/sensors', icon: Cpu,           label: 'Capteurs' },
    { to: '/admin/parcels', icon: Layers,        label: 'Parcelles' },
    { to: '/admin/alerts',  icon: AlertTriangle, label: 'Alertes' },
  ]},
  { section: 'Système', items: [
    { to: '/admin/settings', icon: Settings, label: 'Configuration' },
  ]},
];

const ADMIN_TITLES = [
  ['/admin/users/', 'Détail utilisateur'],
  ['/admin/users', 'Utilisateurs'],
  ['/admin/stats', 'Statistiques'],
  ['/admin/activity', 'Activité temps réel'],
  ['/admin/map', 'Carte & NDVI'],
  ['/admin/sensors', 'Capteurs'],
  ['/admin/parcels', 'Parcelles'],
  ['/admin/alerts', 'Alertes'],
  ['/admin/settings', 'Configuration'],
  ['/admin', 'Vue globale'],
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const handleLogout = () => { logout(); navigate('/login'); };
  const title = (ADMIN_TITLES.find(([p]) => location.pathname.startsWith(p)) || [null, 'Administration'])[1];

  return (
    <div className="admin-theme flex h-screen overflow-hidden" style={{ background: 'var(--a-bg)' }}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 lg:hidden" style={{ background: 'rgba(10,18,32,0.5)' }}
          onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-[248px] flex-shrink-0 flex flex-col transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ background: '#111c2e' }}>
        <div className="flex items-center justify-between" style={{ padding: '20px 18px 18px' }}>
          <Brand subtitle="Administration" />
          <button className="lg:hidden p-1.5 rounded-lg" aria-label="Fermer le menu"
            style={{ color: '#a9b8d0' }} onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto sidebar-scroll" style={{ padding: '6px 12px 12px' }}>
          {ADMIN_NAV.map(({ section, items }) => (
            <div key={section} style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(169,184,208,0.55)', padding: '0 12px', marginBottom: 6 }}>{section}</p>
              {items.map(({ to, icon: Icon, label, exact }) => (
                <NavLink key={to} to={to} end={exact} onClick={() => setSidebarOpen(false)}
                  style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
                  {({ isActive }) => (
                    <div style={{
                      position: 'relative', display: 'flex', alignItems: 'center', gap: 11,
                      padding: '9px 12px', borderRadius: 9,
                      background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                      color: isActive ? '#fff' : '#a9b8d0',
                      fontSize: 13.5, fontWeight: isActive ? 700 : 500, transition: 'background .15s, color .15s'
                    }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a9b8d0'; } }}>
                      {isActive && <span style={{ position: 'absolute', left: -12, top: 8, bottom: 8, width: 3, borderRadius: 3, background: '#7ea3ff' }} />}
                      <Icon size={17} strokeWidth={isActive ? 2.3 : 2} />
                      <span>{label}</span>
                    </div>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3" style={{ padding: '8px 10px' }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: 'rgba(255,255,255,0.1)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{user?.name}</p>
              <p className="truncate" style={{ fontSize: 11.5, color: '#a9b8d0' }}>Administrateur</p>
            </div>
            <button onClick={handleLogout} title="Déconnexion" aria-label="Déconnexion"
              style={{ color: '#a9b8d0', padding: 6, borderRadius: 8 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a9b8d0'; }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="flex items-center justify-between flex-shrink-0"
          style={{ height: 58, padding: '0 20px', background: 'var(--a-surface)', borderBottom: '1px solid var(--a-border)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden" aria-label="Ouvrir le menu" style={{ color: 'var(--a-text2)' }} onClick={() => setSidebarOpen(true)}>
              <Menu size={22} />
            </button>
            <h1 className="truncate" style={{ fontSize: 15, fontWeight: 700, color: 'var(--a-text)', letterSpacing: '-0.01em' }}>{title}</h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              fontSize: 12, fontWeight: 600,
              background: isConnected ? 'var(--a-primary-light)' : 'var(--a-danger-light)',
              color: isConnected ? 'var(--a-primary)' : 'var(--a-danger)'
            }}>
            <span className={isConnected ? 'pulse-dot' : ''}
              style={{ width: 7, height: 7, borderRadius: 99, background: isConnected ? 'var(--a-primary)' : 'var(--a-danger)' }} />
            {isConnected ? 'Temps réel actif' : 'Connexion perdue'}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
