// Bienvenida, test inicial (4 pasos) y plan.
import { html, icon, bowl, gotas, ruler, $, $$, toast, logoMark } from '../ui.js';
import { computePlan, activityFactor, LEVEL_NAMES, bmi, fmt, fmtDate, todayISO } from '../plan.js';
import { saveProfile, getProfile, db, askPersistence } from '../db.js';
import { ensureSeed } from '../store.js';
import { DIETS, COMMON_AVOID, ALLERGENS, DEFAULT_DIET, allergenIcon, leafIcon } from '../diet.js';

const KEY = 'baku-borrador';
const DEFAULT = { name: '', sex: 'hombre', age: 30, height: 175, weight: 80, work: 'sentado', days: 0, goal: 'perder', target: 75, rate: 0.5 };
const draft = () => ({ ...DEFAULT, ...JSON.parse(sessionStorage.getItem(KEY) || '{}') });
const save = (d) => sessionStorage.setItem(KEY, JSON.stringify(d));
const go = (h) => { location.hash = h; };

const WORK = [
  ['sentado', 'Sentado', 'Oficina, ordenador, conducir', 'laptop'],
  ['depie', 'De pie', 'Tienda, sala, caminas a ratos', 'steps'],
  ['fisico', 'Físico', 'Cargar, obra, almacén', 'bolt'],
];
const DAYS = ['0', '1–2', '3–4', '5 o más'];
const RATES = [[0.25, 'Suave'], [0.5, 'Recomendado'], [0.75, 'Rápido']];
const WORK_SHORT = { sentado: 'Sentado', depie: 'De pie', fisico: 'Físico' };

function stepHeader(n, back) {
  return html`<div class="between" style="margin-bottom:6px">
    <a class="icon-btn glass flat" href="${back}" aria-label="Volver">${icon('back', 18, 2)}</a>
    ${gotas(n, 5)}
    <span class="num muted" style="width:40px;text-align:right;font-size:12px">${n} de 5</span>
  </div>`;
}
const title = (t, sub) => html`<div class="col" style="gap:6px;padding:0 4px"><h1 style="font-size:28px;font-weight:600;letter-spacing:-0.02em;line-height:1.1">${t}</h1><p class="muted" style="font-size:14px;line-height:1.4">${sub}</p></div>`;

// ---------- Bienvenida ----------
export function bienvenida(app) {
  app.className = 'full';
  app.innerHTML = html`<div class="screen" style="align-items:center;text-align:center">
    <div class="spacer"></div>
    <div style="filter:drop-shadow(0 20px 40px rgba(0,0,0,0.25))">${bowl(0.62, 190)}</div>
    <h1 class="row logo-in" style="gap:12px;align-items:center;margin-top:22px;font-size:52px;font-weight:620;letter-spacing:-0.045em">${logoMark(50)}<span>baku</span></h1>
    <p style="font-size:18px;font-weight:500">Come con ganas. Con cabeza.</p>
    <p class="muted" style="font-size:14px;line-height:1.4;max-width:280px">Tu dieta, tus menús y tu progreso en un solo sitio.</p>
    <div class="spacer"></div>
    <a class="btn" href="#/entrar">Empezar</a>
    <p class="muted row" style="font-size:12px;justify-content:center;gap:6px">${icon('lock', 14)}Tus fotos se cifran en tu móvil: solo tú puedes verlas</p>
    <a class="link muted" href="#/test/1" style="font-size:12px;padding:4px;opacity:.8">Usar sin cuenta</a>
  </div>`;
}

// ---------- Paso 1: sobre ti ----------
export function paso1(app) {
  const d = draft();
  app.className = 'full';
  app.innerHTML = html`<div class="screen">
    ${stepHeader(1, '#/bienvenida')}
    ${title('Sobre ti', 'Con esto calculo cuánta energía gasta tu cuerpo en reposo.')}
    <div class="field" style="margin-top:8px"><label for="nombre">¿Cómo te llamas?</label>
      <input id="nombre" class="input glass flat" type="text" autocomplete="given-name" placeholder="Tu nombre" value="${d.name.replace(/"/g, '&quot;')}">
      <span class="muted small">Tu inicial será tu avatar.</span></div>
    <div class="field"><span class="label">Sexo</span>
      <div class="seg glass flat" role="radiogroup" aria-label="Sexo">
        <button role="radio" data-sex="hombre" aria-checked="${d.sex === 'hombre'}">Hombre</button>
        <button role="radio" data-sex="mujer" aria-checked="${d.sex === 'mujer'}">Mujer</button>
      </div>
      <span class="muted small">Solo lo uso para calcular tu metabolismo.</span></div>
    <div class="field"><span class="label">Edad</span>
      <div class="stepper glass flat"><button data-age="-1" aria-label="Menos años">${icon('minus', 14, 2.6)}</button><output class="num" id="edad">${d.age} años</output><button data-age="1" aria-label="Más años">${icon('plus', 14, 2.6)}</button></div></div>
    <div class="spacer"></div>
    <button class="btn" id="next" ${d.name.trim() ? '' : 'disabled'}>Continuar</button>
  </div>`;
  const next = $('#next', app);
  $('#nombre', app).addEventListener('input', (e) => { d.name = e.target.value; save(d); next.disabled = !d.name.trim(); });
  $$('[data-sex]', app).forEach((b) => b.addEventListener('click', () => {
    d.sex = b.dataset.sex; save(d);
    $$('[data-sex]', app).forEach((x) => x.setAttribute('aria-checked', x === b));
  }));
  $$('[data-age]', app).forEach((b) => b.addEventListener('click', () => {
    d.age = Math.max(14, Math.min(99, d.age + +b.dataset.age)); save(d);
    $('#edad', app).textContent = `${d.age} años`;
  }));
  next.addEventListener('click', () => go('#/test/2'));
}

// ---------- Paso 2: tu cuerpo ----------
export function paso2(app) {
  const d = draft();
  app.className = 'full';
  app.innerHTML = html`<div class="screen">
    ${stepHeader(2, '#/test/1')}
    ${title('Tu cuerpo', 'Desliza la regla. Este peso será tu punto de partida.')}
    <div class="field" style="margin-top:6px"><div class="between"><span class="label">Altura</span><span class="num"><span id="h" style="font-size:28px;font-weight:600">${d.height}</span> <span class="unit">cm</span></span></div><div id="rh"></div></div>
    <div class="field"><div class="between"><span class="label">Peso actual</span><span class="num"><span id="w" style="font-size:28px;font-weight:600">${fmt(d.weight, 1)}</span> <span class="unit">kg</span></span></div><div id="rw"></div></div>
    <div class="glass flat card" style="flex-direction:row;justify-content:space-between;align-items:center;padding:12px 16px">
      <span class="muted" style="font-size:13px">Tu IMC ahora</span><span class="num" id="imc" style="font-size:17px;font-weight:600">${fmt(bmi(d.weight, d.height), 1)}</span></div>
    <div class="spacer"></div>
    <a class="btn" href="#/test/3">Continuar</a>
  </div>`;
  const upd = () => { save(d); $('#imc', app).textContent = fmt(bmi(d.weight, d.height), 1); };
  $('#rh', app).appendChild(ruler({ min: 120, max: 220, step: 1, value: d.height, labelEvery: 10,
    onChange: (v) => { d.height = v; $('#h', app).textContent = v; upd(); } }).el);
  $('#rw', app).appendChild(ruler({ min: 35, max: 200, step: 0.1, value: d.weight, decimals: 1, labelEvery: 10,
    onChange: (v) => {
      // Si el objetivo aún es el de por defecto, lo movemos con el peso
      if (Math.abs(d.target - (d.weight - 5)) < 0.01) d.target = +(v - 5).toFixed(1);
      d.weight = v; $('#w', app).textContent = fmt(v, 1); upd();
    } }).el);
}

// ---------- Paso 3: actividad ----------
export function paso3(app) {
  const d = draft();
  app.className = 'full';
  const level = () => { const f = activityFactor(d.work, d.days); return `${LEVEL_NAMES[f]} · × ${fmt(f, f === 1.2 || f === 1.9 ? 1 : f === 1.55 ? 2 : 3)}`; };
  app.innerHTML = html`<div class="screen">
    ${stepHeader(3, '#/test/2')}
    ${title('¿Cuánto te mueves?', 'Dos preguntas rápidas: tu trabajo y tu entreno.')}
    <div class="field" style="margin-top:6px"><span class="label">¿Cómo es tu trabajo?</span>
      <div class="chips" role="radiogroup" aria-label="Tipo de trabajo" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      ${WORK.map(([k, l, sub, ic]) => html`<button class="chip" role="radio" data-work="${k}" aria-checked="${d.work === k}" style="height:auto;border-radius:18px;padding:12px 6px;display:flex;flex-direction:column;align-items:center;gap:6px">${icon(ic, 22)}<span style="font-size:14px;font-weight:600">${l}</span><span style="font-size:11px;opacity:.75;line-height:1.3;font-weight:400">${sub}</span></button>`).join('')}
      </div></div>
    <div class="field"><span class="label">¿Cuántos días entrenas a la semana?</span>
      <div class="chips" role="radiogroup" aria-label="Días de entreno" style="grid-template-columns:repeat(4,minmax(0,1fr))">
      ${DAYS.map((l, i) => html`<button class="chip num" role="radio" data-days="${i}" aria-checked="${d.days === i}">${l}</button>`).join('')}
      </div>
      <span class="muted small">Gimnasio, correr, bici, deporte… al menos 30 minutos.</span></div>
    <div class="glass flat card" style="flex-direction:row;justify-content:space-between;align-items:center;padding:12px 16px">
      <span class="muted" style="font-size:13px">Tu nivel de actividad</span><span class="num" id="lvl" style="font-size:15px;font-weight:600">${level()}</span></div>
    <div class="spacer"></div>
    <a class="btn" href="#/test/dieta">Continuar</a>
  </div>`;
  const pick = (attr, key, parse) => $$(`[data-${attr}]`, app).forEach((b) => b.addEventListener('click', () => {
    d[key] = parse(b.dataset[attr]); save(d);
    $$(`[data-${attr}]`, app).forEach((x) => x.setAttribute('aria-checked', x === b));
    $('#lvl', app).textContent = level();
  }));
  pick('work', 'work', (v) => v);
  pick('days', 'days', (v) => +v);
}

// ---------- Paso 4: alimentación ----------
// Controles de dieta (se usan aquí y en Perfil). Devuelve { html, bind(root, onChange) }
export function dietControls(diet) {
  const d = { type: diet.type, avoid: [...(diet.avoid || [])] };
  const others = ALLERGENS.filter(([k]) => !COMMON_AVOID.some(([c]) => c === k));
  const openOthers = d.avoid.some((a) => others.some(([k]) => k === a));
  const markup = html`<div class="field"><span class="label">¿Qué tipo de dieta sigues?</span>
      <div class="chips" role="radiogroup" aria-label="Tipo de dieta" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      ${DIETS.map(([k, l, sub]) => html`<button class="chip" role="radio" data-diet="${k}" aria-checked="${d.type === k}" style="height:auto;border-radius:18px;padding:12px 6px;display:flex;flex-direction:column;align-items:center;gap:5px">${k === 'omnivora' ? icon('menus', 20) : leafIcon(20)}<span style="font-size:13px;font-weight:600">${l}</span><span style="font-size:11px;opacity:.75;line-height:1.3;font-weight:400">${sub}</span></button>`).join('')}
      </div></div>
    <div class="field"><span class="label">¿Hay algo que no puedas tomar?</span>
      <div class="chips" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      ${COMMON_AVOID.map(([k, l, sub]) => html`<button class="chip" data-avoid="${k}" aria-pressed="${d.avoid.includes(k)}" style="height:auto;border-radius:18px;padding:10px 12px;display:flex;align-items:center;gap:10px;text-align:left">${allergenIcon(k, 22)}<span class="col"><span style="font-size:14px;font-weight:600">${l}</span><span style="font-size:11px;opacity:.75;font-weight:400">${sub}</span></span></button>`).join('')}
      </div>
      <details ${openOthers ? 'open' : ''} style="margin-top:2px"><summary class="link" style="font-size:13px;padding:6px 4px;cursor:pointer">Otras alergias</summary>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:6px">${others.map(([k, l]) => `<button class="chip-s row" data-avoid="${k}" aria-pressed="${d.avoid.includes(k)}" style="gap:6px;justify-content:flex-start;padding:0 12px">${allergenIcon(k, 15)}${l}</button>`).join('')}</div></details>
      <span class="muted small" style="line-height:1.4">Lo que marques no saldrá en las propuestas y te avisaré si lo añades. Es orientativo: con celiaquía o alergias, revisa siempre la etiqueta.</span></div>`;
  const bind = (root, onChange) => {
    $$('[data-diet]', root).forEach((b) => b.addEventListener('click', () => { d.type = b.dataset.diet; $$('[data-diet]', root).forEach((x) => x.setAttribute('aria-checked', x === b)); onChange({ ...d }); }));
    $$('[data-avoid]', root).forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.avoid;
      d.avoid = d.avoid.includes(k) ? d.avoid.filter((x) => x !== k) : [...d.avoid, k];
      $$(`[data-avoid="${k}"]`, root).forEach((x) => x.setAttribute('aria-pressed', d.avoid.includes(k)));
      onChange({ ...d, avoid: [...d.avoid] });
    }));
  };
  return { html: markup, bind };
}

export function pasoDieta(app) {
  const d = draft();
  app.className = 'full';
  const c = dietControls(d.diet || DEFAULT_DIET);
  app.innerHTML = html`<div class="screen">
    ${stepHeader(4, '#/test/3')}
    ${title('Tu alimentación', 'Así no te propongo nada que no comas.')}
    ${c.html}
    <div class="spacer"></div>
    <a class="btn" href="#/test/4">Continuar</a>
  </div>`;
  c.bind(app, (diet) => { d.diet = diet; save(d); });
}

// ---------- Paso 5: objetivo ----------
export function paso4(app) {
  const d = draft();
  app.className = 'full';
  app.innerHTML = html`<div class="screen">
    ${stepHeader(5, '#/test/dieta')}
    ${title('Tu objetivo', 'Puedes cambiarlo cuando quieras desde tu perfil.')}
    <div class="seg glass flat" role="radiogroup" aria-label="Objetivo" style="margin-top:6px">
      ${['perder', 'mantener', 'ganar'].map((g) => html`<button role="radio" data-goal="${g}" aria-checked="${d.goal === g}">${g[0].toUpperCase() + g.slice(1)}</button>`).join('')}
    </div>
    <div id="tgt" class="field"><div class="between"><span class="label">Peso objetivo</span><span class="num"><span id="t" style="font-size:28px;font-weight:600">${fmt(d.target, 1)}</span> <span class="unit">kg</span></span></div>
      <div id="rt"></div><span class="muted small num" id="tdiff"></span></div>
    <div id="rateBox" class="field"><span class="label">Ritmo</span>
      <div class="chips" role="radiogroup" aria-label="Ritmo" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      ${RATES.map(([r, l]) => html`<button class="chip" role="radio" data-rate="${r}" aria-checked="${d.rate === r}" style="height:auto;border-radius:16px;padding:10px 4px;display:flex;flex-direction:column;gap:2px"><span class="num" style="font-size:14px;font-weight:600">${fmt(r, 2).replace(/0$/, '')} kg/sem</span><span style="font-size:11px;opacity:.75;font-weight:400">${l}</span></button>`).join('')}
      </div></div>
    <p id="eta" class="muted num" style="font-size:13px;line-height:1.4;padding:0 4px"></p>
    <div class="spacer"></div>
    <button class="btn" id="next">Ver mi plan</button>
  </div>`;
  const refresh = () => {
    save(d);
    const keep = d.goal === 'mantener';
    $('#tgt', app).hidden = keep;
    $('#rateBox', app).hidden = keep;
    const diff = d.target - d.weight;
    $('#tdiff', app).textContent = `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${fmt(Math.abs(diff), Math.abs(diff) % 1 ? 1 : 0)} kg desde hoy`;
    const valid = keep || (d.goal === 'perder' ? diff < 0 : diff > 0);
    $('#next', app).disabled = !valid;
    if (keep) { $('#eta', app).textContent = 'Comerás lo justo para mantener tu peso.'; return; }
    if (!valid) { $('#eta', app).textContent = d.goal === 'perder' ? 'El peso objetivo tiene que ser menor que el actual.' : 'El peso objetivo tiene que ser mayor que el actual.'; return; }
    const p = computePlan(d);
    $('#eta', app).innerHTML = `Llegarías a ${fmt(d.target, d.target % 1 ? 1 : 0)} kg en unas <b style="color:#fff">${p.weeks} semanas</b>, hacia el ${fmtDate(p.endDate, { day: 'numeric', month: 'long' })}.`;
  };
  const r = ruler({ min: 35, max: 200, step: 0.1, value: d.target, decimals: 1, labelEvery: 10,
    onChange: (v) => { d.target = v; $('#t', app).textContent = fmt(v, 1); refresh(); } });
  $('#rt', app).appendChild(r.el);
  $$('[data-goal]', app).forEach((b) => b.addEventListener('click', () => {
    d.goal = b.dataset.goal;
    $$('[data-goal]', app).forEach((x) => x.setAttribute('aria-checked', x === b));
    if (d.goal === 'perder' && d.target >= d.weight) d.target = +(d.weight - 5).toFixed(1);
    if (d.goal === 'ganar' && d.target <= d.weight) d.target = +(d.weight + 5).toFixed(1);
    if (d.goal === 'mantener') d.target = d.weight;
    // Redibujamos para que la regla se coloque en el nuevo valor
    save(d); paso4(app);
  }));
  $$('[data-rate]', app).forEach((b) => b.addEventListener('click', () => {
    d.rate = +b.dataset.rate;
    $$('[data-rate]', app).forEach((x) => x.setAttribute('aria-checked', x === b));
    refresh();
  }));
  $('#next', app).addEventListener('click', () => go('#/plan'));
  refresh();
}

// ---------- Tu plan ----------
export function plan(app) {
  const d = draft();
  if (!d.name) return go('#/test/1');
  const p = computePlan(d);
  app.className = 'full';
  const fdec = (f) => fmt(f, f === 1.2 || f === 1.9 ? 1 : f === 1.55 ? 2 : 3);
  const daysTxt = ['sin entreno', '1–2 días de entreno', '3–4 días de entreno', '5 o más días de entreno'][d.days];
  const line = (a, b, v, strong) => html`<div class="between" style="padding:9px 0;border-top:1px solid var(--linea)"><span class="col"><span style="font-size:14px;${strong ? 'font-weight:600' : ''}">${a}</span>${b ? `<span class="muted small">${b}</span>` : ''}</span><span class="num" style="font-size:${strong ? 17 : 15}px;font-weight:600">${v}</span></div>`;
  const adjLabel = d.goal === 'perder' ? 'Déficit' : d.goal === 'ganar' ? 'Superávit' : 'Sin ajuste';
  const adjSub = d.goal === 'mantener' ? 'Para mantener tu peso' : `Para ${d.goal} ${fmt(d.rate, 2).replace(/0$/, '')} kg por semana`;
  app.innerHTML = html`<div class="screen">
    <a class="icon-btn glass flat" href="#/test/4" aria-label="Volver">${icon('back', 18, 2)}</a>
    ${title('Tu plan está listo', 'Esto es lo que te toca comer cada día.')}
    <section class="glass card" style="align-items:center;text-align:center;padding:18px 16px">
      <span class="num" style="font-size:56px;font-weight:300;letter-spacing:-0.04em;line-height:1">${fmt(p.kcal)}</span>
      <span class="muted" style="margin-top:-6px">kcal al día</span>
      <div class="num" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center">
        <span class="pill">Proteína ${p.protein} g</span><span class="pill">Hidratos ${p.carbs} g</span><span class="pill">Grasas ${p.fat} g</span></div>
    </section>
    <section class="glass card" style="gap:0;padding:12px 16px 6px">
      <h2 style="font-size:15px;font-weight:600;padding-bottom:8px">Cómo lo he calculado</h2>
      ${line('Metabolismo basal', 'Lo que gastas en reposo', fmt(p.bmr))}
      ${line('Con tu actividad', `${WORK_SHORT[d.work]} + ${daysTxt}, × ${fdec(p.factor)}`, fmt(p.tdee))}
      ${line(adjLabel, adjSub, d.goal === 'mantener' ? '0' : (d.goal === 'perder' ? '−' : '+') + fmt(p.adjust))}
      ${line('Tu objetivo diario', '', fmt(p.kcal) + ' <span class="unit">kcal</span>', true)}
    </section>
    <p class="muted" style="font-size:13px;line-height:1.45;padding:0 4px">${d.goal === 'mantener' ? '' : `Meta: <b style="color:#fff">${fmt(d.target, d.target % 1 ? 1 : 0)} kg</b> hacia el ${fmtDate(p.endDate, { day: 'numeric', month: 'long' })}. `}El plan se recalcula cada vez que registres tu peso y nunca bajará de 1.500 kcal.${p.floored ? ' Con tus datos, el cálculo daba menos, así que lo he subido al mínimo.' : ''}</p>
    <div class="spacer"></div>
    <button class="btn" id="start">Empezar con Baku</button>
  </div>`;
  $('#start', app).addEventListener('click', async () => {
    const today = todayISO();
    const prev = await getProfile(); // si rehace el test, se conserva el punto de partida
    const profile = {
      name: d.name.trim(), sex: d.sex, age: d.age, height: d.height,
      startWeight: prev ? prev.startWeight : d.weight, weight: d.weight, target: d.target, goal: d.goal, rate: d.rate,
      work: d.work, days: d.days, diet: d.diet || prev?.diet || { ...DEFAULT_DIET }, startDate: prev ? prev.startDate : today, plan: { ...p, weeksTotal: p.weeks }, createdAt: prev ? prev.createdAt : Date.now(),
    };
    await saveProfile(profile);
    await db.put('weights', { date: today, kg: d.weight });
    await ensureSeed();
    sessionStorage.removeItem(KEY);
    askPersistence();
    go('#/hoy');
    setTimeout(() => toast(`${profile.sex === 'mujer' ? 'Bienvenida' : 'Bienvenido'}, ${profile.name}`), 300);
  });
}
