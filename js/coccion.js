// Crudo o cocinado: pasta, arroz, cereales y legumbres cambian mucho de peso al cocerse.
// Factor = gramos cocinados por cada gramo en crudo (valores medios, cocción normal).
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const FACTORS = [
  [/arroz integral/, 3],
  [/fideos de arroz/, 2.5],
  [/arroz/, 2.7],
  [/quinoa/, 3],
  [/pasta fresca|tortellini|ravioli/, 1.5],
  [/pasta|fideos|noodles|lasana|macarron|espagueti|tallarin|espiral/, 2.3],
  [/cuscus/, 2.5],
  [/bulgur/, 2.5],
  [/polenta/, 4],
  [/mijo/, 3],
  [/trigo sarraceno/, 2.5],
  [/lentejas rojas/, 2.5],
  [/lentejas/, 2.8],
  [/garbanzos/, 2.6],
  [/alubias|judias blancas|frijoles/, 2.7],
  [/soja/, 2.4],
];
// Productos que llevan estas palabras pero no se cuecen así (o ya son un plato)
const SKIP = /harina|tortita|tostad|galleta|bebida|leche|crema|sopa|hummus|copos|inflad|hinchad|estofad|cocido de|fabada| con |salsa|brotes|verde|yogur|tofu|tempeh|edamame|postre|natillas/;

// { state: 'crudo' | 'cocinado', factor } o null si no aplica
export function cookInfo(f) {
  if (!f || f.cat === 'Platos') return null;
  const n = norm(f.name || '');
  if (SKIP.test(n)) return null;
  const hit = FACTORS.find(([re]) => re.test(n));
  if (!hit) return null;
  let state = null;
  if (/cocid|hervid/.test(n)) state = 'cocinado';
  else if (/\(crud|\(sec|crudas?\)|secos?\)|fresca|tortellini/.test(n)) state = 'crudo';
  else if (f.kcal >= 250) state = 'crudo';
  else if (f.kcal > 0 && f.kcal <= 200) state = 'cocinado';
  return state ? { state, factor: hit[1] } : null;
}

// Gramos del alimento (en su estado) → gramos en el estado elegido, y al revés
export const toState = (g, info, st) => (!info || st === info.state ? g : st === 'cocinado' ? g * info.factor : g / info.factor);
export const fromState = (g, info, st) => (!info || st === info.state ? g : st === 'cocinado' ? g / info.factor : g * info.factor);
export const fmtFactor = (x) => String(x).replace('.', ',');
