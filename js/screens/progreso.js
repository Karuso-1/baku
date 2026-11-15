// Progreso: gráfica de peso, anotar peso, fotos semanales y comparar.
import { html, icon, ruler, sheet, $, $$, toast, pickImage, resizeImage, blobUrl, circleLink } from '../ui.js';
import { fmt, fmtDate, todayISO, bmi, computePlan } from '../plan.js';
import { getProfile, saveProfile, db } from '../db.js';
import { weightsAll, logWeight, photosByWeek, planWeek, addDays, parse, VIEWS, iso, estimateRealTDEE, getSettings, saveSettings, ADAPT } from '../store.js';
import { totalWeeks } from './hoy.js';

const weekDate = (p, n) => addDays(p.startDate, (n - 1) * 7);
const xWeek = (p, date) => (parse(date) - parse(p.startDate)) / (7 * 86400000) + 1;

// ---------- Gráfica ----------
function chart(profile, weights, period) {
  const W = 340, H = 190, L = 34, R = 10, T = 12, B = 26;
  const tw = Math.max(totalWeeks(profile), 1);
  const now = xWeek(profile, todayISO());
  const last = weights[weights.length - 1];
  const reachX = profile.goal === 'mantener' ? now : Math.max(now, 1 + tw);
  let x0 = 1;
  if (period === '1M') x0 = Math.max(1, now - 4.3);
  if (period === '3M') x0 = Math.max(1, now - 13);
  const x1 = Math.max(reachX, now + 0.5);
  const pts = weights.filter((w) => xWeek(profile, w.date) >= x0 - 0.01);
  const vals = [...pts.map((w) => w.kg), profile.target, last.kg];
  let y0 = Math.floor(Math.min(...vals) - 1), y1 = Math.ceil(Math.max(...vals) + 1);
  if (y1 - y0 < 4) { y0 -= 1; y1 += 1; }
  const sx = (x) => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R);
  const sy = (y) => T + ((y1 - y) / (y1 - y0)) * (H - T - B);
  const step = Math.max(1, Math.round((y1 - y0) / 4));
  let grid = '';
  for (let y = y0; y <= y1; y += step) {
    grid += `<line x1="${L}" x2="${W - R}" y1="${sy(y)}" y2="${sy(y)}" stroke="rgba(242,234,219,0.1)"/><text x="${L - 6}" y="${sy(y) + 3.5}" text-anchor="end" font-size="10" fill="#E3DCCD">${y}</text>`;
  }
  const goal = profile.goal !== 'mantener'
    ? `<line x1="${L}" x2="${W - R}" y1="${sy(profile.target)}" y2="${sy(profile.target)}" stroke="var(--salvia)" stroke-width="1.2" stroke-dasharray="4 4"/>` : '';
  const line = pts.map((w, i) => `${i ? 'L' : 'M'}${sx(xWeek(profile, w.date)).toFixed(1)} ${sy(w.kg).toFixed(1)}`).join(' ');
  // Tendencia: media que suaviza los altibajos del agua (solo con 4 pesos o más)
  let ema = null;
  const trendPts = weights.map((w) => { ema = ema === null ? w.kg : ema + 0.45 * (w.kg - ema); return { date: w.date, kg: ema }; }).filter((w) => xWeek(profile, w.date) >= x0 - 0.01);
  const trend = weights.length >= 4 ? `<path d="${trendPts.map((w, i) => `${i ? 'L' : 'M'}${sx(xWeek(profile, w.date)).toFixed(1)} ${sy(w.kg).toFixed(1)}`).join(' ')}" stroke="#F2EADB" stroke-opacity="0.22" stroke-width="7" fill="none" stroke-linejoin="round" stroke-linecap="round"/>` : '';
  const dots = pts.map((w, i) => {
    const isLast = i === pts.length - 1;
    const cx = sx(xWeek(profile, w.date)), cy = sy(w.kg);
    return isLast
      ? `<circle cx="${cx}" cy="${cy}" r="9" fill="#F2EADB" opacity="0.2"/><circle cx="${cx}" cy="${cy}" r="4.5" fill="#F2EADB"/>`
      : `<circle cx="${cx}" cy="${cy}" r="2.6" fill="#F2EADB"/>`;
  }).join('');
  const proj = profile.goal !== 'mantener'
    ? `<path d="M${sx(xWeek(profile, last.date))} ${sy(last.kg)} L${sx(reachX)} ${sy(profile.target)}" stroke="#F2EADB" stroke-opacity="0.55" stroke-width="1.6" stroke-dasharray="3 4" fill="none"/>` : '';
  const ticks = [Math.ceil(x0), Math.round((x0 + x1) / 2), Math.floor(x1)].filter((v, i, a) => a.indexOf(v) === i)
    .map((x) => `<text x="${sx(x)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#E3DCCD">S${x}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Gráfica de peso">${grid}${goal}${trend}${proj}<path d="${line}" stroke="#F2EADB" stroke-width="2.2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>${dots}${ticks}</svg>`;
}

export async function progreso(app, profile, params) {
  app.className = '';
  const weights = await weightsAll();
  const photos = await photosByWeek();
  const period = sessionStorage.getItem('baku-periodo') || 'Todo';
  const last = weights[weights.length - 1];
  const start = profile.startWeight;
  const tw = totalWeeks(profile);
  const week = planWeek(profile);
  const lost = start - last.kg;
  const left = Math.abs(last.kg - profile.target);
  const elapsedW = (parse(last.date) - parse(profile.startDate)) / (7 * 86400000);
  const realRate = elapsedW >= 1 ? lost / elapsedW : null;
  let eta = null, ahead = false;
  if (profile.goal !== 'mantener') {
    const rate = realRate && Math.sign(realRate) === (profile.goal === 'perder' ? 1 : -1) ? Math.abs(realRate) : profile.rate;
    eta = addDays(last.date, Math.ceil((left / rate) * 7));
    const planEnd = addDays(profile.startDate, tw * 7);
    ahead = realRate !== null && eta < planEnd;
  }
  const weeksList = Array.from({ length: week }, (_, i) => week - i);
  const est = await estimateRealTDEE(profile);
  const settings = await getSettings();
  const adapt = adaptCard(profile, est, settings);

  app.innerHTML = html`<div class="screen">
    <div class="col" style="gap:4px;padding:0 4px">
      <span class="muted num" style="font-size:12px">Semana ${week}${tw ? ' de ' + tw : ''}</span>
      <div class="between"><div class="row" style="gap:10px"><span class="title-ic glass flat">${icon('progreso', 18, 2)}</span><h1 class="h1">Progreso</h1></div>
      <div class="seg glass flat" role="radiogroup" aria-label="Periodo" style="height:36px;padding:3px;width:150px">${['1M', '3M', 'Todo'].map((p) => `<button role="radio" data-period="${p}" aria-checked="${p === period}" style="font-size:12px">${p}</button>`).join('')}</div></div>
    </div>

    <section class="glass card">
      <div class="between" style="align-items:flex-start">
        <span class="col"><span class="muted small">Peso actual</span><span class="num" style="font-size:34px;font-weight:300;letter-spacing:-0.03em;line-height:1.1">${fmt(last.kg, 1)} <span class="unit" style="font-size:13px">kg</span></span></span>
        <button class="btn small" id="anotar" style="width:auto;padding:0 16px;height:40px;font-size:13px">Anotar peso</button></div>
      <div class="row num" style="gap:6px;flex-wrap:wrap">
        ${Math.abs(lost) >= 0.05 ? `<span class="pill" style="background:rgba(156,199,175,0.18);color:var(--salvia)">${lost > 0 ? '−' : '+'}${fmt(Math.abs(lost), 1)} kg desde el inicio</span>` : '<span class="pill">Punto de partida</span>'}
        ${profile.goal === 'mantener' ? '' : `<span class="pill">${left < 0.05 ? 'Meta alcanzada' : `Faltan ${fmt(left, 1)} kg`}</span>`}</div>
      ${chart(profile, weights, period)}
      <div class="row muted small" style="gap:14px;flex-wrap:wrap">
        <span class="row" style="gap:5px"><span style="width:14px;height:2px;background:#F2EADB;border-radius:2px"></span>Tu peso (kg)</span>
        ${weights.length >= 4 ? '<span class="row" style="gap:5px"><span style="width:14px;height:6px;background:rgba(242,234,219,0.25);border-radius:4px"></span>Tendencia</span>' : ''}
        ${profile.goal === 'mantener' ? '' : `<span class="row" style="gap:5px"><span style="width:14px;border-top:2px dashed rgba(242,234,219,0.6)"></span>Proyección</span><span class="row num" style="gap:5px"><span style="width:14px;border-top:2px dashed var(--salvia)"></span>Meta ${fmt(profile.target, profile.target % 1 ? 1 : 0)} kg</span>`}
      </div>
    </section>

    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
      <div class="glass stat"><span class="muted small">IMC</span><span class="num" style="font-size:18px;font-weight:600">${fmt(bmi(last.kg, profile.height), 1)}</span></div>
      <div class="glass stat"><span class="muted small">Ritmo real</span><span class="num" style="font-size:18px;font-weight:600">${realRate === null ? '—' : fmt(Math.abs(realRate), 2).replace(/0$/, '')} ${realRate === null ? '' : '<span class="unit">kg/sem</span>'}</span></div>
      <div class="glass stat"><span class="muted small">${ahead ? 'Adelantado' : 'Llegada'}</span><span class="num" style="font-size:18px;font-weight:600">${eta ? fmtDate(eta) : '—'}</span></div>
    </div>

    ${adapt.html}

    <section class="glass card" id="fotos">
      <div class="between"><h2 class="h2">Fotos semanales</h2>${Object.keys(photos).length >= 2 ? `<a class="link" href="#/progreso/comparar" style="font-size:13px">Comparar</a>` : '<span class="muted small">Compara a partir de 2 semanas</span>'}</div>
      <div class="hscroll" style="margin:0 -14px;padding:0 14px">
        ${weeksList.map((n) => {
          const ph = photos[n] || {};
          const count = Object.keys(ph).length;
          const thumb = ph.frontal || Object.values(ph)[0];
          return `<button data-week="${n}" style="flex:none;width:86px;border:0;padding:0;background:transparent;color:#fff;display:flex;flex-direction:column;gap:5px">
            <span class="photo" style="width:86px;aspect-ratio:3/4;${thumb ? '' : 'border:1.5px dashed rgba(242,234,219,0.45);background:rgba(255,255,255,0.04)'}">
            ${thumb ? `<img src="${blobUrl(thumb.blob)}" alt="Foto de la semana ${n}">${count < 3 ? '' : `<span class="num" style="position:absolute;right:5px;top:5px;font-size:10px;font-weight:600;background:rgba(20,40,32,0.6);border-radius:99px;padding:2px 6px">3</span>`}` : `<span class="empty-ph col" style="gap:4px">${icon('camera', 18)}<span class="num small">${count} de 3</span></span>`}</span>
            <span class="small num" style="text-align:center;color:${n === week ? '#fff' : 'var(--apagado)'}">${n === week ? 'Esta semana' : 'Semana ' + n}</span></button>`;
        }).join('')}
      </div>
    </section>
  </div>`;

  $$('[data-period]', app).forEach((b) => b.addEventListener('click', () => { sessionStorage.setItem('baku-periodo', b.dataset.period); progreso(app, profile, params); }));
  $('#anotar', app).addEventListener('click', () => anotarPeso(() => window.__route()));
  adapt.bind(app, () => window.__route());
  $$('[data-week]', app).forEach((b) => b.addEventListener('click', () => fotosSemana(+b.dataset.week, () => window.__route())));
  if (params.get('fotos')) $('#fotos', app).scrollIntoView({ block: 'center' });
}

// ---------- Hoja: anotar peso ----------
export async function anotarPeso(onSaved) {
  const weights = await weightsAll();
  const last = weights[weights.length - 1];
  let date = todayISO();
  let kg = last.kg;
  const showTip = weights.length < 4;
  sheet('Anotar peso', html`
    <div class="seg glass flat" role="radiogroup" aria-label="Fecha" style="height:40px">
      <button role="radio" data-d="0" aria-checked="true" style="font-size:13px">Hoy</button>
      <button role="radio" data-d="1" aria-checked="false" style="font-size:13px">Ayer</button>
      <button role="radio" data-d="x" aria-checked="false" style="font-size:13px">Otro día</button></div>
    <input type="date" id="otro" class="input glass flat" hidden max="${todayISO()}" value="${todayISO()}" style="height:44px">
    <div class="ruler-value"><span class="big num" id="kg">${fmt(kg, 1)}</span> <span class="unit" style="font-size:15px">kg</span>
      <div class="muted small num" id="diff" style="margin-top:4px">Último: ${fmt(last.kg, 1)} kg · ${fmtDate(last.date)}</div></div>
    <div id="r"></div>
    ${showTip ? html`<div class="row" style="gap:10px;align-items:flex-start;border-radius:16px;background:rgba(242,234,219,0.08);padding:10px 12px"><span style="color:var(--crema);display:flex;padding-top:1px">${icon('info', 16, 2)}</span><span style="font-size:12px;line-height:1.45">Pésate por la mañana, en ayunas, después de ir al baño y siempre el mismo día de la semana.</span></div>` : ''}
    <button class="btn" id="save">Guardar peso</button>`, {
    onMount: ({ el, close }) => {
      const upd = () => {
        const d = kg - last.kg;
        $('#kg', el).textContent = fmt(kg, 1);
        $('#diff', el).textContent = Math.abs(d) < 0.05 ? `Igual que la última vez (${fmtDate(last.date)})` : `${d < 0 ? '−' : '+'}${fmt(Math.abs(d), 1)} kg desde el ${fmtDate(last.date)}`;
      };
      $('#r', el).appendChild(ruler({ min: 35, max: 200, step: 0.1, value: kg, decimals: 1, labelEvery: 10, onChange: (v) => { kg = v; upd(); } }).el);
      $$('[data-d]', el).forEach((b) => b.addEventListener('click', () => {
        $$('[data-d]', el).forEach((x) => x.setAttribute('aria-checked', x === b));
        const v = b.dataset.d;
        $('#otro', el).hidden = v !== 'x';
        date = v === 'x' ? $('#otro', el).value : addDays(todayISO(), -+v);
      }));
      $('#otro', el).addEventListener('change', (e) => { date = e.target.value; });
      $('#save', el).addEventListener('click', async () => {
        const before = (await getProfile()).plan.kcal;
        const res = await logWeight(date, kg);
        close();
        if (res.reached) { location.hash = '#/meta'; return; }
        onSaved && onSaved();
        setTimeout(() => toast(res.changed ? `Objetivo actualizado: ${fmt(res.profile.plan.kcal)} kcal` : 'Peso guardado'), 250);
        void before;
      });
    },
  });
}

// ---------- Hoja: fotos de una semana ----------
export async function fotosSemana(week, onChange) {
  const profile = await getProfile();
  const render = async (api) => {
    const ph = (await photosByWeek())[week] || {};
    api.el.innerHTML = html`<p class="muted" style="font-size:13px;line-height:1.4;margin-top:-6px">${fmtDate(weekDate(profile, week), { day: 'numeric', month: 'long' })}. Misma luz, misma ropa y misma distancia cada semana.</p>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
      ${VIEWS.map(([k, l]) => `<div class="col" style="gap:6px"><button data-view="${k}" class="photo" style="aspect-ratio:3/4;border:${ph[k] ? '0' : '1.5px dashed rgba(242,234,219,0.45)'};padding:0;color:#fff">
        ${ph[k] ? `<img src="${blobUrl(ph[k].blob)}" alt="${l}">` : `<span class="empty-ph col" style="gap:4px">${icon('camera', 20)}<span class="small">Hacer</span></span>`}</button>
        <span class="between small"><span>${l}</span>${ph[k] ? `<button data-del="${k}" class="link" style="font-size:11px;color:var(--apagado)">Borrar</button>` : ''}</span></div>`).join('')}
      </div>
      <button class="btn ghost small" id="galeria">${icon('image', 16)}Elegir de la galería</button>`;
    let next = VIEWS.find(([k]) => !ph[k])?.[0] || 'frontal';
    const take = async (view, capture) => {
      const file = await pickImage({ capture });
      if (!file) return;
      const blob = await resizeImage(file);
      await db.put('photos', { id: `${week}-${view}`, week, view, date: todayISO(), blob });
      await render(api);
      onChange && onChange();
    };
    $$('[data-view]', api.el).forEach((b) => b.addEventListener('click', () => take(b.dataset.view, true)));
    $('#galeria', api.el).addEventListener('click', () => take(next, false));
    $$('[data-del]', api.el).forEach((b) => b.addEventListener('click', async () => {
      await db.del('photos', `${week}-${b.dataset.del}`);
      await render(api);
      onChange && onChange();
    }));
  };
  sheet(week === planWeek(profile) ? 'Fotos de esta semana' : `Fotos · semana ${week}`, '', { onMount: (api) => render(api) });
}

// ---------- Comparar fotos ----------
export async function comparar(app, profile) {
  app.className = 'full';
  const photos = await photosByWeek();
  const weights = await weightsAll();
  const weeks = Object.keys(photos).map(Number).sort((a, b) => a - b);
  if (weeks.length < 2) { location.hash = '#/progreso'; return; }
  const st = JSON.parse(sessionStorage.getItem('baku-comparar') || 'null') || { a: weeks[0], b: weeks[weeks.length - 1], view: 'frontal', mode: 'lado' };
  if (!weeks.includes(st.a)) st.a = weeks[0];
  if (!weeks.includes(st.b)) st.b = weeks[weeks.length - 1];
  const save = () => sessionStorage.setItem('baku-comparar', JSON.stringify(st));
  const kgAt = (n) => {
    const d = addDays(weekDate(profile, n), 6);
    const before = weights.filter((w) => w.date <= d);
    return (before[before.length - 1] || weights[0]).kg;
  };
  const pick = (n) => photos[n][st.view] || photos[n].frontal || Object.values(photos[n])[0];
  const pa = pick(st.a), pb = pick(st.b);
  const diff = kgAt(st.b) - kgAt(st.a);
  const cap = (n) => `Semana ${n} · ${fmtDate(weekDate(profile, n), { weekday: 'short', day: 'numeric', month: 'short' })}`;
  const tag = (n) => `<span class="num" style="position:absolute;left:8px;top:8px;height:22px;padding:0 8px;border-radius:999px;background:rgba(20,40,32,0.55);font-size:11px;display:inline-flex;align-items:center">S${n} · ${fmt(kgAt(n), 1)} kg</span>`;

  const side = html`<div style="display:flex;gap:10px">
    ${[[st.a, pa], [st.b, pb]].map(([n, p]) => `<figure style="margin:0;flex:1;display:flex;flex-direction:column;gap:6px"><button class="photo zoom" data-src="${blobUrl(p.blob)}" style="aspect-ratio:3/4;border:0;padding:0"><img src="${blobUrl(p.blob)}" alt="${cap(n)}">${tag(n)}</button><figcaption class="muted small num" style="text-align:center">${cap(n)}</figcaption></figure>`).join('')}</div>`;
  const slide = html`<div class="photo" id="slider" style="aspect-ratio:3/4;touch-action:none;user-select:none">
    <img src="${blobUrl(pb.blob)}" alt="${cap(st.b)}">
    <div id="clip" style="position:absolute;inset:0;clip-path:inset(0 50% 0 0)"><img src="${blobUrl(pa.blob)}" alt="${cap(st.a)}"></div>
    <span style="position:absolute;left:8px;top:8px" class="pill num">S${st.a}</span><span style="position:absolute;right:8px;top:8px" class="pill num">S${st.b}</span>
    <div id="bar" style="position:absolute;top:0;bottom:0;left:50%;width:3px;margin-left:-1.5px;background:#F2EADB"><span style="position:absolute;top:50%;left:50%;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:999px;background:#F2EADB;color:#1B3A2F;display:flex;align-items:center;justify-content:center">${icon('swap', 16, 2.2)}</span></div></div>`;

  app.innerHTML = html`<div class="screen">
    <div class="between">${circleLink('back', 'Volver', '#/progreso')}<h1 style="font-size:20px;font-weight:600">Comparar fotos</h1>
      <div class="seg glass flat" role="radiogroup" aria-label="Modo" style="height:40px;padding:3px;width:92px">
        <button role="radio" data-mode="lado" aria-checked="${st.mode === 'lado'}" aria-label="Lado a lado">${icon('split', 16)}</button>
        <button role="radio" data-mode="deslizar" aria-checked="${st.mode === 'deslizar'}" aria-label="Deslizar">${icon('slider', 16)}</button></div></div>
    <div class="row" style="gap:8px">
      <button class="glass flat grow" data-sel="a" style="height:48px;border-radius:16px;color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 12px;text-align:left"><span class="muted small">Antes</span><span class="num" style="font-weight:600">Semana ${st.a}</span></button>
      <button class="icon-btn glass flat" id="swapw" aria-label="Intercambiar">${icon('swap', 16, 2)}</button>
      <button class="glass flat grow" data-sel="b" style="height:48px;border-radius:16px;color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 12px;text-align:left"><span class="muted small">Después</span><span class="num" style="font-weight:600">Semana ${st.b}</span></button></div>
    ${st.mode === 'lado' ? side : slide}
    <div class="seg glass flat" role="radiogroup" aria-label="Vista">${VIEWS.map(([k, l]) => `<button role="radio" data-view="${k}" aria-checked="${st.view === k}">${l}</button>`).join('')}</div>
    <div class="row" style="justify-content:center"><span class="pill num" style="height:32px;font-size:14px;font-weight:600;background:rgba(156,199,175,0.18);color:var(--salvia)">${Math.abs(diff) < 0.05 ? 'Mismo peso' : `${diff < 0 ? '−' : '+'}${fmt(Math.abs(diff), 1)} kg entre estas semanas`}</span></div>
    <div class="spacer"></div>
    <button class="btn" id="guardar">${icon('download', 18, 2)}Guardar imagen en la galería</button>
  </div>`;

  const rerender = () => { save(); comparar(app, profile); };
  $$('[data-mode]', app).forEach((b) => b.addEventListener('click', () => { st.mode = b.dataset.mode; rerender(); }));
  $$('[data-view]', app).forEach((b) => b.addEventListener('click', () => { st.view = b.dataset.view; rerender(); }));
  $('#swapw', app).addEventListener('click', () => { [st.a, st.b] = [st.b, st.a]; rerender(); });
  $$('[data-sel]', app).forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.sel;
    sheet(k === 'a' ? 'Antes' : 'Después', `<div class="col">${weeks.map((n) => `<button data-w="${n}" class="list-row" style="background:none;border-left:0;border-right:0;border-bottom:0;color:#fff;font-size:15px;justify-content:space-between"><span>Semana ${n}</span><span class="muted small num">${fmt(kgAt(n), 1)} kg</span></button>`).join('')}</div>`, {
      onMount: ({ el, close }) => $$('[data-w]', el).forEach((x) => x.addEventListener('click', () => { st[k] = +x.dataset.w; close(); setTimeout(rerender, 220); })),
    });
  }));
  // Divisor arrastrable
  const sl = $('#slider', app);
  if (sl) {
    const move = (e) => {
      const r = sl.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 100;
      $('#clip', sl).style.clipPath = `inset(0 ${100 - p}% 0 0)`;
      $('#bar', sl).style.left = p + '%';
    };
    sl.addEventListener('pointerdown', (e) => { sl.setPointerCapture(e.pointerId); move(e); sl.onpointermove = move; });
    sl.addEventListener('pointerup', () => { sl.onpointermove = null; });
  }
  $$('.zoom', app).forEach((b) => b.addEventListener('click', () => fullscreen(b.dataset.src)));
  $('#guardar', app).addEventListener('click', () => saveComposite(pa.blob, pb.blob, cap(st.a), cap(st.b), diff));
}

// Pantalla completa con zoom de pellizco
function fullscreen(src) {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:30;background:rgba(5,12,10,0.94);display:flex;align-items:center;justify-content:center;touch-action:none';
  ov.innerHTML = `<img src="${src}" alt="" style="max-width:100%;max-height:100%;transform-origin:center;transition:transform .05s"><button aria-label="Cerrar" class="icon-btn glass flat" style="position:absolute;top:calc(16px + env(safe-area-inset-top));right:16px">${icon('close', 16, 2.2)}</button>`;
  document.body.appendChild(ov);
  const img = ov.querySelector('img');
  const pts = new Map();
  let scale = 1, tx = 0, ty = 0, startDist = 0, startScale = 1, last = null;
  const apply = () => { img.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`; };
  ov.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, e); last = e; if (pts.size === 2) { const [a, b] = [...pts.values()]; startDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); startScale = scale; } });
  ov.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, e);
    if (pts.size === 2) { const [a, b] = [...pts.values()]; scale = Math.max(1, Math.min(5, startScale * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / startDist)); }
    else if (scale > 1 && last) { tx += e.clientX - last.clientX; ty += e.clientY - last.clientY; }
    last = e; apply();
  });
  const up = (e) => { pts.delete(e.pointerId); if (scale === 1) { tx = 0; ty = 0; apply(); } };
  ov.addEventListener('pointerup', up);
  ov.addEventListener('pointercancel', up);
  ov.addEventListener('dblclick', () => { scale = scale > 1 ? 1 : 2.5; tx = ty = 0; apply(); });
  ov.querySelector('button').addEventListener('click', () => ov.remove());
}

// Una sola imagen con las dos fotos, las fechas y los kg
async function saveComposite(a, b, ca, cb, diff) {
  const [ia, ib] = await Promise.all([createImageBitmap(a), createImageBitmap(b)]);
  const c = document.createElement('canvas');
  const w = 540, h = 720, pad = 24;
  c.width = w * 2 + pad * 3; c.height = h + pad * 2 + 120;
  const x = c.getContext('2d');
  x.fillStyle = '#1B3A2F'; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(ia, pad, pad, w, h);
  x.drawImage(ib, pad * 2 + w, pad, w, h);
  x.fillStyle = '#E3DCCD'; x.font = '500 26px "Uncut Sans", sans-serif'; x.textAlign = 'center';
  x.fillText(ca, pad + w / 2, h + pad + 46);
  x.fillText(cb, pad * 2 + w * 1.5, h + pad + 46);
  x.fillStyle = '#F2EADB'; x.font = '600 34px "Uncut Sans", sans-serif';
  x.fillText(Math.abs(diff) < 0.05 ? 'Mismo peso' : `${diff < 0 ? '−' : '+'}${fmt(Math.abs(diff), 1)} kg · Baku`, c.width / 2, h + pad + 100);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
  const file = new File([blob], `baku-${todayISO()}.jpg`, { type: 'image/jpeg' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Baku' }); return; } catch (_) { /* cancelado */ }
  }
  const a2 = document.createElement('a');
  a2.href = URL.createObjectURL(blob); a2.download = file.name; a2.click();
  toast('Imagen descargada');
}
export { iso };

// ---------- Meta que se ajusta sola ----------
function adaptCard(profile, est, settings) {
  const none = { html: '', bind: () => {} };
  const head = (t) => `<div class="row" style="gap:10px"><span class="title-ic glass flat" style="width:32px;height:32px">${icon('sync', 15, 2)}</span><h2 class="h2">${t}</h2></div>`;
  const card = (inner) => `<section class="glass card" style="gap:8px">${inner}</section>`;
  const p = (t) => `<p class="muted" style="font-size:13px;line-height:1.45">${t}</p>`;
  if (!est.ok) {
    const weeks = ADAPT.minDays / 7;
    const txt = est.need === 'comidas'
      ? `Para ajustar tu meta con tus datos reales necesito que marques como hechas las comidas de 8 de cada 10 días. Estas semanas vas por el ${Math.round(est.logged * 100)} %.`
      : est.need === 'raro'
        ? 'Los datos de estas semanas no cuadran (quizá falta alguna comida por apuntar o hay un pesaje raro). Sigo con el cálculo de siempre.'
        : `Cuando lleves ${weeks} semanas pesándote y apuntando lo que comes, compararé las dos cosas y ajustaré tu meta a lo que gastas de verdad. ${est.weeks ? `Llevas ${est.weeks} de ${weeks}.` : ''}`;
    return { html: card(head('Tu meta se ajusta sola') + p(txt)), bind: () => {} };
  }
  const weeks = Math.round(est.span / 7);
  const changeTxt = Math.abs(est.change) < 0.05 ? 'tu peso no se ha movido' : `has ${est.change < 0 ? 'bajado' : 'subido'} ${fmt(Math.abs(est.change), 1)} kg`;
  const base = `En las últimas ${weeks} semanas has comido de media ${fmt(est.intake)} kcal al día y ${changeTxt}. Eso indica que gastas unas <b style="color:#fff">${fmt(est.real)} kcal</b> al día.`;
  if (!est.worth) return { html: card(head('Vas según lo previsto') + p(`${base} Es casi lo que calculé al principio (${fmt(est.current)}), así que tu meta sigue igual.`)), bind: () => {} };
  if (settings.adaptSeen === est.to) return none;
  const next = { ...profile, tdeeAdjust: (profile.tdeeAdjust || 0) + est.step };
  const newKcal = computePlan(next).kcal;
  if (newKcal === profile.plan.kcal) return none;
  const capped = Math.abs(est.real - est.current) > ADAPT.maxStep;
  return {
    html: card(head('Tu gasto real es otro') + p(`${base} Al principio calculé ${fmt(est.current)}.`)
      + `<div class="between glass flat" style="border-radius:16px;padding:10px 14px"><span class="muted small">Tu meta diaria</span><span class="num" style="font-size:16px;font-weight:600">${fmt(profile.plan.kcal)} → ${fmt(newKcal)} <span class="unit">kcal</span></span></div>`
      + p(newKcal > profile.plan.kcal
        ? (profile.goal === 'perder' ? 'Subir la meta no te frena: el déficit para bajar se sigue calculando, pero sobre lo que gastas de verdad.' : 'Gastas más de lo calculado, así que te toca algo más de comida.')
        : (profile.goal === 'perder' ? 'Para bajar al ritmo que elegiste, te toca comer algo menos de lo calculado al principio.' : 'Gastas menos de lo calculado, así que te toca algo menos de comida.'))
      + (capped ? p(`Lo cambio como mucho ${ADAPT.maxStep} kcal de golpe. Si hace falta más, te lo volveré a proponer con los próximos pesajes.`) : '')
      + p('Solo cuenta los días con comidas marcadas como hechas. Si se te olvidó apuntar algo, mejor no lo apliques.')
      + `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"><button class="btn small ghost" id="adNo">Ahora no</button><button class="btn small" id="adOk">Ajustar meta</button></div>`),
    bind: (app, done) => {
      $('#adNo', app)?.addEventListener('click', async () => { await saveSettings({ adaptSeen: est.to }); done(); });
      $('#adOk', app)?.addEventListener('click', async () => {
        const weeksTotal = profile.plan.weeksTotal;
        profile.tdeeAdjust = next.tdeeAdjust;
        profile.plan = { ...computePlan(profile), weeksTotal };
        await saveProfile(profile);
        await saveSettings({ adaptSeen: est.to });
        toast(`Meta ajustada: ${fmt(profile.plan.kcal)} kcal al día`);
        done();
      });
    },
  };
}
