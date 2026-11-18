import { useState, useEffect } from 'react';
import { BACKEND_URL } from '../api';

const adminFetch = (path) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return fetch(`${BACKEND_URL}/api${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
};

/**
 * Hook pour filtrer les données admin par utilisateur
 * Retourne : { users, selectedUserId, setSelectedUserId, UserSelector }
 */
export const useAdminFilter = () => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('all');

  useEffect(() => {
    adminFetch('/users').then(res => {
      if (res.success) setUsers(res.data || []);
    });
  }, []);

  return { users, selectedUserId, setSelectedUserId };
};

export default useAdminFilter;
