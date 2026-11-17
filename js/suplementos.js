// Suplementos: los que solo se toman (creatina, omega 3, zinc…) se marcan con un toque en Hoy.
// Los que alimentan (batido de proteína, barrita…) van unidos a un alimento de la biblioteca y,
// al marcarlos, suman sus kcal y macros al día (store.suppTotals).
//
// Lista en ajustes: settings.supps = [{ id, name, dose, food?: nombre del alimento, g? }]
// Lo tomado, en el día: day.supps = { [id]: { n, d, foodId?, g? } } (copia, por si luego cambias la lista)
import { html, icon, esc, sheet, toast, $, $$ } from './ui.js';
import { fmt } from './plan.js';
import { getSettings, saveSettings, foodsAll, foodNutr, uid, dayPut } from './store.js';

export const PRESETS = [
  { name: 'Creatina', dose: '5 g' },
  { name: 'Omega 3', dose: '1 cápsula' },
  { name: 'Vitamina D', dose: '1 cápsula' },
  { name: 'Zinc', dose: '1 comprimido' },
  { name: 'Magnesio', dose: '1 comprimido' },
  { name: 'Multivitamínico', dose: '1 comprimido' },
  { name: 'Proteína en polvo', dose: '1 cacito', food: 'Proteína en polvo (whey)', g: 30 },
  { name: 'Batido de proteínas', dose: '1 botella', food: 'Batido de proteínas', g: 330 },
  { name: 'Barrita de proteínas', dose: '1 barrita', food: 'Barrita de proteínas', g: 60 },
];

const byName = (foods) => Object.fromEntries(foods.map((f) => [f.name, f]));
const nutrTxt = (f, g) => { const n = foodNutr(f, g); return `${fmt(n.kcal)} kcal · ${fmt(n.p)} g de proteína`; };

// Tarjeta de Hoy (solo si hay suplementos en la lista)
export function suppCard(settings, day, m) {
  const list = settings.supps || [];
  if (!list.length) return '';
  const foods = byName(Object.values(m.foods));
  const taken = list.filter((s) => day.supps?.[s.id]).length;
  return html`<section class="glass card" style="gap:10px;padding:12px 14px">
    <div class="between"><span class="col"><h2 class="h2">Suplementos</h2><span class="muted small num">${taken === list.length ? 'Todo tomado hoy' : `${taken} de ${list.length} tomados`}</span></span>
      <button class="link" id="suppEdit" style="font-size:12px">Editar</button></div>
    <div class="row" style="gap:6px;flex-wrap:wrap">${list.map((s) => {
      const on = !!day.supps?.[s.id];
      const f = s.food && foods[s.food];
      return html`<button class="chip" data-supp="${s.id}" aria-pressed="${on}" style="height:auto;min-height:40px;padding:6px 12px;display:inline-flex;align-items:center;gap:6px;text-align:left" aria-label="${esc(s.name)}, ${esc(s.dose)}: ${on ? 'tomado' : 'pendiente'}">
        ${on ? icon('check', 14, 2.6) : icon('pill', 14, 2)}<span class="col" style="line-height:1.2"><span style="font-size:13px">${esc(s.name)}</span><span class="small num" style="opacity:0.75;font-weight:400">${esc(s.dose)}${f ? ` · ${fmt(foodNutr(f, s.g).kcal)} kcal` : ''}</span></span></button>`;
    }).join('')}</div>
  </section>`;
}

export function bindSuppCard(app, day, settings, m, rerender) {
  $$('[data-supp]', app).forEach((b) => b.addEventListener('click', async () => {
    const s = (settings.supps || []).find((x) => x.id === b.dataset.supp);
    if (!s) return;
    day.supps = { ...(day.supps || {}) };
    if (day.supps[s.id]) delete day.supps[s.id];
    else {
      const f = s.food && Object.values(m.foods).find((x) => x.name === s.food);
      day.supps[s.id] = f ? { n: s.name, d: s.dose, foodId: f.id, g: s.g } : { n: s.name, d: s.dose };
      if (f) toast(`${s.name}: ${nutrTxt(f, s.g)} sumadas a hoy.`);
    }
    await dayPut(day);
    if (navigator.vibrate) navigator.vibrate(8);
    rerender();
  }));
  $('#suppEdit', app)?.addEventListener('click', () => suppSheet(rerender));
}

// Hoja para elegir los suplementos que tomas
export async function suppSheet(onDone) {
  const foods = byName(await foodsAll());
  let list = [...((await getSettings()).supps || [])];
  let form = null; // { name, dose, food?, g? }

  const body = () => {
    const names = new Set(list.map((s) => s.name));
    const presets = PRESETS.filter((p) => !names.has(p.name) && (!p.food || foods[p.food]));
    const ff = form?.food && foods[form.food];
    return html`<p class="muted" style="font-size:13px;line-height:1.4">Salen en Hoy para marcarlos con un toque. Los que alimentan (proteína, barritas) suman sus kcal y macros al marcarlos.</p>
    ${list.length ? html`<div class="glass flat" style="border-radius:16px;padding:2px 12px">${list.map((s) => {
      const f = s.food && foods[s.food];
      return html`<div class="list-row"><span class="col grow" style="min-width:0"><span style="font-size:14px;font-weight:500">${esc(s.name)}</span>
        <span class="muted small num">${esc(s.dose)}${f ? ` · ${nutrTxt(f, s.g)}` : ' · sin calorías'}</span></span>
        <button class="icon-btn glass flat" data-del="${s.id}" aria-label="Quitar ${esc(s.name)}" style="width:36px;height:36px">${icon('trash', 15, 2)}</button></div>`;
    }).join('')}</div>` : ''}
    ${form ? html`<div class="col" style="gap:10px">
        <div class="field"><label for="sName">Nombre</label><input id="sName" class="input glass flat" value="${esc(form.name)}" placeholder="Ej.: Hierro" ${form.food ? 'readonly' : ''}></div>
        <div class="field"><label for="sDose">${form.food ? 'Ración' : 'Cantidad'}</label><input id="sDose" class="input glass flat" value="${esc(form.dose)}" placeholder="Ej.: 1 cápsula"></div>
        ${ff ? html`<div class="field"><label for="sG">Gramos por toma</label><input id="sG" class="input glass flat num" inputmode="decimal" value="${form.g}">
          <span class="muted small num" id="sInfo">${nutrTxt(ff, form.g)}</span></div>` : ''}
        <div class="row" style="gap:8px"><button class="btn small ghost" id="sCancel" style="width:auto;padding:0 16px">Cancelar</button><button class="btn small grow" id="sAdd">Añadir</button></div>
      </div>`
      : html`<div class="col" style="gap:8px"><span class="label">Añadir</span>
        <div class="row" style="gap:6px;flex-wrap:wrap">${presets.map((p) => html`<button class="chip" data-pre="${PRESETS.indexOf(p)}" style="height:38px;padding:0 12px">${esc(p.name)}</button>`).join('')}
        <button class="chip" id="sOther" style="height:38px;padding:0 12px">${icon('plus', 13, 2.2)} Otro</button></div></div>`}
    <button class="btn" id="sDone">Listo</button>`;
  };

  sheet('Tus suplementos', '<div class="col" style="gap:14px" id="sBody"></div>', {
    onMount: (api) => {
      const root = $('#sBody', api.el);
      const save = async () => { await saveSettings({ supps: list }); onDone && onDone(); };
      const draw = () => {
        root.innerHTML = body();
        $$('[data-del]', root).forEach((b) => b.addEventListener('click', async () => { list = list.filter((s) => s.id !== b.dataset.del); await save(); draw(); }));
        $$('[data-pre]', root).forEach((b) => b.addEventListener('click', () => { form = { ...PRESETS[+b.dataset.pre] }; draw(); $('#sDose', root)?.focus(); }));
        $('#sOther', root)?.addEventListener('click', () => { form = { name: '', dose: '' }; draw(); $('#sName', root).focus(); });
        $('#sCancel', root)?.addEventListener('click', () => { form = null; draw(); });
        $('#sG', root)?.addEventListener('input', (e) => {
          const g = parseFloat(e.target.value.replace(',', '.'));
          if (g > 0) $('#sInfo', root).textContent = nutrTxt(foods[form.food], g);
        });
        $('#sAdd', root)?.addEventListener('click', async () => {
          const name = $('#sName', root).value.trim();
          const dose = $('#sDose', root).value.trim();
          if (!name) { toast('Ponle un nombre.'); return; }
          const s = { id: uid(), name, dose: dose || '1 toma' };
          if (form.food) {
            const g = parseFloat($('#sG', root).value.replace(',', '.'));
            if (!(g > 0)) { toast('Pon los gramos de cada toma.'); return; }
            s.food = form.food; s.g = g;
          }
          list.push(s); form = null; await save(); draw();
        });
        $('#sDone', root).addEventListener('click', () => api.close());
      };
      draw();
    },
  });
}
