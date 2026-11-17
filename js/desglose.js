// Desglose de un macro: al tocar una barra de Hoy, de qué alimentos viene.
import { html, icon, esc, sheet } from './ui.js';
import { fmt } from './plan.js';
import { MEALS, entryNutr, entryName, entryAmount, foodNutr } from './store.js';

const LABELS = { p: 'Proteína', h: 'Hidratos', g: 'Grasas', fi: 'Fibra' };
const n1 = (v) => fmt(v, v > 0 && v < 10 ? 1 : 0);

// Ingrediente de una receta que más aporta a ese macro (para saber "de dónde" dentro del plato)
function topIngredient(r, k, m) {
  const list = (r.items || []).map((it) => ({ f: m.foods[it.foodId], g: it.g })).filter((x) => x.f)
    .map((x) => ({ name: x.f.name, v: foodNutr(x.f, x.g)[k] / (r.servings || 1) }));
  const total = list.reduce((s, x) => s + x.v, 0);
  const top = list.sort((a, b) => b.v - a.v)[0];
  return top && total > 0 && top.v / total >= 0.3 ? top.name : null;
}

// Junta lo mismo comido en varias comidas en una sola línea
function rows(day, m, k, done) {
  const by = {};
  for (const [meal, label] of MEALS) {
    if (!!day.done[meal] !== done) continue;
    for (const e of day.meals[meal]) {
      const v = entryNutr(e, m)[k];
      if (v <= 0) continue;
      const key = e.kind + ':' + e.id;
      const r = by[key] || (by[key] = { name: entryName(e, m), v: 0, meals: [], amounts: [], hint: null });
      r.v += v;
      if (!r.meals.includes(label)) r.meals.push(label);
      r.amounts.push(entryAmount(e, m));
      if (e.kind === 'recipe' && m.recipes[e.id]) r.hint = topIngredient(m.recipes[e.id], k, m);
    }
  }
  if (done) {
    for (const x of Object.values(day.supps || {})) {
      const f = x.foodId && m.foods[x.foodId];
      if (!f) continue;
      const v = foodNutr(f, x.g)[k];
      if (v > 0) by['s:' + x.foodId] = { name: x.n || f.name, v, meals: ['Suplemento'], amounts: [x.d].filter(Boolean), hint: null };
    }
  }
  return Object.values(by).sort((a, b) => b.v - a.v);
}

const row = (r, total, muted) => html`<div class="list-row" style="flex-direction:column;align-items:stretch;gap:5px">
  <div class="between" style="gap:10px">
    <span class="col grow" style="min-width:0"><span class="ellipsis" style="font-size:14px;font-weight:500">${esc(r.name)}</span>
      <span class="muted small ellipsis">${esc(r.meals.join(' · '))}${r.amounts.length === 1 ? ' · ' + esc(r.amounts[0]) : ''}${r.hint ? ' · sobre todo ' + esc(r.hint.toLowerCase()) : ''}</span></span>
    <span class="col" style="align-items:flex-end;flex:none"><span class="num" style="font-size:15px;font-weight:600">${n1(r.v)} <span class="unit">g</span></span>
      ${muted ? '' : `<span class="muted small num">${fmt((r.v / total) * 100)} %</span>`}</span></div>
  ${muted ? '' : `<span style="height:4px;border-radius:2px;background:rgba(242,234,219,0.12);display:block;overflow:hidden"><span style="display:block;height:100%;width:${Math.max(2, (r.v / total) * 100)}%;background:var(--crema);border-radius:2px"></span></span>`}
</div>`;

export function desglose(k, day, m, goal, eaten) {
  const done = rows(day, m, k, true);
  const pending = rows(day, m, k, false);
  const total = done.reduce((s, r) => s + r.v, 0) || 1;
  const diff = eaten - goal;
  // La fibra es un mínimo: pasarse es bueno
  const status = k === 'fi'
    ? (diff >= 0 ? 'Meta de fibra cumplida' : `Te faltan ${n1(-diff)} g`)
    : (diff > 0.5 ? `Te pasas ${n1(diff)} g` : `Te quedan ${n1(-diff)} g`);
  const over = k !== 'fi' && diff > 0.5;

  const body = html`
    <div class="between" style="align-items:flex-end">
      <span class="num" style="font-size:26px;font-weight:700;letter-spacing:-0.02em">${n1(eaten)} <span class="unit" style="font-size:14px">/ ${fmt(goal)} g</span></span>
      <span class="small" style="font-weight:600;color:${over ? 'var(--oxido-claro)' : 'var(--crema)'}">${status}</span></div>
    ${done.length
      ? html`<section class="col" style="gap:0">
          <span class="muted small" style="padding-bottom:4px">De dónde viene, de más a menos</span>
          ${done.map((r) => row(r, total, false)).join('')}</section>`
      : `<p class="muted" style="font-size:13px;line-height:1.4">Aún no cuenta nada: ${pending.length ? 'marca como hecha una comida para que sume.' : 'no hay comidas con este macro hoy.'}</p>`}
    ${pending.length ? html`<section class="col" style="gap:0">
      <span class="muted small" style="padding-bottom:4px">${icon('dashed', 12, 2)} Planificado, sin marcar como hecho (aún no suma)</span>
      ${pending.map((r) => row(r, total, true)).join('')}</section>` : ''}`;

  sheet(LABELS[k] + ' de hoy', body);
}
