import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://smart-agriculture-5n9j.onrender.com';
let socketInstance = null;

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
};

export const sendBrowserNotification = (title, body, icon = '/icon-192.png') => {
  if (Notification.permission === 'granted') new Notification(title, { body, icon });
};

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMeasure, setLastMeasure] = useState(null);
  const [pumpState, setPumpState] = useState({});
  const [newAlert, setNewAlert] = useState(null);
  const pingRef = useRef(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Détruire l'ancienne instance si le token a changé
    if (socketInstance && !socketInstance.connected) {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
      socketInstance = null;
    }

    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'], // websocket d'abord, polling en fallback
        reconnection: true,
        reconnectionAttempts: Infinity,      // Toujours réessayer
        reconnectionDelay: 1000,             // 1s avant premier retry
        reconnectionDelayMax: 10000,         // Max 10s entre retries
        timeout: 20000,
        forceNew: false,
      });
    }

    const s = socketInstance;

    s.on('connect', () => {
      setIsConnected(true);
      s.emit('join_dashboard');
      console.log('✅ Socket.IO connecté');

      // Heartbeat : ping toutes les 25s pour garder le serveur éveillé
      if (pingRef.current) clearInterval(pingRef.current);
      pingRef.current = setInterval(() => {
        if (s.connected) s.emit('ping_heartbeat');
      }, 25000);
    });

    s.on('disconnect', (reason) => {
      setIsConnected(false);
      console.warn('⚠️ Socket.IO déconnecté:', reason);
      if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }

      // Reconnexion forcée si déconnecté côté serveur
      if (reason === 'io server disconnect') {
        setTimeout(() => s.connect(), 2000);
      }
    });

    s.on('connect_error', (err) => {
      setIsConnected(false);
      console.warn('❌ Socket.IO erreur connexion:', err.message);
    });

    s.on('new_measure', (m) => setLastMeasure(m));

    s.on('pump_state_changed', ({ sensorId, state }) => {
      setPumpState(prev => ({ ...prev, [sensorId]: state }));
      sendBrowserNotification(`💧 Pompe ${state ? 'activée' : 'arrêtée'}`, 'Changement détecté');
    });

    s.on('new_alert', (a) => {
      setNewAlert(a);
      if (a.priority === 'critical' || a.priority === 'high') {
        sendBrowserNotification(`⚠️ Alerte ${a.priority === 'critical' ? 'CRITIQUE' : 'HAUTE'}`, a.message);
      }
    });

    return () => {
      if (pingRef.current) clearInterval(pingRef.current);
      s.off('new_measure');
      s.off('pump_state_changed');
      s.off('new_alert');
      s.off('connect');
      s.off('disconnect');
      s.off('connect_error');
    };
  }, []);

  return { isConnected, lastMeasure, pumpState, newAlert };
};

export default useSocket;
