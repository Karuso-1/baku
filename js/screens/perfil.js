// Perfil y ajustes: datos, plan, fondo, copia de seguridad, pausa y meta alcanzada.
import { html, icon, sheet, ruler, $, $$, toast, esc, pickImage, resizeImage, blobUrl, circleLink, APP_VERSION, isDiscreet, setDiscreet } from '../ui.js';
import { fmt, fmtDate, todayISO, fiberGoal, computePlan, activityFactor, LEVEL_NAMES, bmi } from '../plan.js';
import { db, saveProfile, getProfile } from '../db.js';
import { getSettings, saveSettings, weightsAll, photosByWeek, planWeek, addDays, parse, recipesAll } from '../store.js';
import { avatar, totalWeeks } from './hoy.js';
import { PALETTES, applyTheme } from '../theme.js';
import { dietOf, dietSummary } from '../diet.js';
import { dietControls } from './onboarding.js';
import { hasSession, signOut, useLocalData } from '../sync.js';
import { resetTips } from '../tips.js';
import { getAvisos, currentSub, permission } from '../avisos.js';

const WORK = { sentado: 'Sentado', depie: 'De pie', fisico: 'Físico' };
const DAYS = ['0 días', '1–2 días', '3–4 días', '5+ días'];

const row = (ic, label, value, attrs) => `<button class="list-row" ${attrs} style="background:none;border-left:0;border-right:0;border-bottom:0;color:#fff;text-align:left;width:100%;min-height:48px"><span style="width:30px;height:30px;border-radius:999px;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;flex:none;color:var(--crema)">${icon(ic, 15)}</span><span class="grow" style="font-size:14px">${label}</span><span class="num muted" style="font-size:13px">${value}</span><span style="color:rgba(227,220,205,0.6);display:flex">${icon('chev', 14, 2)}</span></button>`;

// Recalcula el plan y avisa si cambia
async function updateProfile(profile, patch) {
  const before = profile.plan.kcal;
  Object.assign(profile, patch);
  const weeksTotal = totalWeeks(profile);
  profile.plan = { ...computePlan(profile), weeksTotal };
  await saveProfile(profile);
  if (profile.plan.kcal !== before) toast(`Tu objetivo pasa de ${fmt(before)} a ${fmt(profile.plan.kcal)} kcal`);
  else toast('Guardado');
}

export async function perfil(app, profile) {
  app.className = '';
  const s = await getSettings();
  const a = await getAvisos();
  const avOn = permission() === 'granted' && !!(await currentSub());
  const p = profile.plan;
  const week = planWeek(profile);
  const tw = totalWeeks(profile);
  const goalTxt = profile.goal === 'mantener' ? 'Mantener' : `${fmt(profile.target, profile.target % 1 ? 1 : 0)} <span class="unit">kg</span>`;
  const daysAgo = s.lastBackup ? Math.floor((Date.now() - s.lastBackup) / 86400000) : null;
  app.innerHTML = html`<div class="screen">
    ${circleLink('back', 'Volver', '#/hoy')}
    <div class="row" style="gap:14px;padding:0 4px">
      <div style="position:relative;flex:none">${avatar(profile, 68, s.avatar)}
        <button id="foto" aria-label="Cambiar foto de perfil" style="position:absolute;right:-2px;bottom:-2px;width:26px;height:26px;border-radius:999px;border:2px solid var(--fondo);background:var(--crema);color:var(--fondo);padding:0;display:flex;align-items:center;justify-content:center">${icon('camera', 13, 2.2)}</button></div>
      <span class="col" style="gap:4px"><span style="font-size:24px;font-weight:600;letter-spacing:-0.02em">${esc(profile.name)}</span>
      <span class="row" style="gap:8px;flex-wrap:wrap"><span class="pill num" style="font-weight:600;background:rgba(242,234,219,0.14)">Semana ${week}${tw ? ' de ' + tw : ''}</span><span class="muted small num">Empezaste el ${fmtDate(profile.startDate)}</span></span></span></div>

    <section class="glass card">
      <div class="between"><h2 class="h2">Tu plan</h2><span class="muted small">Se recalcula al anotar peso</span></div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
        <span class="col"><span class="muted small">Objetivo</span><span class="num${profile.goal === 'mantener' ? '' : ' priv'}" style="font-size:18px;font-weight:600">${goalTxt}</span></span>
        <span class="col"><span class="muted small">Ritmo</span><span class="num priv" style="font-size:18px;font-weight:600">${profile.goal === 'mantener' ? '—' : fmt(profile.rate, 2).replace(/0$/, '') + ' <span class="unit">kg/sem</span>'}</span></span>
        <span class="col"><span class="muted small">Al día</span><span class="num" style="font-size:18px;font-weight:600">${fmt(p.kcal)} <span class="unit">kcal</span></span></span></div>
      <div class="num row" style="gap:6px;font-size:12px;flex-wrap:wrap"><span class="pill">P ${p.protein} g</span><span class="pill">H ${p.carbs} g</span><span class="pill">G ${p.fat} g</span><span class="pill">Fibra ${fiberGoal(p.kcal)} g</span></div>
      ${profile.tdeeAdjust ? `<div class="between"><span class="muted small num">Ajustada con tus datos: ${profile.tdeeAdjust > 0 ? '+' : '−'}${fmt(Math.abs(profile.tdeeAdjust))} kcal de gasto</span><button class="link" id="unadapt" style="font-size:12px">Quitar ajuste</button></div>` : ''}
      <div class="row" style="gap:8px"><button class="btn small ghost grow" id="goal">Cambiar objetivo</button><button class="btn small ghost" id="pause" style="width:auto;padding:0 16px">${icon('pause', 15, 2.2)}${s.pause ? 'En pausa' : 'Pausar'}</button></div>
    </section>

    <div class="col" style="gap:6px"><h2 class="muted" style="font-size:13px;font-weight:600;padding-left:4px">Tus datos</h2>
    <section class="glass card" style="gap:0;padding:4px 14px">
      ${row('ruler2', 'Altura', `${profile.height} cm`, 'data-e="height"')}${row('cake', 'Edad', `${profile.age} años`, 'data-e="age"')}${row('user', 'Sexo', profile.sex === 'mujer' ? 'Mujer' : 'Hombre', 'data-e="sex"')}${row('steps', 'Actividad', `${WORK[profile.work]} · ${DAYS[profile.days]}`, 'data-e="act"')}${row('menus', 'Alimentación', esc(dietSummary(dietOf(profile))), 'data-e="diet"')}${row('pill', 'Suplementos', (s.supps || []).length ? `${s.supps.length}` : 'Ninguno', 'data-supps="1"')}
    </section></div>

    <div class="col" style="gap:6px"><h2 class="muted" style="font-size:13px;font-weight:600;padding-left:4px">App</h2>
    <section class="glass card" style="gap:0;padding:4px 14px">
      ${row('image', 'Fondo', s.bgPhoto ? 'Mi foto' : PALETTES[s.palette].name, 'data-go="#/perfil/fondo"')}
      ${row('eyeoff', 'Modo discreto', isDiscreet() ? 'Activado' : 'Desactivado', 'data-disc="1"')}
      ${row('calendar', 'La semana empieza el', s.weekStart === 1 ? 'Lunes' : 'Domingo', 'data-e="week"')}
      ${row('cloud', 'Cuenta y copia en la nube', hasSession() ? 'Activa' : 'Sin activar', 'data-go="#/cuenta"')}
      ${row('bell', 'Avisos', a.pausa ? 'En pausa' : avOn ? 'Activados' : 'Desactivados', 'data-go="#/avisos"')}
      ${row('info', 'Volver a ver los consejos', '', 'data-tips="1"')}
      ${row('shield', 'Privacidad', '', 'data-go="#/privacidad"')}
      ${row('mail', 'Enviar opinión o un fallo', '', 'data-fb="1"')}
      ${row('download', 'Copia de seguridad', daysAgo === null ? 'Nunca' : daysAgo === 0 ? 'Hoy' : `Hace ${daysAgo} días`, 'data-go="#/perfil/copia"')}
    </section></div>
    <p class="muted small" style="text-align:center;line-height:1.5">Baku ${APP_VERSION}<br>${hasSession() ? 'Tus datos en este móvil y en tu copia en la nube' : 'Tus datos solo están en este móvil'}</p>
  </div>`;

  const rerender = async () => perfil(app, await getProfile());
  $('[data-supps]', app)?.addEventListener('click', async () => { const { suppSheet } = await import('../suplementos.js'); suppSheet(rerender); });
  $$('[data-go]', app).forEach((b) => b.addEventListener('click', () => { location.hash = b.dataset.go; }));
  $('[data-fb]', app).addEventListener('click', () => feedback());
  $('[data-disc]', app).addEventListener('click', () => {
    const on = !isDiscreet();
    setDiscreet(on);
    $('[data-disc] .num', app).textContent = on ? 'Activado' : 'Desactivado';
    toast(on ? 'Modo discreto: peso e IMC ocultos' : 'Peso e IMC visibles');
  });
  $('[data-tips]', app).addEventListener('click', async () => { await resetTips(); location.hash = '#/hoy'; });
  $('#foto', app).addEventListener('click', () => sheet('Foto de perfil', `<button class="btn" id="pick">${icon('image', 18)}Elegir foto</button>${s.avatar ? '<button class="btn ghost" id="ini">Usar mi inicial</button>' : ''}`, {
    onMount: ({ el, close }) => {
      $('#pick', el).addEventListener('click', async () => {
        const f = await pickImage();
        if (!f) return;
        await saveSettings({ avatar: await resizeImage(f, { ratio: 1, max: 400 }) });
        close(); rerender();
      });
      $('#ini', el)?.addEventListener('click', async () => { await saveSettings({ avatar: null }); close(); rerender(); });
    },
  }));
  $('#goal', app).addEventListener('click', () => {
    sessionStorage.setItem('baku-borrador', JSON.stringify({ name: profile.name, sex: profile.sex, age: profile.age, height: profile.height, weight: profile.weight, work: profile.work, days: profile.days, goal: profile.goal, target: profile.target, rate: profile.rate, tdeeAdjust: profile.tdeeAdjust || 0 }));
    location.hash = '#/test/4';
  });
  $('#pause', app).addEventListener('click', () => pausar(s, rerender));
  $('#unadapt', app)?.addEventListener('click', async () => { await updateProfile(profile, { tdeeAdjust: 0 }); rerender(); });
  $$('[data-e]', app).forEach((b) => b.addEventListener('click', () => editData(b.dataset.e, profile, s, rerender)));
}

function editData(kind, profile, s, done) {
  if (kind === 'diet') {
    let diet = dietOf(profile);
    const c = dietControls(diet);
    sheet('Alimentación', `${c.html}<button class="btn" id="ok">Guardar</button>`, {
      onMount: ({ el, close }) => {
        c.bind(el, (d) => { diet = d; });
        $('#ok', el).addEventListener('click', async () => { close(); profile.diet = diet; await saveProfile(profile); toast('Guardado'); done(); });
      },
    });
  }
  if (kind === 'height') {
    let v = profile.height;
    sheet('Altura', `<div class="ruler-value"><span class="big num" id="v">${v}</span> <span class="unit" style="font-size:15px">cm</span></div><div id="r"></div><button class="btn" id="ok">Guardar</button>`, {
      onMount: ({ el, close }) => {
        $('#r', el).appendChild(ruler({ min: 120, max: 220, step: 1, value: v, onChange: (x) => { v = x; $('#v', el).textContent = x; } }).el);
        $('#ok', el).addEventListener('click', async () => { close(); await updateProfile(profile, { height: v }); done(); });
      },
    });
  }
  if (kind === 'age') {
    let v = profile.age;
    sheet('Edad', `<div class="stepper glass flat"><button data-a="-1" aria-label="Menos">${icon('minus', 14, 2.6)}</button><output class="num" id="v">${v} años</output><button data-a="1" aria-label="Más">${icon('plus', 14, 2.6)}</button></div><button class="btn" id="ok">Guardar</button>`, {
      onMount: ({ el, close }) => {
        $$('[data-a]', el).forEach((b) => b.addEventListener('click', () => { v = Math.max(14, Math.min(99, v + +b.dataset.a)); $('#v', el).textContent = `${v} años`; }));
        $('#ok', el).addEventListener('click', async () => { close(); await updateProfile(profile, { age: v }); done(); });
      },
    });
  }
  if (kind === 'sex') {
    let v = profile.sex;
    sheet('Sexo', `<div class="seg glass flat" role="radiogroup"><button role="radio" data-s="hombre" aria-checked="${v === 'hombre'}">Hombre</button><button role="radio" data-s="mujer" aria-checked="${v === 'mujer'}">Mujer</button></div><p class="muted small">Solo lo uso para calcular tu metabolismo.</p><button class="btn" id="ok">Guardar</button>`, {
      onMount: ({ el, close }) => {
        $$('[data-s]', el).forEach((b) => b.addEventListener('click', () => { v = b.dataset.s; $$('[data-s]', el).forEach((x) => x.setAttribute('aria-checked', x === b)); }));
        $('#ok', el).addEventListener('click', async () => { close(); await updateProfile(profile, { sex: v }); done(); });
      },
    });
  }
  if (kind === 'act') {
    let w = profile.work, d = profile.days;
    const lvl = () => { const f = activityFactor(w, d); return `${LEVEL_NAMES[f]} · × ${String(f).replace('.', ',')}`; };
    sheet('Actividad', `<span class="label">¿Cómo es tu trabajo?</span><div class="chips" style="grid-template-columns:repeat(3,minmax(0,1fr))">${Object.entries(WORK).map(([k, l]) => `<button class="chip" data-w="${k}" aria-checked="${k === w}">${l}</button>`).join('')}</div>
      <span class="label">Días de entreno a la semana</span><div class="chips" style="grid-template-columns:repeat(4,minmax(0,1fr))">${['0', '1–2', '3–4', '5+'].map((l, i) => `<button class="chip num" data-d="${i}" aria-checked="${i === d}">${l}</button>`).join('')}</div>
      <div class="between glass flat card" style="flex-direction:row;padding:12px 16px"><span class="muted small">Nivel</span><span class="num" id="lv" style="font-weight:600">${lvl()}</span></div><button class="btn" id="ok">Guardar</button>`, {
      onMount: ({ el, close }) => {
        $$('[data-w]', el).forEach((b) => b.addEventListener('click', () => { w = b.dataset.w; $$('[data-w]', el).forEach((x) => x.setAttribute('aria-checked', x === b)); $('#lv', el).textContent = lvl(); }));
        $$('[data-d]', el).forEach((b) => b.addEventListener('click', () => { d = +b.dataset.d; $$('[data-d]', el).forEach((x) => x.setAttribute('aria-checked', x === b)); $('#lv', el).textContent = lvl(); }));
        $('#ok', el).addEventListener('click', async () => { close(); await updateProfile(profile, { work: w, days: d }); done(); });
      },
    });
  }
  if (kind === 'week') {
    sheet('La semana empieza el', `<div class="seg glass flat" role="radiogroup"><button role="radio" data-w="1" aria-checked="${s.weekStart === 1}">Lunes</button><button role="radio" data-w="0" aria-checked="${s.weekStart === 0}">Domingo</button></div>`, {
      onMount: ({ el, close }) => $$('[data-w]', el).forEach((b) => b.addEventListener('click', async () => { await saveSettings({ weekStart: +b.dataset.w }); close(); done(); })),
    });
  }
}

// ---------- Pausar el plan ----------
function pausar(s, done) {
  if (s.pause) {
    sheet('Plan en pausa', `<p class="muted" style="font-size:14px;line-height:1.45">${s.pause.to ? `Hasta el ${fmtDate(s.pause.to, { day: 'numeric', month: 'long' })}` : 'Hasta que vuelvas'}. Tu racha está guardada.</p><button class="btn" id="ok">Reanudar el plan</button>`, {
      onMount: ({ el, close }) => $('#ok', el).addEventListener('click', async () => { await saveSettings({ pause: null }); close(); toast('Plan reanudado'); done(); }),
    });
    return;
  }
  let mode = 'fechas';
  const today = todayISO();
  let from = today, to = addDays(today, 7);
  const bullet = (t, sub) => `<div class="row" style="gap:10px;align-items:flex-start"><span style="color:var(--salvia);display:flex;padding-top:2px">${icon('check', 14, 2.4)}</span><span class="col"><span style="font-size:14px">${t}</span><span class="muted small">${sub}</span></span></div>`;
  sheet('Pausar el plan', html`<span class="muted" style="font-size:13px;line-height:1.45;margin-top:-6px">Para vacaciones, fiestas o una semana complicada. Desconectar también es parte del plan.</span>
    <div class="col" style="gap:10px">${bullet('Tu racha se congela', 'No la pierdes por no anotar')}${bullet('Sin avisos de exceso', 'El cuenco no se pone en óxido')}${bullet('Puedes seguir anotando si quieres', 'Los días en pausa no cuentan en la media')}</div>
    <span class="label">¿Cuánto tiempo?</span>
    <div class="chips" style="grid-template-columns:repeat(2,minmax(0,1fr))">${[['1', '1 semana'], ['2', '2 semanas'], ['fechas', 'Elegir fechas'], ['abierta', 'Hasta que vuelva']].map(([k, l]) => `<button class="chip" data-m="${k}" aria-checked="${k === mode}" style="height:40px;font-size:13px">${l}</button>`).join('')}</div>
    <div class="row" id="dates" style="gap:8px"><input type="date" id="from" class="input glass flat" value="${from}" min="${today}" style="height:46px"><input type="date" id="to" class="input glass flat" value="${to}" min="${today}" style="height:46px"></div>
    <button class="btn" id="ok">${icon('pause', 16, 2.2)}Pausar el plan</button>`, {
    onMount: ({ el, close }) => {
      $$('[data-m]', el).forEach((b) => b.addEventListener('click', () => {
        mode = b.dataset.m;
        $$('[data-m]', el).forEach((x) => x.setAttribute('aria-checked', x === b));
        $('#dates', el).hidden = mode !== 'fechas';
      }));
      $('#from', el).addEventListener('change', (e) => { from = e.target.value; });
      $('#to', el).addEventListener('change', (e) => { to = e.target.value; });
      $('#ok', el).addEventListener('click', async () => {
        const pause = mode === 'fechas' ? { from, to } : mode === 'abierta' ? { from: today, to: null } : { from: today, to: addDays(today, 7 * +mode - 1) };
        if (pause.to && pause.to < pause.from) return toast('La fecha final va después de la inicial');
        await saveSettings({ pause });
        close(); toast('Plan en pausa'); done();
      });
    },
  });
}

// ---------- Fondo ----------
export async function fondo(app) {
  app.className = 'full';
  const s = await getSettings();
  const grad = (pal) => `<svg width="100%" height="100%" viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true"><defs><filter id="f${pal}"><feGaussianBlur stdDeviation="14"/></filter></defs><rect width="100" height="150" fill="${PALETTES[pal].vars.fondo}"/><g filter="url(#f${pal})"><circle cx="20" cy="30" r="40" fill="${PALETTES[pal].blobs[0]}"/><circle cx="85" cy="80" r="38" fill="${PALETTES[pal].blobs[1]}"/><circle cx="30" cy="135" r="36" fill="${PALETTES[pal].blobs[4]}"/></g></svg>`;
  const tile = (inner, label, sel, attr) => `<button ${attr} aria-pressed="${sel}" style="border:0;padding:0;background:transparent;color:#fff;display:flex;flex-direction:column;gap:6px"><span style="position:relative;height:150px;border-radius:16px;overflow:hidden;display:block;${sel ? 'outline:2px solid var(--crema);outline-offset:2px' : ''}">${inner}${sel ? `<span style="position:absolute;top:6px;right:6px;width:22px;height:22px;border-radius:999px;background:var(--crema);color:var(--fondo);display:flex;align-items:center;justify-content:center">${icon('check', 13, 2.6)}</span>` : ''}</span><span style="font-size:12px;text-align:center">${label}</span></button>`;
  const slider = (id, label, val, txt) => `<div class="col" style="gap:8px;padding:10px 0"><div class="between" style="font-size:13px"><label for="${id}">${label}</label><span class="num muted" id="${id}v">${txt}</span></div><input type="range" id="${id}" min="0" max="100" value="${val}" style="width:100%;accent-color:#F2EADB"></div>`;
  const blurTxt = (v) => (v < 34 ? 'Poco' : v < 67 ? 'Medio' : 'Mucho');
  app.innerHTML = html`<div class="screen">
    <div class="row" style="gap:12px">${circleLink('back', 'Volver', '#/perfil')}<h1 style="font-size:20px;font-weight:600">Fondo</h1></div>
    <p class="muted" style="font-size:13px;line-height:1.4;padding:0 4px">Las paletas cambian los colores de toda la app. Tu foto solo cambia la imagen y se queda en el móvil.</p>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">
      ${Object.keys(PALETTES).map((k) => tile(grad(k), PALETTES[k].name, !s.bgPhoto && s.palette === k, `data-pal="${k}"`)).join('')}
      ${s.bgPhoto ? tile(`<img src="${blobUrl(s.bgPhoto)}" alt="" style="width:100%;height:100%;object-fit:cover">`, 'Mi foto', true, 'id="mine"') : ''}
      ${tile(`<span class="empty-ph col" style="height:100%;border:1.5px dashed rgba(242,234,219,0.5);border-radius:16px;gap:6px;color:var(--crema)">${icon('plus', 18, 2.2)}<span class="small">Galería</span></span>`, s.bgPhoto ? 'Cambiar' : 'Añadir', false, 'id="add"')}
    </div>
    ${s.bgPhoto ? html`<div class="col" style="gap:6px"><h2 class="muted" style="font-size:13px;font-weight:600;padding-left:4px">Ajustes de tu foto</h2>
      <section class="glass card" style="gap:0;padding:4px 16px">${slider('blur', 'Desenfoque', s.bgBlur, blurTxt(s.bgBlur))}<div style="height:1px;background:var(--linea)"></div>${slider('dim', 'Oscurecer', s.bgDim, s.bgDim + ' %')}</section></div>
      <p class="small row" style="gap:6px;padding:0 4px" id="read"></p>` : ''}
  </div>`;
  const refresh = async (patch) => { const n = await saveSettings(patch); applyTheme(n); fondo(app); };
  $$('[data-pal]', app).forEach((b) => b.addEventListener('click', () => refresh({ palette: b.dataset.pal, bgPhoto: null })));
  $('#add', app).addEventListener('click', async () => {
    const f = await pickImage();
    if (f) refresh({ bgPhoto: await resizeImage(f, { ratio: null, max: 1600, quality: 0.8 }) });
  });
  const readable = (dim, blur) => {
    const ok = dim >= 25 || blur >= 60;
    $('#read', app).innerHTML = ok ? `<span style="color:var(--salvia);display:flex">${icon('check', 13, 2.6)}</span><span class="muted">Se lee bien: el texto blanco tiene contraste</span>` : `<span style="color:var(--oxido-claro)">Sube el oscurecer o el desenfoque para que el texto se lea bien</span>`;
  };
  if (s.bgPhoto) {
    const live = () => {
      const blur = +$('#blur', app).value, dim = +$('#dim', app).value;
      $('#blurv', app).textContent = blurTxt(blur);
      $('#dimv', app).textContent = dim + ' %';
      applyTheme({ ...s, bgBlur: blur, bgDim: dim });
      readable(dim, blur);
      return { bgBlur: blur, bgDim: dim };
    };
    ['blur', 'dim'].forEach((id) => {
      $('#' + id, app).addEventListener('input', live);
      $('#' + id, app).addEventListener('change', async () => saveSettings(live()));
    });
    readable(s.bgDim, s.bgBlur);
  }
}

// ---------- Copia de seguridad ----------
const toB64 = (blob) => new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
const fromB64 = async (s) => (await fetch(s)).blob();
async function walk(v, fn) {
  if (v instanceof Blob) return fn(v);
  if (Array.isArray(v)) return Promise.all(v.map((x) => walk(x, fn)));
  if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = await walk(x, fn); return o; }
  return v;
}
async function unwalk(v) {
  if (typeof v === 'string' && v.startsWith('data:image/')) return fromB64(v);
  if (Array.isArray(v)) return Promise.all(v.map(unwalk));
  if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = await unwalk(x); return o; }
  return v;
}

export async function copia(app) {
  app.className = 'full';
  const s = await getSettings();
  const [w, ph, rec] = await Promise.all([weightsAll(), db.all('photos'), recipesAll()]);
  const daysAgo = s.lastBackup ? Math.floor((Date.now() - s.lastBackup) / 86400000) : null;
  app.innerHTML = html`<div class="screen">
    <div class="row" style="gap:12px">${circleLink('back', 'Volver', '#/perfil')}<h1 style="font-size:20px;font-weight:600">Copia de seguridad</h1></div>
    <div class="row" style="gap:10px;align-items:flex-start;border-radius:16px;background:rgba(242,234,219,0.1);padding:12px"><span style="color:var(--crema);display:flex;padding-top:1px">${icon('info', 16, 2)}</span><span style="font-size:12px;line-height:1.45">Baku guarda todo en este móvil, sin cuentas ni nube. Si cambias de móvil o borras los datos de Chrome, solo lo recuperas con una copia.</span></div>
    <section class="glass card">
      <span class="col"><span style="font-size:14px;font-weight:600">${daysAgo === null ? 'Aún no has hecho ninguna copia' : `Última copia: ${daysAgo === 0 ? 'hoy' : `hace ${daysAgo} días`}`}</span></span>
      <div class="num" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;text-align:center">
        ${[[w.length, 'pesos'], [ph.length, 'fotos'], [rec.length, 'recetas']].map(([n, l]) => `<span style="border-radius:14px;background:rgba(255,255,255,0.06);padding:8px 0;display:flex;flex-direction:column"><span style="font-size:16px;font-weight:600">${n}</span><span class="muted small">${l}</span></span>`).join('')}</div>
      <button class="btn" id="make">${icon('download', 17, 2)}Crear copia ahora</button>
      <span class="muted small" style="text-align:center">Se crea un archivo. Guárdalo en tu móvil o en Drive.</span>
    </section>
    <section class="glass card" style="gap:0;padding:4px 14px">
      <button class="list-row" id="restore" style="background:none;border-left:0;border-right:0;border-bottom:0;border-top:0;color:#fff;text-align:left;gap:10px"><span style="width:30px;height:30px;border-radius:999px;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;color:var(--crema)">${icon('upload', 15)}</span><span class="grow" style="font-size:14px">Restaurar desde un archivo</span>${icon('chev', 14, 2)}</button>
      <div class="list-row"><span class="col grow"><span style="font-size:14px">Recordármelo cada mes</span><span class="muted small">Aviso al abrir Baku si la copia es antigua</span></span>
        <button role="switch" id="rem" aria-checked="${s.backupReminder}" aria-label="Recordármelo cada mes" style="width:44px;height:26px;border-radius:999px;border:0;position:relative;background:${s.backupReminder ? 'var(--crema)' : 'rgba(255,255,255,0.14)'}"><span style="position:absolute;top:3px;${s.backupReminder ? 'right' : 'left'}:3px;width:20px;height:20px;border-radius:999px;background:${s.backupReminder ? 'var(--fondo)' : 'var(--crema)'}"></span></button></div>
    </section>
    <div class="spacer"></div>
    <button class="btn" id="wipe" style="background:transparent;border:1px solid rgba(242,165,126,0.45);color:var(--oxido-claro)">${icon('trash', 16)}Borrar todos los datos</button>
  </div>`;
  $('#make', app).addEventListener('click', async () => {
    const data = { app: 'baku', version: 1, date: new Date().toISOString(), stores: {} };
    for (const st of ['weights', 'foods', 'recipes', 'days', 'photos']) data.stores[st] = await walk(await db.all(st), toB64);
    data.kv = { profile: await getProfile(), settings: await walk({ ...(await getSettings()), lastBackup: Date.now() }, toB64) };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const file = new File([blob], `baku-copia-${todayISO()}.json`, { type: 'application/json' });
    await saveSettings({ lastBackup: Date.now() });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Copia de Baku' }); copia(app); return; } catch (_) { /* cancelado: se descarga */ }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
    toast('Copia descargada'); copia(app);
  });
  $('#restore', app).addEventListener('click', () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json,.json';
    input.onchange = async () => {
      try {
        const data = JSON.parse(await input.files[0].text());
        if (data.app !== 'baku') throw new Error();
        if (!confirm('Se sustituirán los datos de este móvil por los de la copia. ¿Seguir?')) return;
        // Si hay cuenta, se conserva la clave de las fotos y la copia restaurada pasa a ser la de la nube
        const keep = hasSession() ? await db.get('kv', 'vaultKey') : null;
        await db.clearAll();
        if (keep) await db.putRaw('kv', keep, 'vaultKey');
        for (const [st, rows] of Object.entries(data.stores)) for (const r of await unwalk(rows)) await db.put(st, r);
        await db.put('kv', data.kv.profile, 'profile');
        const settings = await unwalk(data.kv.settings);
        await db.put('kv', settings, 'settings');
        applyTheme(settings);
        toast('Copia restaurada'); location.hash = '#/hoy';
        if (keep) useLocalData().catch(() => toast('No se pudo subir a la nube: se intentará luego'));
      } catch (_) { toast('Ese archivo no es una copia de Baku'); }
    };
    input.click();
  });
  $('#rem', app).addEventListener('click', async () => { await saveSettings({ backupReminder: !s.backupReminder }); copia(app); });
  $('#wipe', app).addEventListener('click', async () => {
    const cloud = hasSession();
    if (!confirm(cloud ? '¿Borrar todos los datos de Baku de este móvil? Se cerrará tu sesión. Tu copia en la nube no se toca: puedes volver a entrar y recuperarla.' : '¿Borrar todos tus datos de Baku? No se puede deshacer.')) return;
    if (cloud) await signOut();
    await db.clearAll(); applyTheme({}); location.hash = '#/bienvenida'; toast('Datos borrados');
  });
}

// ---------- Objetivo alcanzado ----------
export async function meta(app, profile) {
  app.className = 'full';
  const w = await weightsAll();
  const ph = await photosByWeek();
  const weeks = Object.keys(ph).map(Number).sort((a, b) => a - b);
  const first = weeks.length ? ph[weeks[0]].frontal || Object.values(ph[weeks[0]])[0] : null;
  const lastW = weeks.length > 1 ? ph[weeks[weeks.length - 1]].frontal || Object.values(ph[weeks[weeks.length - 1]])[0] : null;
  const last = w[w.length - 1];
  const diff = Math.abs(profile.startWeight - last.kg);
  const nWeeks = Math.max(1, Math.round((parse(last.date) - parse(profile.startDate)) / (7 * 86400000)));
  const days = (await db.all('days')).filter((d) => Object.values(d.done || {}).some(Boolean)).length;
  const maint = computePlan({ ...profile, weight: last.kg, goal: 'mantener', target: last.kg });
  const pic = (p, label) => `<figure style="margin:0;flex:1;display:flex;flex-direction:column;gap:6px"><div class="photo" style="aspect-ratio:3/4">${p ? `<img src="${blobUrl(p.blob)}" alt="${label}">` : `<span class="empty-ph">${icon('camera', 22)}</span>`}</div><figcaption class="muted small" style="text-align:center">${label}</figcaption></figure>`;
  app.innerHTML = html`<div class="screen">
    <div class="row" style="justify-content:flex-end">${circleLink('close', 'Cerrar', '#/hoy')}</div>
    <div class="col" style="align-items:center;text-align:center;gap:8px">
      <span style="width:72px;height:72px;border-radius:999px;background:var(--crema);color:var(--fondo);display:flex;align-items:center;justify-content:center;box-shadow:0 0 40px rgba(242,234,219,0.35)">${icon('check', 34, 2.4)}</span>
      <h1 style="font-size:30px;font-weight:600;letter-spacing:-0.02em;margin-top:4px">Lo has conseguido</h1>
      <span class="muted num priv" style="font-size:14px">${fmt(last.kg, 1)} kg · ${fmt(diff, diff % 1 ? 1 : 0)} kg ${profile.goal === 'ganar' ? 'más' : 'menos'} en ${nWeeks} semanas</span></div>
    ${first ? `<div class="row" style="gap:10px">${pic(first, `Semana ${weeks[0]}`)}${pic(lastW, lastW ? `Semana ${weeks[weeks.length - 1]}` : 'Hazte la foto de hoy')}</div>` : ''}
    <div class="num" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;text-align:center">
      ${[[days, 'días anotando'], [w.length, 'pesos'], [fmt(bmi(last.kg, profile.height), 1), 'IMC ahora']].map(([n, l]) => `<span class="glass stat" style="align-items:center"><span class="${l === 'IMC ahora' ? 'priv' : ''}" style="font-size:16px;font-weight:600">${n}</span><span class="muted small">${l}</span></span>`).join('')}</div>
    <div class="spacer"></div>
    <p class="muted" style="font-size:12px;text-align:center;line-height:1.4;padding:0 12px">¿Y ahora? Lo difícil es mantenerlo. En mantenimiento comes lo justo para que el peso no rebote.</p>
    <button class="btn" id="maint" style="flex-direction:column;gap:0;height:58px"><span>Pasar a mantenimiento</span><span class="num" style="font-size:11px;font-weight:500;opacity:.75">${fmt(maint.kcal)} kcal al día</span></button>
    <button class="btn ghost" id="new">Nuevo objetivo</button>
  </div>`;
  $('#maint', app).addEventListener('click', async () => {
    Object.assign(profile, { goal: 'mantener', target: last.kg, weight: last.kg });
    profile.plan = { ...computePlan(profile), weeksTotal: totalWeeks(profile) };
    await saveProfile(profile);
    location.hash = '#/hoy';
    setTimeout(() => toast(`Mantenimiento: ${fmt(profile.plan.kcal)} kcal al día`), 250);
  });
  $('#new', app).addEventListener('click', () => {
    sessionStorage.setItem('baku-borrador', JSON.stringify({ name: profile.name, sex: profile.sex, age: profile.age, height: profile.height, weight: last.kg, work: profile.work, days: profile.days, goal: 'perder', target: +(last.kg - 3).toFixed(1), rate: profile.rate || 0.5, tdeeAdjust: profile.tdeeAdjust || 0 }));
    location.hash = '#/test/4';
  });
}

// Opinión o fallo: abre un correo ya preparado con lo que ayuda a entender el problema
function feedback() {
  const ua = navigator.userAgent;
  const device = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? `Android ${(ua.match(/Android ([\d.]+)/) || [])[1] || ''}`.trim() : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Otro';
  const browser = /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /CriOS|Chrome/.test(ua) ? 'Chrome' : /FxiOS|Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'Otro';
  const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone ? 'instalada' : 'en el navegador';
  const body = `Cuéntame qué te gusta, qué echas en falta o qué ha fallado (y qué estabas haciendo):\n\n\n\n---\nNo borres esto, ayuda a encontrar el fallo:\nBaku ${APP_VERSION} · ${device} · ${browser} · ${installed} · pantalla ${screen.width}×${screen.height}`;
  location.href = `mailto:baku.app.dieta@gmail.com?subject=${encodeURIComponent(`Opinión sobre Baku ${APP_VERSION}`)}&body=${encodeURIComponent(body)}`;
}
