// Cerrar el día: cuando ya no vas a apuntar nada más (después de cenar).
// Guarda day.closedAt y enseña una tarjeta con el resumen y un mensaje de cómo ha ido.
// El día se puede reabrir. Si se sigue apuntando después de cerrar, el resumen se recalcula.
import { html, icon, bowl, tube, $, $$, sheet, toast } from './ui.js';
import { fmt, fiberGoal } from './plan.js';
import { MEALS, maps, dayGet, dayPut, dayTotals, getSettings, streakAndAverage } from './store.js';

// Elige siempre la misma frase para el mismo día (así no cambia al volver a abrir el resumen)
const pick = (list, seed) => {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length];
};

// Mensaje según cómo ha ido el día. Nunca culpa: un día suelto no cambia nada.
export function dayMessage({ kcal, goal, protein, proteinGoal, doneMeals, plannedMeals, aim, avg, streak, paused, date }) {
  const r = goal ? kcal / goal : 0;
  const s = (list) => pick(list, date);
  let tone, title, text;

  if (paused) {
    tone = 'neutro'; title = 'Día en pausa';
    text = 'Está apuntado, pero no cuenta para la racha ni para la media. Descansar también es parte del plan.';
  } else if (doneMeals <= 1 && r < 0.5) {
    tone = 'neutro'; title = 'Día a medias';
    text = 'Solo has marcado una comida. Si comiste algo más, apúntalo: así la media de la semana te dice la verdad.';
  } else if (Math.abs(r - 1) <= 0.05) {
    tone = 'bien';
    [title, text] = s([
      ['Clavado', 'Justo en tu meta. Días así son los que hacen que esto funcione.'],
      ['Día de diez', 'Has comido lo que tocaba, ni más ni menos. Así da gusto.'],
      ['Perfecto', 'En tu meta y sin complicarte. Mañana, otro igual.'],
    ]);
  } else if (r < 1) {
    if (r >= 0.85) {
      tone = 'bien';
      if (aim === 'ganar') { title = 'Casi'; text = 'Te ha faltado un poco para tu meta. Mañana añade algo para picar entre horas.'; }
      else [title, text] = s([
        ['Muy bien', 'Un poco por debajo de la meta. Bien, siempre que no te quedes con hambre.'],
        ['Buen día', 'Cerca de tu meta y por debajo. Vas por buen camino.'],
      ]);
    } else {
      tone = 'aviso'; title = 'Te has quedado corto';
      text = aim === 'ganar'
        ? 'Para ganar peso hace falta llegar a la meta. Mañana prueba a meter un plato más o raciones algo más grandes.'
        : 'Comer muy por debajo de la meta cansa y da más hambre al día siguiente. No hace falta pasar hambre para avanzar: mañana intenta acercarte.';
    }
  } else if (r <= 1.15) {
    tone = aim === 'ganar' ? 'bien' : 'suave';
    if (aim === 'ganar') { title = 'Sumando'; text = 'Un poco por encima de la meta. Para ganar peso, perfecto.'; }
    else [title, text] = s([
      ['Un pelín por encima', avg != null ? `No pasa nada: lo que cuenta es la media de la semana, y vas en ${fmt(avg)} kcal.` : 'No pasa nada: lo que cuenta es la media de la semana, no un día suelto.'],
      ['Casi en la meta', 'Te has pasado un poco. Nada que arreglar: mañana, como siempre.'],
    ]);
  } else {
    tone = 'suave';
    [title, text] = s([
      ['Día generoso', 'Pasa. Un día no cambia nada. Mañana vuelves a tu meta, sin compensar ni saltarte comidas.'],
      ['Mañana, otro cuenco', 'Hoy te has pasado, y está bien que lo hayas apuntado igual. Eso es lo que hace que funcione.'],
    ]);
  }

  const extras = [];
  if (!paused && proteinGoal && protein >= proteinGoal * 0.9) extras.push('Proteína cumplida');
  if (!paused && doneMeals === plannedMeals && plannedMeals >= 3) extras.push('Todas las comidas hechas');
  if (!paused && [7, 14, 21, 30, 50, 100].includes(streak)) extras.push(`${streak} días seguidos`);
  return { tone, title, text, extras };
}

// Botón o aviso que va en Hoy, debajo de las comidas
export function closeBlock(day) {
  const anyDone = MEALS.some(([k]) => day.done[k] && day.meals[k].length);
  if (day.closedAt) {
    return html`<button class="glass card cierre-row" id="verCierre" aria-label="Día cerrado. Ver resumen">
      <span class="cierre-ico">${icon('moon', 16, 2)}</span>
      <span class="col grow" style="text-align:left"><span style="font-size:14px;font-weight:600">Día cerrado</span><span class="muted small">Hasta mañana</span></span>
      <span class="link" style="font-size:12px">Ver resumen</span></button>`;
  }
  if (!anyDone) return '';
  const pending = MEALS.filter(([k]) => day.meals[k].length && !day.done[k]).length;
  const late = new Date().getHours() >= 19;
  // Antes de la tarde solo sale si ya está todo marcado (si no, molesta)
  if (!late && pending) return '';
  return html`<button class="btn ghost row" id="cerrarDia" style="gap:8px">${icon('moon', 17, 2)}Cerrar el día</button>`;
}

// Conecta los botones de closeBlock
export function bindClose(app, date, profile, rerender) {
  $('#cerrarDia', app)?.addEventListener('click', () => closeDay(date, profile, rerender));
  $('#verCierre', app)?.addEventListener('click', () => summary(date, profile, rerender));
}

// Cerrar: si quedan comidas sin marcar, pregunta cuáles se han comido
export async function closeDay(date, profile, rerender) {
  const day = await dayGet(date);
  const pending = MEALS.filter(([k]) => day.meals[k].length && !day.done[k]);
  const finish = async () => {
    day.closedAt = new Date().toISOString();
    await dayPut(day);
    if (navigator.vibrate) navigator.vibrate([10, 40, 10]);
    rerender && rerender();
    summary(date, profile, rerender);
  };
  if (!pending.length) return finish();
  sheet('Antes de cerrar', html`
    <p class="muted" style="font-size:14px;line-height:1.4;margin:0">Te quedan comidas sin marcar. Toca las que sí te has comido; las demás no cuentan.</p>
    <div class="chips" style="grid-template-columns:repeat(${Math.min(pending.length, 2)},minmax(0,1fr))">
      ${pending.map(([k, l]) => `<button class="chip" data-k="${k}" aria-pressed="false">${l}</button>`).join('')}</div>
    <button class="btn row" id="ok" style="gap:8px">${icon('moon', 17, 2)}Cerrar el día</button>`, {
    onMount: (api) => {
      $$('[data-k]', api.el).forEach((b) => b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'))));
      $('#ok', api.el).addEventListener('click', async () => {
        $$('[data-k]', api.el).forEach((b) => { if (b.getAttribute('aria-pressed') === 'true') day.done[b.dataset.k] = true; });
        api.close();
        await finish();
      });
    },
  });
}

// Tarjeta con el resumen del día
export async function summary(date, profile, rerender) {
  const [day, m, settings] = await Promise.all([dayGet(date), maps(), getSettings()]);
  const { streak, avg } = await streakAndAverage(profile, settings);
  const plan = profile.plan;
  const t = dayTotals(day, m, true);
  const planned = MEALS.filter(([k]) => day.meals[k].length).length;
  const done = MEALS.filter(([k]) => day.meals[k].length && day.done[k]).length;
  const paused = !!(settings.pause && date >= settings.pause.from && (!settings.pause.to || date <= settings.pause.to));
  const msg = dayMessage({ kcal: t.kcal, goal: plan.kcal, protein: t.p, proteinGoal: plan.protein, doneMeals: done, plannedMeals: planned, aim: profile.goal, avg, streak, paused, date });
  const diff = Math.round(t.kcal - plan.kcal);
  const pct = t.kcal / plan.kcal;
  const toneColor = { bien: 'var(--salvia)', suave: 'var(--arena-claro)', aviso: 'var(--oxido-claro)', neutro: 'var(--crema)' }[msg.tone];
  const status = Math.abs(diff) <= plan.kcal * 0.05 ? 'En tu meta' : diff < 0 ? `${fmt(-diff)} kcal por debajo` : `${fmt(diff)} kcal por encima`;
  const f = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const fecha = f[0].toUpperCase() + f.slice(1);

  sheet('Resumen del día', html`
    <div class="cierre-card glass">
      <span class="muted small">${fecha}</span>
      <div class="row" style="gap:16px;margin-top:6px">
        <div style="flex:none">${bowl(Math.min(pct, 1.3), 84)}</div>
        <div class="col grow" style="gap:2px;min-width:0">
          <span class="num" style="font-size:30px;font-weight:700;letter-spacing:-0.02em;line-height:1">${fmt(t.kcal)}</span>
          <span class="muted small num">de ${fmt(plan.kcal)} kcal</span>
          <span class="cierre-status num" style="color:${toneColor};border-color:${toneColor}">${status}</span></div>
      </div>
      <div class="macros" style="margin-top:12px">
        ${[['Proteína', 'P', t.p, plan.protein], ['Hidratos', 'H', t.h, plan.carbs], ['Grasas', 'G', t.g, plan.fat], ['Fibra', 'F', t.fi, fiberGoal(plan.kcal)]].map(([l, k, v, g]) =>
          html`<div class="col" style="gap:5px"><span class="muted small">${l}</span>${tube(k, k === 'F' ? Math.min(v, g) : v, g)}<span class="num" style="font-size:12px;font-weight:500">${fmt(v)} / ${fmt(g)} g</span></div>`).join('')}
      </div>
      <div class="num" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px">
        <span class="glass flat stat"><span class="muted small">Comidas hechas</span><span style="font-size:16px;font-weight:600">${done} de ${planned}</span></span>
        <span class="glass flat stat"><span class="muted small">Racha</span><span class="row" style="gap:4px;font-size:16px;font-weight:600">${paused ? 'En pausa' : `${icon('flame', 14, 2.2)}${streak} ${streak === 1 ? 'día' : 'días'}`}</span></span>
      </div>
    </div>
    <div class="cierre-msg" style="border-left-color:${toneColor}">
      <span style="font-size:17px;font-weight:600">${msg.title}</span>
      <span style="font-size:14px;line-height:1.45;color:var(--apagado)">${msg.text}</span>
      ${msg.extras.length ? `<span class="row" style="gap:6px;flex-wrap:wrap;margin-top:4px">${msg.extras.map((x) => `<span class="chip-s" aria-pressed="true">${icon('check', 12, 2.6)}${x}</span>`).join('')}</span>` : ''}
    </div>
    <button class="btn" id="bye">Hasta mañana</button>
    <button class="link" id="reabrir" style="align-self:center;padding:4px 8px">Reabrir el día</button>`, {
    onMount: (api) => {
      $('#bye', api.el).addEventListener('click', api.close);
      $('#reabrir', api.el).addEventListener('click', async () => {
        const d = await dayGet(date);
        delete d.closedAt;
        await dayPut(d);
        api.close();
        toast('Día abierto otra vez');
        rerender && rerender();
      });
    },
  });
}
