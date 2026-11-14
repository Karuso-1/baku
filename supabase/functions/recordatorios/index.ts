// Recordatorios de Baku. Cloudflare llama aquí cada hora (y eso, de paso, mantiene despierta la base de datos).
// Reglas: como mucho 1 aviso al día, nunca en horas de silencio y nunca si ya lo has hecho.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

const DEF = {
  peso: { on: true, dia: 0, hora: 10 },
  foto: { on: true },
  semana: { on: false, dia: 0, hora: 18 },
  comidas: { on: false, hora: 21 },
  volver: { on: false, hora: 19 },
  silencio: { desde: 22, hasta: 8.5 },
};

const MSG: Record<string, [string, string]> = {
  pesofoto: ['Toca pesarse', 'Un minuto: tu peso y la foto de la semana. Sin agobios.'],
  peso: ['¿Te pesas hoy?', 'Lo apuntas en un segundo y Baku ajusta tu plan.'],
  foto: ['Foto de la semana', 'Una foto rápida para ver tu cambio con el tiempo. Solo la ves tú.'],
  semana: ['¿Preparamos la semana?', 'Deja listos tus menús en un par de minutos.'],
  comidas: ['¿Qué tal hoy?', 'Si te apetece, apunta lo que has comido. Si no, mañana más.'],
  volver: ['Por aquí seguimos', 'Cuando quieras, retomamos donde lo dejaste.'],
  prueba: ['Así te llegarán los avisos', 'Pocos y útiles. Puedes silenciarlos cuando quieras.'],
};
const URL_FOR: Record<string, string> = { pesofoto: '#/progreso', peso: '#/progreso', foto: '#/progreso', semana: '#/menus', comidas: '#/hoy', volver: '#/hoy', prueba: '#/avisos' };

function local(tz: string) {
  let parts: Record<string, string>;
  try {
    parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' })
      .formatToParts(new Date()).map((p) => [p.type, p.value]));
  } catch (_) { return local('Europe/Madrid'); }
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return { date, wd, hour: Number(parts.hour) + Number(parts.minute) / 60 };
}
const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const merge = (a: any, b: any) => { const o = { ...a }; for (const k in b || {}) o[k] = typeof b[k] === 'object' && b[k] && !Array.isArray(b[k]) ? { ...(a?.[k] || {}), ...b[k] } : b[k]; return o; };
const maxDates = (list: any[]) => { const o: Record<string, string> = {}; for (const s of list) for (const [k, v] of Object.entries(s || {})) if (typeof v === 'string' && (!o[k] || v > o[k])) o[k] = v; return o; };

// Qué aviso toca ahora (o null)
function pick(p: any, st: Record<string, string>, sent: Record<string, string>, t: ReturnType<typeof local>) {
  const quiet = p.silencio.desde > p.silencio.hasta ? (t.hour >= p.silencio.desde || t.hour < p.silencio.hasta) : (t.hour >= p.silencio.desde && t.hour < p.silencio.hasta);
  if (p.pausa || quiet) return null;
  const recent = (d: string | undefined, days: number) => !!d && d > addDays(t.date, -days);
  if (t.wd === p.peso.dia && t.hour >= p.peso.hora) {
    const wPeso = p.peso.on && !recent(st.peso, 5) && sent.peso !== t.date;
    const wFoto = p.foto.on && !recent(st.foto, 5) && sent.foto !== t.date;
    if (wPeso && wFoto) return { tipo: 'pesofoto', marks: ['peso', 'foto'] };
    if (wPeso) return { tipo: 'peso', marks: ['peso'] };
    if (wFoto) return { tipo: 'foto', marks: ['foto'] };
  }
  if (p.semana.on && t.wd === p.semana.dia && t.hour >= p.semana.hora && !recent(sent.semana, 6) && !(st.plan && st.plan >= addDays(t.date, 3))) return { tipo: 'semana', marks: ['semana'] };
  if (p.comidas.on && t.hour >= p.comidas.hora && st.comida && st.comida !== t.date && sent.comidas !== t.date && recent(st.open, 3)) return { tipo: 'comidas', marks: ['comidas'] };
  if (p.volver.on && t.hour >= p.volver.hora && st.open && st.open <= addDays(t.date, -4) && !(sent.volver && sent.volver > st.open)) return { tipo: 'volver', marks: ['volver'] };
  return null;
}

async function send(row: any, tipo: string) {
  const [title, body] = MSG[tipo];
  try {
    await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      JSON.stringify({ title, body, tipo, url: URL_FOR[tipo] }), { TTL: 6 * 3600, urgency: 'low' });
    return true;
  } catch (e: any) {
    if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from('push_subs').delete().eq('endpoint', row.endpoint);
    console.log('push error', e?.statusCode, String(e?.body || e).slice(0, 200));
    return false;
  }
}

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try { return await handle(req); } catch (e) {
    console.log('fallo', String(e));
    return Response.json({ error: 'fallo interno' }, { status: 500, headers: cors });
  }
});

async function handle(req: Request) {
  const { data: cfg, error: cfgErr } = await sb.from('app_config').select('k,v');
  if (cfgErr) throw cfgErr;
  const c = Object.fromEntries((cfg || []).map((r: any) => [r.k, r.v]));
  webpush.setVapidDetails('mailto:baku.app.dieta@gmail.com', c.vapid_public, c.vapid_private);

  // Aviso de prueba: solo a tus propios dispositivos
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (req.method === 'POST' && token.split('.').length === 3) {
    const { data: u } = await sb.auth.getUser(token);
    if (!u?.user) return Response.json({ error: 'sin sesión' }, { status: 401, headers: cors });
    const { data: rows } = await sb.from('push_subs').select('*').eq('user_id', u.user.id);
    let ok = 0;
    for (const r of rows || []) if (await send(r, 'prueba')) ok++;
    return Response.json({ enviados: ok }, { headers: cors });
  }

  // Pasada de cada hora
  const { data: rows } = await sb.from('push_subs').select('*');
  const byUser: Record<string, any[]> = {};
  for (const r of rows || []) (byUser[r.user_id] ||= []).push(r);
  let sentN = 0;
  for (const list of Object.values(byUser)) {
    const st = maxDates(list.map((r) => r.state));
    for (const r of list) {
      const t = local(r.tz);
      if (r.last_sent_on === t.date) continue; // máximo uno al día
      const sent = maxDates(list.map((x) => x.sent));
      const p = merge(DEF, r.prefs);
      const hit = pick(p, st, sent, t);
      if (!hit) continue;
      if (await send(r, hit.tipo)) {
        sentN++;
        const ns = { ...(r.sent || {}) };
        for (const m of hit.marks) ns[m] = t.date;
        r.sent = ns;
        await sb.from('push_subs').update({ last_sent_on: t.date, sent: ns }).eq('endpoint', r.endpoint);
      }
    }
  }
  return Response.json({ ok: true, revisados: rows?.length || 0, enviados: sentN }, { headers: cors });
}
