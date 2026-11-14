// Cuenta y copia en la nube: entrar con email y código, clave de recuperación de las fotos,
// elegir qué datos conservar, estado, cerrar sesión y borrar la cuenta.
import { html, icon, $, toast, esc } from '../ui.js';
import { getProfile, db } from '../db.js';
import * as sync from '../sync.js';

const head = (title, back) => html`<div class="row" style="gap:12px">${back ? `<button class="icon-btn glass flat" id="back" aria-label="Volver">${icon('back', 18, 2)}</button>` : ''}<h1 style="font-size:22px;font-weight:600;letter-spacing:-0.01em">${title}</h1></div>`;
const note = (ic, text) => `<div class="row" style="gap:10px;align-items:flex-start"><span style="color:var(--crema);display:flex;padding-top:1px;flex:none">${icon(ic, 17)}</span><span style="font-size:13px;line-height:1.45">${text}</span></div>`;
const busy = (btn, on, label) => { btn.disabled = on; if (label) btn.textContent = on ? 'Un momento…' : label; };
const ago = (t) => {
  if (!t) return 'Todavía no';
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? 'Hace un momento' : m < 60 ? `Hace ${m} min` : m < 1440 ? `Hace ${Math.round(m / 60)} h` : `Hace ${Math.round(m / 1440)} días`;
};

// Entrada: decide qué paso enseñar
export async function cuenta(app) {
  app.className = 'full';
  const fromWelcome = !(await getProfile());
  if (!sync.hasSession()) return stepEmail(app, fromWelcome);
  try {
    const user = await sync.currentUser();
    if (!user) { await sync.signOut(); return stepEmail(app, fromWelcome); }
    if (!(await db.get('kv', 'vaultKey'))) return afterLogin(app);
    return estado(app, user);
  } catch (_) {
    return estado(app, null);
  }
}

// ---------- 1. Email ----------
function stepEmail(app, fromWelcome) {
  app.innerHTML = html`<div class="screen">
    ${head(fromWelcome ? 'Empecemos' : 'Copia en la nube', true)}
    ${fromWelcome ? '<p class="muted" style="font-size:14px;line-height:1.45;padding:0 4px">Escribe tu email. Si ya tienes cuenta, recuperas tus datos; si no, se crea sola.</p>' : ''}
    <section class="glass card" style="gap:12px">
      ${note('cloud', fromWelcome ? 'Tus datos se guardan en tu cuenta: no los pierdes si cambias de móvil.' : 'Guarda tus datos en tu cuenta para no perderlos si cambias de móvil, y úsala en más de uno.')}
      ${note('lock', '<b>Tus fotos se cifran en tu móvil</b> antes de subirlas. Nadie más puede verlas, ni siquiera quien gestiona la app.')}
      ${note('mail', 'Sin contraseñas: te mando un código al correo cada vez que entres en un móvil nuevo.')}
    </section>
    <div class="field"><label for="em" class="muted small" style="padding-left:4px">Tu email</label>
      <input id="em" class="input glass flat" type="email" inputmode="email" autocomplete="email" placeholder="tu@correo.com" value="${esc(sessionStorage.getItem('baku-email') || '')}"></div>
    <div class="spacer"></div>
    <button class="btn" id="go">Enviarme el código</button>
  </div>`;
  $('#back', app).addEventListener('click', () => { location.hash = fromWelcome ? '#/bienvenida' : '#/perfil'; });
  const go = $('#go', app);
  go.addEventListener('click', async () => {
    const email = $('#em', app).value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('Revisa el email');
    busy(go, true, 'Enviarme el código');
    try {
      await sync.sendCode(email);
      sessionStorage.setItem('baku-email', email);
      stepCode(app, email, fromWelcome);
    } catch (e) { toast(e.message); busy(go, false, 'Enviarme el código'); }
  });
}

// ---------- 2. Código del correo ----------
function stepCode(app, email, fromWelcome) {
  app.innerHTML = html`<div class="screen">
    ${head('Revisa tu correo', true)}
    <p class="muted" style="font-size:14px;line-height:1.45;padding:0 4px">Te he enviado un código a <b style="color:#fff">${esc(email)}</b>. Si no llega en un minuto, mira en spam.</p>
    <input id="code" class="input glass flat num" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="000000" style="height:64px;text-align:center;font-size:30px;font-weight:600;letter-spacing:0.25em">
    <div class="spacer"></div>
    <button class="btn" id="ok" disabled>Entrar</button>
    <button class="link" id="again" style="font-size:13px;padding:8px">Reenviar el código</button>
  </div>`;
  $('#back', app).addEventListener('click', () => stepEmail(app, fromWelcome));
  const input = $('#code', app), ok = $('#ok', app);
  input.focus();
  input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, ''); ok.disabled = input.value.length < 6; });
  ok.addEventListener('click', async () => {
    busy(ok, true, 'Entrar');
    try {
      await sync.verifyCode(email, input.value);
      afterLogin(app);
    } catch (e) { toast(e.message); busy(ok, false, 'Entrar'); }
  });
  $('#again', app).addEventListener('click', async () => {
    try { await sync.sendCode(email); toast('Código reenviado'); } catch (e) { toast(e.message); }
  });
}

// ---------- 3. Después de entrar ----------
async function afterLogin(app) {
  app.innerHTML = `<div class="screen" style="align-items:center;justify-content:center"><p class="muted">Preparando tu cuenta…</p></div>`;
  try {
    const check = await sync.vaultExists();
    if (!check) return stepNewKey(app, await sync.createVault());
    return stepEnterKey(app, check);
  } catch (e) {
    app.innerHTML = html`<div class="screen">${head('Algo ha fallado', false)}<p class="muted" style="font-size:13px">${esc(e.message || e)}</p><a class="btn small" href="#/perfil">Volver</a></div>`;
  }
}

// Primera vez: enseñar la clave de recuperación
function stepNewKey(app, code) {
  app.innerHTML = html`<div class="screen">
    ${head('Tu clave de recuperación', false)}
    <p class="muted" style="font-size:14px;line-height:1.45;padding:0 4px">Es la llave de tus fotos. Solo la tienes tú: <b style="color:#fff">si cambias de móvil, la necesitarás para verlas</b>. Si la pierdes, nadie puede recuperarlas.</p>
    <section class="glass card" style="align-items:center;gap:12px;padding:18px 14px">
      <span class="num" id="kc" style="font-size:19px;font-weight:600;letter-spacing:0.06em;text-align:center;line-height:1.5;word-break:break-word">${code}</span>
      <button class="btn small ghost" id="cp" style="width:auto;padding:0 18px">${icon('copy', 16)}Copiar</button>
    </section>
    <section class="glass card" style="gap:10px">
      <h2 class="h2">Guárdala en un sitio seguro</h2>
      ${note('key', 'En el gestor de contraseñas de Google (passwords.google.com), como nota.')}
      ${note('image', 'O haz una captura de pantalla y guárdala fuera del móvil, por ejemplo en Drive.')}
      ${note('edit', 'O apúntala en un papel.')}
    </section>
    <label class="row" style="gap:10px;padding:4px;font-size:14px;align-items:flex-start"><input type="checkbox" id="saved" style="width:20px;height:20px;accent-color:var(--crema);flex:none;margin-top:1px">He guardado mi clave en un sitio seguro</label>
    <div class="spacer"></div>
    <button class="btn" id="ok" disabled>Continuar</button>
  </div>`;
  $('#cp', app).addEventListener('click', async () => { try { await navigator.clipboard.writeText(code); toast('Clave copiada'); } catch (_) { toast('Mantén pulsada la clave para copiarla'); } });
  $('#saved', app).addEventListener('change', (e) => { $('#ok', app).disabled = !e.target.checked; });
  $('#ok', app).addEventListener('click', () => firstSync(app));
}

// Móvil nuevo: escribir la clave
function stepEnterKey(app, check) {
  app.innerHTML = html`<div class="screen">
    ${head('Escribe tu clave', false)}
    <p class="muted" style="font-size:14px;line-height:1.45;padding:0 4px">Tu cuenta ya tiene fotos cifradas. Escribe la clave de recuperación que guardaste la primera vez para poder verlas en este móvil.</p>
    <textarea id="k" class="input glass flat num" rows="3" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="ABCD-EFGH-…" style="height:auto;padding:14px 16px;font-size:18px;font-weight:600;letter-spacing:0.05em;resize:none"></textarea>
    <div class="spacer"></div>
    <button class="btn" id="ok">Desbloquear</button>
    <details style="padding:0 4px"><summary class="link" style="font-size:13px;padding:6px 0;cursor:pointer">He perdido mi clave</summary>
      <p class="muted" style="font-size:13px;line-height:1.45;padding-top:6px">Sin la clave, nadie puede abrir tus fotos: ni tú ni quien gestiona Baku. Mira en tu gestor de contraseñas, tus capturas o tus notas. Mientras tanto puedes seguir usando Baku en este móvil sin la copia en la nube.</p>
      <button class="btn small ghost" id="out" style="margin-top:8px">${icon('logout', 16)}Salir de la cuenta</button></details>
  </div>`;
  const ok = $('#ok', app);
  ok.addEventListener('click', async () => {
    busy(ok, true, 'Desbloquear');
    if (!(await sync.unlockVault($('#k', app).value, check))) { busy(ok, false, 'Desbloquear'); return toast('Esa clave no es la de esta cuenta'); }
    toast('Clave correcta');
    const local = await getProfile();
    if (local && await sync.remoteHasData()) return stepChoose(app);
    firstSync(app);
  });
  $('#out', app).addEventListener('click', async () => { await sync.signOut(); location.hash = (await getProfile()) ? '#/perfil' : '#/bienvenida'; });
}

// Hay datos en el móvil y en la nube: elegir
function stepChoose(app) {
  app.innerHTML = html`<div class="screen">
    ${head('¿Qué datos conservo?', false)}
    <p class="muted" style="font-size:14px;line-height:1.45;padding:0 4px">Este móvil ya tiene datos de Baku y tu cuenta también. Elige cuáles quieres usar a partir de ahora.</p>
    <button class="glass card" id="cloud" style="text-align:left;color:#fff;gap:6px;border:0"><span class="row" style="gap:10px;font-size:15px;font-weight:600">${icon('cloud', 18)}Los de mi cuenta</span><span class="muted small">Se sustituyen los datos de este móvil por los de la nube. Lo normal si cambias de móvil.</span></button>
    <button class="glass card" id="local" style="text-align:left;color:#fff;gap:6px;border:0"><span class="row" style="gap:10px;font-size:15px;font-weight:600">${icon('despensa', 18)}Los de este móvil</span><span class="muted small">Se sustituye lo que había en tu cuenta por lo de este móvil.</span></button>
  </div>`;
  $('#cloud', app).addEventListener('click', async () => {
    if (!confirm('Se borrarán los datos de este móvil y se cargarán los de tu cuenta. ¿Seguimos?')) return;
    working(app, 'Bajando tus datos…');
    try { await sync.useCloudData(); done(); } catch (e) { fail(app, e); }
  });
  $('#local', app).addEventListener('click', async () => {
    if (!confirm('Se borrará lo que había en tu cuenta y se subirá lo de este móvil. ¿Seguimos?')) return;
    working(app, 'Subiendo tus datos…');
    try { await sync.useLocalData(); done(); } catch (e) { fail(app, e); }
  });
}

const working = (app, t) => { app.innerHTML = `<div class="screen" style="align-items:center;justify-content:center;gap:10px"><span style="color:var(--crema)">${icon('sync', 28)}</span><p class="muted">${t}</p><p class="muted small">No cierres la app.</p></div>`; };
const fail = (app, e) => { app.innerHTML = html`<div class="screen">${head('No se ha podido terminar', false)}<p class="muted" style="font-size:13px;line-height:1.45">${esc(e.message || e)}. Tus datos siguen en el móvil; se volverá a intentar solo.</p><a class="btn small" href="#/hoy">Seguir</a></div>`; };
async function done() {
  const p = await getProfile();
  location.hash = p ? '#/hoy' : '#/test/1';
  setTimeout(() => toast(p ? 'Copia en la nube activada' : 'Cuenta lista. Ahora, unas preguntas para tu plan'), 300);
}

// Primera sincronización: sube lo del móvil o baja lo de la nube
async function firstSync(app) {
  const local = await getProfile();
  working(app, local ? 'Subiendo tus datos…' : 'Bajando tus datos…');
  try {
    if (local) { await sync.queueAll(); await sync.syncNow(); } else await sync.useCloudData();
    done();
  } catch (e) { fail(app, e); }
}

// ---------- Estado de la cuenta ----------
async function estado(app, user) {
  app.className = '';
  const info = await sync.syncInfo();
  const pending = (await db.all('outbox')).length;
  app.innerHTML = html`<div class="screen">
    ${head('Cuenta', true)}
    <section class="glass card" style="gap:10px">
      <div class="row" style="gap:12px"><span style="width:40px;height:40px;border-radius:999px;background:rgba(242,234,219,0.14);display:flex;align-items:center;justify-content:center;color:var(--crema);flex:none">${icon('cloud', 20)}</span>
        <span class="col" style="min-width:0"><span class="ellipsis" style="font-size:15px;font-weight:600">${esc(user?.email || 'Sin conexión')}</span><span class="muted small" id="st">Última copia: ${ago(info.last)}${pending ? ` · ${pending} cambios por subir` : ''}</span></span></div>
      <button class="btn small ghost" id="now">${icon('sync', 16)}Sincronizar ahora</button>
    </section>
    <section class="glass card" style="gap:10px">
      ${note('lock', 'Tus fotos están cifradas con tu clave de recuperación. En la nube nadie puede verlas.')}
      <button class="btn small ghost" id="show">${icon('key', 16)}Ver mi clave de recuperación</button>
      <div id="kbox" hidden class="col" style="align-items:center;gap:8px"><span class="num" id="kc" style="font-size:17px;font-weight:600;letter-spacing:0.06em;text-align:center;line-height:1.5"></span><button class="link small" id="cp">Copiar</button></div>
    </section>
    <section class="glass card" style="gap:0;padding:4px 14px">
      <button class="list-row" id="out" style="background:none;border:0;color:#fff;gap:12px;min-height:48px">${icon('logout', 18)}<span class="grow" style="font-size:14px;text-align:left">Cerrar sesión en este móvil</span></button>
      <button class="list-row" id="del" style="background:none;border-left:0;border-right:0;border-bottom:0;color:var(--oxido-claro);gap:12px;min-height:48px">${icon('trash', 18)}<span class="grow" style="font-size:14px;text-align:left">Borrar mi cuenta y la copia en la nube</span></button>
    </section>
    <p class="muted small" style="text-align:center;line-height:1.4;padding:0 10px">Al cerrar sesión, tus datos se quedan en este móvil. Al borrar la cuenta, se borra todo lo de la nube; lo del móvil se queda.</p>
  </div>`;
  $('#back', app).addEventListener('click', () => history.back());
  const now = $('#now', app);
  now.addEventListener('click', async () => {
    now.disabled = true;
    try { await sync.syncNow(); toast('Todo al día'); estado(app, user); } catch (_) { toast('No se ha podido sincronizar. Revisa la conexión'); now.disabled = false; }
  });
  $('#show', app).addEventListener('click', async () => { $('#kc', app).textContent = await sync.recoveryCode(); $('#kbox', app).hidden = false; $('#show', app).hidden = true; });
  $('#cp', app).addEventListener('click', async () => { try { await navigator.clipboard.writeText($('#kc', app).textContent); toast('Clave copiada'); } catch (_) { toast('Mantén pulsada la clave para copiarla'); } });
  $('#out', app).addEventListener('click', async () => {
    if (pending && !confirm(`Hay ${pending} cambios sin subir. Si cierras sesión, solo quedarán en este móvil. ¿Cerrar igualmente?`)) return;
    if (!pending && !confirm('¿Cerrar sesión en este móvil? Tus datos se quedan aquí.')) return;
    await sync.signOut(); location.hash = '#/perfil'; toast('Sesión cerrada');
  });
  $('#del', app).addEventListener('click', async () => {
    const w = prompt('Se borrará tu cuenta, tus datos y tus fotos de la nube. No se puede deshacer. Escribe BORRAR para confirmar.');
    if ((w || '').trim().toUpperCase() !== 'BORRAR') return;
    try { await sync.deleteAccount(); location.hash = '#/perfil'; toast('Cuenta borrada'); } catch (e) { toast('No se ha podido borrar: ' + (e.message || e)); }
  });
}
