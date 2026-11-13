# Baku · app (fase 1)

Web instalable (PWA) para Android. Sin servidor, sin cuentas: los datos se guardan en el navegador del móvil (IndexedDB).

## Qué hay en esta fase
- Bienvenida, test de 4 pasos y plan (Mifflin-St Jeor × actividad − déficit, macros y mínimo de 1.500 kcal).
- Hoy: cuenco animado, tubos de macros, peso de partida y estado vacío del primer día.
- Perfil básico: plan, rehacer el test y borrar datos.
- Progreso, Menús y Despensa: pantalla "Lo estoy cocinando" (llegan en las siguientes fases).
- Funciona sin conexión e instalable (manifest + service worker).
- Logo provisional: la palabra "baku" en Uncut Sans.

## Estructura
- `index.html`: página única, fondo y filtro de cristal.
- `css/app.css`: estilos (paleta Nori, Liquid Glass).
- `js/app.js`: arranque y rutas (#/hoy, #/test/1…).
- `js/db.js`: base de datos local.
- `js/plan.js`: cálculo del plan y formato de números.
- `js/ui.js`: iconos, cuenco, tubos, gotas, regla y barra inferior.
- `js/screens/`: una pantalla por archivo.
- `sw.js`: copia sin conexión. **Sube `VERSION` en cada publicación.**

## Probar en el PC
Necesita un servidor (no vale abrir el archivo con doble clic). En esta carpeta:
`python -m http.server 8000` y abre http://localhost:8000

## Publicar
No hay paso de compilación: Cloudflare Pages sirve la carpeta tal cual (directorio de salida: `/`).
