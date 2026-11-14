// Centro de avisos: activar, elegir cuáles y cuándo, horas de silencio y pausa.
import { html, icon, $, $$, toast } from '../ui.js';
import { hasSession } from '../sync.js';
import * as av from '../avisos.js';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const hh = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'}`;
const horas = (from, to, sel) => { let o = ''; for (let h = from; h <= to; h += 0.5) o += `<option value="${h}" ${h === sel ? 'selected' : ''}>${hh(h)}</option>`; return o; };
const sw = (id, on, label, dis = false) => `<button class="sw" role="switch" id="${id}" aria-checked="${on}" aria-label="${label}" ${dis ? 'disabled' : ''}></button>`;

export async function avisos(app, profile, params) {
  app.className = '';
  const a = await av.getAvisos();

  // Desde el botón "No me avises de esto" de un aviso
  const mute = (params.get('silenciar') || '').split(',').filter((k) => av.TIPOS[k]);
  if (mute.length) {
    mute.forEach((k) => { a[k].on = false; });
    await av.guardarAvisos(a);
    toast(mute.length > 1 ? 'Vale, ya no te aviso del pesaje ni de la foto' : `Vale, ya no te aviso de «${av.TIPOS[mute[0]][0].toLowerCase()}»`);
    history.replaceState(null, '', '#/avisos');
  }

  const sub = await av.currentSub();
  const perm = av.permission();
  const on = !!sub && perm === 'granted';

  let top;
  if (perm === 'unsupported') top = `<p style="font-size:13.5px;line-height:1.5">Este navegador no admite avisos. En Android, abre Baku con <b>Chrome</b> (o instálala desde Chrome) y vuelve aquí.</p>`;
  else if (!hasSession()) top = `<p style="font-size:13.5px;line-height:1.5">Los avisos necesitan la cuenta, porque los manda el servidor aunque no tengas Baku abierta.</p><a class="btn small" href="#/cuenta">Crear cuenta o entrar</a>`;
  else if (perm === 'denied') top = `<p style="font-size:13.5px;line-height:1.5">Bloqueaste los avisos en el navegador. Para activarlos: mantén pulsado el icono de Baku → <b>Información de la app → Notificaciones</b>, o en Chrome toca el candado junto a la dirección → <b>Notificaciones</b>.</p>`;
  else top = `<div class="between" style="gap:12px"><span class="col" style="gap:2px"><span style="font-size:15px;font-weight:600">${on ? 'Avisos activados' : 'Avisos desactivados'}</span><span class="muted small">${on ? 'En este móvil' : 'Te pediremos permiso una vez'}</span></span>${sw('master', on, 'Avisos en este móvil')}</div>
    ${on ? `<button class="btn small ghost" id="test">${icon('bell', 15, 2)}Mandarme un aviso de prueba</button>` : ''}`;

  const rows = Object.entries(av.TIPOS).map(([k, [name, desc]]) => {
    const p = a[k];
    let opts = '';
    if (k === 'peso') opts = `<div class="row aviso-opts" style="gap:8px"><select class="mini-sel" data-k="peso" data-f="dia">${DIAS.map((d, i) => `<option value="${i}" ${i === p.dia ? 'selected' : ''}>${d}</option>`).join('')}</select><select class="mini-sel" data-k="peso" data-f="hora">${horas(8.5, 21.5, p.hora)}</select></div>`;
    if (k === 'semana') opts = `<div class="row aviso-opts" style="gap:8px"><select class="mini-sel" data-k="semana" data-f="dia">${DIAS.map((d, i) => `<option value="${i}" ${i === p.dia ? 'selected' : ''}>${d}</option>`).join('')}</select><select class="mini-sel" data-k="semana" data-f="hora">${horas(8.5, 21.5, p.hora)}</select></div>`;
    if (k === 'comidas') opts = `<div class="row aviso-opts" style="gap:8px"><span class="muted small">A las</span><select class="mini-sel" data-k="comidas" data-f="hora">${horas(18, 21.5, p.hora)}</select></div>`;
    if (k === 'volver') opts = `<div class="row aviso-opts" style="gap:8px"><span class="muted small">A las</span><select class="mini-sel" data-k="volver" data-f="hora">${horas(9, 21.5, p.hora)}</select></div>`;
    return `<div class="aviso-row ${p.on ? '' : 'off'}" data-row="${k}"><div class="between" style="gap:12px"><span class="col" style="gap:2px"><span style="font-size:14px;font-weight:600">${name}</span><span class="muted" style="font-size:12.5px;line-height:1.4">${desc}</span></span>${sw('t-' + k, p.on, name)}</div>${opts}</div>`;
  }).join('');

  app.innerHTML = html`<div class="screen">
    <div class="row" style="gap:12px"><a class="icon-btn glass flat" href="#/perfil" aria-label="Volver">${icon('back', 18, 2)}</a><h1 style="font-size:22px;font-weight:600;letter-spacing:-0.01em">Avisos</h1></div>
    <p class="muted" style="font-size:14px;line-height:1.5;padding:0 4px">Baku avisa poco: <b style="color:#fff">como mucho una vez al día</b>, nunca en tus horas de silencio y nunca de algo que ya has hecho.</p>
    <section class="glass card" style="gap:12px">${top}</section>
    <div class="col" style="gap:6px"><h2 class="muted" style="font-size:13px;font-weight:600;padding-left:4px">Qué quieres que te avise</h2>
    <section class="glass card" style="gap:0;padding:4px 16px">${rows}</section></div>
    <div class="col" style="gap:6px"><h2 class="muted" style="font-size:13px;font-weight:600;padding-left:4px">Tranquilidad</h2>
    <section class="glass card" style="gap:14px">
      <div class="between" style="gap:12px"><span class="col" style="gap:2px"><span style="font-size:14px;font-weight:600">Horas de silencio</span><span class="muted" style="font-size:12.5px">Nada de avisos en esta franja</span></span></div>
      <div class="row" style="gap:8px"><span class="muted small">De</span><select class="mini-sel" data-k="silencio" data-f="desde">${horas(19, 23.5, a.silencio.desde)}</select><span class="muted small">a</span><select class="mini-sel" data-k="silencio" data-f="hasta">${horas(6, 11, a.silencio.hasta)}</select></div>
      <div class="between" style="gap:12px;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px"><span class="col" style="gap:2px"><span style="font-size:14px;font-weight:600">Pausar todos</span><span class="muted" style="font-size:12.5px">Vacaciones, semanas liadas… vuelves cuando quieras</span></span>${sw('pausa', a.pausa, 'Pausar todos los avisos')}</div>
    </section></div>
    <p class="muted small" style="text-align:center;line-height:1.5;padding:0 12px 8px">Cada aviso trae un botón «No me avises de esto» para quitarlo al momento.</p>
  </div>`;

  const save = async () => { await av.guardarAvisos(a); };
  const flip = (b) => { const v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', String(v)); return v; };

  Object.keys(av.TIPOS).forEach((k) => {
    $('#t-' + k, app).addEventListener('click', (e) => {
      a[k].on = flip(e.currentTarget);
      $(`[data-row="${k}"]`, app).classList.toggle('off', !a[k].on);
      save();
    });
  });
  $$('.mini-sel', app).forEach((s) => s.addEventListener('change', () => { a[s.dataset.k][s.dataset.f] = Number(s.value); save(); }));
  $('#pausa', app).addEventListener('click', (e) => { a.pausa = flip(e.currentTarget); save(); toast(a.pausa ? 'Avisos en pausa' : 'Avisos de vuelta'); });

  const master = $('#master', app);
  if (master) master.addEventListener('click', async () => {
    master.disabled = true;
    try {
      if (on) { await av.desactivar(); toast('Avisos desactivados en este móvil'); }
      else { await av.activar(); toast('¡Listo! Te avisaré solo cuando toque'); }
    } catch (e) {
      toast(e.message === 'denied' ? 'Has bloqueado los avisos en el navegador' : e.message);
    }
    window.__route();
  });
  const test = $('#test', app);
  if (test) test.addEventListener('click', async () => {
    test.disabled = true;
    try {
      const n = await av.probar();
      toast(n ? 'Enviado: te llegará en unos segundos' : 'No se pudo enviar. Desactiva y vuelve a activar');
    } catch (e) { toast('No se pudo enviar ahora'); }
    test.disabled = false;
  });
}
