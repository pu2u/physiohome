// PhysioHome Service Worker – App offline verfügbar machen.
// WICHTIG: Bei jeder neuen Version (Datei-Änderung + Deploy) die Versionsnummer erhöhen,
// damit Geräte die aktualisierte App laden.
const CACHE = 'physiohome-v18';

// App-Shell: das, was die App zum Starten braucht. Klienten-Daten liegen in localStorage
// und sind vom Cache unabhängig.
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
  './sg-latin.woff2',
  './sg-latinext.woff2'
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

// Cache aktualisieren (Kopie der Antwort ablegen)
function cachePut(req, res) {
  const copy = res.clone();
  caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
  return res;
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isHTML = e.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  const isManifest = url.pathname.endsWith('.webmanifest');

  if (isHTML || isManifest) {
    // Network-first: immer die frische Version laden (damit Updates zuverlässig ankommen),
    // bei Offline aus dem Cache liefern.
    e.respondWith(
      fetch(e.request).then(res => cachePut(e.request, res))
        .catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
    );
  } else {
    // Cache-first für statische Dateien (Icons usw.): schnell, sonst aus dem Netz.
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => cachePut(e.request, res)))
    );
  }
});
