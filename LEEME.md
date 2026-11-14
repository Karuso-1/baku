# Baku · app (fase 1)

Web instalable (PWA) para Android. Los datos se guardan en el navegador del móvil (IndexedDB). Copia en la nube opcional con cuenta (Supabase): entrar con un código al email, sincronización entre móviles y fotos cifradas en el móvil con una clave de recuperación que solo tiene el usuario.

## Qué hace
- Bienvenida, test de 4 pasos y plan (Mifflin-St Jeor × actividad − déficit, macros, mínimo 1.500 kcal).
- Hoy: cuenco animado con lo comido, tubos de macros, comidas del día (pendiente/hecha), racha, peso, foto semanal y media de la semana.
- Progreso: gráfica con proyección, anotar peso (recalcula el plan), fotos semanales (frontal, lateral, trasera) y comparar (lado a lado o deslizar, zoom, guardar imagen).
- Menús: semana, día por comidas, añadir platos, cambiar, rellenar día/semana con propuesta antes de aplicar, copiar día y repetir semana.
- Despensa: biblioteca de 533 alimentos con buscador sin tildes, recetas (con foto), alimentos por categorías con me gusta/oculto, ficha con raciones, búsqueda en Open Food Facts, escáner de códigos de barras, alta manual y "Llena tu despensa".
- Dietas y alérgenos: vegetariana, vegana, sin gluten, sin lactosa y los 14 alérgenos de la UE, con iconos en fichas y recetas. Lo que no encaja no sale en las propuestas.
- Comedor: 65 platos típicos de comedor ya calculados y "Montar el menú de hoy" con ración pequeña, normal o grande.
- Perfil: foto, plan, datos editables, pausar el plan, fondo (paletas o foto), copia de seguridad y restaurar.
- Objetivo alcanzado: pasar a mantenimiento o nuevo objetivo.
- Sin conexión e instalable (manifest + service worker). Logo provisional.

## Estructura
- `index.html`, `css/app.css`
- `js/app.js` rutas · `js/db.js` base de datos · `js/store.js` datos y cálculos · `js/plan.js` plan
- `js/ui.js` piezas comunes · `js/theme.js` paletas · `js/fill.js` rellenar automático · `js/seed.js` biblioteca de alimentos · `js/diet.js` dietas y alérgenos · `js/comedor.js` platos de comedor
- `js/screens/` una pantalla por archivo
- `sw.js`: **sube `VERSION` en cada publicación**

## Supabase
- `supabase/esquema.sql`: tablas, seguridad por usuario (RLS), carpeta privada de fotos y borrar cuenta. Se pega en SQL Editor.
- `js/sync.js`: cuenta, cola de cambios, subir/bajar y cifrado AES-GCM. `js/screens/cuenta.js`: pantallas.
- Las plantillas de correo (Magic Link y Confirm signup) deben incluir `{{ .Token }}` para que llegue el código.
- Sin SMTP propio, Supabase solo envía correos a los miembros del equipo del proyecto.

## Publicar
Cada `git push` a `main` despliega en Cloudflare (Worker `baku`, archivos estáticos con `wrangler.jsonc`).
URL: https://baku.irevivalxx.workers.dev
