// Elegir a qué día va lo que añades (para apuntar lo que se olvidó ayer).
import { todayISO } from './plan.js';
import { addDays, parse, MEAL_NAME } from './store.js';
import { $$ } from './ui.js';

const WD = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const WDL = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// Si vienes de «Añadir plato» de un día concreto y pasas por Buscar más, Escanear o una receta,
// se recuerda ese día y esa comida para no acabar añadiendo a hoy sin querer.
const KEY = 'baku-anadir-ctx';
export const setAddCtx = (date, meal) => sessionStorage.setItem(KEY, JSON.stringify({ date, meal, t: Date.now() }));
export const clearAddCtx = () => sessionStorage.removeItem(KEY);
export function getAddCtx() {
  try {
    const c = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    return c && Date.now() - c.t < 20 * 60000 ? c : null; // pasados 20 minutos, vuelve a hoy
  } catch { return null; }
}

export function dayName(d) {
  const today = todayISO();
  if (d === today) return 'hoy';
  if (d === addDays(today, -1)) return 'ayer';
  if (d === addDays(today, 1)) return 'mañana';
  return `el ${WDL[parse(d).getDay()]} ${parse(d).getDate()}`;
}
const chipLabel = (d) => {
  const n = dayName(d);
  return n.startsWith('el ') ? `${WD[parse(d).getDay()]} ${parse(d).getDate()}` : n[0].toUpperCase() + n.slice(1);
};

// Chips de día (desde hace 3 días hasta dentro de 6) y de comida
export function dayMealPicker(date, meal) {
  const today = todayISO();
  const dates = Array.from({ length: 10 }, (_, i) => addDays(today, i - 3));
  if (!dates.includes(date)) dates.push(date);
  return `<div class="col" style="gap:6px"><span class="label">Día</span>
    <div class="hscroll" data-days style="margin:0 -20px;padding:0 20px">${dates.map((d) => `<button class="chip-s" data-pick-d="${d}" aria-pressed="${d === date}">${chipLabel(d)}</button>`).join('')}</div>
    <div class="hscroll" style="margin:0 -20px;padding:0 20px">${Object.entries(MEAL_NAME).map(([k, l]) => `<button class="chip-s" data-pick-m="${k}" aria-pressed="${k === meal}">${l}</button>`).join('')}</div></div>`;
}
export function bindDayMealPicker(el, state, onChange) {
  const days = $$('[data-pick-d]', el);
  days.find((b) => b.getAttribute('aria-pressed') === 'true')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  days.forEach((b) => b.addEventListener('click', () => { state.date = b.dataset.pickD; days.forEach((x) => x.setAttribute('aria-pressed', x === b)); onChange(); }));
  const meals = $$('[data-pick-m]', el);
  meals.forEach((b) => b.addEventListener('click', () => { state.meal = b.dataset.pickM; meals.forEach((x) => x.setAttribute('aria-pressed', x === b)); onChange(); }));
}
export const addCta = (state, what = '') => `Añadir${what} a ${dayName(state.date)} · ${MEAL_NAME[state.meal].toLowerCase()}`;
