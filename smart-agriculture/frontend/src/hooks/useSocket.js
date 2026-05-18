import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'https://smart-agriculture-5n9j.onrender.com';
let socketInstance = null;

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMeasure, setLastMeasure] = useState(null);
  const [pumpState, setPumpState] = useState({});
  const [newAlert, setNewAlert] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000
      });
    }

    const s = socketInstance;
    s.on('connect', () => { setIsConnected(true); s.emit('join_dashboard'); });
    s.on('disconnect', () => setIsConnected(false));
    s.on('new_measure', (m) => setLastMeasure(m));
    s.on('pump_state_changed', ({ sensorId, state }) => setPumpState(prev => ({ ...prev, [sensorId]: state })));
    s.on('new_alert', (a) => setNewAlert(a));

    return () => {
      s.off('new_measure'); s.off('pump_state_changed');
      s.off('new_alert'); s.off('connect'); s.off('disconnect');
    };
  }, []);

  return { isConnected, lastMeasure, pumpState, newAlert };
};

export default useSocket;
