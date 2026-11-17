// "Te faltan X g": ideas de la Despensa para llegar a la proteína y la fibra del día
// sin pasarse de las kcal que quedan. Primero lo que te gusta; nunca lo oculto ni lo que no encaja con tu dieta.
import { tagsOf, fits } from './diet.js';

// Ingredientes que no se comen tal cual (en seco, crudos, harinas…)
const RAW = /\((secos?|secas?|crud[oa]s?|placas crudas)\)|^harina|^maicena|^levadura|^pimentón|^canela|^sal\b|^masa de/i;

const NUTRIENT = {
  p: { min: 8, label: 'proteína' },
  fi: { min: 3, label: 'fibra' },
};

// need: gramos que faltan · kcalLeft: kcal que quedan (planificadas) · m: maps() · key: 'p' | 'fi'
export function suggest(key, need, kcalLeft, m, n = 3) {
  const cap = Math.max(kcalLeft + 40, 130);
  const minV = Math.min(NUTRIENT[key].min, need * 0.5);
  const scored = [];
  for (const f of Object.values(m.foods)) {
    if (f.hidden || RAW.test(f.name) || f.cat === 'Bebidas' && key === 'fi') continue;
    if (!fits(tagsOf([f]), m.diet)) continue;
    const portion = f.portions?.find((x) => x.default) || f.portions?.[0];
    const g = portion ? portion.g : 100;
    const kcal = (f.kcal * g) / 100;
    const v = ((f[key] || 0) * g) / 100;
    if (v < minV || kcal > cap || kcal <= 0) continue;
    const score = (v / Math.max(kcal, 25)) * (f.liked ? 1.8 : 1) * (f.top ? 1.15 : 1) * (f.cat === 'Platos' ? 0.8 : 1);
    scored.push({ food: f, g, portion: portion?.name || `${g} g`, v, kcal, score });
  }
  scored.sort((a, b) => b.score - a.score);
  // Variedad: uno por categoría
  const out = [], cats = new Set();
  for (const s of scored) {
    if (cats.has(s.food.cat)) continue;
    cats.add(s.food.cat); out.push(s);
    if (out.length === n) break;
  }
  return out;
}

export const NUTRIENT_LABEL = (key) => NUTRIENT[key].label;
