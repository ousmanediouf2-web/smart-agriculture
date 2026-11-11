// Service Worker v10 - No cache, réseau toujours prioritaire
const CACHE_NAME = 'agrosmart-v10';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Supprimer TOUS les anciens caches
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Réseau TOUJOURS en premier - jamais de cache
self.addEventListener('fetch', e => {
  // Ignorer les requêtes non-GET
  if (e.request.method !== 'GET') return;
  // Toujours aller chercher sur le réseau
  e.respondWith(
    fetch(e.request).catch(() => {
      // Fallback seulement si hors ligne
      return caches.match(e.request);
    })
  );
});
