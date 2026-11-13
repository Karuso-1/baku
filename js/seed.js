// Alimentos de partida: valores medios por 100 g (crudo salvo que se indique).
// Raciones habituales para no tener que pesar.
export const CATEGORIES = ['Proteínas', 'Legumbres', 'Hidratos', 'Verduras', 'Frutas', 'Lácteos', 'Grasas', 'Bebidas', 'Otros'];

const f = (name, cat, kcal, p, h, g, portions = []) => ({ name, cat, kcal, p, h, g, portions });
const r = (name, g, def = false) => ({ name, g, default: def });

export const SEED = [
  // Proteínas
  f('Pechuga de pollo', 'Proteínas', 110, 23, 0, 1.5, [r('1 filete', 150, true)]),
  f('Muslo de pollo sin piel', 'Proteínas', 120, 20, 0, 4.5, [r('1 muslo', 110, true)]),
  f('Pavo en lonchas', 'Proteínas', 104, 19, 2, 2, [r('1 loncha', 15, true)]),
  f('Ternera magra', 'Proteínas', 130, 21, 0, 5, [r('1 filete', 150, true)]),
  f('Lomo de cerdo', 'Proteínas', 150, 21, 0, 7, [r('1 filete', 120, true)]),
  f('Carne picada mixta', 'Proteínas', 220, 18, 0, 16, [r('1 ración', 125, true)]),
  f('Salmón', 'Proteínas', 208, 20, 0, 13, [r('1 lomo', 150, true)]),
  f('Merluza', 'Proteínas', 78, 17, 0, 1, [r('1 filete', 150, true)]),
  f('Atún al natural', 'Proteínas', 108, 25, 0, 1, [r('1 lata escurrida', 56, true)]),
  f('Huevo', 'Proteínas', 143, 12.6, 0.7, 9.5, [r('1 huevo mediano', 55, true), r('1 huevo grande', 65), r('2 huevos', 110)]),
  f('Claras de huevo', 'Proteínas', 52, 11, 0.7, 0.2, [r('1 clara', 33, true)]),
  f('Gambas', 'Proteínas', 85, 19, 0, 1, [r('1 ración', 120, true)]),
  f('Tofu', 'Proteínas', 120, 13, 2, 7, [r('1 ración', 125, true)]),
  f('Jamón serrano', 'Proteínas', 240, 31, 0, 13, [r('1 loncha', 15, true)]),
  // Legumbres (cocidas)
  f('Lentejas cocidas', 'Legumbres', 116, 9, 20, 0.4, [r('1 plato', 250, true)]),
  f('Garbanzos cocidos', 'Legumbres', 140, 7.5, 21, 2.5, [r('1 plato', 250, true), r('1 bote escurrido', 250)]),
  f('Alubias cocidas', 'Legumbres', 110, 7.5, 18, 0.5, [r('1 plato', 250, true)]),
  // Hidratos
  f('Arroz blanco (crudo)', 'Hidratos', 355, 7, 79, 0.6, [r('1 ración', 80, true)]),
  f('Pasta (cruda)', 'Hidratos', 355, 12, 72, 1.5, [r('1 ración', 80, true)]),
  f('Pan blanco', 'Hidratos', 265, 9, 51, 3.2, [r('1 rebanada', 30, true), r('1 barra entera', 250)]),
  f('Pan integral', 'Hidratos', 247, 13, 41, 3.4, [r('1 rebanada', 30, true)]),
  f('Copos de avena', 'Hidratos', 370, 13, 60, 7, [r('1 ración', 40, true)]),
  f('Patata', 'Hidratos', 77, 2, 17, 0.1, [r('1 patata mediana', 170, true)]),
  f('Quinoa (cruda)', 'Hidratos', 368, 14, 64, 6, [r('1 ración', 70, true)]),
  f('Tortitas de maíz', 'Hidratos', 380, 8, 80, 3, [r('1 tortita', 8, true)]),
  // Verduras
  f('Brócoli', 'Verduras', 34, 2.8, 4, 0.4, [r('1 ración', 150, true)]),
  f('Calabacín', 'Verduras', 17, 1.2, 2.2, 0.3, [r('1 calabacín', 250, true)]),
  f('Espinacas', 'Verduras', 23, 2.9, 1.4, 0.4, [r('1 puñado', 30, true)]),
  f('Tomate', 'Verduras', 18, 0.9, 3.5, 0.2, [r('1 tomate', 120, true)]),
  f('Lechuga', 'Verduras', 15, 1.4, 1.5, 0.2, [r('1 ración', 80, true)]),
  f('Pimiento rojo', 'Verduras', 31, 1, 6, 0.3, [r('1 pimiento', 160, true)]),
  f('Cebolla', 'Verduras', 40, 1.1, 9, 0.1, [r('1 cebolla', 110, true)]),
  f('Zanahoria', 'Verduras', 41, 0.9, 9.6, 0.2, [r('1 zanahoria', 70, true)]),
  f('Espárragos verdes', 'Verduras', 20, 2.2, 2, 0.1, [r('1 manojo', 250, true)]),
  // Frutas
  f('Plátano', 'Frutas', 89, 1.1, 23, 0.3, [r('1 plátano', 120, true)]),
  f('Manzana', 'Frutas', 52, 0.3, 14, 0.2, [r('1 manzana', 180, true)]),
  f('Naranja', 'Frutas', 47, 0.9, 12, 0.1, [r('1 naranja', 200, true)]),
  f('Fresas', 'Frutas', 32, 0.7, 7.7, 0.3, [r('1 bol', 150, true)]),
  f('Arándanos', 'Frutas', 57, 0.7, 14, 0.3, [r('1 puñado', 50, true)]),
  // Lácteos
  f('Leche semidesnatada', 'Lácteos', 46, 3.2, 4.7, 1.6, [r('1 vaso', 250, true)]),
  f('Yogur natural', 'Lácteos', 61, 3.5, 4.7, 3.3, [r('1 yogur', 125, true)]),
  f('Yogur griego natural', 'Lácteos', 132, 3.8, 4.5, 10.8, [r('1 yogur', 125, true)]),
  f('Queso fresco batido 0 %', 'Lácteos', 46, 8, 3.6, 0.2, [r('1 tarrina', 250, true)]),
  f('Queso fresco', 'Lácteos', 174, 12, 3, 13, [r('1 ración', 60, true)]),
  // Grasas
  f('Aceite de oliva', 'Grasas', 884, 0, 0, 100, [r('1 cucharada', 10, true), r('1 cucharadita', 4)]),
  f('Aguacate', 'Grasas', 160, 2, 8.5, 14.7, [r('1/2 aguacate', 80, true)]),
  f('Nueces', 'Grasas', 654, 15, 14, 65, [r('1 puñado', 25, true)]),
  f('Almendras', 'Grasas', 579, 21, 22, 50, [r('1 puñado', 25, true)]),
  f('Crema de cacahuete', 'Grasas', 588, 25, 20, 50, [r('1 cucharada', 15, true)]),
  // Bebidas
  f('Café con leche', 'Bebidas', 40, 2.4, 3.6, 1.6, [r('1 taza', 200, true)]),
  f('Zumo de naranja', 'Bebidas', 45, 0.7, 10.4, 0.2, [r('1 vaso', 200, true)]),
  f('Cerveza', 'Bebidas', 43, 0.5, 3.6, 0, [r('1 caña', 200, true), r('1 tercio', 330)]),
  f('Vino tinto', 'Bebidas', 85, 0.1, 2.6, 0, [r('1 copa', 150, true)]),
  // Otros
  f('Chocolate negro 85 %', 'Otros', 600, 10, 20, 50, [r('1 onza', 10, true)]),
  f('Tomate frito', 'Otros', 75, 1.5, 9, 3.5, [r('1 cucharada', 20, true)]),
  f('Miel', 'Otros', 304, 0.3, 82, 0, [r('1 cucharadita', 7, true)]),
];

// Recetas de ejemplo que se crean con la despensa de partida (se pueden borrar)
export const SEED_RECIPES = [
  { name: 'Pollo a la plancha con patatas', meals: ['comida', 'cena'], servings: 1,
    items: [['Pechuga de pollo', 150], ['Patata', 200], ['Aceite de oliva', 10], ['Lechuga', 80]] },
  { name: 'Yogur griego con avena y fresas', meals: ['desayuno', 'merienda'], servings: 1,
    items: [['Yogur griego natural', 125], ['Copos de avena', 40], ['Fresas', 150]] },
  { name: 'Lentejas estofadas con verduras', meals: ['comida'], servings: 2,
    items: [['Lentejas cocidas', 500], ['Zanahoria', 140], ['Cebolla', 110], ['Pimiento rojo', 80], ['Aceite de oliva', 15]] },
  { name: 'Salmón al horno con espárragos', meals: ['cena'], servings: 1,
    items: [['Salmón', 150], ['Espárragos verdes', 200], ['Aceite de oliva', 5]] },
  { name: 'Tostadas con tomate y pavo', meals: ['desayuno', 'merienda'], servings: 1,
    items: [['Pan integral', 60], ['Tomate', 60], ['Aceite de oliva', 5], ['Pavo en lonchas', 45]] },
  { name: 'Arroz con atún y verduras', meals: ['comida', 'cena'], servings: 1,
    items: [['Arroz blanco (crudo)', 80], ['Atún al natural', 112], ['Calabacín', 150], ['Pimiento rojo', 80], ['Aceite de oliva', 10]] },
  { name: 'Tortilla francesa con espinacas', meals: ['cena'], servings: 1,
    items: [['Huevo', 110], ['Espinacas', 60], ['Aceite de oliva', 5], ['Pan integral', 30]] },
  { name: 'Ensalada templada de garbanzos', meals: ['comida', 'cena'], servings: 1,
    items: [['Garbanzos cocidos', 200], ['Tomate', 120], ['Espinacas', 30], ['Huevo', 55], ['Aceite de oliva', 10]] },
];
