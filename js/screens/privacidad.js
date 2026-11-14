// Privacidad: qué guarda Baku, dónde y cómo borrarlo. Escrito en claro, sin letra pequeña.
import { html, icon, $ } from '../ui.js';

const sec = (ic, title, body) => `<section class="glass card" style="gap:8px">
  <div class="row" style="gap:10px"><span style="width:30px;height:30px;border-radius:999px;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;flex:none;color:var(--crema)">${icon(ic, 15)}</span><h2 class="h2" style="font-size:16px">${title}</h2></div>
  <div style="font-size:13.5px;line-height:1.55;color:rgba(255,255,255,0.86)">${body}</div></section>`;

export function privacidad(app) {
  app.className = 'full';
  app.innerHTML = html`<div class="screen">
    <div class="row" style="gap:12px"><button class="icon-btn glass flat" id="back" aria-label="Volver">${icon('back', 18, 2)}</button><h1 style="font-size:22px;font-weight:600;letter-spacing:-0.01em">Tu privacidad</h1></div>
    <p class="muted" style="font-size:14px;line-height:1.5;padding:0 4px">Baku es una app hecha por una persona, no por una empresa. <b style="color:#fff">Sin anuncios, sin vender datos y sin rastreadores.</b> Aquí tienes todo, sin letra pequeña.</p>
    ${sec('user', 'Qué se guarda', 'Lo que tú metes: tu nombre, edad, altura, sexo, actividad y objetivo; tus pesos; tus comidas y menús; tus alimentos y recetas; tu tipo de alimentación y alergias; y las fotos de progreso. Si creas cuenta, también tu email, que solo sirve para entrar.')}
    ${sec('cloud', 'Dónde se guarda', 'Sin cuenta, <b>solo en tu móvil</b>: no sale de ahí. Con cuenta, además hay una copia en <b>Supabase</b>, con servidores en Londres (para la ley europea, Reino Unido tiene la misma protección que la UE). La web se sirve desde <b>Cloudflare</b>.')}
    ${sec('lock', 'Tus fotos', 'Se <b>cifran en tu móvil</b> con tu clave de recuperación antes de subirlas. En el servidor solo hay datos ilegibles: ni yo ni nadie más puede verlas. Por eso, si pierdes el móvil <i>y</i> la clave, no se pueden recuperar.')}
    ${sec('shield', 'El resto de tus datos', 'Pesos, comidas y perfil se guardan protegidos: cada cuenta solo puede leer lo suyo. Siendo sincero, quien administra la base de datos técnicamente podría acceder a ellos (a las fotos no). No lo hago ni lo haré, y nunca se comparten con nadie.')}
    ${sec('bell', 'Avisos', 'Solo si los activas. Para no avisarte de lo que ya has hecho, el servidor guarda tu zona horaria y <b>la fecha</b> de tu último pesaje, foto y comida apuntada. Las fechas, no los datos.')}
    ${sec('search', 'Buscar alimentos', 'Cuando buscas o escaneas un producto, la búsqueda pasa por Baku hasta Open Food Facts, una base de datos abierta. No se guarda quién buscó qué.')}
    ${sec('trash', 'Tus datos son tuyos', 'Puedes descargarlos cuando quieras (Perfil → Copia de seguridad) y <b>borrar tu cuenta</b> con todo lo que hay en ella (Perfil → Cuenta → Borrar cuenta). Se borra de verdad, al momento. Para cualquier duda: <b>baku.app.dieta@gmail.com</b>')}
    ${sec('heart', 'Una cosa más', 'Baku te ayuda a organizarte, pero no es consejo médico. Si tienes alguna condición de salud, embarazo o un trastorno de la alimentación, habla antes con un profesional.')}
    <p class="muted small" style="text-align:center;padding:4px 0 8px">Actualizado el 14 de noviembre de 2026</p>
  </div>`;
  $('#back', app).addEventListener('click', () => (history.length > 1 ? history.back() : (location.hash = '#/bienvenida')));
}
