import { create } from 'zustand';
import { BACKEND_URL } from '../api';

const useAuthStore = create((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: !!localStorage.getItem('token'),

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
        localStorage.setItem('token', data.token);
        set({ user: data.user, isAuthenticated: true, isLoading: false });
        return { success: true };
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
        localStorage.setItem('token', data.token);
        set({ user: data.user, isAuthenticated: true, isLoading: false });
        return { success: true };
      }
      set({ isLoading: false });
      return { success: false, message: data.message || 'Erreur création compte' };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, message: 'Erreur serveur: ' + err.message };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) set({ user: data.user, isAuthenticated: true });
      else { localStorage.removeItem('token'); set({ isAuthenticated: false }); }
    } catch {
      localStorage.removeItem('token');
      set({ isAuthenticated: false });
    }
  }
}));

export default useAuthStore;
