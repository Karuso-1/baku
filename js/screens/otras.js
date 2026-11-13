// Pestañas que llegan en las siguientes fases, y un perfil básico.
import { html, icon, $, toast } from '../ui.js';
import { fmt, fmtDate } from '../plan.js';
import { db } from '../db.js';
import { avatar, daysSince } from './hoy.js';

const SOON = {
  progreso: ['Progreso', 'Gráfica de peso con la proyección hasta tu meta, fotos semanales y comparar el antes y el después.'],
  menus: ['Menús', 'La semana día a día, tus recetas por comida y «Rellenar» automático con lo que te gusta.'],
  despensa: ['Despensa', 'Tus recetas y alimentos, el buscador de Open Food Facts y el escáner de códigos de barras.'],
};

export function pronto(app, key) {
  const [t, txt] = SOON[key];
  app.className = '';
  app.innerHTML = html`<div class="screen">
    <div class="row" style="gap:10px;padding:0 4px">
      <span class="glass flat" style="width:34px;height:34px;border-radius:999px;display:flex;align-items:center;justify-content:center;color:var(--crema)">${icon(key, 18, 2)}</span>
      <h1 style="font-size:28px;font-weight:600;letter-spacing:-0.02em">${t}</h1></div>
    <section class="glass card" style="align-items:center;text-align:center;padding:28px 18px">
      <span style="width:56px;height:56px;border-radius:999px;background:rgba(242,234,219,0.12);display:flex;align-items:center;justify-content:center;color:var(--crema)">${icon('menus', 26, 1.8)}</span>
      <h2 style="font-size:18px;font-weight:600">Lo estoy cocinando</h2>
      <p class="muted" style="font-size:13px;line-height:1.45;max-width:280px">${txt}</p>
    </section>
  </div>`;
}

export function perfil(app, profile) {
  app.className = '';
  const p = profile.plan;
  const week = Math.floor(daysSince(profile.startDate) / 7) + 1;
  const goalTxt = profile.goal === 'mantener' ? 'Mantener' : `${fmt(profile.target, profile.target % 1 ? 1 : 0)} kg`;
  app.innerHTML = html`<div class="screen">
    <a class="icon-btn glass flat" href="#/hoy" aria-label="Volver">${icon('back', 18, 2)}</a>
    <div class="row" style="gap:14px;padding:0 4px">${avatar(profile, 68)}
      <span class="col" style="gap:4px"><span style="font-size:24px;font-weight:600;letter-spacing:-0.02em">${profile.name}</span>
      <span class="row" style="gap:8px"><span class="pill num" style="font-weight:600;background:rgba(242,234,219,0.14)">Semana ${week}${p.weeks ? ' de ' + p.weeks : ''}</span><span class="muted small num">Empezaste el ${fmtDate(profile.startDate)}</span></span></span></div>
    <section class="glass card">
      <div class="between"><h2 style="font-size:15px;font-weight:600">Tu plan</h2><span class="muted small">Se recalcula al anotar peso</span></div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
        <span class="col"><span class="muted small">Objetivo</span><span class="num" style="font-size:18px;font-weight:600">${goalTxt}</span></span>
        <span class="col"><span class="muted small">Ritmo</span><span class="num" style="font-size:18px;font-weight:600">${profile.goal === 'mantener' ? '—' : fmt(profile.rate, 2).replace(/0$/, '') + ' <span class="unit">kg/sem</span>'}</span></span>
        <span class="col"><span class="muted small">Al día</span><span class="num" style="font-size:18px;font-weight:600">${fmt(p.kcal)} <span class="unit">kcal</span></span></span>
      </div>
      <div class="num row" style="gap:6px;font-size:12px"><span class="pill">P ${p.protein} g</span><span class="pill">H ${p.carbs} g</span><span class="pill">G ${p.fat} g</span></div>
      <button class="btn small ghost" id="redo">Rehacer el test</button>
    </section>
    <section class="glass card" style="padding:12px 16px">
      <p class="muted" style="font-size:13px;line-height:1.45">Fondo, foto de perfil, copia de seguridad y pausar el plan llegan en las siguientes fases.</p>
    </section>
    <div class="spacer"></div>
    <button class="btn small" id="wipe" style="background:transparent;border:1px solid rgba(242,165,126,0.45);color:var(--oxido-claro)">Borrar todos los datos</button>
  </div>`;
  $('#redo', app).addEventListener('click', () => {
    sessionStorage.setItem('baku-borrador', JSON.stringify({
      name: profile.name, sex: profile.sex, age: profile.age, height: profile.height, weight: profile.weight,
      work: profile.work, days: profile.days, goal: profile.goal, target: profile.target, rate: profile.rate,
    }));
    location.hash = '#/test/1';
  });
  $('#wipe', app).addEventListener('click', async () => {
    if (!confirm('¿Borrar todos tus datos de Baku? No se puede deshacer.')) return;
    await db.clearAll();
    location.hash = '#/bienvenida';
    toast('Datos borrados');
  });
}
