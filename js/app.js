// Baku · arranque y navegación por pantallas (#/ruta)
import { getProfile } from './db.js';
import { renderNav } from './ui.js';
import * as test from './screens/onboarding.js';
import { hoy } from './screens/hoy.js';
import { pronto, perfil } from './screens/otras.js';

const app = document.getElementById('app');

const ONBOARDING = {
  '/bienvenida': test.bienvenida,
  '/test/1': test.paso1,
  '/test/2': test.paso2,
  '/test/3': test.paso3,
  '/test/4': test.paso4,
  '/plan': test.plan,
};
const TABS = ['hoy', 'progreso', 'menus', 'despensa'];

async function route() {
  const path = location.hash.slice(1) || '/';
  const profile = await getProfile();

  if (ONBOARDING[path]) {
    // Con perfil ya hecho, la bienvenida lleva a Hoy (el test sí se puede rehacer)
    if (profile && path === '/bienvenida') return go('/hoy');
    renderNav(null);
    ONBOARDING[path](app);
  } else if (!profile) {
    return go('/bienvenida');
  } else {
    const tab = path.slice(1);
    if (tab === 'perfil') { renderNav(null); perfil(app, profile); }
    else if (tab === 'hoy') { renderNav('hoy'); await hoy(app, profile); }
    else if (TABS.includes(tab)) { renderNav(tab); pronto(app, tab); }
    else return go('/hoy');
  }
  window.scrollTo(0, 0);
}

function go(p) {
  if (location.hash === '#' + p) route();
  else location.hash = p;
}

window.addEventListener('hashchange', route);
route();

// Funcionar sin conexión e instalarse en el móvil
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}
