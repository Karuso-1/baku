// Lista de la compra: suma lo que llevan los menús de la semana y lo agrupa por pasillo.
import { html, icon, sheet, $, $$, toast, esc } from '../ui.js';
import { fmt, todayISO } from '../plan.js';
import { db } from '../db.js';
import { MEALS, maps, dayGet, weekStartOf, weekDays, getSettings, parse } from '../store.js';
import { CATEGORIES } from '../seed.js';

const MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const short = (s) => { const d = parse(s); return `${d.getDate()} ${MON[d.getMonth()]}`; };
// Lo que no se compra
const SKIP = new Set(['Agua', 'Sal']);
// Orden de los pasillos (más natural que el de la despensa)
const AISLES = ['Frutas', 'Verduras', 'Proteínas', 'Lácteos', 'Legumbres', 'Hidratos', 'Grasas', 'Bebidas', 'Platos', 'Otros'];
// Unidades que se pueden contar en la tienda
const COUNT = /^(\d+(?:[.,]\d+)?)\s+(huevo|pieza|plátano|manzana|pimiento|patata|lata|yogur|filete|loncha|rebanada|tarrina|hamburguesa|chuleta|muslo|tortita|botella|lomo|brick|aguacate|limón|naranja|kiwi|pera|tomate|cebolla|calabacín|zanahoria|pepino|mango|lima)s?$/i;
const plural = (w, n) => (n === 1 ? w : /[aeiouáéó]$/i.test(w) ? w + 's' : w === 'limón' ? 'limones' : w === 'calabacín' ? 'calabacines' : w + 'es');
const liquid = (f) => f.cat === 'Bebidas' || /^(leche|bebida de|caldo|nata|kéfir)/i.test(f.name);

function amount(f, g) {
  const u = liquid(f) ? ['ml', 'l'] : ['g', 'kg'];
  const main = g >= 1000 ? `${fmt(g / 1000, 1).replace(/,0$/, '')} ${u[1]}` : `${Math.max(5, Math.round(g / 5) * 5)} ${u[0]}`;
  const p = (f.portions || []).map((x) => [x, x.name.match(COUNT)]).find(([, mm]) => mm);
  if (!p) return main;
  const [por, mm] = p;
  const per = por.g / parseFloat(mm[1].replace(',', '.'));
  const n = Math.max(1, Math.round(g / per));
  return `${main} · ≈ ${n} ${plural(mm[2].toLowerCase(), n)}`;
}

// Suma los gramos de cada alimento: los sueltos y los que van dentro de las recetas
function collect(days, m) {
  const tot = {};
  const addG = (id, g) => { if (m.foods[id] && g > 0) tot[id] = (tot[id] || 0) + g; };
  for (const d of days) for (const [k] of MEALS) for (const e of d.meals[k]) {
    if (e.kind === 'food') addG(e.id, e.g);
    else {
      const r = m.recipes[e.id];
      if (!r) continue;
      const k2 = (e.servings || 1) / (r.servings || 1);
      for (const it of r.items) addG(it.foodId, it.g * k2);
    }
  }
  return Object.entries(tot).map(([id, g]) => ({ f: m.foods[id], g })).filter(({ f }) => !SKIP.has(f.name));
}

export async function compra(app, profile, params) {
  app.className = 'full';
  const settings = await getSettings();
  const today = todayISO();
  const ref = params.get('fecha') || today;
  const ws = weekStartOf(ref, settings.weekStart);
  const week = weekDays(ws);
  const future = week.filter((d) => d >= today);
  let scope = sessionStorage.getItem('baku-compra-scope') || 'resto';
  const m = await maps();
  const days = await Promise.all(week.map(dayGet));
  const state = { week: ws, checked: [], extra: [], ...((await db.get('kv', 'compra')) || {}) };
  if (state.week !== ws) Object.assign(state, { week: ws, checked: [], extra: [] });
  const persist = () => db.put('kv', state, 'compra');

  const render = () => {
    const range = scope === 'resto' && future.length && future.length < 7 ? future : week;
    const list = collect(days.filter((d) => range.includes(d.date)), m);
    const checked = new Set(state.checked);
    const groups = AISLES.filter((c) => CATEGORIES.includes(c)).map((c) => [c, list.filter(({ f }) => f.cat === c).sort((a, b) => a.f.name.localeCompare(b.f.name))]).filter(([, l]) => l.length);
    const total = list.length + state.extra.length;
    const done = list.filter(({ f }) => checked.has(f.id)).length + state.extra.filter((x) => checked.has('x:' + x)).length;
    const item = (id, name, sub) => {
      const on = checked.has(id);
      return `<button class="list-row" data-c="${esc(id)}" aria-pressed="${on}" style="background:none;border-left:0;border-right:0;border-bottom:0;color:#fff;text-align:left;width:100%;gap:12px;${on ? 'opacity:.45' : ''}">
        <span style="flex:none;width:22px;height:22px;border-radius:7px;border:1.6px solid ${on ? 'var(--salvia)' : 'rgba(242,234,219,0.5)'};background:${on ? 'var(--salvia)' : 'transparent'};display:flex;align-items:center;justify-content:center;color:var(--pino)">${on ? icon('check', 14, 3) : ''}</span>
        <span class="col grow" style="min-width:0"><span class="ellipsis" style="font-size:14px;font-weight:500;${on ? 'text-decoration:line-through' : ''}">${esc(name)}</span>${sub ? `<span class="muted small num">${sub}</span>` : ''}</span></button>`;
    };
    $('#body', app).innerHTML = total ? html`
      <div class="between" style="padding:0 4px"><span class="muted small num">${done} de ${total} en el carro</span>${done ? '<button class="link" id="clear" style="font-size:12px">Desmarcar todo</button>' : ''}</div>
      ${groups.map(([c, l]) => html`<section class="glass card" style="gap:0;padding:10px 14px 6px"><h2 class="h2" style="padding-bottom:2px">${c}</h2>${l.map(({ f, g }) => item(f.id, f.name, amount(f, g))).join('')}</section>`).join('')}
      ${state.extra.length ? html`<section class="glass card" style="gap:0;padding:10px 14px 6px"><div class="between" style="padding-bottom:2px"><h2 class="h2">Además</h2><button class="link" id="noextra" style="font-size:12px">Quitar</button></div>${state.extra.map((x) => item('x:' + x, x, '')).join('')}</section>` : ''}`
      : html`<section class="glass card" style="align-items:center;text-align:center;padding:22px 16px">
        <span style="width:52px;height:52px;border-radius:999px;background:rgba(242,234,219,0.12);display:flex;align-items:center;justify-content:center;color:var(--crema)">${icon('cart', 24)}</span>
        <h2 style="font-size:17px;font-weight:600">La lista está vacía</h2>
        <p class="muted" style="font-size:13px;line-height:1.4;max-width:270px">Sale sola de los menús que planifiques ${scope === 'resto' && future.length < 7 ? 'de hoy en adelante' : 'esta semana'}. También puedes añadir cosas a mano.</p>
        <a class="btn small" href="#/menus?fecha=${ref}">Ir a Menús</a></section>`;
    $$('[data-c]', app).forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.c;
      state.checked = checked.has(id) ? state.checked.filter((x) => x !== id) : [...state.checked, id];
      if (navigator.vibrate) navigator.vibrate(5);
      persist(); render();
    }));
    $('#noextra', app)?.addEventListener('click', () => { state.checked = state.checked.filter((x) => !x.startsWith('x:')); state.extra = []; persist(); render(); });
    $('#clear', app)?.addEventListener('click', () => { state.checked = []; persist(); render(); });
    $('#share', app).onclick = () => share(groups);
  };

  const share = async (groups) => {
    const checked = new Set(state.checked);
    const lines = [`Lista de la compra · semana del ${short(ws)}`];
    for (const [c, l] of groups) {
      const left = l.filter(({ f }) => !checked.has(f.id));
      if (left.length) lines.push('', c, ...left.map(({ f, g }) => `- ${f.name} · ${amount(f, g)}`));
    }
    const ex = state.extra.filter((x) => !checked.has('x:' + x));
    if (ex.length) lines.push('', 'Además', ...ex.map((x) => `- ${x}`));
    const text = lines.join('\n');
    try {
      if (navigator.share) await navigator.share({ title: 'Lista de la compra', text });
      else { await navigator.clipboard.writeText(text); toast('Lista copiada'); }
    } catch (e) { if (e.name !== 'AbortError') { try { await navigator.clipboard.writeText(text); toast('Lista copiada'); } catch (_) { toast('No se pudo compartir'); } } }
  };

  app.innerHTML = html`<div class="screen">
    <div class="between"><div class="row" style="gap:12px"><button class="icon-btn glass flat" id="back" aria-label="Volver">${icon('back', 18, 2)}</button>
      <span class="col"><h1 style="font-size:20px;font-weight:600">Lista de la compra</h1><span class="muted small num">Semana del ${short(week[0])} al ${short(week[6])}</span></span></div>
      <button class="icon-btn glass flat" id="share" aria-label="Compartir la lista">${icon('upload', 17, 2)}</button></div>
    ${future.length && future.length < 7 ? html`<div class="seg glass flat" role="radiogroup" aria-label="Qué días" style="height:40px">
      <button role="radio" data-s="resto" aria-checked="${scope === 'resto'}" style="font-size:13px">De hoy en adelante</button>
      <button role="radio" data-s="semana" aria-checked="${scope === 'semana'}" style="font-size:13px">Toda la semana</button></div>` : ''}
    <div id="body" class="col" style="gap:12px"></div>
    <button class="btn small ghost" id="extra">${icon('plus', 16, 2.2)}Añadir algo más</button>
    <p class="muted small" style="text-align:center;line-height:1.4;padding:0 8px">Cantidades orientativas: suma los gramos de tus menús, también los que van dentro de las recetas.</p>
  </div>`;
  $('#back', app).addEventListener('click', () => history.back());
  $$('[data-s]', app).forEach((b) => b.addEventListener('click', () => { scope = b.dataset.s; sessionStorage.setItem('baku-compra-scope', scope); $$('[data-s]', app).forEach((x) => x.setAttribute('aria-checked', x === b)); render(); }));
  $('#extra', app).addEventListener('click', () => sheet('Añadir a la lista', html`<div class="field"><label for="x" class="label">Qué necesitas</label><input id="x" class="input glass flat" placeholder="Papel de cocina, servilletas…" autocomplete="off"></div><button class="btn" id="ok">Añadir</button>`, {
    onMount: ({ el, close }) => {
      const ok = () => { const v = $('#x', el).value.trim(); if (!v) return; if (!state.extra.includes(v)) state.extra.push(v); persist(); close(); render(); };
      $('#ok', el).addEventListener('click', ok);
      $('#x', el).addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
      setTimeout(() => $('#x', el).focus(), 250);
    },
  }));
  render();
}
