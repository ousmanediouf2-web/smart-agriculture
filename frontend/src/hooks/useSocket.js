import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { BACKEND_URL } from '../api';

// Utilise la même URL backend que le reste de l'app (api/index.js) au lieu
// d'un fallback codé en dur, pour rester synchronisé après une migration Render
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || BACKEND_URL;
if (!import.meta.env.VITE_SOCKET_URL) {
  console.warn('⚠️ VITE_SOCKET_URL non définie — utilisation de VITE_API_URL comme fallback:', SOCKET_URL);
}

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
  const [isConnected, setIsConnected] = useState(() => socketInstance?.connected || false);
  const [lastMeasure, setLastMeasure] = useState(null);
  // Mesures temps réel indexées par sensorId — permet d'afficher la dernière
  // mesure de CHAQUE capteur en direct (page détail capteur), au lieu d'un
  // seul "lastMeasure" global écrasé par le dernier capteur qui a parlé.
  const [measuresBySensor, setMeasuresBySensor] = useState({});
  const [pumpState, setPumpState] = useState({});
  const [newAlert, setNewAlert] = useState(null);
  const pingRef = useRef(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Détruire l'ancienne instance uniquement si elle est réellement morte
    // (pas juste "non connectée à cet instant" — socket.io peut être en
    // cours de reconnexion automatique, le détruire ici casserait ce cycle)
    if (socketInstance && socketInstance.disconnected && !socketInstance.active) {
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

    // Synchroniser immédiatement l'état affiché avec l'état réel du socket
    // au moment du montage — corrige le faux "Connexion perdue" affiché
    // après une navigation alors que le socket est toujours bien connecté
    setIsConnected(s.connected);

    const handleConnect = () => {
      setIsConnected(true);
      s.emit('join_dashboard');
      console.log('✅ Socket.IO connecté');

      if (pingRef.current) clearInterval(pingRef.current);
      pingRef.current = setInterval(() => {
        if (s.connected) s.emit('ping_heartbeat');
      }, 25000);
    };

    const handleDisconnect = (reason) => {
      setIsConnected(false);
      console.warn('⚠️ Socket.IO déconnecté:', reason);
      if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
      if (reason === 'io server disconnect') {
        setTimeout(() => s.connect(), 2000);
      }
    };

    const handleConnectError = (err) => {
      setIsConnected(false);
      console.warn('❌ Socket.IO erreur connexion:', err.message);
    };

    const handleNewMeasure = (m) => {
      setLastMeasure(m);
      if (m?.sensorId) {
        setMeasuresBySensor(prev => ({ ...prev, [m.sensorId]: m }));
      }
    };

    const handlePumpStateChanged = ({ sensorId, state }) => {
      setPumpState(prev => ({ ...prev, [sensorId]: state }));
      sendBrowserNotification(`💧 Pompe ${state ? 'activée' : 'arrêtée'}`, 'Changement détecté');
    };

    const handleNewAlert = (a) => {
      setNewAlert(a);
      if (a.priority === 'critical' || a.priority === 'high') {
        sendBrowserNotification(`⚠️ Alerte ${a.priority === 'critical' ? 'CRITIQUE' : 'HAUTE'}`, a.message);
      }
    };

    s.on('connect', handleConnect);
    s.on('disconnect', handleDisconnect);
    s.on('connect_error', handleConnectError);
    s.on('new_measure', handleNewMeasure);
    s.on('pump_state_changed', handlePumpStateChanged);
    s.on('new_alert', handleNewAlert);

    return () => {
      if (pingRef.current) clearInterval(pingRef.current);
      // Retirer uniquement les listeners ajoutés par cette instance du hook,
      // par référence — jamais s.off('event') sans référence, qui supprimerait
      // aussi les listeners d'un composant venant d'être monté ailleurs sur
      // ce même socket partagé (c'était la cause du faux "Connexion perdue")
      s.off('connect', handleConnect);
      s.off('disconnect', handleDisconnect);
      s.off('connect_error', handleConnectError);
      s.off('new_measure', handleNewMeasure);
      s.off('pump_state_changed', handlePumpStateChanged);
      s.off('new_alert', handleNewAlert);
    };
  }, []);

  return { isConnected, lastMeasure, measuresBySensor, pumpState, newAlert };
};

export default useSocket;
