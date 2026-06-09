import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Cpu, Layers, AlertTriangle,
  LogOut, Menu, Shield, BarChart2, Settings, Activity,
  X, ChevronRight, Wifi, WifiOff, Map
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useSocket from '../../hooks/useSocket';

const ADMIN_NAV = [
  { section: 'TABLEAU DE BORD', items: [
    { to: '/admin',          icon: LayoutDashboard, label: 'Vue globale',        exact: true },
    { to: '/admin/stats',    icon: BarChart2,       label: 'Statistiques' },
    { to: '/admin/activity', icon: Activity,        label: 'Activité temps réel' },
    { to: '/admin/map',      icon: Map,             label: 'Carte des parcelles' },
  ]},
  { section: 'GESTION', items: [
    { to: '/admin/users',   icon: Users,         label: 'Utilisateurs' },
    { to: '/admin/sensors', icon: Cpu,           label: 'Capteurs' },
    { to: '/admin/parcels', icon: Layers,        label: 'Parcelles' },
    { to: '/admin/alerts',  icon: AlertTriangle, label: 'Alertes' },
  ]},
  { section: 'SYSTÈME', items: [
    { to: '/admin/settings', icon: Settings, label: 'Configuration' },
  ]},
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="admin-theme flex h-screen overflow-hidden" style={{ background: 'var(--a-bg)' }}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar admin */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 flex-shrink-0 flex flex-col transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ background: 'var(--a-surface)', borderRight: '1px solid var(--a-border)' }}>

        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: '1px solid var(--a-border)' }}>
          <div className="flex flex-col gap-1">
            <img src="/logo.png" alt="AgroSmart"
              style={{ height: 52, width: 'auto', objectFit: 'contain', maxWidth: 180,
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))' }} />
            <span className="text-xs font-semibold px-1" style={{ color: 'var(--a-primary)' }}>⚙️ Administration</span>
          </div>
          <button className="lg:hidden p-1.5 rounded-lg" style={{ color: 'var(--a-text3)' }}
            onClick={() => setSidebarOpen(false)}><X size={16} /></button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {ADMIN_NAV.map(({ section, items }) => (
            <div key={section} className="mb-5">
              <p className="text-xs font-semibold px-3 mb-1.5" style={{ color: 'var(--a-text3)', letterSpacing: '0.06em' }}>{section}</p>
              {items.map(({ to, icon: Icon, label, exact }) => (
                <NavLink key={to} to={to} end={exact}
                  onClick={() => setSidebarOpen(false)}
                  style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
                  {({ isActive }) => (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 11, cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                      background: isActive ? 'rgba(37,99,235,0.12)' : 'transparent',
                      border: isActive ? '1px solid rgba(37,99,235,0.25)' : '1px solid transparent',
                      transform: isActive ? 'translateX(4px)' : 'translateX(0)',
                      boxShadow: isActive ? '0 2px 8px rgba(37,99,235,0.15)' : 'none',
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(37,99,235,0.06)'; e.currentTarget.style.transform = 'translateX(4px)'; }}}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateX(0)'; }}}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 9,
                        background: isActive ? '#2563eb' : 'rgba(37,99,235,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.2s ease',
                        boxShadow: isActive ? '0 4px 10px rgba(37,99,235,0.35)' : 'none',
                      }}>
                        <Icon size={15} style={{ color: isActive ? 'white' : 'var(--a-primary)' }} />
                      </div>
                      <span style={{
                        fontSize: 13.5, fontWeight: isActive ? 600 : 500, flex: 1,
                        color: isActive ? 'var(--a-primary)' : 'var(--a-text2)',
                        transition: 'color 0.2s ease',
                      }}>{label}</span>
                      {isActive && (
                        <div style={{ width: 6, height: 6, borderRadius: '50%',
                          background: 'var(--a-primary)', flexShrink: 0,
                          animation: 'pulse-dot 2s ease-in-out infinite' }} />
                      )}
                    </div>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4" style={{ borderTop: '1px solid var(--a-border)' }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3"
            style={{ background: isConnected ? 'var(--a-primary-light)' : '#fee2e2' }}>
            {isConnected
              ? <Wifi size={13} style={{ color: 'var(--a-primary)' }} />
              : <WifiOff size={13} style={{ color: 'var(--a-danger)' }} />}
            <span className="text-xs font-medium" style={{ color: isConnected ? 'var(--a-primary)' : 'var(--a-danger)' }}>
              {isConnected ? 'Temps réel actif' : 'Connexion perdue'}
            </span>
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2"
            style={{ background: 'var(--a-surface2)', border: '1px solid var(--a-border)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--a-text)' }}>{user?.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--a-text3)' }}>Administrateur</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-xs w-full px-3 py-2 rounded-lg transition-colors"
            style={{ color: 'var(--a-text3)' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = 'var(--a-danger)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--a-text3)'; }}>
            <LogOut size={14} />Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="flex items-center justify-between px-6 py-3 aglass"
          style={{ borderBottom: '1px solid var(--a-border)' }}>
          <button className="lg:hidden" style={{ color: 'var(--a-text2)' }} onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="hidden lg:flex items-center gap-2">
            <Shield size={14} style={{ color: 'var(--a-primary)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--a-text)' }}>Panel Administrateur</span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: isConnected ? 'var(--a-primary-light)' : '#fee2e2',
                color: isConnected ? 'var(--a-primary)' : 'var(--a-danger)',
                border: `1px solid ${isConnected ? 'rgba(37,99,235,0.2)' : 'rgba(220,38,38,0.2)'}`
              }}>
              <div className={`w-1.5 h-1.5 rounded-full pulse-dot`}
                style={{ background: isConnected ? 'var(--a-primary)' : 'var(--a-danger)' }} />
              {isConnected ? 'En ligne' : 'Hors ligne'}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
