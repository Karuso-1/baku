// Despensa: recetas, alimentos, ficha, escáner, alta manual y primera vez.
import { html, icon, sheet, $, $$, toast, esc, blobUrl, circleBtn } from '../ui.js';
import { fmt, todayISO } from '../plan.js';
import { MEALS, MEAL_NAME, maps, foodGet, foodPut, foodNutr, recipeServing, uid, dayGet, dayPut, getSettings, saveSettings, addDays, parse } from '../store.js';
import { CATEGORIES, SEED } from '../seed.js';
import { foodAmountSheet } from './menus.js';
import { db } from '../db.js';

function header(tab) {
  return html`<div class="row" style="gap:10px;padding:0 4px"><span class="title-ic glass flat">${icon('despensa', 18, 2)}</span><h1 class="h1">Despensa</h1></div>
  <div class="seg glass" role="tablist" aria-label="Apartados" style="height:44px">
    <a role="tab" href="#/despensa" aria-selected="${tab === 'recetas'}" style="border-radius:999px;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:13px;${tab === 'recetas' ? 'background:var(--crema);color:var(--fondo);font-weight:600' : 'color:#fff'}">Recetas</a>
    <a role="tab" href="#/despensa/alimentos" aria-selected="${tab === 'alimentos'}" style="border-radius:999px;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:13px;${tab === 'alimentos' ? 'background:var(--crema);color:var(--fondo);font-weight:600' : 'color:#fff'}">Alimentos</a></div>`;
}

// ---------- Recetas ----------
export async function despensaRecetas(app) {
  app.className = '';
  const s = await getSettings();
  if (!s.filled) { location.hash = '#/llenar'; return; }
  const m = await maps();
  let filter = sessionStorage.getItem('baku-filtro-recetas') || 'todas';
  const render = () => {
    const list = Object.values(m.recipes).filter((r) => filter === 'todas' || r.meals?.includes(filter)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    $('#grid', app).innerHTML = list.length ? list.map((r) => html`<a href="#/receta/${r.id}" class="glass" style="border-radius:18px;overflow:hidden;display:flex;flex-direction:column;text-decoration:none;color:#fff;box-shadow:none">
      <div style="height:96px;overflow:hidden">${r.photo ? `<img src="${blobUrl(r.photo)}" alt="" style="width:100%;height:100%;object-fit:cover">` : `<div class="empty-ph" style="background:rgba(255,255,255,0.06)">${icon('menus', 30, 1.6)}</div>`}</div>
      <div class="col" style="padding:8px 10px 10px;gap:2px"><span style="font-size:13px;font-weight:600;line-height:1.25">${esc(r.name)}</span><span class="num muted small">${fmt(recipeServing(r, m.foods).kcal)} kcal / ración</span></div></a>`).join('')
      : `<p class="muted" style="grid-column:1/-1;text-align:center;padding:30px 0;font-size:13px">No hay recetas aquí todavía.</p>`;
    $('#count', app).textContent = `${list.length} ${list.length === 1 ? 'receta' : 'recetas'}`;
  };
  app.innerHTML = html`<div class="screen">${header('recetas')}
    <div class="row" style="justify-content:space-between;gap:6px" role="tablist" aria-label="Filtrar por comida">
      ${[['todas', 'Todas'], ...MEALS.map(([k, l]) => [k, l])].map(([k, l]) => `<button class="chip-s" data-f="${k}" aria-pressed="${k === filter}" style="padding:0 10px">${l}</button>`).join('')}</div>
    <span class="muted small" id="count" style="padding:0 4px"></span>
    <div id="grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px"></div>
    <a class="btn small ghost" href="#/receta/nueva">${icon('plus', 16, 2.2)}Nueva receta</a>
  </div>`;
  $$('[data-f]', app).forEach((b) => b.addEventListener('click', () => { filter = b.dataset.f; sessionStorage.setItem('baku-filtro-recetas', filter); $$('[data-f]', app).forEach((x) => x.setAttribute('aria-pressed', x === b)); render(); }));
  render();
}

// ---------- Open Food Facts ----------
const OFF_FIELDS = 'code,product_name,product_name_es,brands,nutriments,categories_tags,serving_quantity,quantity';
function guessCat(tags = []) {
  const t = tags.join(' ');
  if (/beverage|drink|juice|bebida/.test(t)) return 'Bebidas';
  if (/dair|yogurt|cheese|milk|lact/.test(t)) return 'Lácteos';
  if (/legum|lentil|chickpea|bean/.test(t)) return 'Legumbres';
  if (/meat|fish|seafood|egg|poultry|ham/.test(t)) return 'Proteínas';
  if (/fruit/.test(t)) return 'Frutas';
  if (/vegetable/.test(t)) return 'Verduras';
  if (/oil|nut|fat|butter/.test(t)) return 'Grasas';
  if (/cereal|bread|pasta|rice|biscuit|cracker|grain/.test(t)) return 'Hidratos';
  return 'Otros';
}
export function fromOFF(p) {
  const n = p.nutriments || {};
  const kcal = n['energy-kcal_100g'] ?? (n.energy_100g ? n.energy_100g / 4.184 : null);
  if (kcal == null) return null;
  const sq = parseFloat(p.serving_quantity);
  return {
    name: (p.product_name_es || p.product_name || 'Producto sin nombre').trim(),
    brand: (p.brands || '').split(',')[0].trim(),
    cat: guessCat(p.categories_tags),
    kcal: Math.round(kcal), p: +(n.proteins_100g || 0).toFixed(1), h: +(n.carbohydrates_100g || 0).toFixed(1), g: +(n.fat_100g || 0).toFixed(1),
    portions: sq > 0 ? [{ name: '1 ración', g: Math.round(sq), default: true }] : [],
    barcode: p.code, quantity: p.quantity || '', source: 'off',
  };
}
async function offSearch(q) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&lc=es&cc=es&fields=${OFF_FIELDS}`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.products || []).map(fromOFF).filter(Boolean);
}
export async function offProduct(code) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`);
  const data = await res.json();
  return data.status === 1 ? fromOFF(data.product) : null;
}

// ---------- Alimentos ----------
export async function despensaAlimentos(app) {
  app.className = '';
  const s = await getSettings();
  if (!s.filled) { location.hash = '#/llenar'; return; }
  const m = await maps();
  let cat = sessionStorage.getItem('baku-cat') || 'Todas';
  let q = '';
  let offTimer, offSeq = 0;
  const row = (f, i) => {
    const op = f.hidden ? 'opacity:.5' : '';
    const sub = f.hidden ? 'Oculto · no saldrá en propuestas' : `${fmt(f.kcal)} kcal / 100 g${f.brand ? ' · ' + esc(f.brand) : ''}`;
    const btn = f.hidden
      ? `<button class="icon-btn plain" data-show="${f.id}" aria-label="Volver a mostrar ${esc(f.name)}" style="color:var(--apagado)">${icon('eyeoff', 17)}</button>`
      : `<button class="icon-btn plain" data-like="${f.id}" aria-pressed="${!!f.liked}" aria-label="${f.liked ? 'Quitar de me gusta' : 'Me gusta'}: ${esc(f.name)}" style="color:${f.liked ? 'var(--crema)' : 'var(--apagado)'}">${f.liked ? `<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/></svg>` : icon('heart', 17)}</button>`;
    return `<div class="list-row" style="padding:5px 0;${i ? '' : 'border-top:0'}"><a href="#/alimento/${f.id}" class="col grow" style="min-width:0;text-decoration:none;color:#fff;${op}"><span class="ellipsis" style="font-size:14px;font-weight:500">${esc(f.name)}</span><span class="num muted small ellipsis">${sub}</span></a>${btn}</div>`;
  };
  const render = () => {
    const all = Object.values(m.foods).filter((f) => (cat === 'Todas' || f.cat === cat) && (!q || f.name.toLowerCase().includes(q) || (f.brand || '').toLowerCase().includes(q)));
    const groups = (cat === 'Todas' ? CATEGORIES : [cat]).map((c) => [c, all.filter((f) => f.cat === c).sort((a, b) => (a.hidden - b.hidden) || (b.liked - a.liked) || a.name.localeCompare(b.name))]).filter(([, l]) => l.length);
    $('#groups', app).innerHTML = groups.map(([c, l]) => html`<section class="glass card" style="gap:0;padding:10px 10px 6px 14px">
      <div class="between" style="padding:0 4px 2px 0"><h2 class="h2">${c}</h2><span class="muted small num">${l.length} · ${l.filter((f) => f.liked).length} te gustan</span></div>${l.map(row).join('')}</section>`).join('')
      || (q ? '' : `<p class="muted" style="text-align:center;padding:20px 0;font-size:13px">No hay alimentos en esta categoría.</p>`);
    bindRows();
    $('#off', app).innerHTML = '';
    clearTimeout(offTimer);
    if (q.length >= 3) {
      $('#off', app).innerHTML = `<p class="muted small" style="text-align:center;padding:8px">Buscando en Open Food Facts…</p>`;
      const seq = ++offSeq;
      offTimer = setTimeout(async () => {
        try {
          const res = await offSearch(q);
          if (seq !== offSeq) return;
          $('#off', app).innerHTML = res.length ? html`<section class="glass card" style="gap:0;padding:10px 14px 6px"><div class="between" style="padding-bottom:2px"><h2 class="h2">En Open Food Facts</h2><span class="muted small">Toca para guardar</span></div>
            ${res.map((p, i) => `<button class="list-row" data-off="${i}" style="background:none;border-left:0;border-right:0;border-bottom:0;color:#fff;text-align:left;${i ? '' : 'border-top:0'}"><span class="col grow" style="min-width:0"><span class="ellipsis" style="font-size:14px">${esc(p.name)}</span><span class="muted small num ellipsis">${esc(p.brand || 'Sin marca')} · ${p.kcal} kcal / 100 g</span></span>${icon('plus', 16, 2.2)}</button>`).join('')}</section>`
            : `<p class="muted small" style="text-align:center;padding:8px">Nada en Open Food Facts. Puedes <a href="#/alimento/nuevo">añadirlo a mano</a>.</p>`;
          $$('[data-off]', app).forEach((b) => b.addEventListener('click', () => scanResult(res[+b.dataset.off])));
        } catch (_) {
          if (seq === offSeq) $('#off', app).innerHTML = `<p class="muted small" style="text-align:center;padding:8px">Sin conexión con Open Food Facts.</p>`;
        }
      }, 500);
    }
  };
  const bindRows = () => {
    $$('[data-like]', app).forEach((b) => b.addEventListener('click', async () => { const f = m.foods[b.dataset.like]; f.liked = !f.liked; await foodPut(f); render(); }));
    $$('[data-show]', app).forEach((b) => b.addEventListener('click', async () => { const f = m.foods[b.dataset.show]; f.hidden = false; await foodPut(f); render(); }));
  };
  app.innerHTML = html`<div class="screen">${header('alimentos')}
    <div class="row" style="gap:8px"><label class="search glass flat">${icon('search', 16, 2)}<input id="q" type="search" placeholder="Buscar alimento" aria-label="Buscar alimento"></label>
    <a class="icon-btn glass flat" href="#/escaner" aria-label="Escanear código de barras" style="width:44px;height:44px">${icon('scan', 18)}</a></div>
    <div class="hscroll">${['Todas', ...CATEGORIES].map((c) => `<button class="chip-s" data-cat="${c}" aria-pressed="${c === cat}">${c}</button>`).join('')}</div>
    <div id="groups" class="col" style="gap:12px"></div>
    <div id="off"></div>
    <span class="muted small" style="text-align:center">Los que te gustan salen primero en las propuestas. Los ocultos, nunca.</span>
    <a class="btn small ghost" href="#/alimento/nuevo">${icon('plus', 16, 2.2)}Añadir a mano</a>
  </div>`;
  $('#q', app).addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); render(); });
  $$('[data-cat]', app).forEach((b) => b.addEventListener('click', () => { cat = b.dataset.cat; sessionStorage.setItem('baku-cat', cat); $$('[data-cat]', app).forEach((x) => x.setAttribute('aria-pressed', x === b)); render(); }));
  render();
}

// ---------- Ficha del alimento ----------
export async function fichaAlimento(app, profile, id) {
  app.className = 'full';
  const m = await maps();
  const f = m.foods[id];
  if (!f) { location.hash = '#/despensa/alimentos'; return; }
  const inRecipes = Object.values(m.recipes).filter((r) => r.items.some((it) => it.foodId === id));
  const save = async () => { await foodPut(f); fichaAlimento(app, profile, id); };
  app.innerHTML = html`<div class="screen">
    <div class="between"><button class="icon-btn glass flat" id="back" aria-label="Volver">${icon('back', 18, 2)}</button>
      <div class="row" style="gap:8px"><button class="icon-btn glass flat" id="like" aria-pressed="${!!f.liked}" aria-label="${f.liked ? 'Quitar de me gusta' : 'Me gusta'}" style="color:${f.liked ? 'var(--crema)' : '#fff'}">${f.liked ? `<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/></svg>` : icon('heart', 17)}</button>${circleBtn('more', 'Más opciones', 'id="more"')}</div></div>
    <div class="col" style="gap:8px;padding:0 4px"><h1 class="h1">${esc(f.name)}</h1>
      <div class="row" style="gap:6px;flex-wrap:wrap"><span class="pill">${f.cat}</span>${f.brand ? `<span class="pill">${esc(f.brand)}</span>` : ''}<span class="muted small">${f.source === 'off' ? 'Datos: Open Food Facts' : f.source === 'manual' ? 'Añadido a mano' : 'Valores medios · editables'}</span>${f.hidden ? '<span class="pill">Oculto</span>' : ''}</div></div>
    <section class="glass card" style="flex-direction:row;justify-content:space-between;align-items:center">
      <span class="col"><span class="muted small">Por 100 g</span><span class="num" style="font-size:22px;font-weight:600">${fmt(f.kcal)} <span class="unit">kcal</span></span></span>
      <span class="num row" style="gap:12px;font-size:12px">${[['Proteína', f.p], ['Hidratos', f.h], ['Grasas', f.g]].map(([l, v]) => `<span class="col" style="align-items:center"><span style="font-weight:600">${fmt(v, v % 1 && v < 10 ? 1 : 0)} g</span><span class="muted small">${l}</span></span>`).join('')}</span></section>
    <section class="glass card" style="gap:0;padding:12px 14px 6px">
      <div class="between" style="padding-bottom:2px"><h2 class="h2">Raciones habituales</h2><span class="muted small">Así no tienes que pesar</span></div>
      ${(f.portions || []).map((p, i) => `<div class="list-row"><button class="col grow" data-def="${i}" style="background:none;border:0;padding:0;color:#fff;text-align:left" aria-label="Usar ${esc(p.name)} por defecto"><span style="font-size:14px;font-weight:500">${esc(p.name)}</span><span class="muted small num">${p.g} g</span></button>
        ${p.default ? '<span class="pill" style="height:22px;font-size:11px;background:rgba(242,234,219,0.16)">Por defecto</span>' : ''}<span class="num" style="width:62px;text-align:right;font-size:14px;font-weight:600">${fmt(foodNutr(f, p.g).kcal)} <span class="unit">kcal</span></span>
        <button class="icon-btn plain" data-rmp="${i}" aria-label="Quitar ración" style="color:var(--apagado)">${icon('close', 14, 2)}</button></div>`).join('')}
      <button class="link row" id="addp" style="gap:6px;padding:10px 0 6px;font-size:14px">${icon('plus', 16, 2.4)}Añadir ración</button></section>
    ${inRecipes.length ? html`<section class="glass card" style="gap:0;padding:12px 14px 4px"><div class="between" style="padding-bottom:2px"><h2 class="h2">Sale en tus recetas</h2><span class="muted small num">${inRecipes.length}</span></div>
      ${inRecipes.map((r) => `<a href="#/receta/${r.id}" class="list-row" style="text-decoration:none;color:#fff"><span class="grow" style="font-size:14px">${esc(r.name)}</span><span class="muted">${icon('chev', 14, 2)}</span></a>`).join('')}</section>` : ''}
    <div class="spacer"></div>
    <button class="btn" id="add">${icon('plus', 18, 2.2)}Añadir a un día</button>
  </div>`;
  $('#back', app).addEventListener('click', () => history.back());
  $('#like', app).addEventListener('click', () => { f.liked = !f.liked; if (f.liked) f.hidden = false; save(); });
  $$('[data-def]', app).forEach((b) => b.addEventListener('click', () => { f.portions.forEach((p, i) => { p.default = i === +b.dataset.def; }); save(); }));
  $$('[data-rmp]', app).forEach((b) => b.addEventListener('click', () => { f.portions.splice(+b.dataset.rmp, 1); if (f.portions.length && !f.portions.some((p) => p.default)) f.portions[0].default = true; save(); }));
  $('#addp', app).addEventListener('click', () => sheet('Añadir ración', html`<div class="field"><label for="pn">Nombre</label><input id="pn" class="input glass flat" placeholder="1 plato, 1 vaso, 1 puñado…"></div>
    <div class="field"><label for="pg">Gramos</label><input id="pg" class="input glass flat num" type="number" inputmode="decimal" placeholder="100"></div><button class="btn" id="ok">Guardar ración</button>`, {
    onMount: ({ el, close }) => $('#ok', el).addEventListener('click', () => {
      const name = $('#pn', el).value.trim(), g = +$('#pg', el).value;
      if (!name || !(g > 0)) return toast('Pon un nombre y los gramos');
      f.portions = [...(f.portions || []), { name, g, default: !(f.portions || []).length }];
      close(); save();
    }),
  }));
  $('#more', app).addEventListener('click', () => sheet('Opciones', `<div class="col">
    <button data-o="edit" class="list-row" style="background:none;border-left:0;border-right:0;border-bottom:0;color:#fff;gap:12px;border-top:0">${icon('edit', 18)}<span style="font-size:15px">Editar valores</span></button>
    <button data-o="hide" class="list-row" style="background:none;border-left:0;border-right:0;border-bottom:0;color:#fff;gap:12px">${icon(f.hidden ? 'eye' : 'eyeoff', 18)}<span style="font-size:15px">${f.hidden ? 'Volver a mostrar' : 'Ocultar · no saldrá en propuestas'}</span></button>
    <button data-o="del" class="list-row" style="background:none;border-left:0;border-right:0;border-bottom:0;color:var(--oxido-claro);gap:12px">${icon('trash', 18)}<span style="font-size:15px">Eliminar de la despensa</span></button></div>`, {
    onMount: ({ el, close }) => $$('[data-o]', el).forEach((b) => b.addEventListener('click', async () => {
      close();
      if (b.dataset.o === 'edit') location.hash = `#/alimento/${id}/editar`;
      if (b.dataset.o === 'hide') { f.hidden = !f.hidden; if (f.hidden) f.liked = false; save(); }
      if (b.dataset.o === 'del') {
        if (inRecipes.length) return toast('Está en recetas: quítalo de ellas primero');
        if (!confirm(`¿Eliminar «${f.name}»?`)) return;
        await db.del('foods', id); location.hash = '#/despensa/alimentos';
      }
    })),
  }));
  $('#add', app).addEventListener('click', () => {
    const today = todayISO();
    const meal = ['desayuno', 'comida', 'merienda', 'cena'][Math.min(3, Math.floor(Math.max(0, new Date().getHours() - 7) / 4))];
    foodAmountSheet(f, `Añadir a hoy (${MEAL_NAME[meal].toLowerCase()})`, async (g) => {
      const day = await dayGet(today);
      day.meals[meal].push({ kind: 'food', id: f.id, g });
      await dayPut(day);
      toast(`Añadido a ${MEAL_NAME[meal].toLowerCase()}`);
    });
  });
}

// ---------- Alta manual y edición ----------
export async function altaManual(app, profile, params, editId) {
  app.className = 'full';
  const existing = editId ? await foodGet(editId) : null;
  const code = params.get('codigo') || existing?.barcode || '';
  const f = existing ? { ...existing } : { id: uid(), name: '', brand: '', cat: 'Otros', kcal: '', p: '', h: '', g: '', portions: [], liked: false, hidden: false, barcode: code, source: 'manual' };
  let portionName = f.portions?.[0]?.name || '', portionG = f.portions?.[0]?.g || '';
  const field = (k, l, u) => `<label class="glass flat" style="border-radius:16px;padding:8px 14px;display:flex;flex-direction:column;gap:2px"><span class="muted small">${l}</span><span class="row" style="gap:4px"><input data-k="${k}" class="num" type="number" inputmode="decimal" value="${f[k]}" placeholder="0" style="width:100%;border:0;background:transparent;outline:none;font-size:20px;font-weight:600"><span class="unit">${u}</span></span></label>`;
  app.innerHTML = html`<div class="screen">
    <div class="row" style="gap:12px"><button class="icon-btn glass flat" id="x" aria-label="Cerrar">${icon('close', 16, 2.2)}</button><h1 style="font-size:20px;font-weight:600">${existing ? 'Editar alimento' : 'Nuevo alimento'}</h1></div>
    ${code && !existing ? `<div class="row" style="gap:10px;align-items:flex-start;border-radius:16px;background:rgba(242,234,219,0.1);padding:10px 12px"><span style="color:var(--crema);display:flex;padding-top:1px">${icon('info', 16, 2)}</span><span style="font-size:12px;line-height:1.4">El código ${esc(code)} no está en la base de datos. Copia la etiqueta una vez y se queda guardado.</span></div>` : ''}
    <div class="field"><label class="muted small" for="n" style="padding-left:4px">Nombre</label><input id="n" class="input glass flat" value="${esc(f.name)}" placeholder="Tortitas de maíz" style="font-size:16px;font-weight:600"></div>
    <div class="row" style="gap:8px"><input id="b" class="input glass flat" value="${esc(f.brand || '')}" placeholder="Marca (opcional)" style="height:44px;border-radius:999px;font-size:14px"></div>
    <div class="hscroll">${CATEGORIES.map((c) => `<button class="chip-s" data-cat="${c}" aria-pressed="${c === f.cat}">${c}</button>`).join('')}</div>
    <div class="between" style="padding:4px 4px 0"><h2 class="h2">Valores por 100 g</h2><span class="muted small">Como en la etiqueta</span></div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">${field('kcal', 'Energía', 'kcal')}${field('p', 'Proteína', 'g')}${field('h', 'Hidratos', 'g')}${field('g', 'Grasas', 'g')}</div>
    <span id="chk" class="small" style="padding-left:4px"></span>
    <div class="between" style="padding:4px 4px 0"><h2 class="h2">Ración</h2><span class="muted small">Opcional</span></div>
    <div class="row" style="gap:8px"><input id="pn" class="input glass flat" value="${esc(portionName)}" placeholder="1 tortita" style="height:46px;flex:1"><input id="pg" class="input glass flat num" type="number" inputmode="decimal" value="${portionG}" placeholder="g" style="height:46px;width:90px;text-align:right"></div>
    <div class="spacer"></div>
    <button class="btn" id="save">${existing ? 'Guardar cambios' : 'Guardar alimento'}</button>
  </div>`;
  const check = () => {
    const k = +f.kcal, est = 4 * +f.p + 4 * +f.h + 9 * +f.g;
    const el = $('#chk', app);
    if (!k || !est) { el.textContent = ''; return; }
    const ok = Math.abs(k - est) / k < 0.15;
    el.innerHTML = ok ? `<span style="color:var(--salvia)">${icon('check', 13, 2.6)}</span> <span class="muted">Las kcal cuadran con los macros</span>` : `<span style="color:var(--oxido-claro)">Revisa los números: con esos macros saldrían unas ${fmt(est)} kcal</span>`;
  };
  $('#x', app).addEventListener('click', () => history.back());
  $('#n', app).addEventListener('input', (e) => { f.name = e.target.value; });
  $('#b', app).addEventListener('input', (e) => { f.brand = e.target.value; });
  $$('[data-k]', app).forEach((i) => i.addEventListener('input', (e) => { f[i.dataset.k] = e.target.value; check(); }));
  $$('[data-cat]', app).forEach((b) => b.addEventListener('click', () => { f.cat = b.dataset.cat; $$('[data-cat]', app).forEach((x) => x.setAttribute('aria-pressed', x === b)); }));
  $('#pn', app).addEventListener('input', (e) => { portionName = e.target.value; });
  $('#pg', app).addEventListener('input', (e) => { portionG = e.target.value; });
  $('#save', app).addEventListener('click', async () => {
    if (!f.name.trim() || f.kcal === '') return toast('Falta el nombre o las kcal');
    const food = { ...f, name: f.name.trim(), kcal: +f.kcal, p: +f.p || 0, h: +f.h || 0, g: +f.g || 0 };
    if (portionName.trim() && +portionG > 0) {
      const rest = (existing?.portions || []).slice(1);
      food.portions = [{ name: portionName.trim(), g: +portionG, default: true }, ...rest.map((p) => ({ ...p, default: false }))];
    }
    await foodPut(food);
    location.hash = `#/alimento/${food.id}`;
    setTimeout(() => toast('Guardado en la Despensa'), 250);
  });
  check();
}

// ---------- Resultado de escanear o buscar ----------
export function scanResult(p, onDone) {
  let cat = p.cat;
  const portion = p.portions[0];
  sheet('Producto encontrado', html`
    <div class="row" style="gap:12px"><span style="width:52px;height:52px;border-radius:14px;background:rgba(242,234,219,0.12);display:flex;align-items:center;justify-content:center;color:var(--crema);flex:none">${icon('despensa', 22)}</span>
      <span class="col" style="min-width:0"><span style="font-size:17px;font-weight:600;line-height:1.2">${esc(p.name)}</span><span class="muted small">${esc(p.brand || 'Sin marca')}${p.quantity ? ' · ' + esc(p.quantity) : ''}</span></span></div>
    <div class="between"><span class="muted small">Categoría</span><div class="hscroll" style="margin:0;padding:0;max-width:66%">${CATEGORIES.map((c) => `<button class="chip-s" data-cat="${c}" aria-pressed="${c === cat}">${c}</button>`).join('')}</div></div>
    <div style="border-radius:18px;background:rgba(255,255,255,0.06);padding:10px 14px" class="between"><span class="col"><span class="muted small">Por 100 g</span><span class="num" style="font-size:20px;font-weight:600">${p.kcal} <span class="unit">kcal</span></span></span>
      <span class="num row" style="gap:12px;font-size:12px">${[['Proteína', p.p], ['Hidratos', p.h], ['Grasas', p.g]].map(([l, v]) => `<span class="col" style="align-items:center"><span style="font-weight:600">${String(v).replace('.', ',')} g</span><span class="muted small">${l}</span></span>`).join('')}</span></div>
    ${portion ? `<div class="between" style="padding:0 4px"><span style="font-size:13px">Ración: ${portion.name} · <span class="num">${portion.g} g</span></span><span class="num" style="font-weight:600">${fmt((p.kcal * portion.g) / 100)} <span class="unit">kcal</span></span></div>` : ''}
    <button class="btn" id="ok">Guardar en la Despensa</button>
    <div class="between" style="padding:0 4px"><a class="link" href="#/alimento/nuevo${p.barcode ? '?codigo=' + p.barcode : ''}">No es este producto</a><span class="muted small">Datos: Open Food Facts</span></div>`, {
    onMount: ({ el, close }) => {
      $$('[data-cat]', el).forEach((b) => b.addEventListener('click', () => { cat = b.dataset.cat; $$('[data-cat]', el).forEach((x) => x.setAttribute('aria-pressed', x === b)); }));
      $('#ok', el).addEventListener('click', async () => {
        const existing = p.barcode ? (await db.all('foods')).find((f) => f.barcode === p.barcode) : null;
        const food = existing || { id: uid(), ...p, cat, liked: false, hidden: false };
        food.cat = cat;
        await foodPut(food);
        close();
        location.hash = `#/alimento/${food.id}`;
        setTimeout(() => toast('Guardado en la Despensa'), 250);
        onDone && onDone();
      });
    },
  });
}

// ---------- Escáner de códigos de barras ----------
export async function escaner(app) {
  app.className = 'full';
  app.style.padding = '0';
  const supported = 'BarcodeDetector' in window;
  app.innerHTML = html`<div style="position:fixed;inset:0;background:#0d1a15">
    <video id="v" playsinline muted style="width:100%;height:100%;object-fit:cover"></video>
    <div style="position:absolute;left:50%;top:42%;width:240px;height:150px;transform:translate(-50%,-50%);border-radius:18px;box-shadow:0 0 0 2000px rgba(8,20,16,0.45)">
      <svg width="240" height="150" viewBox="0 0 240 150" aria-hidden="true" style="position:absolute;inset:0"><g fill="none" stroke="#F2EADB" stroke-width="3.5" stroke-linecap="round"><path d="M2 32V14A12 12 0 0 1 14 2h18"/><path d="M208 2h18a12 12 0 0 1 12 12v18"/><path d="M238 118v18a12 12 0 0 1-12 12h-18"/><path d="M32 148H14A12 12 0 0 1 2 136v-18"/></g><rect x="40" y="74" width="160" height="2" rx="1" fill="#A9D3A0"><animate attributeName="y" values="30;118;30" dur="2.4s" repeatCount="indefinite"/></rect></svg></div>
    <div class="between" style="position:absolute;left:16px;right:16px;top:calc(52px + var(--safe-top))">
      <button class="icon-btn glass flat" id="x" aria-label="Cerrar" style="background:rgba(20,40,32,0.35)">${icon('close', 16, 2.2)}</button>
      <span class="glass flat" id="st" style="height:32px;padding:0 12px;border-radius:999px;font-size:12px;display:flex;align-items:center;background:rgba(20,40,32,0.35)">${supported ? 'Apunta al código de barras' : 'Escribe el código'}</span><span style="width:40px"></span></div>
    <div class="glass" style="position:absolute;left:12px;right:12px;bottom:calc(24px + var(--safe-bottom));border-radius:24px;padding:14px;display:flex;flex-direction:column;gap:10px">
      <span class="muted small">${supported ? '¿No lo lee? Escribe los números de debajo de las barras.' : 'Este navegador no puede leer códigos con la cámara.'}</span>
      <div class="row" style="gap:8px"><input id="code" class="input glass flat num" inputmode="numeric" placeholder="8480000123456" style="height:46px;flex:1"><button class="btn small" id="go" style="width:auto;padding:0 18px">Buscar</button></div></div>
  </div>`;
  let stream, stop = false;
  const st = (t) => { $('#st', app).textContent = t; };
  const lookup = async (code) => {
    stop = true;
    st('Buscando…');
    try {
      const p = await offProduct(code);
      stream?.getTracks().forEach((t) => t.stop());
      if (p) scanResult(p);
      else location.hash = `#/alimento/nuevo?codigo=${code}`;
    } catch (_) { st('Sin conexión'); stop = false; }
  };
  $('#x', app).addEventListener('click', () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); history.back(); });
  $('#go', app).addEventListener('click', () => { const c = $('#code', app).value.replace(/\D/g, ''); if (c.length >= 8) lookup(c); else toast('El código tiene al menos 8 números'); });
  window.addEventListener('hashchange', () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); }, { once: true });
  if (!supported || !navigator.mediaDevices) return;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const v = $('#v', app);
    v.srcObject = stream;
    await v.play();
    const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    const loop = async () => {
      if (stop) return;
      try {
        const codes = await det.detect(v);
        if (codes.length) { if (navigator.vibrate) navigator.vibrate(30); return lookup(codes[0].rawValue); }
      } catch (_) { /* sigue intentando */ }
      setTimeout(loop, 250);
    };
    loop();
  } catch (_) { st('Sin permiso de cámara'); }
}

// ---------- Primera vez: llena tu despensa ----------
export async function llenar(app) {
  app.className = 'full';
  const foods = await db.all('foods');
  const byName = Object.fromEntries(foods.map((f) => [f.name, f]));
  const list = SEED.map((s) => byName[s.name]).filter(Boolean);
  const state = Object.fromEntries(list.map((f) => [f.id, f.hidden ? 'hid' : f.liked ? 'on' : '']));
  const count = () => Object.values(state).filter(Boolean).length;
  const chip = (f) => {
    const s = state[f.id];
    if (s === 'on') return `<button data-id="${f.id}" aria-pressed="true" style="min-height:40px;border-radius:999px;border:0;background:var(--crema);color:var(--fondo);font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:5px;padding:4px 8px">${icon('heart', 12, 2.4)}${esc(f.name)}</button>`;
    if (s === 'hid') return `<button data-id="${f.id}" aria-pressed="mixed" aria-label="${esc(f.name)}, oculto" class="glass flat" style="min-height:40px;border-radius:999px;color:rgba(255,255,255,0.5);font-size:13px;display:flex;align-items:center;justify-content:center;gap:5px;padding:4px 8px;text-decoration:line-through">${icon('eyeoff', 12, 2)}${esc(f.name)}</button>`;
    return `<button data-id="${f.id}" aria-pressed="false" class="glass flat" style="min-height:40px;border-radius:999px;color:#fff;font-size:13px;padding:4px 8px">${esc(f.name)}</button>`;
  };
  const render = () => {
    $('#groups', app).innerHTML = CATEGORIES.map((c) => {
      const l = list.filter((f) => f.cat === c);
      return l.length ? `<div class="col" style="gap:8px"><h2 style="font-size:14px;font-weight:600;padding-left:4px">${c}</h2><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px">${l.map(chip).join('')}</div></div>` : '';
    }).join('');
    $('#cnt', app).textContent = `${count()} de ${list.length} marcados`;
    $$('[data-id]', app).forEach((b) => b.addEventListener('click', () => {
      const s = state[b.dataset.id];
      state[b.dataset.id] = s === '' ? 'on' : s === 'on' ? 'hid' : '';
      if (navigator.vibrate) navigator.vibrate(5);
      render();
    }));
  };
  const finish = async () => {
    for (const f of list) { f.liked = state[f.id] === 'on'; f.hidden = state[f.id] === 'hid'; await foodPut(f); }
    await saveSettings({ filled: true });
    location.hash = '#/despensa/alimentos';
    setTimeout(() => toast('Despensa lista'), 250);
  };
  app.innerHTML = html`<div class="screen">
    <div class="between"><span class="muted num small" id="cnt"></span><button class="link" id="skip">Saltar</button></div>
    <div class="col" style="gap:6px;padding:0 4px"><h1 style="font-size:26px;font-weight:600;letter-spacing:-0.02em">Llena tu despensa</h1>
      <p class="muted" style="font-size:13px;line-height:1.4">Toca una vez lo que te gusta. Dos veces, lo que no quieres ver nunca. Lo demás, déjalo como está.</p></div>
    <div class="row muted small" style="gap:14px;padding:0 4px;flex-wrap:wrap"><span class="row" style="gap:4px;color:var(--crema)">${icon('heart', 12, 2.4)}Me gusta</span><span class="row" style="gap:4px">${icon('eyeoff', 12, 2)}Oculto</span><span>Sin marcar: puede salir</span></div>
    <div id="groups" class="col" style="gap:14px"></div>
    <div style="height:70px"></div>
  </div>
  <div style="position:fixed;left:50%;transform:translateX(-50%);width:min(448px,calc(100% - 32px));bottom:calc(24px + var(--safe-bottom));z-index:5"><button class="btn" id="done" style="box-shadow:0 8px 24px rgba(0,0,0,0.3)">Listo, guardar</button></div>`;
  $('#skip', app).addEventListener('click', async () => { await saveSettings({ filled: true }); location.hash = '#/despensa/alimentos'; });
  $('#done', app).addEventListener('click', finish);
  render();
}
export { addDays, parse };
