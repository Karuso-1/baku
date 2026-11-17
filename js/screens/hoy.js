// Pantalla Hoy.
import { html, icon, bowl, tube, $, $$, blobUrl, esc, toast, discreetBtn } from '../ui.js';
import { fmt, todayISO, fiberGoal } from '../plan.js';
import { closeBlock, bindClose } from '../cierre.js';
import { suggest } from '../sugerencias.js';
import { suppCard, bindSuppCard } from '../suplementos.js';
import { MEALS, maps, dayGet, dayPut, dayTotals, mealTotals, entryName, weightsAll, getSettings, streakAndAverage, photosByWeek, planWeek, parse, addDays } from '../store.js';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export const daysSince = (iso) => Math.floor((new Date(todayISO() + 'T12:00:00') - new Date(iso + 'T12:00:00')) / 86400000);
export const totalWeeks = (p) => p.plan.weeksTotal || p.plan.weeks || 0;

export function avatar(profile, size = 42, photo = null) {
  const weeks = totalWeeks(profile) || 1;
  const done = Math.min(1, (daysSince(profile.startDate) / 7) / weeks);
  const r = size / 2 - 2;
  const c = 2 * Math.PI * r;
  const inner = photo
    ? `<img src="${blobUrl(photo)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:999px">`
    : (profile.name[0] || '?').toUpperCase();
  return html`<span style="position:relative;width:${size}px;height:${size}px;display:block;flex:none">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" style="position:absolute;inset:0">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#F2EADB" stroke-opacity="0.2" stroke-width="2.5"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#F2EADB" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${Math.max(0.5, done * c)} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    </svg>
    <span class="glass flat" style="position:absolute;inset:${size * 0.12}px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:${size * 0.36}px;font-weight:600;overflow:hidden">${inner}</span>
  </span>`;
}

export async function hoy(app, profile) {
  app.className = '';
  const date = todayISO();
  const now = new Date();
  const [settings, m, day, weights, photos, prev] = await Promise.all([getSettings(), maps(), dayGet(date), weightsAll(), photosByWeek(), dayGet(addDays(date, -1))]);
  const { streak, avg, perDay } = await streakAndAverage(profile, settings);
  const plan = profile.plan;
  const week = planWeek(profile, date);
  const tw = totalWeeks(profile);
  const paused = settings.pause && date >= settings.pause.from && (!settings.pause.to || date <= settings.pause.to);
  const eaten = dayTotals(day, m, true);
  const left = plan.kcal - eaten.kcal;
  let pct = eaten.kcal / plan.kcal;
  if (paused && pct > 1) pct = 1; // en pausa no hay óxido
  const textDark = pct >= 0.5 && pct <= 1;
  const last = weights[weights.length - 1];
  const dayN = daysSince(profile.startDate) + 1;
  const weekPhotos = Object.keys(photos[week] || {}).length;
  const daysToSunday = (7 - now.getDay()) % 7;
  const anyMeal = MEALS.some(([k]) => day.meals[k].length);

  // Ideas para llegar a la proteína y la fibra (desde las 16:00, con lo planificado del día)
  const planned = dayTotals(day, m);
  const kcalLeft = plan.kcal - planned.kcal;
  const needs = paused || day.closedAt || !anyMeal || now.getHours() < 16 ? [] : [
    ['p', 'proteína', plan.protein - planned.p, 15],
    ['fi', 'fibra', fiberGoal(plan.kcal) - planned.fi, 6],
  ].filter(([, , need, min]) => need >= min).map(([k, l, need]) => [k, l, need, suggest(k, need, kcalLeft, m)]).filter(([, , , list]) => list.length);
  const target = mealNow() === 'cena' || now.getHours() >= 19 ? 'cena' : 'merienda';
  const ideas = needs.length ? html`<section class="glass card" style="gap:0;padding:12px 14px 6px">
    <div class="col" style="gap:2px;padding-bottom:4px"><h2 class="h2">Te faltan ${needs.map(([, l, need]) => `${fmt(need)} g de ${l}`).join(' y ')}</h2>
      <span class="muted small">${kcalLeft > 0 ? `Ideas de tu despensa que caben en las ${fmt(kcalLeft)} kcal que te quedan` : 'Ideas ligeras de tu despensa'}</span></div>
    ${needs.map(([k, l, , list]) => `${needs.length > 1 ? `<span class="muted small" style="padding:8px 0 2px;display:block;text-transform:capitalize">${l}</span>` : ''}${list.map((x) => html`<div class="list-row">
      <a href="#/alimento/${x.food.id}" class="col grow" style="min-width:0;text-decoration:none;color:#fff"><span style="font-size:14px;font-weight:500">${x.food.liked ? `<span style="color:var(--crema)">${icon('heart', 12, 2.4)}</span> ` : ''}${esc(x.food.name)}</span>
        <span class="muted small num">${esc(x.portion)} · +${fmt(x.v, x.v < 10 ? 1 : 0)} g de ${l} · ${fmt(x.kcal)} kcal</span></a>
      <button class="icon-btn glass flat" data-idea="${x.food.id}" data-g="${x.g}" aria-label="Añadir ${esc(x.food.name)} a la ${target}">${icon('plus', 16, 2.2)}</button></div>`).join('')}`).join('')}
  </section>` : '';

  const streakPill = paused ? '' : html`<span class="streak glass flat num" aria-label="${dayN === 1 ? 'Día 1' : `Racha de ${streak} días`}">${dayN === 1 ? 'Día 1' : `${icon('flame', 12, 2.2)}${streak}`}</span>`;

  const mealRow = ([k, label]) => {
    const items = day.meals[k];
    const t = mealTotals(day, k, m);
    const done = !!day.done[k];
    if (!items.length) {
      const ayer = prev.meals[k].length;
      return html`<div class="list-row"><a href="#/anadir?fecha=${date}&comida=${k}" class="row grow" style="gap:10px;text-decoration:none;color:#fff;min-width:0">
        <span style="width:28px;height:28px;flex:none;display:flex;align-items:center;justify-content:center;color:rgba(242,234,219,0.4)">${icon('dashed', 22, 1.6)}</span>
        <span class="col grow" style="min-width:0"><span style="font-size:14px;font-weight:600">${label}</span><span class="muted small">Sin planificar</span></span>
        ${ayer ? '' : '<span class="link" style="font-size:12px">Añadir</span>'}</a>
        ${ayer ? `<button class="link" data-ayer="${k}" style="font-size:12px;white-space:nowrap" aria-label="${label} como ayer: ${esc(prev.meals[k].map((e) => entryName(e, m)).join(', '))}">Como ayer</button>` : ''}</div>`;
    }
    return html`<div class="list-row">
      <button class="meal-toggle" data-meal="${k}" aria-pressed="${done}" aria-label="${label}: ${done ? 'hecha' : 'pendiente'}" style="width:28px;height:28px;border:0;padding:0;background:transparent;display:flex;align-items:center;justify-content:center;color:${done ? 'var(--salvia)' : 'rgba(242,234,219,0.6)'}">
        ${done ? `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M7.5 12.3l3 3 6-6" stroke="#1B3A2F" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>` : icon('dashed', 24, 1.6)}</button>
      <a href="#/menus?fecha=${date}" class="col grow" style="min-width:0;text-decoration:none;color:#fff"><span style="font-size:14px;font-weight:600">${label}</span><span class="muted small ellipsis">${items.map((e) => esc(entryName(e, m))).join(' · ')}</span></a>
      <span class="num" style="font-size:14px;font-weight:600;white-space:nowrap">${fmt(t.kcal)} <span class="unit">kcal</span></span></div>`;
  };

  const maxBar = Math.max(plan.kcal * 1.2, ...perDay.map((d) => d.kcal));
  const bars = perDay.map((d) => {
    const h = d.closed ? Math.max(4, (d.kcal / maxBar) * 44) : 4;
    const isToday = d.date === date;
    return `<span class="col" style="align-items:center;gap:4px;flex:1"><span style="height:48px;display:flex;align-items:flex-end"><span style="width:14px;height:${h}px;border-radius:5px;background:${d.closed ? (d.kcal > plan.kcal * 1.05 ? 'var(--oxido-claro)' : 'var(--crema)') : 'rgba(242,234,219,0.2)'}"></span></span><span class="small" style="color:${isToday ? '#fff' : 'var(--apagado)'};font-weight:${isToday ? 600 : 400}">${SHORT[parse(d.date).getDay()]}</span></span>`;
  }).join('');
  const goalY = 48 - (plan.kcal / maxBar) * 44;

  app.innerHTML = html`<div class="screen">
    <header class="hoy-head">
      <div class="row" style="gap:12px">
        <span class="hoy-day num">${now.getDate()}</span>
        <div class="hoy-meta">
          <div class="row" style="gap:8px"><span style="font-size:14px;font-weight:600">${DAYS[now.getDay()]}</span>${streakPill}</div>
          <span class="muted" style="font-size:12px">${MONTHS[now.getMonth()]} · semana ${week}</span>
        </div>
      </div>
      <div class="row" style="gap:8px">${discreetBtn(17)}<a href="#/perfil" aria-label="Perfil, semana ${week}${tw ? ' de ' + tw : ''}" style="text-decoration:none">${avatar(profile, 42, settings.avatar)}</a></div>
    </header>

    ${paused ? html`<section class="glass card" style="flex-direction:row;align-items:center;gap:10px;padding:10px 10px 10px 14px">
      <span style="width:32px;height:32px;border-radius:999px;background:rgba(242,234,219,0.14);color:var(--crema);display:flex;align-items:center;justify-content:center;flex:none">${icon('pause', 16, 2.2)}</span>
      <span class="col grow"><span style="font-size:14px;font-weight:600">Plan en pausa</span><span class="muted small num">${settings.pause.to ? 'Hasta el ' + parse(settings.pause.to).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '') : 'Hasta que vuelvas'} · racha guardada: ${streak}</span></span>
      <button class="btn small" id="resume" style="width:auto;height:34px;padding:0 12px;font-size:12px">Reanudar</button></section>` : ''}

    <section class="glass card">
      <div class="row" style="gap:18px">
        <div class="bowl-wrap" role="img" aria-label="${fmt(eaten.kcal)} de ${fmt(plan.kcal)} kcal consumidas">${bowl(pct)}
          <div class="bowl-label" style="color:${textDark ? '#1B3A2F' : pct > 1 ? '#FFFFFF' : '#F2EADB'}">
            <span class="num" style="font-size:22px;font-weight:700;letter-spacing:-0.02em;line-height:1">${fmt(Math.abs(left))}</span>
            <span style="font-size:11px;font-weight:500;margin-top:2px">${left >= 0 ? 'restantes' : 'de más'}</span></div></div>
        <div class="col grow" style="gap:8px">
          <div class="between"><span class="muted" style="font-size:12px">Consumidas</span><span class="num" style="font-size:16px;font-weight:600">${fmt(eaten.kcal)} <span class="unit">kcal</span></span></div>
          <div style="height:1px;background:rgba(242,234,219,0.18)"></div>
          <div class="between"><span class="muted" style="font-size:12px">Objetivo</span><span class="num" style="font-size:16px;font-weight:600">${fmt(plan.kcal)} <span class="unit">kcal</span></span></div>
        </div>
      </div>
      <div class="macros">
        ${[['Proteína', 'P', eaten.p, plan.protein], ['Hidratos', 'H', eaten.h, plan.carbs], ['Grasas', 'G', eaten.g, plan.fat], ['Fibra', 'F', eaten.fi, fiberGoal(plan.kcal)]].map(([l, k, v, g]) =>
          html`<button class="col macro-btn" data-macro="${k}" aria-label="${l}: ${fmt(v)} de ${fmt(g)} g. Ver de dónde viene" style="gap:5px"><span class="between"><span class="muted small">${l}</span><span style="color:var(--apagado);display:flex">${icon('chev', 12, 2.2)}</span></span>${tube(k, paused || k === 'F' ? Math.min(v, g) : v, g)}<span class="num" style="font-size:12px;font-weight:500">${fmt(v)} / ${fmt(g)} g</span></button>`).join('')}
      </div>
    </section>

    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
      <button id="peso" class="glass card" style="padding:12px 14px;gap:2px;color:#fff;text-align:left">
        <span class="muted small">Peso</span>
        <span class="num priv" style="font-size:20px;font-weight:600">${fmt(last ? last.kg : profile.weight, 1)} <span class="unit">kg</span></span>
        <span class="small" style="color:var(--crema);font-weight:600">Anotar peso</span></button>
      <a href="#/progreso?fotos=1" class="glass card" style="padding:12px 14px;gap:2px;text-decoration:none;color:#fff;flex-direction:row;align-items:center;gap:10px">
        <span style="position:relative;width:40px;height:40px;flex:none">
          <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" style="position:absolute;inset:0"><circle cx="20" cy="20" r="18" fill="none" stroke="#F2EADB" stroke-opacity="0.2" stroke-width="2.5"/><circle cx="20" cy="20" r="18" fill="none" stroke="#F2EADB" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${((7 - daysToSunday) / 7) * 113} 113" transform="rotate(-90 20 20)"/></svg>
          <span class="glass flat" style="position:absolute;inset:5px;border-radius:999px;display:flex;align-items:center;justify-content:center">${icon('camera', 15)}</span></span>
        <span class="col" style="min-width:0"><span class="muted small">Foto semanal</span>
        <span style="font-size:14px;font-weight:600">${weekPhotos >= 3 ? 'Hecha' : weekPhotos ? `${weekPhotos} de 3` : week === 1 ? 'Haz la primera' : 'Pendiente'}</span>
        <span class="muted small">${weekPhotos >= 3 ? `Semana ${week}` : daysToSunday > 1 ? `Faltan ${daysToSunday} días` : daysToSunday === 1 ? 'Mañana toca' : 'Hoy toca'}</span></span></a>
    </div>

    ${suppCard(settings, day, m)}

    ${anyMeal ? html`<section class="glass card" style="gap:0;padding:10px 14px 6px">
      <div class="between" style="padding-bottom:4px"><h2 class="h2">Comidas de hoy</h2><a class="link" href="#/menus?fecha=${date}" style="font-size:12px">Ver el día</a></div>
      ${MEALS.map(mealRow).join('')}</section>
    ${ideas}
    ${closeBlock(day)}`
    : html`<section class="glass card" style="align-items:center;text-align:center;padding:18px 16px">
      <h2 style="font-size:17px;font-weight:600">Tu cuenco está vacío</h2>
      <p class="muted" style="font-size:13px;line-height:1.4;max-width:260px">Añade lo que comas o planifica el menú de la semana.</p>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:100%">
        <a class="btn small" href="#/anadir?fecha=${date}&comida=${mealNow()}">Añadir ${MEALS.find(([k]) => k === mealNow())[1].toLowerCase()}</a>
        <a class="btn small ghost" href="#/menus">Planificar menú</a></div>
      ${MEALS.some(([k]) => prev.meals[k].length) ? `<button class="link row" id="ayerTodo" style="gap:6px;font-size:13px;margin-top:2px">${icon('copy', 14, 2)}Copiar el menú de ayer</button>` : ''}
    </section>`}

    <section class="glass card" style="padding:12px 16px">
      <div class="between"><span class="col"><span class="h2">Media de la semana</span><span class="muted small">${avg === null ? (dayN === 1 ? 'Aparece mañana, al cerrar tu primer día' : 'Aparece al cerrar un día con comidas hechas') : 'Por día, con los días cerrados'}</span></span>
      ${avg === null ? '' : `<span class="num" style="font-size:20px;font-weight:600">${fmt(avg)} <span class="unit">kcal</span></span>`}</div>
      ${avg === null ? '' : html`<div style="position:relative;display:flex;gap:4px;padding-top:4px">${bars}<span style="position:absolute;left:0;right:0;top:${goalY + 4}px;border-top:1px dashed rgba(156,199,175,0.7)"></span></div>`}
    </section>
  </div>`;

  bindClose(app, date, profile, () => hoy(app, profile));
  bindSuppCard(app, day, settings, m, () => hoy(app, profile));

  // Tocar una barra de macros: de qué alimentos viene
  const MK = { P: ['p', plan.protein], H: ['h', plan.carbs], G: ['g', plan.fat], F: ['fi', fiberGoal(plan.kcal)] };
  $$('[data-macro]', app).forEach((b) => b.addEventListener('click', async () => {
    const [k, goal] = MK[b.dataset.macro];
    const { desglose } = await import('../desglose.js');
    desglose(k, day, m, goal, eaten[k]);
  }));

  // Marcar comida hecha / pendiente
  $$('.meal-toggle', app).forEach((b) => b.addEventListener('click', async () => {
    const k = b.dataset.meal;
    day.done[k] = !day.done[k];
    await dayPut(day);
    hoy(app, profile);
    if (navigator.vibrate) navigator.vibrate(8);
  }));
  $$('[data-ayer]', app).forEach((b) => b.addEventListener('click', async () => {
    const k = b.dataset.ayer;
    day.meals[k] = JSON.parse(JSON.stringify(prev.meals[k]));
    await dayPut(day);
    hoy(app, profile);
    toast(`${MEALS.find(([x]) => x === k)[1]} como ayer. Márcala cuando la comas.`);
  }));
  $$('[data-idea]', app).forEach((b) => b.addEventListener('click', async () => {
    day.meals[target].push({ kind: 'food', id: b.dataset.idea, g: +b.dataset.g });
    await dayPut(day);
    hoy(app, profile);
    toast(day.done[target] ? `Añadido a la ${target}.` : `Añadido a la ${target}. Márcala cuando la comas.`);
  }));
  $('#ayerTodo', app)?.addEventListener('click', async () => {
    day.meals = JSON.parse(JSON.stringify(prev.meals)); day.done = {};
    await dayPut(day); hoy(app, profile);
    toast('Menú de ayer copiado. Marca cada comida cuando la hagas.');
  });
  $('#peso', app).addEventListener('click', async () => {
    const { anotarPeso } = await import('./progreso.js');
    anotarPeso(() => window.__route());
  });
  $('#resume', app)?.addEventListener('click', async () => {
    const { saveSettings } = await import('../store.js');
    await saveSettings({ pause: null });
    hoy(app, profile);
  });
}

export function mealNow() {
  const h = new Date().getHours();
  if (h < 11) return 'desayuno';
  if (h < 16) return 'comida';
  if (h < 19) return 'merienda';
  return 'cena';
}
