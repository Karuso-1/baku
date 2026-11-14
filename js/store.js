// Datos de la app: alimentos, recetas, días, pesos, fotos y ajustes.
import { db, getProfile, saveProfile } from './db.js';
import { SEED, SEED_RECIPES, CATALOG_VERSION } from './seed.js';
import { COMEDOR } from './comedor.js';
import { dietOf } from './diet.js';
import { computePlan, todayISO } from './plan.js';

export const MEALS = [
  ['desayuno', 'Desayuno', 0.25],
  ['comida', 'Comida', 0.35],
  ['merienda', 'Merienda', 0.1],
  ['cena', 'Cena', 0.3],
];
export const MEAL_NAME = Object.fromEntries(MEALS.map(([k, l]) => [k, l]));

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const round = (n) => Math.round(n * 10) / 10;

// ---------- Fechas ----------
export const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const parse = (s) => new Date(s + 'T12:00:00');
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export function weekStartOf(s, startDay = 1) {
  const d = parse(s);
  const diff = (d.getDay() - startDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  return iso(d);
}
export const weekDays = (start) => Array.from({ length: 7 }, (_, i) => addDays(start, i));

// ---------- Ajustes ----------
const DEFAULT_SETTINGS = { weekStart: 1, palette: 'nori', bgPhoto: null, bgBlur: 55, bgDim: 30, avatar: null, pause: null, lastBackup: null, backupReminder: true, seeded: false, filled: false, catalog: 1 };
export async function getSettings() { return { ...DEFAULT_SETTINGS, ...((await db.get('kv', 'settings')) || {}) }; }
export async function saveSettings(patch) { const s = { ...(await getSettings()), ...patch }; await db.put('kv', s, 'settings'); return s; }

// ---------- Alimentos ----------
// Crea la biblioteca la primera vez y la amplía en cada versión nueva sin tocar lo del usuario
export async function ensureSeed() {
  const s = await getSettings();
  if (s.seeded && s.catalog >= CATALOG_VERSION) return;
  const existing = await db.all('foods');
  const byName = Object.fromEntries(existing.map((f) => [f.name, f]));
  for (const f of SEED) {
    const old = byName[f.name];
    if (!old) {
      const food = { id: uid(), ...f, liked: false, hidden: false, source: 'baku' };
      await db.put('foods', food);
      byName[f.name] = food;
    } else if (old.source === 'baku' && (!old.tags || old.top !== f.top || (f.cat === 'Platos' && old.cat !== 'Platos'))) {
      // Alimentos de la biblioteca anterior: se añaden etiquetas (y los platos pasan a su apartado) sin tocar valores ni me gusta
      old.tags = old.tags || f.tags; old.top = !!f.top;
      if (f.cat === 'Platos') old.cat = 'Platos';
      await db.put('foods', old);
    }
  }
  const recipes = await db.all('recipes');
  if (!s.seeded && !recipes.length) {
    for (const r of SEED_RECIPES) {
      await db.put('recipes', {
        id: uid(), name: r.name, meals: r.meals, servings: r.servings, photo: null, sample: true, createdAt: Date.now(),
        items: r.items.map(([n, g]) => ({ foodId: byName[n].id, g })),
      });
    }
  }
  // Platos de comedor (se identifican por su clave para no duplicarlos)
  const have = new Set(recipes.filter((r) => r.comedor).map((r) => r.key));
  for (const c of COMEDOR) {
    if (have.has(c.key)) continue;
    const items = c.items.map(([n, g]) => ({ foodId: byName[n]?.id, g })).filter((it) => it.foodId);
    await db.put('recipes', { id: uid(), key: c.key, name: c.name, course: c.course, meals: ['comida'], servings: 1, photo: null, comedor: true, createdAt: 0, items });
  }
  await saveSettings({ seeded: true, catalog: CATALOG_VERSION });
}

// ---------- Búsqueda ----------
// Sin tildes ni mayúsculas, y vale con escribir trozos de palabras en cualquier orden
export const norm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function matchScore(q, ...fields) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return 1;
  const hay = norm(fields.filter(Boolean).join(' '));
  if (!words.every((w) => hay.includes(w))) return 0;
  const name = norm(fields[0]);
  return name.startsWith(words[0]) ? 3 : name.split(/[^a-z0-9ñ]+/).some((t) => t.startsWith(words[0])) ? 2 : 1;
}
export function searchSort(list, q, fields = (x) => [x.name, x.brand]) {
  if (!q) return list;
  return list.map((x) => [x, matchScore(q, ...fields(x))]).filter(([, sc]) => sc).sort((a, b) => b[1] - a[1] || a[0].name.length - b[0].name.length).map(([x]) => x);
}

export const foodsAll = () => db.all('foods');
export const foodGet = (id) => db.get('foods', id);
export const foodPut = (f) => db.put('foods', f);
export const recipesAll = () => db.all('recipes');
export const recipeGet = (id) => db.get('recipes', id);
export const recipePut = (r) => db.put('recipes', r);
export const recipeDel = (id) => db.del('recipes', id);

export async function maps() {
  const [foods, recipes, profile] = await Promise.all([foodsAll(), recipesAll(), getProfile()]);
  return { foods: Object.fromEntries(foods.map((f) => [f.id, f])), recipes: Object.fromEntries(recipes.map((r) => [r.id, r])), diet: dietOf(profile) };
}

export const foodNutr = (f, g) => ({ kcal: (f.kcal * g) / 100, p: (f.p * g) / 100, h: (f.h * g) / 100, g: (f.g * g) / 100 });
const add = (a, b) => ({ kcal: a.kcal + b.kcal, p: a.p + b.p, h: a.h + b.h, g: a.g + b.g });
export const ZERO = { kcal: 0, p: 0, h: 0, g: 0 };

// Valores de una ración de la receta
export function recipeServing(r, foods) {
  let t = ZERO;
  for (const it of r.items) { const f = foods[it.foodId]; if (f) t = add(t, foodNutr(f, it.g)); }
  const n = r.servings || 1;
  return { kcal: t.kcal / n, p: t.p / n, h: t.h / n, g: t.g / n };
}

export function entryNutr(e, m) {
  if (e.kind === 'recipe') {
    const r = m.recipes[e.id];
    if (!r) return ZERO;
    const s = recipeServing(r, m.foods);
    const k = e.servings || 1;
    return { kcal: s.kcal * k, p: s.p * k, h: s.h * k, g: s.g * k };
  }
  const f = m.foods[e.id];
  return f ? foodNutr(f, e.g) : ZERO;
}
export const entryName = (e, m) => (e.kind === 'recipe' ? m.recipes[e.id]?.name : m.foods[e.id]?.name) || 'Eliminado';
export function entryAmount(e, m) {
  if (e.kind === 'recipe') return e.servings === 1 ? '1 ración' : `${String(e.servings).replace('.', ',')} raciones`;
  const f = m.foods[e.id];
  const p = f?.portions?.find((x) => Math.abs(x.g - e.g) < 0.5);
  return p ? p.name : `${Math.round(e.g)} g`;
}

// ---------- Días ----------
export function emptyDay(date) { return { date, meals: { desayuno: [], comida: [], merienda: [], cena: [] }, done: {} }; }
export async function dayGet(date) { const d = await db.get('days', date); return d ? { ...emptyDay(date), ...d } : emptyDay(date); }
export const dayPut = (d) => db.put('days', d);
export function mealTotals(day, meal, m) { return day.meals[meal].reduce((t, e) => add(t, entryNutr(e, m)), ZERO); }
export function dayTotals(day, m, onlyDone = false) {
  return MEALS.reduce((t, [k]) => (onlyDone && !day.done[k] ? t : add(t, mealTotals(day, k, m))), ZERO);
}
export const dayPlanned = (day) => MEALS.filter(([k]) => day.meals[k].length).length;

// ---------- Pesos ----------
export async function weightsAll() { return (await db.all('weights')).sort((a, b) => a.date.localeCompare(b.date)); }

// Guarda un peso y recalcula el plan. Devuelve { profile, changed, reached }.
export async function logWeight(date, kg) {
  await db.put('weights', { date, kg });
  const profile = await getProfile();
  const all = await weightsAll();
  const latest = all[all.length - 1];
  const before = profile.plan.kcal;
  if (latest.date === date) {
    profile.weight = kg;
    const keep = { ...profile.plan };
    profile.plan = computePlan(profile);
    // La fecha de llegada y las semanas del plan se conservan desde el inicio
    profile.plan.weeksTotal = keep.weeksTotal || keep.weeks;
  }
  await saveProfile(profile);
  const reached = profile.goal === 'perder' ? kg <= profile.target : profile.goal === 'ganar' ? kg >= profile.target : false;
  return { profile, changed: profile.plan.kcal !== before, reached };
}

// ---------- Fotos ----------
export const VIEWS = [['frontal', 'Frontal'], ['lateral', 'Lateral'], ['trasera', 'Trasera']];
export async function photosAll() { return db.all('photos'); }
export async function photosByWeek() {
  const all = await photosAll();
  const out = {};
  for (const p of all) (out[p.week] ||= {})[p.view] = p;
  return out;
}

// Semana del plan (1, 2, 3…) a partir de la fecha de inicio
export function planWeek(profile, date = todayISO()) {
  return Math.floor((parse(date) - parse(profile.startDate)) / (7 * 86400000)) + 1;
}

// ---------- Racha y media ----------
export async function streakAndAverage(profile, settings) {
  const days = Object.fromEntries((await db.all('days')).map((d) => [d.date, { ...emptyDay(d.date), ...d }]));
  const m = await maps();
  const today = todayISO();
  const inPause = (d) => settings.pause && d >= settings.pause.from && (!settings.pause.to || d <= settings.pause.to);
  const logged = (d) => days[d] && MEALS.some(([k]) => days[d].done[k]);
  let streak = 0;
  let d = logged(today) ? today : addDays(today, -1);
  while (d >= profile.startDate) {
    if (logged(d)) streak++;
    else if (!inPause(d)) break;
    d = addDays(d, -1);
  }
  const ws = weekStartOf(today, settings.weekStart);
  const closed = weekDays(ws).filter((x) => x < today && x >= profile.startDate && logged(x) && !inPause(x));
  const perDay = weekDays(ws).map((x) => ({ date: x, kcal: days[x] ? dayTotals(days[x], m, true).kcal : 0, closed: closed.includes(x) }));
  const avg = closed.length ? closed.reduce((s, x) => s + dayTotals(days[x], m, true).kcal, 0) / closed.length : null;
  return { streak, avg, perDay };
}

export const r1 = round;
