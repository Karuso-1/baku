// Menús: semana, día, rellenar automático, propuesta y añadir platos.
import { html, icon, tube, sheet, $, $$, toast, esc, circleBtn } from '../ui.js';
import { fmt, todayISO } from '../plan.js';
import { MEALS, MEAL_NAME, maps, dayGet, dayPut, dayTotals, mealTotals, entryNutr, entryName, entryAmount, weekStartOf, weekDays, addDays, parse, getSettings, recipeServing, foodNutr, emptyDay, searchSort } from '../store.js';
import { conflicts, recipeTags, tagsOf, allergenRow } from '../diet.js';
import { COURSES } from '../comedor.js';
import { db } from '../db.js';
import { fillDay, swapMeal } from '../fill.js';
import { CATEGORIES } from '../seed.js';
import { mealNow } from './hoy.js';

const WD = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const WL = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const short = (s) => { const d = parse(s); return `${d.getDate()} ${MON[d.getMonth()]}`; };
const macroLine = (t) => `P ${fmt(t.p)} · H ${fmt(t.h)} · G ${fmt(t.g)}`;

export async function menus(app, profile, params) {
  app.className = '';
  const settings = await getSettings();
  const date = params.get('fecha') || todayISO();
  const ws = weekStartOf(date, settings.weekStart);
  const days = weekDays(ws);
  const m = await maps();
  const loaded = await Promise.all(days.map(dayGet));
  const byDate = Object.fromEntries(loaded.map((d) => [d.date, d]));
  const day = byDate[date];
  const goal = profile.plan.kcal;
  const planned = dayTotals(day, m);
  const filled = MEALS.filter(([k]) => day.meals[k].length).length;
  const today = todayISO();

  const strip = days.map((d) => {
    const n = MEALS.filter(([k]) => byDate[d].meals[k].length).length;
    const sel = d === date;
    const dot = n === 4 ? 'background:var(--salvia)' : n ? 'border:1.5px solid var(--salvia)' : 'background:transparent';
    return `<a href="#/menus?fecha=${d}" aria-current="${sel}" aria-label="${WD[parse(d).getDay()]} ${parse(d).getDate()}" style="flex:1;height:62px;border-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;text-decoration:none;${sel ? 'background:var(--crema);color:var(--fondo)' : 'color:#fff'}">
      <span class="small" style="${sel ? '' : 'color:var(--apagado)'}">${WL[parse(d).getDay()]}</span><span class="num" style="font-size:16px;font-weight:600">${parse(d).getDate()}</span>
      <span style="width:6px;height:6px;border-radius:9px;${sel && n ? 'background:var(--pino)' : dot}"></span></a>`;
  }).join('');

  const mealCard = ([k, label]) => {
    const items = day.meals[k];
    const t = mealTotals(day, k, m);
    const done = !!day.done[k];
    return html`<section class="glass card" style="gap:4px;padding:12px 14px 8px">
      <div class="between">
        <span class="row" style="gap:8px">${items.length ? `<button class="meal-toggle" data-meal="${k}" aria-pressed="${done}" aria-label="${label}: ${done ? 'hecha' : 'pendiente'}" style="width:24px;height:24px;border:0;padding:0;background:transparent;display:flex;color:${done ? 'var(--salvia)' : 'rgba(242,234,219,0.6)'}">${done ? `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M7.5 12.3l3 3 6-6" stroke="#1B3A2F" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>` : icon('dashed', 22, 1.6)}</button>` : ''}
        <h2 class="h2">${label}</h2></span>
        ${items.length ? `<span class="col" style="align-items:flex-end"><span class="num" style="font-size:15px;font-weight:600">${fmt(t.kcal)} <span class="unit">kcal</span></span><span class="muted num" style="font-size:10px">${macroLine(t)}</span></span>` : ''}</div>
      ${items.map((e, i) => {
        const n = entryNutr(e, m);
        const href = e.kind === 'recipe' ? `#/receta/${e.id}` : `#/alimento/${e.id}`;
        return `<div class="list-row" style="padding:6px 0"><a href="${href}" class="col grow" style="min-width:0;text-decoration:none;color:#fff"><span class="ellipsis" style="font-size:14px">${esc(entryName(e, m))}</span><span class="muted small">${e.kind === 'recipe' ? 'Receta' : 'Alimento'} · ${entryAmount(e, m)}</span></a>
          <span class="num" style="font-size:13px;font-weight:600;width:62px;text-align:right">${fmt(n.kcal)} <span class="unit">kcal</span></span>
          <button class="icon-btn plain" data-del="${k}:${i}" aria-label="Quitar ${esc(entryName(e, m))}" style="color:var(--apagado)">${icon('close', 14, 2)}</button></div>`;
      }).join('')}
      <div class="row" style="gap:14px;padding-top:4px">
        <a class="link row" style="gap:4px;font-size:13px" href="#/anadir?fecha=${date}&comida=${k}">${icon('plus', 14, 2.4)}Añadir</a>
        ${items.length && !done && items.some((e) => e.kind === 'recipe') ? `<button class="link row" data-swap="${k}" style="gap:4px;font-size:13px">${icon('swap', 14, 2)}Cambiar</button>` : ''}
      </div></section>`;
  };

  const d0 = parse(days[0]), d6 = parse(days[6]);
  const range = d0.getMonth() === d6.getMonth() ? `${d0.getDate()} al ${d6.getDate()} ${MON[d6.getMonth()]}` : `${short(days[0])} al ${short(days[6])}`;

  app.innerHTML = html`<div class="screen">
    <div class="col" style="gap:4px;padding:0 4px">
      <span class="muted num" style="font-size:12px">Semana del ${range}</span>
      <div class="between"><div class="row" style="gap:10px"><span class="title-ic glass flat">${icon('menus', 18, 2)}</span><h1 class="h1">Menús</h1></div>
      <div class="row" style="gap:6px"><a class="icon-btn glass flat" href="#/menus?fecha=${addDays(date, -7)}" aria-label="Semana anterior">${icon('chevl', 16, 2)}</a><a class="icon-btn glass flat" href="#/menus?fecha=${addDays(date, 7)}" aria-label="Semana siguiente">${icon('chev', 16, 2)}</a></div></div>
    </div>
    <div class="glass flat" style="border-radius:22px;padding:4px;display:flex;gap:2px">${strip}</div>

    <section class="glass card" style="gap:8px">
      <div class="between"><span class="col"><span class="h2">${date === today ? 'Hoy' : WD[parse(date).getDay()]} · ${short(date)}</span><span class="muted small num">${fmt(planned.kcal)} de ${fmt(goal)} kcal planificadas</span></span>
      ${circleBtn('more', 'Opciones del día', 'id="opts"')}</div>
      ${tube('H', planned.kcal, goal)}
    </section>

    ${filled ? MEALS.map(mealCard).join('') : html`<section class="glass card" style="align-items:center;text-align:center;padding:22px 16px">
      <span style="width:52px;height:52px;border-radius:999px;background:rgba(242,234,219,0.12);display:flex;align-items:center;justify-content:center;color:var(--crema)">${icon('calendar', 24)}</span>
      <h2 style="font-size:18px;font-weight:600">${date === today ? 'Hoy está libre' : `El ${WD[parse(date).getDay()].toLowerCase()} está libre`}</h2>
      <p class="muted" style="font-size:13px;line-height:1.4;max-width:270px">Rellénalo con tus recetas favoritas o planifícalo tú, comida a comida.</p>
      <button class="btn small" id="fillDay">Rellenar con mis recetas</button>
      <a class="btn small ghost" href="#/anadir?fecha=${date}&comida=desayuno">Planificar a mano</a>
    </section>`}
  </div>`;

  const save = async () => { await dayPut(day); menus(app, profile, params); };
  $$('.meal-toggle', app).forEach((b) => b.addEventListener('click', () => { day.done[b.dataset.meal] = !day.done[b.dataset.meal]; save(); }));
  $$('[data-del]', app).forEach((b) => b.addEventListener('click', () => { const [k, i] = b.dataset.del.split(':'); day.meals[k].splice(+i, 1); if (!day.meals[k].length) delete day.done[k]; save(); }));
  $$('[data-swap]', app).forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.swap;
    const n = swapMeal(k, day.meals[k], goal, m);
    if (!n) return toast('No tienes otra receta para esta comida');
    day.meals[k] = n; save();
    toast(`Cambiado por ${entryName(n[0], m)}`);
  }));
  const proposeDays = (dates) => {
    const used = {};
    const add = {};
    for (const d of dates) {
      const res = fillDay(byDate[d] || emptyDay(d), goal, m, used);
      if (Object.keys(res).length) add[d] = res;
    }
    if (!Object.keys(add).length) return toast(Object.keys(m.recipes).length ? 'No hay huecos que rellenar' : 'Primero crea alguna receta');
    sessionStorage.setItem('baku-propuesta', JSON.stringify({ back: date, add }));
    location.hash = '#/menus/propuesta';
  };
  $('#fillDay', app)?.addEventListener('click', () => proposeDays([date]));
  $('#opts', app).addEventListener('click', () => {
    sheet('Opciones del día', html`<div class="col">
      ${[['fd', 'calendar', 'Rellenar este día', 'Con tus recetas y favoritos'], ['fw', 'menus', 'Rellenar la semana', 'Solo los huecos, desde hoy'], ['cp', 'swap', 'Copiar este día a…', 'Otro día de la semana'], ['rp', 'chevl', 'Repetir la semana anterior', 'Copia los 7 días'], ['cl', 'trash', 'Vaciar el día', 'Quita todos los platos']]
        .map(([id, ic, t, s]) => `<button data-o="${id}" class="list-row" style="background:none;border-left:0;border-right:0;border-bottom:0;color:${id === 'cl' ? 'var(--oxido-claro)' : '#fff'};text-align:left;gap:12px"><span class="title-ic glass flat" style="width:36px;height:36px">${icon(ic, 17)}</span><span class="col"><span style="font-size:15px;font-weight:500">${t}</span><span class="muted small">${s}</span></span></button>`).join('')}</div>`, {
      onMount: ({ el, close }) => $$('[data-o]', el).forEach((b) => b.addEventListener('click', async () => {
        const o = b.dataset.o;
        close();
        if (o === 'fd') proposeDays([date]);
        if (o === 'fw') proposeDays(days.filter((d) => d >= today));
        if (o === 'cl') { day.meals = emptyDay(date).meals; day.done = {}; save(); }
        if (o === 'rp') {
          for (const d of days) {
            const prev = await dayGet(addDays(d, -7));
            if (MEALS.some(([k]) => prev.meals[k].length)) await dayPut({ ...emptyDay(d), meals: prev.meals });
          }
          toast('Semana anterior copiada'); menus(app, profile, params);
        }
        if (o === 'cp') setTimeout(() => sheet('Copiar a…', `<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px">${days.filter((d) => d !== date).map((d) => `<button class="chip" data-to="${d}" style="height:52px;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center"><span class="small">${WD[parse(d).getDay()].slice(0, 3)}</span><span class="num" style="font-weight:600">${parse(d).getDate()}</span></button>`).join('')}</div>`, {
          onMount: (s) => $$('[data-to]', s.el).forEach((x) => x.addEventListener('click', async () => {
            await dayPut({ ...emptyDay(x.dataset.to), meals: JSON.parse(JSON.stringify(day.meals)) });
            s.close(); toast(`Copiado al ${WD[parse(x.dataset.to).getDay()].toLowerCase()}`); menus(app, profile, params);
          })),
        }), 230);
      })),
    });
  });
}

// ---------- Propuesta antes de aplicar ----------
export async function propuesta(app, profile) {
  app.className = 'full';
  const prop = JSON.parse(sessionStorage.getItem('baku-propuesta') || 'null');
  if (!prop) { location.hash = '#/menus'; return; }
  const m = await maps();
  const goal = profile.plan.kcal;
  const dates = Object.keys(prop.add).sort();
  const days = Object.fromEntries(await Promise.all(dates.map(async (d) => [d, await dayGet(d)])));
  const card = (d) => {
    const day = days[d];
    const merged = { ...day, meals: { ...day.meals } };
    for (const [k, v] of Object.entries(prop.add[d])) merged.meals[k] = v;
    const t = dayTotals(merged, m);
    return html`<section class="glass card" style="gap:4px;padding:12px 14px 8px">
      <div class="between"><h2 class="h2">${WD[parse(d).getDay()]} · ${short(d)}</h2><span class="num small" style="color:${Math.abs(t.kcal - goal) / goal < 0.08 ? 'var(--salvia)' : 'var(--apagado)'}">${fmt(t.kcal)} / ${fmt(goal)} kcal</span></div>
      ${MEALS.map(([k, label]) => {
        const isNew = !!prop.add[d][k];
        const items = merged.meals[k];
        if (!items.length) return `<div class="list-row" style="padding:6px 0"><span class="muted" style="font-size:13px">${label}: sin propuesta</span></div>`;
        return `<div class="list-row" style="padding:6px 0;${isNew ? '' : 'opacity:.55'}"><span class="col grow" style="min-width:0"><span class="small muted">${label}${isNew ? '' : ' · ya planificado'}</span><span class="ellipsis" style="font-size:14px">${items.map((e) => esc(entryName(e, m))).join(' · ')}</span></span>
          ${isNew ? `<span class="pill" style="height:22px;font-size:11px;background:rgba(156,199,175,0.18);color:var(--salvia)">Nuevo</span><button class="link" data-swap="${d}:${k}" aria-label="Cambiar ${label}" style="display:flex">${icon('swap', 16, 2)}</button>` : ''}
          <span class="num" style="font-size:13px;width:54px;text-align:right">${fmt(items.reduce((s, e) => s + entryNutr(e, m).kcal, 0))}</span></div>`;
      }).join('')}</section>`;
  };
  app.innerHTML = html`<div class="screen">
    <div class="row" style="gap:12px"><button class="icon-btn glass flat" id="back" aria-label="Volver">${icon('back', 18, 2)}</button><h1 style="font-size:20px;font-weight:600">Propuesta</h1></div>
    <p class="muted" style="font-size:13px;line-height:1.4;padding:0 4px">Lo nuevo va marcado. Lo que ya tenías se respeta. No cambia nada hasta que pulses Aplicar.</p>
    ${dates.map(card).join('')}
    <div class="spacer"></div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"><button class="btn ghost" id="discard">Descartar</button><button class="btn" id="apply">Aplicar</button></div>
  </div>`;
  const back = () => { sessionStorage.removeItem('baku-propuesta'); location.hash = `#/menus?fecha=${prop.back}`; };
  $('#back', app).addEventListener('click', back);
  $('#discard', app).addEventListener('click', back);
  $$('[data-swap]', app).forEach((b) => b.addEventListener('click', () => {
    const [d, k] = b.dataset.swap.split(':');
    const n = swapMeal(k, prop.add[d][k], goal, m);
    if (!n) return toast('No hay otra receta para esa comida');
    prop.add[d][k] = n;
    sessionStorage.setItem('baku-propuesta', JSON.stringify(prop));
    propuesta(app, profile);
  }));
  $('#apply', app).addEventListener('click', async () => {
    for (const d of dates) {
      const day = days[d];
      for (const [k, v] of Object.entries(prop.add[d])) day.meals[k] = v;
      await dayPut(day);
    }
    sessionStorage.removeItem('baku-propuesta');
    location.hash = `#/menus?fecha=${prop.back}`;
    setTimeout(() => toast(dates.length > 1 ? `${dates.length} días planificados` : 'Día planificado'), 250);
  });
}

// ---------- Añadir un plato a un día ----------
export async function anadir(app, profile, params) {
  app.className = 'full';
  const date = params.get('fecha') || todayISO();
  let meal = params.get('comida') || mealNow();
  let tab = sessionStorage.getItem('baku-anadir-tab') || 'recetas';
  let q = '';
  let cat = 'Todas';
  const m = await maps();
  const ret = params.get('volver') || `#/menus?fecha=${date}`;

  // Aviso pequeño si algo no encaja con la dieta
  const warn = (tags) => (conflicts(tags, m.diet).length ? ` <span style="color:var(--oxido-claro)">· No encaja con tu dieta</span>` : '');
  const render = () => {
    const recipes = searchSort(Object.values(m.recipes).filter((r) => !r.comedor)
      .sort((a, b) => (b.meals?.includes(meal) ? 1 : 0) - (a.meals?.includes(meal) ? 1 : 0) || a.name.localeCompare(b.name)), q);
    const foods = searchSort(Object.values(m.foods)
      .filter((f) => !f.hidden && (cat === 'Todas' || f.cat === cat))
      .sort((a, b) => (b.liked ? 1 : 0) - (a.liked ? 1 : 0) || a.name.localeCompare(b.name)), q);
    const comedor = searchSort(Object.values(m.recipes).filter((r) => r.comedor), q);
    if (tab === 'comedor') {
      $('#list', app).innerHTML = `<a class="btn small" href="#/comedor/menu?fecha=${date}&comida=${meal}&volver=${encodeURIComponent(ret)}" style="margin:8px 0 4px">${icon('plus', 16, 2.2)}Montar menú completo</a>`
        + (COURSES.map(([k, l]) => {
          const rows = comedor.filter((r) => r.course === k);
          return rows.length ? `<h2 class="h2" style="padding:12px 0 2px">${l}</h2>` + rows.map((r) => `<button class="list-row" data-r="${r.id}" style="background:none;border-left:0;border-right:0;border-bottom:0;color:#fff;text-align:left;width:100%"><span class="col grow" style="min-width:0"><span class="ellipsis" style="font-size:14px;font-weight:500">${esc(r.name)}</span><span class="muted small row" style="gap:4px">${allergenRow(recipeTags(r, m.foods), 11)}${warn(recipeTags(r, m.foods))}</span></span><span class="num" style="font-size:13px;font-weight:600">${fmt(recipeServing(r, m.foods).kcal)} <span class="unit">kcal</span></span>${icon('plus', 16, 2.2)}</button>`).join('') : '';
        }).join('') || `<p class="muted" style="padding:14px 0;text-align:center;font-size:13px">Ningún plato con ese nombre.</p>`);
      $$('[data-r]', app).forEach((b) => b.addEventListener('click', () => addRecipe(m.recipes[b.dataset.r])));
      $('#cats', app).hidden = true;
      return;
    }
    $('#list', app).innerHTML = tab === 'recetas'
      ? (recipes.length ? recipes.map((r) => `<button class="list-row" data-r="${r.id}" style="background:none;border-left:0;border-right:0;border-bottom:0;color:#fff;text-align:left;width:100%"><span class="col grow" style="min-width:0"><span class="ellipsis" style="font-size:14px;font-weight:500">${esc(r.name)}</span><span class="muted small">${(r.meals || []).map((k) => MEAL_NAME[k]).join(' · ') || 'Sin comida asignada'}${warn(recipeTags(r, m.foods))}</span></span><span class="num" style="font-size:13px;font-weight:600">${fmt(recipeServing(r, m.foods).kcal)} <span class="unit">kcal</span></span>${icon('plus', 16, 2.2)}</button>`).join('')
        : `<p class="muted" style="padding:14px 0;text-align:center;font-size:13px">No tienes recetas con ese nombre.</p>`)
        + `<a class="btn small ghost" href="#/receta/nueva" style="margin-top:8px">${icon('plus', 16, 2.2)}Nueva receta</a>`
      : (foods.length ? foods.slice(0, 80).map((f) => `<button class="list-row" data-f="${f.id}" style="background:none;border-left:0;border-right:0;border-bottom:0;color:#fff;text-align:left;width:100%"><span class="col grow" style="min-width:0"><span class="ellipsis" style="font-size:14px;font-weight:500">${f.liked ? `<span style="color:var(--crema)">${icon('heart', 11, 2)}</span> ` : ''}${esc(f.name)}</span><span class="muted small num">${f.cat} · ${fmt(f.kcal)} kcal / 100 g${warn(tagsOf([f]))}</span></span>${icon('plus', 16, 2.2)}</button>`).join('')
        : `<p class="muted" style="padding:14px 0;text-align:center;font-size:13px">No está en tu despensa. Búscalo en Open Food Facts desde la Despensa o escanéalo.</p>`)
        + `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px"><a class="btn small ghost" href="#/escaner">${icon('scan', 16)}Escanear</a><a class="btn small ghost" href="#/despensa/alimentos">${icon('search', 16)}Buscar más</a></div>`;
    $$('[data-r]', app).forEach((b) => b.addEventListener('click', () => addRecipe(m.recipes[b.dataset.r])));
    $$('[data-f]', app).forEach((b) => b.addEventListener('click', () => addFood(m.foods[b.dataset.f])));
    $('#cats', app).hidden = tab !== 'alimentos';
  };

  const commit = async (entry) => {
    const day = await dayGet(date);
    day.meals[meal].push(entry);
    await dayPut(day);
    location.hash = ret;
    setTimeout(() => toast(`Añadido a ${MEAL_NAME[meal].toLowerCase()}`), 250);
  };
  const addRecipe = (r) => {
    let k = 1;
    const per = recipeServing(r, m.foods);
    sheet(r.name, html`<div class="between"><span class="label">Raciones</span>
      <div class="stepper glass flat" style="width:170px"><button data-k="-0.5" aria-label="Menos">${icon('minus', 14, 2.6)}</button><output class="num" id="k">1</output><button data-k="0.5" aria-label="Más">${icon('plus', 14, 2.6)}</button></div></div>
      <div class="between"><span class="muted">Total</span><span class="num" id="t" style="font-size:20px;font-weight:600">${fmt(per.kcal)} <span class="unit">kcal</span></span></div>
      <button class="btn" id="ok">Añadir a ${MEAL_NAME[meal].toLowerCase()}</button>`, {
      onMount: ({ el, close }) => {
        $$('[data-k]', el).forEach((b) => b.addEventListener('click', () => {
          k = Math.max(0.5, Math.min(6, k + +b.dataset.k));
          $('#k', el).textContent = String(k).replace('.', ',');
          $('#t', el).innerHTML = `${fmt(per.kcal * k)} <span class="unit">kcal</span>`;
        }));
        $('#ok', el).addEventListener('click', () => { close(); commit({ kind: 'recipe', id: r.id, servings: k }); });
      },
    });
  };
  const addFood = (f) => foodAmountSheet(f, `Añadir a ${MEAL_NAME[meal].toLowerCase()}`, (g) => commit({ kind: 'food', id: f.id, g }));

  app.innerHTML = html`<div class="screen">
    <div class="row" style="gap:12px"><button class="icon-btn glass flat" id="back" aria-label="Volver">${icon('back', 18, 2)}</button>
      <span class="col"><h1 style="font-size:20px;font-weight:600">Añadir plato</h1><span class="muted small">${date === todayISO() ? 'Hoy' : WD[parse(date).getDay()] + ' ' + short(date)}</span></span></div>
    <div class="hscroll">${MEALS.map(([k, l]) => `<button class="chip-s" data-meal="${k}" aria-pressed="${k === meal}">${l}</button>`).join('')}</div>
    <label class="search glass flat">${icon('search', 16, 2)}<input id="q" type="search" placeholder="Buscar" aria-label="Buscar"></label>
    <div class="seg glass flat" role="radiogroup" aria-label="Tipo" style="height:44px;grid-template-columns:repeat(3,minmax(0,1fr))"><button role="radio" data-tab="recetas" aria-checked="${tab === 'recetas'}">Recetas</button><button role="radio" data-tab="alimentos" aria-checked="${tab === 'alimentos'}">Alimentos</button><button role="radio" data-tab="comedor" aria-checked="${tab === 'comedor'}">Comedor</button></div>
    <div class="hscroll" id="cats">${['Todas', ...CATEGORIES].map((c) => `<button class="chip-s" data-cat="${c}" aria-pressed="${c === cat}">${c}</button>`).join('')}</div>
    <section class="glass card" style="gap:0;padding:6px 14px 12px" id="list"></section>
  </div>`;
  $('#back', app).addEventListener('click', () => history.back());
  $('#q', app).addEventListener('input', (e) => { q = e.target.value.trim(); render(); });
  $$('[data-meal]', app).forEach((b) => b.addEventListener('click', () => { meal = b.dataset.meal; $$('[data-meal]', app).forEach((x) => x.setAttribute('aria-pressed', x === b)); render(); }));
  $$('[data-tab]', app).forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; sessionStorage.setItem('baku-anadir-tab', tab); $$('[data-tab]', app).forEach((x) => x.setAttribute('aria-checked', x === b)); render(); }));
  $$('[data-cat]', app).forEach((b) => b.addEventListener('click', () => { cat = b.dataset.cat; $$('[data-cat]', app).forEach((x) => x.setAttribute('aria-pressed', x === b)); render(); }));
  render();
}

// Hoja para elegir cantidad de un alimento: raciones habituales o gramos
export function foodAmountSheet(f, cta, onOk) {
  const def = f.portions?.find((p) => p.default) || f.portions?.[0];
  let g = def ? def.g : 100;
  sheet(f.name, html`
    ${f.portions?.length ? `<div class="hscroll">${f.portions.map((p) => `<button class="chip-s" data-g="${p.g}" aria-pressed="${p.g === g}">${esc(p.name)} · ${p.g} g</button>`).join('')}</div>` : ''}
    <div class="between"><label class="label" for="g">Cantidad</label><span class="row" style="gap:6px"><input id="g" class="input glass flat num" type="number" inputmode="decimal" min="1" value="${g}" style="width:110px;height:46px;text-align:right"><span class="unit">g</span></span></div>
    <div class="between"><span class="muted num" id="mac"></span><span class="num" id="t" style="font-size:20px;font-weight:600"></span></div>
    <button class="btn" id="ok">${cta}</button>`, {
    onMount: ({ el, close }) => {
      const upd = () => {
        const n = foodNutr(f, g);
        $('#t', el).innerHTML = `${fmt(n.kcal)} <span class="unit">kcal</span>`;
        $('#mac', el).textContent = macroLine(n);
      };
      $$('[data-g]', el).forEach((b) => b.addEventListener('click', () => { g = +b.dataset.g; $('#g', el).value = g; $$('[data-g]', el).forEach((x) => x.setAttribute('aria-pressed', x === b)); upd(); }));
      $('#g', el).addEventListener('input', (e) => { g = Math.max(0, +e.target.value || 0); $$('[data-g]', el).forEach((x) => x.setAttribute('aria-pressed', +x.dataset.g === g)); upd(); });
      $('#ok', el).addEventListener('click', () => { if (g > 0) { close(); onOk(g); } });
      upd();
    },
  });
}
export { db };
