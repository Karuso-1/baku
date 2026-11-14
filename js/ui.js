// Piezas de interfaz reutilizables: iconos, cuenco, tubos, gotas, regla y barra.
import { fmt } from './plan.js';
import { colors } from './theme.js';

export const html = (s, ...v) => s.reduce((a, str, i) => a + str + (i < v.length ? (v[i] ?? '') : ''), '');
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const svg = (paths, size = 18, sw = 1.9, extra = '') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${paths}</svg>`;

export const ICON = {
  hoy: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  progreso: '<path d="M3 19.5h18" stroke-dasharray="3 2.5"/><path d="M3 15.5C6 15.5 7 7 11 7s5 6 8 6"/><circle cx="19" cy="13" r="2.2" fill="currentColor" stroke="none"/>',
  menus: '<path d="M6.5 14V20h11v-6"/><path d="M6.5 17h11"/><path d="M6.5 14a3.8 3.8 0 0 1-.6-7.5A5 5 0 0 1 12 3a5 5 0 0 1 6.1 3.5 3.8 3.8 0 0 1-.6 7.5"/>',
  despensa: '<path d="M7.5 3h9v3h-9z"/><path d="M6 8.5A2.5 2.5 0 0 1 8.5 6h7A2.5 2.5 0 0 1 18 8.5V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M9 12h6v4H9z"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
  flame: '<path d="M12 22c4 0 7-2.8 7-6.8 0-3.6-2.4-6-4.2-8.2-.4 2-1.6 3.4-2.8 3.8.2-3-1.2-6.2-4-8.8.2 3.4-1.6 5.6-3 7.6C3.8 11.6 5 14 5 15.2 5 19.2 8 22 12 22z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2.5 19h19"/>',
  steps: '<path d="M7 3.5c1.8 0 2.8 1.8 2.8 4.2S8.8 12 7 12 4.2 10 4.2 7.7 5.2 3.5 7 3.5z"/><path d="M4.8 15h4.4v1.5a2.2 2.2 0 0 1-4.4 0z"/><path d="M17 7.5c1.8 0 2.8 1.8 2.8 4.2S18.8 16 17 16s-2.8-2-2.8-4.3S15.2 7.5 17 7.5z"/><path d="M14.8 19h4.4v.5a2.2 2.2 0 0 1-4.4 0z"/>',
  bolt: '<path d="M13 2.5 4.5 13.5h6.5l-1 8 8.5-11h-6.5z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5v.01"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
  eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c5 0 9 6 9 6a15.7 15.7 0 0 1-3 3.4"/><path d="M6.6 6.7C4.4 8.2 3 12 3 12s4 6 9 6a8.6 8.6 0 0 0 4.3-1.2"/>',
  eye: '<path d="M3 12s4-6 9-6 9 6 9 6-4 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.8"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  scan: '<path d="M4 7V5a1 1 0 0 1 1-1h2"/><path d="M17 4h2a1 1 0 0 1 1 1v2"/><path d="M20 17v2a1 1 0 0 1-1 1h-2"/><path d="M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M8 8v8"/><path d="M11 8v8"/><path d="M14 8v8"/><path d="M16.5 8v8"/>',
  more: '<circle cx="5.5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  chevl: '<path d="M15 5l-7 7 7 7"/>',
  swap: '<path d="M7 4 4 7l3 3"/><path d="M4 7h13"/><path d="M17 20l3-3-3-3"/><path d="M20 17H7"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4.5 7h15"/><path d="M9 7V4.5h6V7"/><path d="M6.5 7l1 12.5a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-12.5"/>',
  pause: '<path d="M9 5v14"/><path d="M15 5v14"/>',
  download: '<path d="M12 3.5v11"/><path d="M7.5 10.5 12 15l4.5-4.5"/><path d="M4 16.5V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-2.5"/>',
  upload: '<path d="M12 20.5v-11"/><path d="M7.5 13.5 12 9l4.5 4.5"/><path d="M4 7.5V5a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 5v2.5"/>',
  image: '<rect x="3" y="4.5" width="18" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17.5l5-4.5 4 3.5 3-2.5 4 3.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  ruler2: '<path d="M4 16.5 16.5 4 20 7.5 7.5 20z"/><path d="M8 12.5l1.5 1.5"/><path d="M10.5 10l2 2"/><path d="M13 7.5l1.5 1.5"/>',
  cake: '<path d="M4 20h16"/><path d="M5 20v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7"/><path d="M5 15c2 1.3 3.5 1.3 5 0s3-1.3 5 0 3 1.3 4 0"/><path d="M12 11V8"/>',
  split: '<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M12 4v16"/>',
  slider: '<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M12 2.5v19"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/>',
  dashed: '<circle cx="12" cy="12" r="8" stroke-dasharray="3 3"/>',
  cloud: '<path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.1 4.7 4.7 0 0 0 7 18.5z"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2 20 3"/><path d="M16.5 6.5l2.5 2.5"/><path d="M14 9l2 2"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  logout: '<path d="M14 4.5h3.5A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 16l-4-4 4-4"/><path d="M6 12h9"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  sync: '<path d="M19.5 12a7.5 7.5 0 0 1-13.1 5"/><path d="M4.5 12a7.5 7.5 0 0 1 13.1-5"/><path d="M17.6 3.5V7h-3.5"/><path d="M6.4 20.5V17h3.5"/>',
};
export const icon = (name, size = 18, sw = 1.9) => svg(ICON[name], size, sw);

let uid = 0;
const nextId = (p) => `${p}${++uid}`;

// ---------- Cuenco de calorías ----------
// pct: 0..1 (más de 1 = exceso). Devuelve el SVG con olas animadas.
export function bowl(pct, size = 104) {
  const id = nextId('b');
  const over = pct > 1;
  const p = Math.max(0, Math.min(1, pct));
  const level = 124 - p * 112; // 124 = vacío, 12 = lleno
  const waves = (y, amp) => {
    let d = `M-136 ${y}`;
    for (let i = 0; i < 12; i++) d += ` q17 ${i % 2 ? amp : -amp} 34 0`;
    return d + ' L272 140 L-136 140 Z';
  };
  const c1 = over ? colors['oxido-claro'] : '#FFFFFF';
  const c2 = over ? colors.oxido : colors.arena;
  return `<svg width="${size}" height="${size}" viewBox="0 0 136 136" aria-hidden="true">
    <defs><clipPath id="${id}c"><circle cx="68" cy="68" r="56"/></clipPath>
    <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <circle cx="68" cy="68" r="56" fill="rgba(255,255,255,0.06)"/>
    ${p > 0 ? `<g clip-path="url(#${id}c)">
      <path d="${waves(level + 3, 7)}" fill="${over ? colors['oxido-claro'] : '#F2EADB'}" opacity="0.35"><animateTransform attributeName="transform" type="translate" from="0 0" to="68 0" dur="5s" repeatCount="indefinite"/></path>
      <path d="${waves(level, 6)}" fill="url(#${id}g)" opacity="0.92"><animateTransform attributeName="transform" type="translate" from="68 0" to="0 0" dur="3.2s" repeatCount="indefinite"/></path>
    </g>` : ''}
    <circle cx="68" cy="68" r="58" fill="none" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="1.5"/>
    <path d="M30 40 A46 46 0 0 1 58 22" fill="none" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}

// ---------- Tubo de macro ----------
const TUBE = {
  P: ['#FFFFFF', '#F2EADB', true],
  H: ['#E3CDA8', '#B8956A', false],
  G: ['#C9E3D4', '#9CC7AF', false],
};
export function tube(kind, value, goal) {
  const id = nextId('t');
  const pct = goal ? value / goal : 0;
  const over = pct > 1;
  const w = Math.max(0, Math.min(100, pct * 100));
  const [a, b, reflect] = over ? [colors['oxido-claro'], colors.oxido, false] : TUBE[kind];
  return `<svg width="100%" height="10" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true" style="display:block;overflow:visible">
    <defs><clipPath id="${id}c"><rect width="100" height="10" rx="5"/></clipPath><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect width="100" height="10" rx="5" fill="rgba(255,255,255,0.07)"/>
    ${w > 0 ? `<g clip-path="url(#${id}c)"><path d="M0 -10 H${w} q2 2.5 0 5 t0 5 t0 5 t0 5 t0 5 t0 5 H0 Z" fill="url(#${id}g)"><animateTransform attributeName="transform" type="translate" from="0 0" to="0 -10" dur="1.8s" repeatCount="indefinite"/></path></g>` : ''}
    <rect x="0.5" y="0.5" width="99" height="9" rx="4.5" fill="none" stroke="#FFFFFF" stroke-opacity="0.4"/>
    ${reflect && w > 8 ? `<path d="M4 2.6 H${Math.min(w * 0.6, 60)}" stroke="#9CC7AF" stroke-opacity="0.55" stroke-width="1.2" stroke-linecap="round"/>` : ''}
  </svg>`;
}

// ---------- Indicador de pasos: gotas ----------
export function gotas(step, total = 4) {
  let out = '<div class="gotas" role="img" aria-label="Paso ' + step + ' de ' + total + '">';
  for (let i = 1; i <= total; i++) {
    const id = nextId('g');
    let inner;
    if (i < step) {
      inner = `<circle cx="12" cy="12" r="10" fill="#F2EADB"/><path d="M7.5 12.3l3 3 6-6" stroke="#1B3A2F" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else if (i === step) {
      inner = `<defs><clipPath id="${id}"><circle cx="12" cy="12" r="10"/></clipPath></defs><circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.08)"/><g clip-path="url(#${id})"><path d="M-24 12 q3 -2 6 0 t6 0 t6 0 t6 0 t6 0 t6 0 t6 0 t6 0 V30 H-24Z" fill="#F2EADB"><animateTransform attributeName="transform" type="translate" from="0 0" to="12 0" dur="2.4s" repeatCount="indefinite"/></path></g><circle cx="12" cy="12" r="10.5" fill="none" stroke="#F2EADB" stroke-width="1.5"/>`;
    } else {
      inner = `<circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.06)" stroke="rgba(242,234,219,0.35)" stroke-width="1.5"/>`;
    }
    out += `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
    if (i < total) out += `<span class="line ${i < step ? 'done' : ''}"></span>`;
  }
  return out + '</div>';
}

// ---------- Regla deslizable ----------
// Devuelve { el, get value } y llama a onChange(valor) al deslizar.
export function ruler({ min, max, step, value, decimals = 0, labelEvery = 10, onChange }) {
  const PX = 10;
  const n = Math.round((max - min) / step);
  const wrap = document.createElement('div');
  wrap.className = 'ruler glass flat';
  let ticks = '';
  for (let i = 0; i <= n; i++) {
    const cls = i % labelEvery === 0 ? 'major' : i % (labelEvery / 2) === 0 ? 'mid' : '';
    ticks += `<i class="${cls}" style="left:${i * PX}px"></i>`;
    if (i % labelEvery === 0) ticks += `<b style="left:${i * PX}px">${fmt(min + i * step, 0)}</b>`;
  }
  wrap.innerHTML = `<div class="ruler-track" tabindex="0" role="slider" aria-valuemin="${min}" aria-valuemax="${max}"><div class="ruler-ticks"><div class="ruler-scale" style="width:${n * PX}px">${ticks}</div></div></div><span class="ruler-needle"></span>`;
  const track = wrap.querySelector('.ruler-track');
  const pad = wrap.querySelector('.ruler-ticks');
  let current = value;
  const setAria = () => {
    track.setAttribute('aria-valuenow', current);
    track.setAttribute('aria-valuetext', fmt(current, decimals));
  };
  // Hueco a ambos lados para poder centrar el primer y el último valor bajo la aguja
  const layout = () => {
    const half = Math.round(track.clientWidth / 2);
    pad.style.padding = `0 ${half}px`;
    track.scrollLeft = Math.round((current - min) / step) * PX;
  };
  requestAnimationFrame(layout);
  let t;
  track.addEventListener('scroll', () => {
    const i = Math.max(0, Math.min(n, Math.round(track.scrollLeft / PX)));
    const v = +(min + i * step).toFixed(decimals);
    if (v !== current) {
      current = v;
      setAria();
      onChange && onChange(v);
      if (navigator.vibrate && i % labelEvery === 0) navigator.vibrate(4);
    }
    clearTimeout(t);
    t = setTimeout(() => track.scrollTo({ left: i * PX, behavior: 'smooth' }), 120);
  }, { passive: true });
  // Con ratón (PC): arrastrar y rueda también mueven la regla
  let drag = null;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    drag = { x: e.clientX, left: track.scrollLeft };
    track.setPointerCapture(e.pointerId);
    track.style.cursor = 'grabbing';
  });
  track.addEventListener('pointermove', (e) => { if (drag) track.scrollLeft = drag.left - (e.clientX - drag.x); });
  const endDrag = () => { drag = null; track.style.cursor = 'grab'; };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.style.cursor = 'grab';
  track.addEventListener('wheel', (e) => {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    track.scrollLeft += Math.sign(d) * PX;
    e.preventDefault();
  }, { passive: false });
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { track.scrollLeft += PX; e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { track.scrollLeft -= PX; e.preventDefault(); }
  });
  setAria();
  return { el: wrap, get value() { return current; } };
}

// ---------- Barra inferior ----------
const TABS = [
  ['hoy', 'Hoy'],
  ['progreso', 'Progreso'],
  ['menus', 'Menús'],
  ['despensa', 'Despensa'],
];
export function renderNav(active) {
  const nav = document.getElementById('nav');
  const brand = document.getElementById('brand');
  if (brand) {
    if (!brand.innerHTML) brand.innerHTML = logoMark(22, '#F2EADB');
    brand.hidden = !active;
  }
  if (!active) { nav.hidden = true; return; }
  nav.hidden = false;
  nav.innerHTML = `<div class="bar glass">${TABS.map(([k, l]) =>
    k === active
      ? `<a class="tab" href="#/${k}" aria-current="page">${icon(k, 17, 2)}<span>${l}</span></a>`
      : `<a class="tab" href="#/${k}" aria-label="${l}">${icon(k, 18, 1.8)}</a>`).join('')}
  </div><a class="plus" href="#/anadir?volver=${encodeURIComponent(location.hash || '#/hoy')}" aria-label="Añadir plato">${icon('plus', 20, 2.2)}</a>`;
}

export function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast glass';
  t.setAttribute('role', 'status');
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

// ---------- Hoja que sube desde abajo ----------
export function sheet(title, body, { onMount } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-back"></div><section class="sheet" role="dialog" aria-label="${title}">
    <span class="sheet-handle"></span>
    <div class="between"><h2 style="font-size:20px;font-weight:600;letter-spacing:-0.01em">${title}</h2>
    <button class="icon-btn glass flat sheet-x" aria-label="Cerrar" style="width:36px;height:36px">${icon('close', 16, 2.2)}</button></div>
    <div class="sheet-body">${body}</div></section>`;
  document.body.appendChild(wrap);
  document.body.style.overflow = 'hidden';
  const close = () => {
    wrap.classList.add('closing');
    document.body.style.overflow = '';
    setTimeout(() => wrap.remove(), 220);
    window.removeEventListener('hashchange', close);
  };
  wrap.querySelector('.sheet-back').addEventListener('click', close);
  wrap.querySelector('.sheet-x').addEventListener('click', close);
  window.addEventListener('hashchange', close);
  const api = { el: wrap.querySelector('.sheet-body'), close };
  onMount && onMount(api);
  return api;
}

// ---------- Fotos: elegir, recortar a 3:4 y comprimir ----------
export function pickImage({ capture = false } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) input.capture = 'environment';
    input.onchange = () => resolve(input.files[0] || null);
    input.click();
  });
}
export async function resizeImage(file, { ratio = 3 / 4, max = 1200, quality = 0.85 } = {}) {
  const img = await createImageBitmap(file);
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (ratio) {
    if (sw / sh > ratio) { sw = Math.round(sh * ratio); sx = Math.round((img.width - sw) / 2); }
    else { sh = Math.round(sw / ratio); sy = Math.round((img.height - sh) / 2); }
  }
  const scale = Math.min(1, max / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.round(sw * scale); c.height = Math.round(sh * scale);
  c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, 'image/jpeg', quality));
}
const urls = new WeakMap();
export function blobUrl(blob) {
  if (!blob) return '';
  if (!urls.has(blob)) urls.set(blob, URL.createObjectURL(blob));
  return urls.get(blob);
}

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Botón con icono de cristal
export const circleBtn = (ic, label, attrs = '') => `<button class="icon-btn glass flat" aria-label="${label}" ${attrs}>${icon(ic, 18, 2)}</button>`;
export const circleLink = (ic, label, href) => `<a class="icon-btn glass flat" aria-label="${label}" href="${href}">${icon(ic, 18, 2)}</a>`;

// ---------- Logo de Baku (órbita y aguja) ----------
let logoN = 0;
export function logoMark(size = 48, color = '#F2EADB') {
  const u = 'lg' + (++logoN);
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true"><g transform="rotate(-35 50 50)"><defs><mask id="g${u}"><rect width="100" height="100" fill="#fff"/><rect x="38.0" y="0" width="24" height="100" fill="#000"/></mask></defs><g mask="url(#g${u})"><ellipse cx="50" cy="50" rx="39.5" ry="19.5" fill="none" stroke="${color}" stroke-width="8"/></g><g fill="${color}"><path d="M50.00 3.00Q52.02 47.98 63.00 50.00Q52.02 52.02 50.00 97.00Q47.98 52.02 37.00 50.00Q47.98 47.98 50.00 3.00Z"/></g></g></svg>`;
}
