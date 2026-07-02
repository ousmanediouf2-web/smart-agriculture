import { create } from 'zustand';
import { BACKEND_URL } from '../api';

// Admin = sessionStorage (effacé à fermeture navigateur)
// Farmer = localStorage (persiste)
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const setToken = (token, role) => {
  if (role === 'admin') {
    sessionStorage.setItem('token', token);
    localStorage.removeItem('token'); // S'assurer qu'il n'y a pas de doublon
  } else {
    localStorage.setItem('token', token);
    sessionStorage.removeItem('token');
  }
};
const removeToken = () => {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
};

const useAuthStore = create((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: !!(localStorage.getItem('token') || sessionStorage.getItem('token')),

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success && data.token) {
        setToken(data.token, data.user?.role);
        set({ user: data.user, isAuthenticated: true, isLoading: false });
        return { success: true, role: data.user?.role };
      }
      set({ isLoading: false });
      return { success: false, message: data.message || 'Identifiants incorrects' };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, message: 'Erreur serveur: ' + err.message };
    }
  },

  register: async (name, email, password, phone) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, role: 'farmer' })
      });
      const data = await res.json();
      if (data.success && data.token) {
        setToken(data.token, 'farmer');
        set({ user: data.user, isAuthenticated: true, isLoading: false });
        return { success: true, role: data.user?.role };
      }
      set({ isLoading: false });
      return { success: false, message: data.message || 'Erreur création compte' };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, message: 'Erreur serveur: ' + err.message };
    }
  },

  logout: () => {
    removeToken();
    set({ user: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) set({ user: data.user, isAuthenticated: true });
      else { removeToken(); set({ isAuthenticated: false }); }
    } catch {
      removeToken();
      set({ isAuthenticated: false });
    }
  }
}));

export default useAuthStore;
export { getToken };
