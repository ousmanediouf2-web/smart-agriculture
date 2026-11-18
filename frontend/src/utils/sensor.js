import { useEffect, useState } from 'react';

// Hors ligne après 45 s sans donnée (le capteur envoie toutes les 3 s).
// Reste supérieur au rafraîchissement des pages (30 s) pour éviter les faux « hors ligne ».
export const ONLINE_WINDOW_MS = 45 * 1000;

// Valeurs affichées quand le capteur est débranché
export const ZERO_MEASURE = { soilHumidity: 0, temperature: 0, airHumidity: 0 };

/** Dernière mesure si le capteur est en ligne, sinon des zéros */
export const measureOrZero = (isOnline, measure) => (isOnline && measure ? measure : ZERO_MEASURE);
// Une mesure reçue en direct depuis moins de 20 s prouve que le capteur est actif
export const LIVE_WINDOW_MS = 20 * 1000;

/** Marque l'instant du chargement pour pouvoir recalculer l'état sans nouvelle requête */
export const stampSensors = (list) => {
  const t = Date.now();
  return (list || []).map(s => ({ ...s, _fetchedAt: t }));
};

/**
 * État en ligne d'un capteur.
 *  1. mesure reçue en direct (socket) récemment → en ligne
 *  2. sinon temps écoulé fourni par le serveur (horloge serveur, insensible à l'horloge du PC)
 *  3. sinon repli sur lastSeen comparé à l'horloge locale
 */
export const isSensorOnline = (sensor, liveMeasure, now = Date.now()) => {
  if (liveMeasure?._receivedAt && now - liveMeasure._receivedAt < LIVE_WINDOW_MS) return true;
  if (!sensor) return false;
  if (typeof sensor.msSinceLastSeen === 'number' && sensor._fetchedAt) {
    return sensor.msSinceLastSeen + (now - sensor._fetchedAt) < ONLINE_WINDOW_MS;
  }
  if (sensor.lastSeen) return now - new Date(sensor.lastSeen).getTime() < ONLINE_WINDOW_MS;
  return false;
};

/** Dernière activité connue (pour l'affichage de l'heure) */
export const lastActivity = (sensor, liveMeasure) => {
  if (liveMeasure?._receivedAt) return new Date(liveMeasure._receivedAt);
  return sensor?.lastSeen ? new Date(sensor.lastSeen) : null;
};

/** Force un nouveau rendu régulier pour que « en ligne » devienne « hors ligne » tout seul */
export const useNow = (intervalMs = 5000) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};
