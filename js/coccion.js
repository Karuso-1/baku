// Crudo o cocinado: el peso cambia al cocinar. Pasta, arroz, cereales y legumbres ganan agua;
// carne, pescado y casi todas las verduras la pierden (factor menor que 1).
// Factor = gramos cocinados por cada gramo en crudo (valores medios: plancha, horno, hervido…).
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const FACTORS = [
  [/arroz integral/, 3],
  [/fideos de arroz/, 2.5],
  [/arroz/, 2.7],
  [/quinoa/, 3],
  [/pasta fresca|tortellini|ravioli/, 1.5],
  [/pasta|fideos|noodles|lasana|macarron|espagueti|tallarin|espiral|plumas|penne|lacito/, 2.3],
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

// Carne, pescado, verduras y tubérculos que se pesan crudos en la biblioteca (pierden agua al cocinarse)
const LOSS = [
  // Carne
  [/hamburguesa de ternera|carne picada|albondigas/, 0.7],
  [/salchichas frescas|butifarra|chorizo fresco/, 0.8],
  [/bacon|panceta/, 0.5],
  [/higado/, 0.75],
  [/pechuga|muslo|contramuslo|alitas|pollo entero|pavo|pato|codorniz|conejo/, 0.75],
  [/ternera|entrecot|cordero|chuletillas/, 0.7],
  [/cerdo|secreto|costillas/, 0.72],
  // Pescado y marisco
  [/calamar|sepia/, 0.7],
  [/gambas|gambon|langostinos/, 0.8],
  [/salmon|merluza|bacalao|lubina|dorada|rape|lenguado|gallo|panga|abadejo|rosada|emperador|atun fresco|sardinas|caballa|boquerones|trucha/, 0.8],
  // Verduras
  [/espinacas/, 0.4],
  [/kale|acelgas|grelos/, 0.6],
  [/champinones|setas/, 0.6],
  [/cebolla|cebolleta|puerro/, 0.65],
  [/berenjena/, 0.7],
  [/calabacin|pimiento(?! del piquillo)|tomate$|tomate cherry/, 0.75],
  [/calabaza|batata|chirivia/, 0.85],
  [/patata$|patata nueva/, 0.9],
  [/brocoli|coliflor|coles de bruselas|col$|col lombarda|judias verdes|zanahoria|esparragos verdes|alcachofa|cardo|nabo|guisantes|habas|okra|pak choi|hinojo/, 0.92],
];
// Lo que ya viene cocinado, curado o en conserva
const LOSS_SKIP = /cocid|cocinad|asad|plancha|frit|conserva|aceite|escabeche|ahumad|curad|jamon|pate|noquis|en lonchas|embuchad|surimi|varitas|palitos|natural|congelad|piquillo|padron|seco|triturad|rallad|gazpacho|crema|pisto|salmorejo|menestra|salteado/;
const LOSS_CATS = ['Proteínas', 'Verduras', 'Hidratos', 'Legumbres'];

// { state: 'crudo' | 'cocinado', factor } o null si no aplica
export function cookInfo(f) {
  if (!f || f.cat === 'Platos') return null;
  const n = norm(f.name || '');
  if (LOSS_CATS.includes(f.cat) && f.source === 'baku' && !LOSS_SKIP.test(n)) {
    const loss = LOSS.find(([re]) => re.test(n));
    if (loss) return { state: 'crudo', factor: loss[1] };
  }
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
