import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import Layout from './components/UI/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import ParcelsPage from './pages/ParcelsPage';
import SensorsPage from './pages/SensorsPage';
import AlertsPage from './pages/AlertsPage';
import ExportPage from './pages/ExportPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  const { isAuthenticated, fetchMe } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) fetchMe();
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1f2937', color: '#f9fafb', border: '1px solid #374151' },
        success: { iconTheme: { primary: '#22c55e', secondary: '#f9fafb' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#f9fafb' } }
      }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="parcels" element={<ParcelsPage />} />
          <Route path="sensors" element={<SensorsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
