// Cuenta y copia en la nube (Supabase).
// - Se entra con el email y un código de un solo uso. Sin contraseñas.
// - La app sigue funcionando sin conexión: guarda en el móvil y sube los cambios cuando puede.
// - Las imágenes (fotos de progreso, foto de perfil, fotos de recetas y fondo) se cifran en el móvil
//   con una clave que solo tiene el usuario. En la nube nadie puede verlas, tampoco el dueño de la app.
import { db, setChangeListener, KEY_PATH } from './db.js';

const SUPABASE_URL = 'https://ldphxpvybcotiasnxrnf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_e98MvbewgH4oPcOs86EFIQ_A5xIWOrT';
const BUCKET = 'privado';
const SYNCED = ['weights', 'foods', 'recipes', 'days', 'photos'];
const SYNCED_KV = ['profile', 'settings', 'avisos'];

// ---------- Cliente (se carga solo cuando hace falta) ----------
let clientPromise;
export function client() {
  if (!clientPromise) {
    clientPromise = new Promise((resolve, reject) => {
      const done = () => resolve(window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'baku-auth' },
      }));
      if (window.supabase) return done();
      const s = document.createElement('script');
      s.src = 'js/vendor/supabase.js';
      s.onload = done;
      s.onerror = () => { clientPromise = null; reject(new Error('No se pudo cargar')); };
      document.head.appendChild(s);
    });
  }
  return clientPromise;
}
// ¿Hay una sesión guardada? (sin cargar la librería)
export const hasSession = () => { try { return !!localStorage.getItem('baku-auth'); } catch (_) { return false; } };

export async function currentUser() {
  if (!hasSession()) return null;
  const sb = await client();
  const { data } = await sb.auth.getSession();
  return data.session?.user || null;
}

// ---------- Entrar con código ----------
export async function sendCode(email) {
  const sb = await client();
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw new Error(authError(error));
}
export async function verifyCode(email, token) {
  const sb = await client();
  const { data, error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw new Error(authError(error));
  return data.user;
}
function authError(e) {
  const m = String(e.message || e);
  if (/not authorized/i.test(m)) return 'Supabase aún no puede enviar correos a esta dirección. Hay que configurar el correo del proyecto.';
  if (/rate limit|only request this/i.test(m)) return 'Demasiados intentos. Espera un poco y vuelve a probar.';
  if (/expired|invalid/i.test(m)) return 'El código no es correcto o ha caducado. Pide uno nuevo.';
  if (/fetch|network/i.test(m)) return 'Sin conexión. Prueba cuando tengas internet.';
  return m;
}

// ---------- Cifrado (AES-GCM de 128 bits) ----------
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I para no confundirse
function toCode(bytes) {
  let bits = 0, val = 0, out = '';
  for (const b of bytes) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += ALPHA[(val >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += ALPHA[(val << (5 - bits)) & 31];
  return out.match(/.{1,4}/g).join('-');
}
function fromCode(code) {
  const s = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let bits = 0, val = 0; const out = [];
  for (const ch of s) {
    const i = ALPHA.indexOf(ch);
    if (i < 0) return null;
    val = (val << 5) | i; bits += 5;
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  return out.length >= 16 ? new Uint8Array(out.slice(0, 16)) : null;
}
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const importKey = (raw) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);

async function encrypt(key, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
  const out = new Uint8Array(12 + ct.byteLength);
  out.set(iv); out.set(new Uint8Array(ct), 12);
  return out;
}
async function decrypt(key, bytes) {
  const b = new Uint8Array(bytes);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, key, b.slice(12));
}
const CHECK = new TextEncoder().encode('baku-clave-ok');
async function makeCheck(key) { return b64(await encrypt(key, CHECK)); }
async function testCheck(key, check) {
  try { return new TextDecoder().decode(await decrypt(key, unb64(check))) === 'baku-clave-ok'; } catch (_) { return false; }
}

// La clave vive en este móvil (IndexedDB). Nunca sale de él.
let keyCache = null;
async function localKey() {
  if (keyCache) return keyCache;
  const raw = await db.get('kv', 'vaultKey');
  if (!raw) return null;
  keyCache = await importKey(unb64(raw));
  return keyCache;
}
export async function recoveryCode() {
  const raw = await db.get('kv', 'vaultKey');
  return raw ? toCode(unb64(raw)) : null;
}

// ¿Tiene ya la cuenta una clave? (si sí, en un móvil nuevo hay que escribir el código)
export async function vaultExists() {
  const sb = await client();
  const { data, error } = await sb.from('vault').select('check_data').maybeSingle();
  if (error) throw error;
  return data?.check_data || null;
}
// Primera vez: crea la clave en el móvil y guarda en la nube solo el comprobante
export async function createVault() {
  const raw = crypto.getRandomValues(new Uint8Array(16));
  const key = await importKey(raw);
  const sb = await client();
  const { error } = await sb.from('vault').insert({ check_data: await makeCheck(key) });
  if (error) throw error;
  await db.putRaw('kv', b64(raw), 'vaultKey');
  keyCache = key;
  return toCode(raw);
}
// Móvil nuevo: comprueba el código y lo guarda
export async function unlockVault(code, check) {
  const raw = fromCode(code);
  if (!raw) return false;
  const key = await importKey(raw);
  if (!(await testCheck(key, check))) return false;
  await db.putRaw('kv', b64(raw), 'vaultKey');
  keyCache = key;
  return true;
}

// ---------- Estado ----------
const getState = async () => ({ cursor: null, blobs: {}, last: null, ...((await db.get('kv', 'sync')) || {}) });
const setState = async (patch) => { const s = { ...(await getState()), ...patch }; await db.putRaw('kv', s, 'sync'); return s; };
export const syncInfo = getState;
const listeners = new Set();
export const onStatus = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
let status = 'idle';
const setStatus = (s) => { status = s; listeners.forEach((fn) => fn(s)); };
export const getStatus = () => status;

// ---------- Cola de cambios ----------
function track(store, key) {
  if (!hasSession()) return;
  if (store === 'kv' && !SYNCED_KV.includes(key)) return;
  if (store !== 'kv' && !SYNCED.includes(store)) return;
  db.putRaw('outbox', { id: `${store}|${key}`, store, key, t: Date.now() });
  schedule();
}
let timer;
function schedule(ms = 4000) { clearTimeout(timer); timer = setTimeout(() => { syncNow().catch(() => {}); }, ms); }

// Mete en la cola todo lo que hay en el móvil (primera subida)
export async function queueAll() {
  for (const k of SYNCED_KV) if (await db.get('kv', k)) await db.putRaw('outbox', { id: `kv|${k}`, store: 'kv', key: k, t: Date.now() });
  for (const st of SYNCED) {
    for (const v of await db.all(st)) {
      const k = String(v[KEY_PATH[st]]);
      await db.putRaw('outbox', { id: `${st}|${k}`, store: st, key: k, t: Date.now() });
    }
  }
}

// ---------- Imágenes: Blob ⇄ archivo cifrado ----------
async function sha(buf) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map((b) => b.toString(16).padStart(2, '0')).join(''); }

async function serialize(value, ctx) {
  if (value instanceof Blob) {
    const buf = await value.arrayBuffer();
    const id = await sha(buf);
    if (!ctx.state.blobs[id]) {
      const path = `${ctx.uid}/${id}`;
      const body = await encrypt(ctx.key, buf);
      const { error } = await ctx.sb.storage.from(BUCKET).upload(path, new Blob([body], { type: 'application/octet-stream' }), { upsert: true });
      if (error) throw error;
      ctx.state.blobs[id] = 1;
      ctx.dirtyState = true;
    }
    return { $blob: id, type: value.type || 'image/jpeg' };
  }
  if (Array.isArray(value)) return Promise.all(value.map((v) => serialize(v, ctx)));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = await serialize(v, ctx);
    return out;
  }
  return value;
}
async function deserialize(value, ctx) {
  if (value && typeof value === 'object' && value.$blob) {
    const { data, error } = await ctx.sb.storage.from(BUCKET).download(`${ctx.uid}/${value.$blob}`);
    if (error) return null;
    const plain = await decrypt(ctx.key, await data.arrayBuffer());
    ctx.state.blobs[value.$blob] = 1;
    return new Blob([plain], { type: value.type });
  }
  if (Array.isArray(value)) return Promise.all(value.map((v) => deserialize(v, ctx)));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = await deserialize(v, ctx);
    return out;
  }
  return value;
}

// ---------- Subir y bajar ----------
let running = null;
export function syncNow() {
  if (!running) running = doSync().finally(() => { running = null; });
  return running;
}
async function doSync() {
  if (!hasSession() || !navigator.onLine) return;
  const sb = await client();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const key = await localKey();
  if (!key) return; // falta escribir la clave de recuperación en este móvil
  setStatus('syncing');
  try {
    const ctx = { sb, key, uid: session.user.id, state: await getState() };
    await push(ctx);
    const changed = await pull(ctx);
    await setState({ blobs: ctx.state.blobs, cursor: ctx.state.cursor, last: Date.now() });
    setStatus('ok');
    if (changed && window.__route) window.__route();
  } catch (e) {
    console.warn('sync', e);
    setStatus('error');
    throw e;
  }
}

async function push(ctx) {
  const pending = await db.all('outbox');
  for (let i = 0; i < pending.length; i += 100) {
    const batch = pending.slice(i, i + 100);
    const rows = [];
    for (const item of batch) {
      const value = await db.get(item.store, item.key);
      rows.push({ user_id: ctx.uid, store: item.store, key: item.key, data: value == null ? null : await serialize(value, ctx), deleted: value == null });
    }
    const { error } = await ctx.sb.from('records').upsert(rows, { onConflict: 'user_id,store,key' });
    if (error) throw error;
    // Solo se quita de la cola si no ha vuelto a cambiar mientras subía
    for (const item of batch) {
      const now = await db.get('outbox', item.id);
      if (now && now.t === item.t) await db.delRaw('outbox', item.id);
    }
  }
}

async function pull(ctx) {
  let changed = false;
  const pendingIds = new Set((await db.all('outbox')).map((o) => o.id));
  for (;;) {
    let q = ctx.sb.from('records').select('store,key,data,deleted,updated_at').order('updated_at', { ascending: true }).limit(500);
    if (ctx.state.cursor) q = q.gt('updated_at', ctx.state.cursor);
    const { data, error } = await q;
    if (error) throw error;
    for (const r of data) {
      ctx.state.cursor = r.updated_at;
      if (pendingIds.has(`${r.store}|${r.key}`)) continue; // lo de este móvil manda, se subirá luego
      if (r.store === 'kv' ? !SYNCED_KV.includes(r.key) : !SYNCED.includes(r.store)) continue;
      if (r.deleted) await db.delRaw(r.store, r.key);
      else {
        const value = await deserialize(r.data, ctx);
        if (r.store === 'kv') await db.putRaw('kv', value, r.key);
        else await db.putRaw(r.store, value);
      }
      changed = true;
    }
    if (data.length < 500) break;
  }
  return changed;
}

// ¿Hay datos en la nube?
export async function remoteHasData() {
  const sb = await client();
  const { count, error } = await sb.from('records').select('key', { count: 'exact', head: true });
  if (error) throw error;
  return count > 0;
}

// Elegir datos al entrar en un móvil que ya tenía datos
export async function useCloudData() {
  for (const st of [...SYNCED, 'outbox']) { const all = await db.all(st); for (const v of all) await db.delRaw(st, v[KEY_PATH[st]]); }
  await setState({ cursor: null });
  await syncNow();
}
export async function useLocalData() {
  const sb = await client();
  const { error } = await sb.from('records').delete().neq('store', '');
  if (error) throw error;
  await setState({ cursor: null });
  await queueAll();
  await syncNow();
}

// ---------- Salir y borrar ----------
export async function signOut() {
  const sb = await client();
  // Sin cuenta no hay avisos: se quitan de este móvil
  try {
    const sub = 'serviceWorker' in navigator ? await (await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 3000))]))?.pushManager?.getSubscription() : null;
    if (sub) { await sb.from('push_subs').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
  } catch (_) { /* nada */ }
  await sb.auth.signOut({ scope: 'local' }).catch(() => {});
  try { localStorage.removeItem('baku-auth'); } catch (_) { /* nada */ }
  keyCache = null;
  await db.delRaw('kv', 'vaultKey');
  await db.delRaw('kv', 'sync');
  for (const o of await db.all('outbox')) await db.delRaw('outbox', o.id);
}

export async function deleteAccount() {
  const sb = await client();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error('Sin sesión');
  // Primero las fotos cifradas, luego la cuenta (y con ella todos sus datos)
  const folder = session.user.id;
  for (;;) {
    const { data, error } = await sb.storage.from(BUCKET).list(folder, { limit: 100 });
    if (error) throw error;
    if (!data.length) break;
    const { error: e2 } = await sb.storage.from(BUCKET).remove(data.map((f) => `${folder}/${f.name}`));
    if (e2) throw e2;
    if (data.length < 100) break;
  }
  const { error } = await sb.rpc('borrar_mi_cuenta');
  if (error) throw error;
  await signOut();
}

// ---------- Arranque ----------
export function startSync() {
  setChangeListener(track);
  if (hasSession()) schedule(800);
  window.addEventListener('online', () => schedule(500));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') syncNow().catch(() => {}); else schedule(1500); });
}
