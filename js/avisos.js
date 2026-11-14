// Recordatorios: pocos, útiles y fáciles de silenciar.
// El móvil guarda tus preferencias; el servidor solo sabe "cuándo fue la última vez que te pesaste",
// "la última foto" o "el último día que apuntaste comida" (fechas, nunca los datos en sí).
import { db } from './db.js';
import { client, hasSession } from './sync.js';
import { todayISO } from './plan.js';

const VAPID_PUBLIC = 'BMwf3MPyResEFa6KSfSAQK8_bG3BwILXFEs_bES2ArrlqDEG5UBEB5CQlU2V77bFusOhgDme7WwClCHWmbDk0sM';

export const DEFAULT_AVISOS = {
  peso: { on: true, dia: 0, hora: 10 },
  foto: { on: true },
  semana: { on: false, dia: 0, hora: 18 },
  comidas: { on: false, hora: 21 },
  volver: { on: false, hora: 19 },
  silencio: { desde: 22, hasta: 8.5 },
  pausa: false,
};

export const TIPOS = {
  peso: ['Pesaje semanal', 'Un aviso el día que elijas. Si ya te has pesado esa semana, no llega.'],
  foto: ['Foto semanal', 'Va junto al pesaje, en el mismo aviso. Si ya la has hecho, no llega.'],
  semana: ['Planificar la semana', 'Solo si aún no tienes menús para los próximos días.'],
  comidas: ['Apuntar comidas', 'Por la noche, solo si ese día no has apuntado nada.'],
  volver: ['Si llevas días sin entrar', 'Tras 4 días sin abrir Baku. Una sola vez, sin insistir.'],
};

export const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const permission = () => (supported() ? Notification.permission : 'unsupported');

export async function getAvisos() {
  const s = (await db.get('kv', 'avisos')) || {};
  const o = {};
  for (const [k, v] of Object.entries(DEFAULT_AVISOS)) o[k] = typeof v === 'object' ? { ...v, ...(s[k] || {}) } : (s[k] ?? v);
  return o;
}

const tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid'; } catch (_) { return 'Europe/Madrid'; } };
const fromB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

async function registration() {
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 4000))]);
  if (!reg) throw new Error('La app aún se está instalando, prueba en unos segundos');
  return reg;
}
export async function currentSub() {
  if (!supported()) return null;
  try { return await (await registration()).pushManager.getSubscription(); } catch (_) { return null; }
}

// Fechas de "lo último que hiciste" para no avisar de lo que ya está hecho
async function estado() {
  const max = (arr) => arr.reduce((m, x) => (x && x > m ? x : m), '');
  const weights = await db.all('weights');
  const photos = await db.all('photos');
  const days = await db.all('days');
  const st = { open: todayISO() };
  const peso = max(weights.map((w) => w.date)); if (peso) st.peso = peso;
  const foto = max(photos.map((p) => p.date)); if (foto) st.foto = foto;
  const comida = max(days.filter((d) => d.done && Object.values(d.done).some(Boolean)).map((d) => d.date)); if (comida) st.comida = comida;
  const plan = max(days.filter((d) => d.meals && Object.values(d.meals).some((m) => m.length)).map((d) => d.date)); if (plan) st.plan = plan;
  return st;
}

async function upsert(sub, extra = {}) {
  const sb = await client();
  const j = sub.toJSON();
  const row = { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, tz: tz(), prefs: await getAvisos(), state: await estado(), updated_at: new Date().toISOString(), ...extra };
  const { error } = await sb.from('push_subs').upsert(row, { onConflict: 'endpoint' });
  if (error) throw error;
}

// Activa los avisos en este móvil (pide permiso al navegador)
export async function activar() {
  if (!supported()) throw new Error('Este navegador no admite avisos');
  if (!hasSession()) throw new Error('Necesitas la cuenta para recibir avisos');
  const p = await Notification.requestPermission();
  if (p !== 'granted') throw new Error(p === 'denied' ? 'denied' : 'Sin permiso');
  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64u(VAPID_PUBLIC) });
  await upsert(sub);
  return sub;
}

export async function desactivar() {
  const sub = await currentSub();
  if (!sub) return;
  try { const sb = await client(); await sb.from('push_subs').delete().eq('endpoint', sub.endpoint); } catch (_) {}
  await sub.unsubscribe();
}

// Guarda preferencias (y las manda al servidor si este móvil tiene avisos)
export async function guardarAvisos(a) {
  await db.put('kv', a, 'avisos');
  const sub = await currentSub();
  if (sub && hasSession()) await upsert(sub).catch(() => {});
}

export async function probar() {
  const sb = await client();
  const { data, error } = await sb.functions.invoke('recordatorios', { method: 'POST', body: { prueba: true } });
  if (error) throw error;
  return data?.enviados || 0;
}

// Al abrir la app y al salir de ella: actualiza las fechas (como mucho cada 10 min)
let last = 0;
export async function refrescarEstado(force = false) {
  if (!hasSession() || permission() !== 'granted') return;
  if (!force && Date.now() - last < 600000) return;
  last = Date.now();
  const sub = await currentSub();
  if (sub) await upsert(sub).catch(() => {});
}
export function startAvisos() {
  setTimeout(() => refrescarEstado(true), 2500);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') refrescarEstado(true); });
}
