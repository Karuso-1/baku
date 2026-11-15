// Baku · arranque y navegación por pantallas (#/ruta)
import { getProfile } from './db.js';
import { renderNav, toast } from './ui.js';
import { getSettings, ensureSeed } from './store.js';
import { applyTheme } from './theme.js';
import * as test from './screens/onboarding.js';
import { hoy } from './screens/hoy.js';
import { progreso, comparar } from './screens/progreso.js';
import { menus, propuesta, anadir } from './screens/menus.js';
import { recetaForm, recetaDetalle } from './screens/recetas.js';
import { despensaRecetas, despensaAlimentos, despensaComedor, comedorMenu, fichaAlimento, altaManual, escaner, llenar } from './screens/despensa.js';
import { perfil, fondo, copia, meta } from './screens/perfil.js';
import { cuenta } from './screens/cuenta.js';
import { startSync } from './sync.js';
import { showTips } from './tips.js';
import { avisos } from './screens/avisos.js';
import { compra } from './screens/compra.js';
import { privacidad } from './screens/privacidad.js';
import { startAvisos } from './avisos.js';
const TIP_FOR = { '/hoy': 'hoy', '/menus': 'menus', '/despensa': 'despensa', '/despensa/alimentos': 'alimentos', '/progreso': 'progreso' };

const app = document.getElementById('app');

const ONBOARDING = {
  '/bienvenida': test.bienvenida,
  '/test/1': test.paso1,
  '/test/2': test.paso2,
  '/test/3': test.paso3,
  '/test/dieta': test.pasoDieta,
  '/test/4': test.paso4,
  '/plan': test.plan,
  '/entrar': cuenta,
  '/privacidad': privacidad,
};

// [patrón, pestaña activa en la barra (o null), pantalla]
const ROUTES = [
  [/^\/hoy$/, 'hoy', hoy],
  [/^\/progreso$/, 'progreso', progreso],
  [/^\/progreso\/comparar$/, null, comparar],
  [/^\/menus$/, 'menus', menus],
  [/^\/menus\/propuesta$/, null, propuesta],
  [/^\/compra$/, null, compra],
  [/^\/anadir$/, null, anadir],
  [/^\/receta\/nueva$/, null, (a, p) => recetaForm(a, p, null)],
  [/^\/receta\/([\w-]+)\/editar$/, null, (a, p, q, id) => recetaForm(a, p, id)],
  [/^\/receta\/([\w-]+)$/, null, (a, p, q, id) => recetaDetalle(a, p, id)],
  [/^\/despensa$/, 'despensa', despensaRecetas],
  [/^\/despensa\/alimentos$/, 'despensa', despensaAlimentos],
  [/^\/despensa\/comedor$/, 'despensa', despensaComedor],
  [/^\/comedor\/menu$/, null, comedorMenu],
  [/^\/alimento\/nuevo$/, null, (a, p, q) => altaManual(a, p, q, null)],
  [/^\/alimento\/([\w-]+)\/editar$/, null, (a, p, q, id) => altaManual(a, p, q, id)],
  [/^\/alimento\/([\w-]+)$/, null, (a, p, q, id) => fichaAlimento(a, p, id)],
  [/^\/escaner$/, null, escaner],
  [/^\/llenar$/, null, llenar],
  [/^\/perfil$/, null, perfil],
  [/^\/perfil\/fondo$/, null, fondo],
  [/^\/perfil\/copia$/, null, copia],
  [/^\/meta$/, null, meta],
  [/^\/cuenta$/, null, cuenta],
  [/^\/avisos$/, null, avisos],
];

let rendering = 0;
async function route() {
  const raw = location.hash.slice(1) || '/';
  const [path, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  const profile = await getProfile();
  const ticket = ++rendering;
  app.removeAttribute('style');
  document.body.style.overflow = '';

  if (ONBOARDING[path]) {
    if (profile && path === '/bienvenida') return go('/hoy');
    renderNav(null);
    ONBOARDING[path](app);
  } else if (!profile) {
    return go('/bienvenida');
  } else {
    const hit = ROUTES.map(([re, tab, fn]) => [path.match(re), tab, fn]).find(([mm]) => mm);
    if (!hit) return go('/hoy');
    const [mm, tab, fn] = hit;
    renderNav(tab);
    try {
      await fn(app, profile, params, ...mm.slice(1));
      if (TIP_FOR[path] && ticket === rendering) setTimeout(() => showTips(TIP_FOR[path]).catch(() => {}), 450);
    } catch (e) {
      console.error(e);
      if (ticket === rendering) app.innerHTML = `<div class="screen"><section class="glass card"><h2 class="h2">Algo ha fallado</h2><p class="muted" style="font-size:13px">${String(e.message || e)}</p><a class="btn small" href="#/hoy">Volver a Hoy</a></section></div>`;
    }
  }
  if (!sessionStorage.getItem('baku-keep-scroll')) window.scrollTo(0, 0);
  sessionStorage.removeItem('baku-keep-scroll');
}
window.__route = () => { sessionStorage.setItem('baku-keep-scroll', '1'); route(); };

function go(p) {
  if (location.hash === '#' + p) route();
  else location.hash = p;
}

async function start() {
  startSync();
  startAvisos();
  const settings = await getSettings();
  applyTheme(settings);
  const profile = await getProfile();
  if (profile) {
    await ensureSeed();
    // Recordatorio de copia de seguridad (una vez por sesión)
    const old = settings.lastBackup ? Date.now() - settings.lastBackup : Date.now() - (profile.createdAt || Date.now());
    if (settings.backupReminder && old > 30 * 86400000 && !sessionStorage.getItem('baku-aviso-copia')) {
      sessionStorage.setItem('baku-aviso-copia', '1');
      setTimeout(() => toast('Hace más de un mes de tu última copia de seguridad'), 1200);
    }
  }
  window.addEventListener('hashchange', route);
  route();
}
start();

// Funcionar sin conexión e instalarse en el móvil
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}
