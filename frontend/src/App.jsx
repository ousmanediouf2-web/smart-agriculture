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
import ParcelDetailPage from './pages/ParcelDetailPage';
import SensorsPage from './pages/SensorsPage';
import SensorDetailPage from './pages/SensorDetailPage';
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
        color: '#14231a',
        border: '1px solid #dfe6dd',
        boxShadow: '0 10px 28px rgba(16,35,26,0.12)',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: 600
      },
      success: { iconTheme: { primary: '#1f7a4d', secondary: '#ffffff' } },
      error: { iconTheme: { primary: '#c0392b', secondary: '#ffffff' } }
    }} />
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Routes farmer */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<AdminRedirect />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="parcels" element={<ParcelsPage />} />
        <Route path="parcels/:parcelId" element={<ParcelDetailPage />} />
        <Route path="sensors" element={<SensorsPage />} />
        <Route path="sensors/:sensorId" element={<SensorDetailPage />} />
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
      setTimeout(() => setAppLoading(false), 500);
    };
    init();
  }, []);

  if (appLoading) return (
    <div className="page-loader-overlay">
      <img src="/logo-brand.png" alt="AgroSmart" className="page-loader-logo"
        style={{ background: '#fff', borderRadius: 18, padding: '14px 20px', width: 'auto', height: 96 }} />
      <p className="page-loader-text">Chargement de la plateforme…</p>
    </div>
  );

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
