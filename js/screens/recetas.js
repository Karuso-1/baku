// Recetas: crear, editar y ver.
import { html, icon, sheet, $, $$, toast, esc, pickImage, resizeImage, blobUrl } from '../ui.js';
import { fmt, todayISO } from '../plan.js';
import { MEALS, MEAL_NAME, maps, recipeGet, recipePut, recipeDel, recipeServing, foodNutr, uid, dayGet, dayPut, addDays, parse, searchSort } from '../store.js';
import { dietCard, recipeTags } from '../diet.js';
import { foodAmountSheet } from './menus.js';
import { CATEGORIES } from '../seed.js';
import { recipeImg, photoCredit } from '../recetario.js';

const WD = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export async function recetaForm(app, profile, id) {
  app.className = 'full';
  const m = await maps();
  const existing = id ? await recipeGet(id) : null;
  const r = existing ? JSON.parse(JSON.stringify({ ...existing, photo: null })) : { id: uid(), name: '', meals: ['comida'], servings: 1, items: [], createdAt: Date.now() };
  let photo = existing?.photo || null;

  const render = () => {
    const per = recipeServing(r, m.foods);
    app.innerHTML = html`<div class="screen">
      <div class="between"><div class="row" style="gap:12px"><button class="icon-btn glass flat" id="x" aria-label="Cerrar">${icon('close', 16, 2.2)}</button><h1 style="font-size:20px;font-weight:600">${existing ? 'Editar receta' : 'Nueva receta'}</h1></div>
        ${existing ? `<button class="icon-btn glass flat" id="del" aria-label="Borrar receta" style="color:var(--oxido-claro)">${icon('trash', 17)}</button>` : ''}</div>
      <button id="foto" class="photo" style="height:${photo || r.img ? 150 : 96}px;border:${photo || r.img ? '0' : '1.5px dashed rgba(242,234,219,0.5)'};padding:0;color:var(--crema);flex:none">
        ${photo || r.img ? `<img src="${recipeImg({ photo, img: r.img }, blobUrl)}" alt="Foto del plato">` : `<span class="empty-ph col" style="gap:6px;color:var(--crema)">${icon('camera', 22)}<span style="font-size:13px;font-weight:600">Añadir foto del plato</span><span class="muted small">Opcional · se verá al abrir la receta</span></span>`}</button>
      <div class="field"><label for="nombre" class="muted small" style="padding-left:4px">Nombre del plato</label>
        <input id="nombre" class="input glass flat" type="text" value="${esc(r.name)}" placeholder="Pollo a la plancha con patatas" style="font-size:17px;font-weight:600"></div>
      <div class="between" style="flex-wrap:wrap;gap:8px">
        <div class="row" role="group" aria-label="Para qué comidas" style="gap:6px;flex-wrap:wrap">${MEALS.map(([k, l]) => `<button class="chip-s" data-meal="${k}" aria-pressed="${r.meals.includes(k)}">${l}</button>`).join('')}</div>
        <div class="stepper glass flat" style="height:38px;width:142px"><button data-s="-1" aria-label="Menos raciones" style="width:30px;height:30px">${icon('minus', 12, 2.6)}</button><output class="num" style="font-size:13px">${r.servings} ${r.servings === 1 ? 'ración' : 'raciones'}</output><button data-s="1" aria-label="Más raciones" style="width:30px;height:30px">${icon('plus', 12, 2.6)}</button></div>
      </div>
      <section class="glass card" style="gap:0;padding:12px 14px">
        <div class="between" style="padding-bottom:4px"><h2 class="h2">Alimentos</h2><span class="muted small">Cantidades de la receta entera</span></div>
        ${r.items.map((it, i) => {
          const f = m.foods[it.foodId];
          return `<div class="list-row"><span class="col grow" style="min-width:0"><span class="ellipsis" style="font-size:14px;font-weight:500">${esc(f?.name || 'Eliminado')}</span><span class="muted small">${f?.cat || ''}</span></span>
            <span class="row" style="gap:4px"><input data-g="${i}" class="input glass flat num" type="number" inputmode="decimal" value="${it.g}" aria-label="Gramos" style="width:68px;height:36px;padding:0 8px;text-align:right;font-size:14px;border-radius:12px"><span class="unit">g</span></span>
            <span class="num" style="width:58px;text-align:right;font-size:13px;font-weight:600">${f ? fmt(foodNutr(f, it.g).kcal) : 0} <span style="font-size:11px">kcal</span></span>
            <button class="icon-btn plain" data-rm="${i}" aria-label="Quitar" style="color:var(--apagado)">${icon('close', 14, 2)}</button></div>`;
        }).join('')}
        <button class="link row" id="add" style="gap:6px;padding-top:10px;font-size:14px">${icon('plus', 16, 2.4)}Añadir alimento</button>
      </section>
      <div class="field"><label for="pasos" class="muted small" style="padding-left:4px">Preparación · opcional, un paso por línea</label>
        <textarea id="pasos" class="input glass flat" rows="4" placeholder="Cuece la pasta…&#10;Mientras, dora el pollo…" style="height:auto;padding:12px 14px;font-size:14px;line-height:1.45;resize:vertical">${esc((r.steps || []).join('\n'))}</textarea></div>
      <section class="glass card" style="flex-direction:row;justify-content:space-between;align-items:center">
        <span class="col"><span class="muted small">Por ración</span><span class="num" style="font-size:22px;font-weight:600">${fmt(per.kcal)} <span class="unit">kcal</span></span></span>
        <span class="num row" style="gap:12px;font-size:12px">${[['Proteína', per.p], ['Hidratos', per.h], ['Grasas', per.g]].map(([l, v]) => `<span class="col" style="align-items:center"><span style="font-weight:600">${fmt(v)} g</span><span class="muted small">${l}</span></span>`).join('')}</span></section>
      <div class="spacer"></div>
      <button class="btn" id="save" ${r.name.trim() && r.items.length ? '' : 'disabled'}>Guardar receta</button>
    </div>`;
    const check = () => { $('#save', app).disabled = !(r.name.trim() && r.items.length); };
    $('#x', app).addEventListener('click', () => history.back());
    $('#nombre', app).addEventListener('input', (e) => { r.name = e.target.value; check(); });
    $('#pasos', app).addEventListener('input', (e) => { r.steps = e.target.value.split('\n').map((t) => t.trim()).filter(Boolean); });
    $$('[data-meal]', app).forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.meal;
      r.meals = r.meals.includes(k) ? r.meals.filter((x) => x !== k) : [...r.meals, k];
      b.setAttribute('aria-pressed', r.meals.includes(k));
    }));
    $$('[data-s]', app).forEach((b) => b.addEventListener('click', () => { r.servings = Math.max(1, Math.min(12, r.servings + +b.dataset.s)); render(); }));
    $$('[data-g]', app).forEach((inp) => inp.addEventListener('change', (e) => { r.items[+inp.dataset.g].g = Math.max(0, +e.target.value || 0); render(); }));
    $$('[data-rm]', app).forEach((b) => b.addEventListener('click', () => { r.items.splice(+b.dataset.rm, 1); render(); }));
    $('#foto', app).addEventListener('click', async () => {
      const file = await pickImage();
      if (file) { photo = await resizeImage(file, { ratio: 4 / 3, max: 1000 }); render(); }
    });
    $('#add', app).addEventListener('click', () => foodPicker(m, (f) => foodAmountSheet(f, 'Añadir a la receta', (g) => { r.items.push({ foodId: f.id, g }); render(); })));
    $('#del', app)?.addEventListener('click', async () => {
      if (!confirm(`¿Borrar «${r.name}»?`)) return;
      await recipeDel(r.id);
      location.hash = '#/despensa';
      toast('Receta borrada');
    });
    $('#save', app).addEventListener('click', async () => {
      await recipePut({ ...r, name: r.name.trim(), photo, sample: false });
      location.hash = `#/receta/${r.id}`;
      setTimeout(() => toast('Receta guardada'), 250);
    });
  };
  render();
}

// Hoja para buscar un alimento de la despensa
export function foodPicker(m, onPick) {
  let q = '', cat = 'Todas';
  sheet('Añadir alimento', html`<label class="search glass flat">${icon('search', 16, 2)}<input id="q" type="search" placeholder="Buscar en tu despensa" aria-label="Buscar"></label>
    <div class="hscroll" style="margin:0 -20px;padding:0 20px">${['Todas', ...CATEGORIES].map((c) => `<button class="chip-s" data-cat="${c}" aria-pressed="${c === cat}">${c}</button>`).join('')}</div>
    <div id="res" class="col" style="min-height:240px"></div>
    <a class="link" href="#/despensa/alimentos" style="text-align:center;font-size:13px">¿No está? Búscalo en Open Food Facts</a>`, {
    onMount: ({ el, close }) => {
      const render = () => {
        const list = searchSort(Object.values(m.foods).filter((f) => !f.hidden && (cat === 'Todas' || f.cat === cat))
          .sort((a, b) => (b.liked ? 1 : 0) - (a.liked ? 1 : 0) || a.name.localeCompare(b.name)), q).slice(0, 60);
        $('#res', el).innerHTML = list.map((f) => `<button class="list-row" data-id="${f.id}" style="background:none;border-left:0;border-right:0;border-bottom:0;color:#fff;text-align:left"><span class="col grow"><span style="font-size:14px">${esc(f.name)}</span><span class="muted small num">${f.cat} · ${fmt(f.kcal)} kcal / 100 g</span></span>${icon('plus', 16, 2.2)}</button>`).join('') || '<p class="muted" style="text-align:center;padding:20px 0;font-size:13px">Nada con ese nombre.</p>';
        $$('[data-id]', el).forEach((b) => b.addEventListener('click', () => { close(); setTimeout(() => onPick(m.foods[b.dataset.id]), 230); }));
      };
      $('#q', el).addEventListener('input', (e) => { q = e.target.value.trim(); render(); });
      $$('[data-cat]', el).forEach((b) => b.addEventListener('click', () => { cat = b.dataset.cat; $$('[data-cat]', el).forEach((x) => x.setAttribute('aria-pressed', x === b)); render(); }));
      render();
    },
  });
}

// ---------- Ver una receta ----------
export async function recetaDetalle(app, profile, id) {
  app.className = 'full';
  const m = await maps();
  const r = m.recipes[id];
  if (!r) { location.hash = '#/despensa'; return; }
  const per = recipeServing(r, m.foods);
  const total = r.items.reduce((s, it) => s + (m.foods[it.foodId] ? foodNutr(m.foods[it.foodId], it.g).kcal : 0), 0);
  app.style.paddingTop = '0';
  app.innerHTML = html`<div class="screen" style="gap:12px">
    <div style="position:relative;margin:0 -16px;height:280px;flex:none">
      ${recipeImg(r, blobUrl) ? `<img src="${recipeImg(r, blobUrl)}" alt="" style="width:100%;height:100%;object-fit:cover">` : `<div class="empty-ph" style="height:100%;background:rgba(255,255,255,0.05)">${icon('menus', 54, 1.4)}</div>`}
      <span style="position:absolute;inset:0;background:linear-gradient(transparent 55%, var(--fondo))"></span>
      <div class="between" style="position:absolute;left:16px;right:16px;top:calc(52px + var(--safe-top))">
        <button class="icon-btn glass flat" id="back" aria-label="Volver" style="background:rgba(20,40,32,0.35)">${icon('back', 18, 2)}</button>
        <div class="row" style="gap:8px">
          <button class="icon-btn glass flat" id="foto" aria-label="Cambiar foto" style="background:rgba(20,40,32,0.35)">${icon('camera', 17, 2)}</button>
          <a class="icon-btn glass flat" href="#/receta/${r.id}/editar" aria-label="Editar receta" style="background:rgba(20,40,32,0.35)">${icon('edit', 17, 2)}</a></div></div>
    </div>
    <div class="col" style="gap:8px;padding:0 4px;margin-top:-40px;position:relative">
      <h1 style="font-size:24px;font-weight:600;letter-spacing:-0.02em;line-height:1.15">${esc(r.name)}</h1>
      <div class="row" style="gap:6px;flex-wrap:wrap">${r.comedor ? '<span class="pill">Comedor</span>' : ''}${(r.meals || []).map((k) => `<span class="pill">${MEAL_NAME[k]}</span>`).join('')}<span class="pill">${r.servings} ${r.servings === 1 ? 'ración' : 'raciones'}</span></div></div>
    <section class="glass card" style="flex-direction:row;justify-content:space-between;align-items:center">
      <span class="col"><span class="muted small">Por ración</span><span class="num" style="font-size:22px;font-weight:600">${fmt(per.kcal)} <span class="unit">kcal</span></span></span>
      <span class="num row" style="gap:12px;font-size:12px">${[['Proteína', per.p], ['Hidratos', per.h], ['Grasas', per.g]].map(([l, v]) => `<span class="col" style="align-items:center"><span style="font-weight:600">${fmt(v)} g</span><span class="muted small">${l}</span></span>`).join('')}</span></section>
    ${dietCard(recipeTags(r, m.foods), m.diet, { recipe: true })}
    <section class="glass card" style="gap:0;padding:12px 14px 6px">
      <div class="between" style="padding-bottom:4px"><h2 class="h2">Alimentos</h2><span class="muted small num">Receta entera · ${fmt(total)} kcal</span></div>
      ${r.items.map((it) => { const f = m.foods[it.foodId]; return `<a class="list-row" href="#/alimento/${it.foodId}" style="text-decoration:none;color:#fff"><span class="grow ellipsis" style="font-size:14px">${esc(f?.name || 'Eliminado')}</span><span class="muted num" style="font-size:13px">${it.g} g</span><span class="num" style="width:62px;text-align:right;font-size:13px;font-weight:600">${f ? fmt(foodNutr(f, it.g).kcal) : 0} <span class="unit">kcal</span></span></a>`; }).join('')}
    </section>
    ${r.steps?.length ? `<section class="glass card" style="gap:10px;padding:12px 14px 14px">
      <h2 class="h2">Preparación</h2>
      <ol class="col" style="gap:10px;margin:0;padding:0;list-style:none">${r.steps.map((t, i) => `<li class="row" style="gap:10px;align-items:flex-start"><span class="num" style="flex:none;width:22px;height:22px;border-radius:999px;background:rgba(242,234,219,0.14);color:var(--crema);font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center">${i + 1}</span><span style="font-size:14px;line-height:1.45">${esc(t)}</span></li>`).join('')}</ol>
    </section>` : ''}
    ${photoCredit(r) ? `<p class="muted small" style="text-align:center;padding:0 8px">${photoCredit(r)}</p>` : ''}
    <div class="spacer"></div>
    <button class="btn" id="add">${icon('plus', 18, 2.2)}Añadir a un día</button>
  </div>`;
  $('#back', app).addEventListener('click', () => history.back());
  $('#foto', app).addEventListener('click', async () => {
    const file = await pickImage();
    if (!file) return;
    r.photo = await resizeImage(file, { ratio: 4 / 3, max: 1000 });
    await recipePut(r);
    recetaDetalle(app, profile, id);
  });
  $('#add', app).addEventListener('click', () => addToDay(r));
}

function addToDay(r) {
  const today = todayISO();
  const dates = Array.from({ length: 8 }, (_, i) => addDays(today, i));
  let date = today;
  let meal = r.meals?.[0] || 'comida';
  sheet('Añadir a un día', html`<div class="hscroll" style="margin:0 -20px;padding:0 20px">${dates.map((d, i) => `<button class="chip-s" data-d="${d}" aria-pressed="${d === date}">${i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : `${WD[parse(d).getDay()]} ${parse(d).getDate()}`}</button>`).join('')}</div>
    <div class="hscroll" style="margin:0 -20px;padding:0 20px">${MEALS.map(([k, l]) => `<button class="chip-s" data-m="${k}" aria-pressed="${k === meal}">${l}</button>`).join('')}</div>
    <button class="btn" id="ok">Añadir 1 ración</button>`, {
    onMount: ({ el, close }) => {
      $$('[data-d]', el).forEach((b) => b.addEventListener('click', () => { date = b.dataset.d; $$('[data-d]', el).forEach((x) => x.setAttribute('aria-pressed', x === b)); }));
      $$('[data-m]', el).forEach((b) => b.addEventListener('click', () => { meal = b.dataset.m; $$('[data-m]', el).forEach((x) => x.setAttribute('aria-pressed', x === b)); }));
      $('#ok', el).addEventListener('click', async () => {
        const day = await dayGet(date);
        day.meals[meal].push({ kind: 'recipe', id: r.id, servings: 1 });
        await dayPut(day);
        close();
        toast(`Añadido a ${MEAL_NAME[meal].toLowerCase()}`);
      });
    },
  });
}
