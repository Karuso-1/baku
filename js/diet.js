// Dietas y alérgenos: etiquetas de cada alimento, de las recetas y avisos según el perfil.
// Es orientativo: la app sabe qué lleva cada alimento, pero no puede garantizar que no haya trazas
// ni contaminación cruzada (importante para celíacos y alergias graves).

const svg = (paths, size, sw = 1.7) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

// Los 14 alérgenos de declaración obligatoria en la UE (Reglamento 1169/2011)
export const ALLERGENS = [
  ['gl', 'Gluten', '<path d="M12 22V6"/><path d="M12 6c-1.2-1-1.2-2.8 0-4 1.2 1.2 1.2 3 0 4z"/><path d="M12 11c-2.6 0-4-1.6-4.2-3.6 2.6 0 4 1.5 4.2 3.6z"/><path d="M12 11c2.6 0 4-1.6 4.2-3.6-2.6 0-4 1.5-4.2 3.6z"/><path d="M12 16c-2.6 0-4-1.6-4.2-3.6 2.6 0 4 1.5 4.2 3.6z"/><path d="M12 16c2.6 0 4-1.6 4.2-3.6-2.6 0-4 1.5-4.2 3.6z"/>'],
  ['la', 'Lácteos', '<path d="M9 3h6"/><path d="M9.5 3v3L7.5 9.5V20a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V9.5L14.5 6V3"/><path d="M7.5 13h9"/>'],
  ['hu', 'Huevo', '<path d="M12 3c3.5 0 6.5 5.5 6.5 10a6.5 6.5 0 0 1-13 0C5.5 8.5 8.5 3 12 3z"/>'],
  ['pe', 'Pescado', '<path d="M2.5 12c3-4.5 9.5-6 14.5 0-5 6-11.5 4.5-14.5 0z"/><path d="M17 12l4.5-3.5v7z"/><circle cx="7.5" cy="11.2" r=".9" fill="currentColor" stroke="none"/>'],
  ['cr', 'Crustáceos', '<path d="M19 6.5C14 4.5 6.5 6 6.5 12c0 3.6 2.6 6 6 6"/><path d="M12.5 18l-2.5 3.5h5.5z"/><path d="M15.5 6c.6 3.4-.6 6.4-3.4 8.4"/><path d="M19 6.5l2.5-2"/><path d="M19 6.5l2.5 1"/><path d="M9.5 9.5 7 10.8"/><path d="M9 13.5H6.6"/>'],
  ['ml', 'Moluscos', '<path d="M12 20.5 3.5 10a9.2 9.2 0 0 1 17 0z"/><path d="M12 20.5V4.5"/><path d="M12 20.5 7.2 5.6"/><path d="M12 20.5l4.8-14.9"/><path d="M9.8 20.5h4.4"/>'],
  ['fc', 'Frutos de cáscara', '<path d="M4.5 10h15"/><path d="M4.5 10c0-3.5 3.3-6 7.5-6s7.5 2.5 7.5 6"/><path d="M6 10c0 5 2.6 9 6 10.5 3.4-1.5 6-5.5 6-10.5"/><path d="M12 4V2"/>'],
  ['ca', 'Cacahuete', '<path d="M12 2.8c2.5 0 4 2 4 4.3 0 1.6-.9 2.4-.9 3.9s.9 2.3.9 3.9c0 2.3-1.5 6.3-4 6.3s-4-4-4-6.3c0-1.6.9-2.4.9-3.9S8 8.7 8 7.1c0-2.3 1.5-4.3 4-4.3z"/><path d="M10.5 7h.01"/><path d="M13.5 15.5h.01"/>'],
  ['so', 'Soja', '<path d="M4.5 19.5C3.5 13 8.5 5 19.5 4.5c1 6.5-4 14.5-15 15z"/><circle cx="9.3" cy="14.7" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="14.7" cy="9.3" r="1.5"/>'],
  ['se', 'Sésamo', '<path d="M8 3.5c1.6 1.7 1.6 4.6 0 6.3-1.6-1.7-1.6-4.6 0-6.3z"/><path d="M16 3.5c1.6 1.7 1.6 4.6 0 6.3-1.6-1.7-1.6-4.6 0-6.3z"/><path d="M12 12.5c1.6 1.7 1.6 4.6 0 6.3-1.6-1.7-1.6-4.6 0-6.3z"/>'],
  ['ap', 'Apio', '<path d="M9 21V11"/><path d="M15 21V11"/><path d="M12 21V8.5"/><path d="M9 11c-3 0-4-3-3-5.2 2.2 0 3.2 2.2 3 5.2z"/><path d="M15 11c3 0 4-3 3-5.2-2.2 0-3.2 2.2-3 5.2z"/><path d="M12 8.5c-1.6-1.6-1.6-4.3 0-6 1.6 1.7 1.6 4.4 0 6z"/>'],
  ['mo', 'Mostaza', '<path d="M10 2.5h4l.6 3.5H9.4z"/><path d="M8 6h8l1 3.2v10.3a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19.5V9.2z"/><circle cx="12" cy="14.5" r="2.3"/>'],
  ['su', 'Sulfitos', '<path d="M7 3h10l-.6 5.5a4.4 4.4 0 0 1-8.8 0z"/><path d="M12 13v7"/><path d="M8.5 21h7"/><path d="M7.6 6.5h8.8"/>'],
  ['al', 'Altramuces', '<path d="M12 22v-8.5"/><circle cx="12" cy="4" r="1.7"/><circle cx="9.5" cy="7.6" r="1.7"/><circle cx="14.5" cy="7.6" r="1.7"/><circle cx="9.5" cy="11.4" r="1.7"/><circle cx="14.5" cy="11.4" r="1.7"/><path d="M12 18.5c-2.2 0-3.7-1-4.3-2.6"/>'],
];
export const ALLERGEN_NAME = Object.fromEntries(ALLERGENS.map(([k, n]) => [k, n]));
const ALLERGEN_ICON = Object.fromEntries(ALLERGENS.map(([k, , p]) => [k, p]));
export const allergenIcon = (k, size = 16) => svg(ALLERGEN_ICON[k], size);
export const LEAF = '<path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15z"/><path d="M5 19l8-8"/>';
export const leafIcon = (size = 16) => svg(LEAF, size);

// Tipos de dieta
export const DIETS = [
  ['omnivora', 'Como de todo', 'Sin restricciones'],
  ['vegetariana', 'Vegetariana', 'Sin carne ni pescado'],
  ['vegana', 'Vegana', 'Nada de origen animal'],
];
export const DIET_NAME = Object.fromEntries(DIETS.map(([k, n]) => [k, n]));
// Lo que más se suele evitar, primero; el resto, en "Otras alergias"
export const COMMON_AVOID = [['gl', 'Sin gluten', 'Celiaquía'], ['la', 'Sin lactosa', 'Intolerancia o alergia']];
export const DEFAULT_DIET = { type: 'omnivora', avoid: [] };
export const dietOf = (profile) => ({ ...DEFAULT_DIET, ...(profile?.diet || {}) });

const ANIMAL_ALLERGENS = ['la', 'hu', 'pe', 'cr', 'ml'];
const SEA = ['pe', 'cr', 'ml'];

// Etiquetas de un conjunto de alimentos (una receta o un alimento suelto)
export function tagsOf(foods) {
  const set = new Set();
  for (const f of foods) for (const t of f?.tags || []) set.add(t);
  return set;
}
export const recipeTags = (r, foodsById) => tagsOf(r.items.map((it) => foodsById[it.foodId]));

export function origin(tags) {
  if (tags.has('C')) return 'carne';
  if (tags.has('P') || SEA.some((a) => tags.has(a))) return 'pescado';
  if (tags.has('A') || ANIMAL_ALLERGENS.some((a) => tags.has(a))) return 'animal';
  return 'vegetal';
}
export const isVegan = (tags) => origin(tags) === 'vegetal';
export const isVegetarian = (tags) => ['vegetal', 'animal'].includes(origin(tags));
export const allergensIn = (tags) => ALLERGENS.map(([k]) => k).filter((k) => tags.has(k));

// Motivos por los que algo no encaja con la dieta (vacío = encaja)
export function conflicts(tags, diet) {
  const out = [];
  const o = origin(tags);
  if (diet.type === 'vegana' && o !== 'vegetal') out.push(o === 'carne' ? 'Lleva carne' : o === 'pescado' ? 'Lleva pescado' : 'Origen animal');
  if (diet.type === 'vegetariana' && (o === 'carne' || o === 'pescado')) out.push(o === 'carne' ? 'Lleva carne' : 'Lleva pescado');
  for (const a of diet.avoid || []) if (tags.has(a)) out.push(`Lleva ${ALLERGEN_NAME[a].toLowerCase()}`);
  return out;
}
export const fits = (tags, diet) => !conflicts(tags, diet).length;
export const dietActive = (diet) => diet.type !== 'omnivora' || (diet.avoid || []).length > 0;
export function dietSummary(diet) {
  const parts = [];
  if (diet.type !== 'omnivora') parts.push(DIET_NAME[diet.type]);
  for (const a of diet.avoid || []) parts.push(a === 'gl' ? 'Sin gluten' : a === 'la' ? 'Sin lactosa' : `Sin ${ALLERGEN_NAME[a].toLowerCase()}`);
  return parts.join(' · ') || 'Como de todo';
}

// Pastillas de alérgenos con icono (para fichas y recetas)
export function allergenChips(tags, diet = DEFAULT_DIET) {
  const list = allergensIn(tags);
  if (!list.length) return '';
  return `<div class="row" style="gap:6px;flex-wrap:wrap">${list.map((k) => {
    const bad = (diet.avoid || []).includes(k);
    return `<span class="pill row" style="gap:5px;height:28px;padding:0 10px;font-size:12px;${bad ? 'background:rgba(181,101,58,0.28);color:var(--oxido-claro)' : ''}">${allergenIcon(k, 15)}${ALLERGEN_NAME[k]}</span>`;
  }).join('')}</div>`;
}

// Fila compacta de iconos (para listas)
export const allergenRow = (tags, size = 13) => allergensIn(tags).map((k) => `<span title="${ALLERGEN_NAME[k]}" style="display:inline-flex;opacity:.75">${allergenIcon(k, size)}</span>`).join('');

// Etiqueta de "apto para…" según el origen
export function suitableLabel(tags) {
  if (isVegan(tags)) return 'Vegano';
  if (isVegetarian(tags)) return 'Vegetariano';
  return '';
}

// Alérgenos y origen desde Open Food Facts
const OFF_MAP = { 'en:gluten': 'gl', 'en:crustaceans': 'cr', 'en:eggs': 'hu', 'en:fish': 'pe', 'en:peanuts': 'ca', 'en:soybeans': 'so', 'en:milk': 'la', 'en:nuts': 'fc', 'en:celery': 'ap', 'en:mustard': 'mo', 'en:sesame-seeds': 'se', 'en:sulphur-dioxide-and-sulphites': 'su', 'en:lupin': 'al', 'en:molluscs': 'ml' };
export function tagsFromOFF(p) {
  const tags = new Set();
  for (const t of [...(p.allergens_tags || []), ...(p.traces_tags || [])]) if (OFF_MAP[t]) tags.add(OFF_MAP[t]);
  const an = p.ingredients_analysis_tags || [];
  if (an.includes('en:non-vegetarian')) tags.add('C');
  else if (an.includes('en:non-vegan') && !ANIMAL_ALLERGENS.some((a) => tags.has(a))) tags.add('A');
  return [...tags];
}

// Bloque para fichas y recetas: apto para…, alérgenos y aviso si no encaja con tu dieta
export function dietCard(tags, diet, { recipe = false } = {}) {
  const bad = conflicts(tags, diet);
  const apt = suitableLabel(tags);
  const chips = allergenChips(tags, diet);
  return `<section class="glass card" style="gap:10px;padding:12px 14px">
    <div class="between"><h2 class="h2">Alérgenos</h2>${apt ? `<span class="pill row" style="gap:5px;height:26px;font-size:12px;color:var(--salvia)">${leafIcon(14)}${apt}</span>` : ''}</div>
    ${chips || `<span class="muted small">Sin ninguno de los 14 alérgenos principales.</span>`}
    ${bad.length ? `<div class="row" style="gap:8px;align-items:flex-start;border-radius:14px;background:rgba(181,101,58,0.18);padding:9px 11px"><span style="color:var(--oxido-claro);display:flex;padding-top:1px">${svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5v.01"/>', 16, 2)}</span><span style="font-size:12px;line-height:1.4"><b>No encaja con tu dieta:</b> ${bad.join(' · ').toLowerCase()}. No saldrá en las propuestas automáticas.</span></div>` : ''}
    <span class="muted" style="font-size:11px;line-height:1.4">Orientativo${recipe ? ', según sus alimentos' : ''}. Si tienes celiaquía o una alergia, revisa siempre la etiqueta: puede haber trazas o contaminación cruzada.</span>
  </section>`;
}
