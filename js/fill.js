// Rellenar días automáticamente con tus recetas y alimentos favoritos (sin IA).
import { MEALS, recipeServing, foodNutr } from './store.js';
import { fits, recipeTags, tagsOf, DEFAULT_DIET } from './diet.js';

const SNACK_CATS = ['Frutas', 'Lácteos'];

// Candidatos para una comida: recetas propias con esa etiqueta, sin alimentos ocultos
// y que encajan con la dieta (los platos de comedor no entran en el rellenado)
function candidates(meal, m) {
  const diet = m.diet || DEFAULT_DIET;
  return Object.values(m.recipes).filter((r) => !r.comedor && r.meals?.includes(meal) && r.items.length && !r.items.some((it) => m.foods[it.foodId]?.hidden) && fits(recipeTags(r, m.foods), diet));
}

function likedScore(r, m) { return r.items.filter((it) => m.foods[it.foodId]?.liked).length; }

// Ajusta las raciones (de 0,5 en 0,5) para acercarse al objetivo de esa comida
function servingsFor(kcal, target) {
  return Math.max(0.5, Math.min(2, Math.round((target / kcal) * 2) / 2));
}

export function pickRecipe(meal, target, m, used = {}, exclude = null) {
  const list = candidates(meal, m).filter((r) => r.id !== exclude);
  if (!list.length) return null;
  const scored = list.map((r) => {
    const kcal = recipeServing(r, m.foods).kcal || 1;
    const k = servingsFor(kcal, target);
    const err = Math.abs(kcal * k - target) / target;
    const score = err + (used[r.id] || 0) * 0.35 - likedScore(r, m) * 0.04 + Math.random() * 0.15;
    return { r, k, score };
  }).sort((a, b) => a.score - b.score);
  const best = scored[0];
  return { kind: 'recipe', id: best.r.id, servings: best.k };
}

function pickSnack(target, m, used = {}) {
  const foods = Object.values(m.foods).filter((f) => !f.hidden && SNACK_CATS.includes(f.cat) && f.portions?.length && fits(tagsOf([f]), m.diet || DEFAULT_DIET));
  // Primero lo que te gusta; si no hay nada, los básicos de la biblioteca (no helados ni natillas)
  const liked = foods.filter((f) => f.liked), basic = foods.filter((f) => f.top);
  const pool = liked.length ? liked : basic.length ? basic : foods;
  if (!pool.length) return [];
  const sorted = pool.map((f) => {
    const p = f.portions.find((x) => x.default) || f.portions[0];
    return { f, p, score: Math.abs(foodNutr(f, p.g).kcal - target) / target + (used[f.id] || 0) * 0.4 + Math.random() * 0.3 };
  }).sort((a, b) => a.score - b.score);
  return [{ kind: 'food', id: sorted[0].f.id, g: sorted[0].p.g }];
}

// Devuelve solo lo nuevo para un día: { comida: [entradas], ... }
export function fillDay(day, kcalGoal, m, used = {}) {
  const out = {};
  for (const [k, , share] of MEALS) {
    if (day.meals[k].length) continue;
    const target = kcalGoal * share;
    const e = pickRecipe(k, target, m, used);
    if (e) { out[k] = [e]; used[e.id] = (used[e.id] || 0) + 1; }
    else if (k === 'merienda' || k === 'desayuno') {
      const s = pickSnack(target, m, used);
      if (s.length) { out[k] = s; used[s[0].id] = (used[s[0].id] || 0) + 1; }
    }
  }
  return out;
}

// Cambiar una comida por otra receta parecida en calorías
export function swapMeal(meal, entries, kcalGoal, m) {
  const current = entries.find((e) => e.kind === 'recipe');
  const share = MEALS.find(([k]) => k === meal)[2];
  const e = pickRecipe(meal, kcalGoal * share, m, {}, current?.id);
  return e ? [e] : null;
}
