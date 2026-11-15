// Service worker: guarda la app en el móvil para que abra sin conexión.
// Cambia VERSION en cada publicación para que el móvil descargue lo nuevo.
const VERSION = 'baku-v0.7.2';
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
  'js/diet.js',
  'js/comedor.js',
  'js/sync.js',
  'js/tips.js',
  'js/avisos.js',
  'js/screens/avisos.js',
  'js/screens/privacidad.js',
  'js/vendor/supabase.js',
  'js/screens/cuenta.js',
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
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/api/')) return;
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

// ---------- Recordatorios ----------
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  const tipo = d.tipo || 'aviso';
  e.waitUntil(self.registration.showNotification(d.title || 'Baku', {
    body: d.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/badge-96.png',
    tag: 'baku-' + tipo,
    data: { url: d.url || '#/hoy', tipo },
    actions: tipo === 'prueba' ? [] : [{ action: 'silenciar', title: 'No me avises de esto' }],
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const { url, tipo } = e.notification.data || {};
  const silencio = { pesofoto: 'peso', peso: 'peso', foto: 'foto', semana: 'semana', comidas: 'comidas', volver: 'volver' }[tipo];
  const hash = e.action === 'silenciar' && silencio ? '#/avisos?silenciar=' + (tipo === 'pesofoto' ? 'peso,foto' : silencio) : (url || '#/hoy');
  const target = new URL('./' + hash, self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const c = list.find((w) => w.url.startsWith(self.registration.scope));
    if (c) return c.focus().then((w) => (w || c).navigate(target)).catch(() => self.clients.openWindow(target));
    return self.clients.openWindow(target);
  }));
});
