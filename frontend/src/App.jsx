import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import Layout from './components/UI/Layout';
import AdminLayout from './components/UI/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import ParcelsPage from './pages/ParcelsPage';
import SensorsPage from './pages/SensorsPage';
import AlertsPage from './pages/AlertsPage';
import ExportPage from './pages/ExportPage';
import SettingsPage from './pages/SettingsPage';
import DronePage from './pages/DronePage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSensors from './pages/admin/AdminSensors';
import AdminParcels from './pages/admin/AdminParcels';
import AdminAlerts from './pages/admin/AdminAlerts';
import AdminSettings from './pages/admin/AdminSettings';
import AdminStats from './pages/admin/AdminStats';
import AdminActivity from './pages/admin/AdminActivity';
import AdminMap from './pages/admin/AdminMap';
import AdminUserDetail from './pages/admin/AdminUserDetail';

// Barre de progression — DOIT être à l'intérieur de BrowserRouter
const TopProgressBar = () => {
  const [visible, setVisible] = React.useState(false);
  const location = useLocation();
  React.useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 600);
    return () => clearTimeout(t);
  }, [location.pathname]);
  if (!visible) return null;
  return <div className="top-progress-bar" />;
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AdminRedirect = () => {
  const { user } = useAuthStore();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

// Contenu principal — séparé pour que TopProgressBar ait accès au Router
const AppContent = () => (
  <>
    <TopProgressBar />
    <Toaster position="top-right" toastOptions={{
      style: {
        background: '#ffffff',
        color: '#1a2e1a',
        border: '1px solid #d8e8d8',
        boxShadow: '0 4px 24px rgba(45,122,58,0.12)',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: 500
      },
      success: { iconTheme: { primary: '#2d7a3a', secondary: '#ffffff' } },
      error: { iconTheme: { primary: '#dc2626', secondary: '#ffffff' } }
    }} />
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Routes farmer */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<AdminRedirect />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="parcels" element={<ParcelsPage />} />
        <Route path="sensors" element={<SensorsPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="export" element={<ExportPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="drone" element={<DronePage />} />
      </Route>

      {/* Routes admin */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="sensors" element={<AdminSensors />} />
        <Route path="parcels" element={<AdminParcels />} />
        <Route path="alerts" element={<AdminAlerts />} />
        <Route path="stats" element={<AdminStats />} />
        <Route path="activity" element={<AdminActivity />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="users/:userId" element={<AdminUserDetail />} />
        <Route path="map" element={<AdminMap />} />
      </Route>

      <Route path="*" element={<AdminRedirect />} />
    </Routes>
  </>
);

export default function App() {
  const { isAuthenticated, fetchMe } = useAuthStore();
  const [appLoading, setAppLoading] = React.useState(true);

  useEffect(() => {
    const init = async () => {
      if (isAuthenticated) await fetchMe();
      setTimeout(() => setAppLoading(false), 800);
    };
    init();
  }, []);

  if (appLoading) return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(135deg, #1b4332 0%, #2e7d32 60%, #1b5e20 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        width: 140, height: 140,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.15)',
        border: '3px solid rgba(255,255,255,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'logo-spin 1.2s linear infinite',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        padding: 14
      }}>
        <img src="/logo.png" alt="AgroSmart"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      <p style={{ color: 'white', fontFamily: "'DM Sans',sans-serif", fontSize: 18,
        fontWeight: 600, letterSpacing: 2, marginTop: 24, opacity: 0.9 }}>
        AGROSMART
      </p>
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'rgba(255,255,255,0.7)',
            animation: 'loader-dot 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`
          }} />
        ))}
      </div>
      <style>{`
        @keyframes logo-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes loader-dot {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
          40% { transform: scale(1.3); opacity: 1; }
        }
      `}</style>
    </div>
  );

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
