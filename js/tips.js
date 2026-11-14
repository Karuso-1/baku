// Consejos para usuarios nuevos: la primera vez que entras en una pantalla, una tarjeta señala
// lo importante con una flecha. Se pueden saltar y no vuelven a salir (se recuerda en los ajustes).
import { getSettings, saveSettings } from './store.js';

const TIPS = {
  hoy: [
    ['.bowl-wrap', 'Tu cuenco del día', 'Se llena con lo que comes. Si te pasas de tu objetivo, rebosa en naranja.'],
    ['#nav .plus', 'Apunta lo que comes', 'Toca + para añadir un plato, un alimento o tu menú del comedor.'],
    ['.hoy-head a[href="#/perfil"]', 'Tu perfil', 'Aquí están tu plan, tu dieta y tu cuenta. Puedes cambiar el objetivo cuando quieras.'],
  ],
  menus: [
    ['#strip', 'Tu semana', 'Toca un día para ver o planificar sus comidas.'],
    ['#opts', 'Rellena en un toque', 'Desde aquí puedes rellenar el día o la semana con tus recetas, copiar un día o repetir la semana anterior.'],
  ],
  despensa: [
    ['[aria-label="Apartados"]', 'Tu despensa', 'Recetas: tus platos. Alimentos: más de 500 con buscador. Comedor: platos típicos ya calculados.'],
  ],
  alimentos: [
    ['[data-like]', 'Lo que te gusta', 'Toca el corazón en lo que te gusta: saldrá primero cuando la app te proponga menús.'],
  ],
  progreso: [
    ['#anotar', 'Anota tu peso', 'Mejor una vez por semana, el mismo día y en ayunas. Tu plan se recalcula solo.'],
    ['#fotos', 'Fotos semanales', 'Frontal, lateral y trasera, una vez por semana. Así verás el cambio aunque la báscula no se mueva.'],
  ],
};

let active = null;
function close() { active?.remove(); active = null; }
window.addEventListener('hashchange', close);

export async function showTips(key) {
  const s = await getSettings();
  if (s.tips?.[key] || active) return;
  const steps = TIPS[key].filter(([sel]) => document.querySelector(sel));
  if (!steps.length) return;
  const done = async () => { close(); const t = (await getSettings()).tips || {}; await saveSettings({ tips: { ...t, [key]: true } }); };
  const hash = location.hash;
  let i = 0;

  const root = document.createElement('div');
  root.className = 'tip-root';
  root.innerHTML = `<div class="tip-hole"></div><div class="tip-card glass" role="dialog" aria-live="polite"><span class="tip-arrow"></span>
    <span class="tip-title"></span><span class="tip-text"></span>
    <div class="tip-foot"><span class="tip-dots"></span><button class="link tip-skip">Saltar</button><button class="btn small tip-next"></button></div></div>`;
  document.body.appendChild(root);
  active = root;
  const hole = root.querySelector('.tip-hole'), card = root.querySelector('.tip-card'), arrow = root.querySelector('.tip-arrow');

  const show = () => {
    const [sel, title, text] = steps[i];
    const el = document.querySelector(sel);
    if (!el || location.hash !== hash) return done();
    root.querySelector('.tip-title').textContent = title;
    root.querySelector('.tip-text').textContent = text;
    root.querySelector('.tip-dots').innerHTML = steps.length > 1 ? steps.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('') : '';
    root.querySelector('.tip-next').textContent = i < steps.length - 1 ? 'Siguiente' : 'Entendido';
    root.querySelector('.tip-skip').hidden = i === steps.length - 1;
    // Lleva el elemento a la vista y coloca el foco y la tarjeta
    const r0 = el.getBoundingClientRect();
    if (r0.top < 60 || r0.bottom > innerHeight - 160) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    card.style.opacity = '0';
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      const pad = 6;
      const radius = parseFloat(getComputedStyle(el).borderRadius) || 14;
      Object.assign(hole.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px`, borderRadius: `${radius + pad}px` });
      const cw = Math.min(330, innerWidth - 32);
      const left = Math.max(16, Math.min(innerWidth - cw - 16, r.left + r.width / 2 - cw / 2));
      card.style.width = `${cw}px`;
      card.style.left = `${left}px`;
      const below = r.bottom + 16 + 150 < innerHeight;
      card.style.top = below ? `${r.bottom + pad + 14}px` : '';
      card.style.bottom = below ? '' : `${innerHeight - r.top + pad + 14}px`;
      arrow.className = `tip-arrow ${below ? 'up' : 'down'}`;
      arrow.style.left = `${Math.max(18, Math.min(cw - 18, r.left + r.width / 2 - left))}px`;
      card.style.opacity = '1';
    }, r0.top < 60 || r0.bottom > innerHeight - 160 ? 380 : 30);
  };
  root.querySelector('.tip-next').addEventListener('click', () => { if (++i < steps.length) show(); else done(); });
  root.querySelector('.tip-skip').addEventListener('click', done);
  show();
}

// Para "Volver a ver los consejos" en Perfil
export const resetTips = () => saveSettings({ tips: {} });
