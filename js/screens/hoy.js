// Pantalla Hoy.
import { html, icon, bowl, tube } from '../ui.js';
import { fmt, todayISO } from '../plan.js';
import { db } from '../db.js';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const daysSince = (iso) => Math.floor((new Date(todayISO() + 'T12:00:00') - new Date(iso + 'T12:00:00')) / 86400000);

export function avatar(profile, size = 42) {
  const weeks = profile.plan.weeks || 1;
  const done = Math.min(1, (daysSince(profile.startDate) / 7) / weeks);
  const r = size / 2 - 2;
  const c = 2 * Math.PI * r;
  return html`<span style="position:relative;width:${size}px;height:${size}px;display:block;flex:none">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" style="position:absolute;inset:0">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#F2EADB" stroke-opacity="0.2" stroke-width="2.5"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#F2EADB" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${Math.max(0.5, done * c)} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    </svg>
    <span class="glass flat" style="position:absolute;inset:${size * 0.12}px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:${size * 0.36}px;font-weight:600">${(profile.name[0] || '?').toUpperCase()}</span>
  </span>`;
}

export async function hoy(app, profile) {
  app.className = '';
  const now = new Date();
  const day = daysSince(profile.startDate) + 1;
  const week = Math.floor((day - 1) / 7) + 1;
  const totalWeeks = profile.plan.weeks;
  const today = (await db.get('days', todayISO())) || { kcal: 0, p: 0, h: 0, g: 0, meals: [] };
  const plan = profile.plan;
  const left = plan.kcal - today.kcal;
  const pct = today.kcal / plan.kcal;
  const weights = (await db.all('weights')).sort((a, b) => a.date.localeCompare(b.date));
  const last = weights[weights.length - 1];
  const textDark = pct >= 0.5 && pct <= 1;

  app.innerHTML = html`<div class="screen">
    <header class="hoy-head">
      <div class="row" style="gap:12px">
        <span class="hoy-day num">${now.getDate()}</span>
        <div class="hoy-meta">
          <div class="row" style="gap:8px"><span style="font-size:14px;font-weight:600">${DAYS[now.getDay()]}</span>
            <span class="streak glass flat num" aria-label="Día ${day} del plan">${day === 1 ? 'Día 1' : `${icon('flame', 12, 2.2)}${day}`}</span></div>
          <span class="muted" style="font-size:12px">${MONTHS[now.getMonth()]} · semana ${week}</span>
        </div>
      </div>
      <a href="#/perfil" aria-label="Perfil, semana ${week}${totalWeeks ? ' de ' + totalWeeks : ''}" style="text-decoration:none">${avatar(profile)}</a>
    </header>

    <section class="glass card">
      <div class="row" style="gap:18px">
        <div class="bowl-wrap" role="img" aria-label="${fmt(today.kcal)} de ${fmt(plan.kcal)} kcal consumidas">${bowl(pct)}
          <div class="bowl-label" style="color:${textDark ? '#1B3A2F' : pct > 1 ? '#FFFFFF' : '#F2EADB'}">
            <span class="num" style="font-size:22px;font-weight:700;letter-spacing:-0.02em;line-height:1">${fmt(Math.abs(left))}</span>
            <span style="font-size:11px;font-weight:500;margin-top:2px">${left >= 0 ? 'restantes' : 'de más'}</span></div></div>
        <div class="col grow" style="gap:8px">
          <div class="between"><span class="muted" style="font-size:12px">Consumidas</span><span class="num" style="font-size:16px;font-weight:600">${fmt(today.kcal)} <span class="unit">kcal</span></span></div>
          <div style="height:1px;background:rgba(242,234,219,0.18)"></div>
          <div class="between"><span class="muted" style="font-size:12px">Objetivo</span><span class="num" style="font-size:16px;font-weight:600">${fmt(plan.kcal)} <span class="unit">kcal</span></span></div>
        </div>
      </div>
      <div class="macros">
        ${[['Proteína', 'P', today.p, plan.protein], ['Hidratos', 'H', today.h, plan.carbs], ['Grasas', 'G', today.g, plan.fat]].map(([l, k, v, g]) =>
          html`<div class="col" style="gap:5px"><span class="muted small">${l}</span>${tube(k, v, g)}<span class="num" style="font-size:12px;font-weight:500">${fmt(v)} / ${fmt(g)} g</span></div>`).join('')}
      </div>
    </section>

    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
      <a href="#/progreso" class="glass card" style="padding:12px 14px;gap:2px;text-decoration:none;color:#fff">
        <span class="muted small">Peso</span>
        <span class="num" style="font-size:20px;font-weight:600">${fmt(last ? last.kg : profile.weight, 1)} <span class="unit">kg</span></span>
        <span class="muted small">${weights.length <= 1 ? 'Punto de partida' : 'Último registro'}</span></a>
      <a href="#/progreso" class="glass card" style="padding:12px 14px;gap:2px;text-decoration:none;color:#fff">
        <span class="muted small">Foto semanal</span>
        <span style="font-size:16px;font-weight:600;margin-top:3px">Haz la primera</span>
        <span class="muted small num">Semana ${week}${totalWeeks ? ' de ' + totalWeeks : ''}</span></a>
    </div>

    ${today.meals.length ? '' : html`<section class="glass card" style="align-items:center;text-align:center;padding:18px 16px">
      <h2 style="font-size:17px;font-weight:600">Tu cuenco está vacío</h2>
      <p class="muted" style="font-size:13px;line-height:1.4;max-width:260px">Añade lo que comas o planifica el menú de la semana.</p>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:100%">
        <a class="btn small" href="#/menus">Añadir ${mealNow()}</a>
        <a class="btn small ghost" href="#/menus">Planificar menú</a></div>
    </section>`}

    <section class="glass card" style="flex-direction:row;align-items:center;justify-content:space-between;padding:12px 16px">
      <span class="col"><span style="font-size:14px;font-weight:600">Media de la semana</span><span class="muted small">${day === 1 ? 'Aparece mañana, al cerrar tu primer día' : 'Se calcula con los días cerrados'}</span></span>
    </section>
  </div>`;
}

function mealNow() {
  const h = new Date().getHours();
  if (h < 11) return 'desayuno';
  if (h < 16) return 'comida';
  if (h < 19) return 'merienda';
  return 'cena';
}
