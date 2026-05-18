import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Map, Layers, Cpu, Bell, Download, Settings, LogOut, Sprout, Menu, Shield } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useSocket from '../../hooks/useSocket';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  const NAV_ITEMS = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/map', icon: Map, label: 'Carte' },
    { to: '/parcels', icon: Layers, label: 'Parcelles' },
    { to: '/sensors', icon: Cpu, label: 'Capteurs' },
    { to: '/alerts', icon: Bell, label: 'Alertes' },
    { to: '/export', icon: Download, label: 'Export' },
    { to: '/settings', icon: Settings, label: 'Paramètres' },
    ...(isAdmin ? [{ to: '/admin', icon: Shield, label: 'Administration', admin: true }] : [])
  ];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-60 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <Sprout size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-white">Smart Agriculture</p>
            <p className="text-xs text-gray-500">IoT Platform</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {NAV_ITEMS.map(({ to, icon: Icon, label, admin }) => (
            <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors ${isActive ? (admin ? 'bg-purple-600/20 text-purple-400 border border-purple-600/30' : 'bg-green-600/20 text-green-400 border border-green-600/30') : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}>
              <Icon size={18} className={admin ? 'text-purple-400' : ''} />
              {label}
              {admin && <span className="ml-auto badge bg-purple-900/30 text-purple-400 text-xs">Admin</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">{isConnected ? 'Temps réel actif' : 'Hors ligne'}</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isAdmin ? 'bg-purple-700 text-purple-200' : 'bg-gray-700 text-green-400'}`}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate">{user?.name}</p>
              <p className={`text-xs truncate ${isAdmin ? 'text-purple-400' : 'text-gray-500'}`}>{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-400 transition-colors w-full">
            <LogOut size={14} />Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white">
            <Menu size={22} />
          </button>
          <span className="text-sm font-bold text-green-400">Smart Agriculture</span>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
