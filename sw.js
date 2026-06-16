// PhysioHome Service Worker – App offline verfügbar machen.
// WICHTIG: Bei jeder neuen Version (Datei-Änderung + Deploy) die Versionsnummer erhöhen,
// damit Geräte die aktualisierte App laden.
const CACHE = 'physiohome-v4';

// App-Shell: das, was die App zum Starten braucht. Klienten-Daten liegen in localStorage
// und sind vom Cache unabhängig.
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // einzeln cachen, damit ein fehlendes Icon den Install nicht abbricht
      .then(c => Promise.all(ASSETS.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first: erst aus Cache, sonst Netz (und neu aufnehmen).
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
