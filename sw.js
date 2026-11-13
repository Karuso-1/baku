// Service worker: guarda la app en el móvil para que abra sin conexión.
// Cambia VERSION en cada publicación para que el móvil descargue lo nuevo.
const VERSION = 'baku-v0.2.0';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'fonts/UncutSans-Variable.woff2',
  'js/app.js',
  'js/db.js',
  'js/plan.js',
  'js/ui.js',
  'js/store.js',
  'js/seed.js',
  'js/theme.js',
  'js/fill.js',
  'js/screens/onboarding.js',
  'js/screens/hoy.js',
  'js/screens/progreso.js',
  'js/screens/menus.js',
  'js/screens/recetas.js',
  'js/screens/despensa.js',
  'js/screens/perfil.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Primero la red (para ver siempre lo último) y, si no hay conexión, la copia guardada
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
