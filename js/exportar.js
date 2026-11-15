// Exportar el menú (un día o la semana) a una tabla en PDF para compartir por WhatsApp.
// Usa jsPDF + AutoTable (licencia MIT), que solo se descargan la primera vez que exportas.
import { fmt } from './plan.js';
import { MEALS, maps, dayGet, entryNutr, entryName, entryAmount, dayTotals, parse } from './store.js';

const WD = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MON = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const longDate = (s) => { const d = parse(s); return `${WD[d.getDay()]} ${d.getDate()} de ${MON[d.getMonth()]}`; };
const shortDate = (s) => { const d = parse(s); return `${d.getDate()} ${MON[d.getMonth()].slice(0, 3)}`; };

// Colores de Baku
const PINO = [27, 58, 47], CREMA = [242, 234, 219], SUAVE = [248, 245, 238], TINTA = [30, 40, 35], GRIS = [110, 118, 112];

// Las fuentes estándar del PDF no tienen algunos signos: los cambiamos por otros que sí
const clean = (t) => String(t ?? '').replace(/≈/g, '~').replace(/−/g, '-').replace(/→/g, '->').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '');

const loaded = {};
const script = (src) => (loaded[src] ||= new Promise((ok, ko) => {
  const s = document.createElement('script');
  s.src = src; s.onload = ok; s.onerror = () => { delete loaded[src]; ko(new Error('Sin conexión para preparar el PDF')); };
  document.head.appendChild(s);
}));
async function libs() {
  await script('js/vendor/jspdf.umd.min.js');
  await script('js/vendor/jspdf.plugin.autotable.min.js');
  return { jsPDF: window.jspdf.jsPDF, autoTable: window.autoTable };
}
async function logo() {
  try {
    const b = await (await fetch('icons/icon-192.png')).blob();
    return await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); });
  } catch (_) { return null; }
}

// Texto de un plato dentro de la tabla
const dish = (e, m) => {
  const amt = entryAmount(e, m);
  return e.kind === 'recipe' ? (e.servings && e.servings !== 1 ? `${entryName(e, m)} (${amt})` : entryName(e, m)) : `${entryName(e, m)} (${amt})`;
};

/**
 * Crea el PDF.
 * opts: { dates: [iso…], name, recipes: bool, kcal: bool, goal }
 * Devuelve { blob, filename } o null si no hay nada planificado.
 */
export async function menuPdf(opts) {
  const m = await maps();
  const days = await Promise.all(opts.dates.map(dayGet));
  if (!days.some((d) => MEALS.some(([k]) => d.meals[k].length))) return null;
  const { jsPDF, autoTable } = await libs();
  const week = days.length > 1;
  const doc = new jsPDF({ orientation: week ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 14;
  const img = await logo();

  // Cabecera
  const title = week ? 'Menú de la semana' : 'Menú del día';
  const sub = week ? `Del ${longDate(opts.dates[0]).toLowerCase()} al ${longDate(opts.dates[opts.dates.length - 1]).toLowerCase()}` : longDate(opts.dates[0]);
  const header = () => {
    if (img) doc.addImage(img, 'PNG', M, 11, 11, 11);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...PINO);
    doc.text(clean(title), M + (img ? 15 : 0), 17.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...GRIS);
    doc.text(clean(`${sub}${opts.name ? ` · Menú de ${opts.name}` : ''}`), M + (img ? 15 : 0), 22.5);
  };
  header();

  // Tabla
  const head = week
    ? [['Día', ...MEALS.map(([, l]) => l), ...(opts.kcal ? ['kcal'] : [])]]
    : [['Comida', 'Plato', 'Cantidad', ...(opts.kcal ? ['kcal'] : [])]];
  let body;
  if (week) {
    body = days.map((d) => [
      `${WD[parse(d.date).getDay()]}\n${shortDate(d.date)}`,
      ...MEALS.map(([k]) => (d.meals[k].length ? d.meals[k].map((e) => '- ' + dish(e, m)).join('\n') : '-')),
      ...(opts.kcal ? [MEALS.some(([k]) => d.meals[k].length) ? fmt(dayTotals(d, m).kcal) : '-'] : []),
    ]);
  } else {
    const d = days[0];
    body = [];
    for (const [k, l] of MEALS) {
      const items = d.meals[k];
      if (!items.length) { body.push([l, '-', '', ...(opts.kcal ? [''] : [])]); continue; }
      items.forEach((e, i) => body.push([i ? '' : l, entryName(e, m), entryAmount(e, m), ...(opts.kcal ? [fmt(entryNutr(e, m).kcal)] : [])]));
    }
    if (opts.kcal) body.push(['', 'Total del día', '', fmt(dayTotals(d, m).kcal)]);
  }
  const cw = week
    ? { 0: { cellWidth: 26, fontStyle: 'bold' }, ...(opts.kcal ? { 5: { cellWidth: 16, halign: 'right' } } : {}) }
    : { 0: { cellWidth: 28, fontStyle: 'bold' }, 2: { cellWidth: 34 }, ...(opts.kcal ? { 3: { cellWidth: 16, halign: 'right' } } : {}) };
  autoTable(doc, {
    startY: 29, margin: { left: M, right: M, top: 16, bottom: 16 },
    head, body: body.map((r) => r.map(clean)), theme: 'grid',
    styles: { font: 'helvetica', fontSize: 10, cellPadding: week ? 2.6 : 3, textColor: TINTA, lineColor: [225, 220, 208], lineWidth: 0.2, valign: 'top', overflow: 'linebreak' },
    headStyles: { fillColor: PINO, textColor: CREMA, fontStyle: 'bold', fontSize: 10 },
    alternateRowStyles: { fillColor: SUAVE },
    columnStyles: cw,
    didParseCell: (c) => { if (!week && opts.kcal && c.section === 'body' && c.row.index === body.length - 1) c.cell.styles.fontStyle = 'bold'; },
  });

  // Recetas: ingredientes y pasos, para quien cocina
  if (opts.recipes) {
    const ids = [];
    for (const d of days) for (const [k] of MEALS) for (const e of d.meals[k]) if (e.kind === 'recipe' && m.recipes[e.id] && !ids.includes(e.id)) ids.push(e.id);
    if (ids.length) {
      doc.addPage('a4', 'portrait');
      const PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight();
      let y = 18;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...PINO);
      doc.text('Recetas', M, y); y += 4;
      const need = (h) => { if (y + h > PH - 18) { doc.addPage('a4', 'portrait'); y = 18; } };
      for (const id of ids) {
        const r = m.recipes[id];
        const items = r.items.filter((it) => m.foods[it.foodId]);
        const steps = r.steps || [];
        need(24);
        y += 6;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...TINTA);
        const nameLines = doc.splitTextToSize(clean(r.name), PW - 2 * M);
        doc.text(nameLines, M, y); y += nameLines.length * 5;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRIS);
        doc.text(clean(`Cantidades para ${r.servings} ${r.servings === 1 ? 'ración' : 'raciones'}`), M, y); y += 2;
        // Ingredientes en dos columnas, a lo ancho
        const ing = items.map((it) => [clean(m.foods[it.foodId].name), clean(`${Math.round(it.g)} g`)]);
        const rows = [];
        for (let i = 0; i < ing.length; i += 2) rows.push([...ing[i], ...(ing[i + 1] || ['', ''])]);
        autoTable(doc, {
          startY: y + 1, margin: { left: M, right: M, top: 18, bottom: 18 }, theme: 'plain',
          body: rows,
          styles: { fontSize: 9.5, cellPadding: { top: 1, bottom: 1, left: 0, right: 3 }, textColor: TINTA },
          columnStyles: { 1: { halign: 'right', cellWidth: 18, textColor: GRIS }, 3: { halign: 'right', cellWidth: 18, textColor: GRIS } },
        });
        y = doc.lastAutoTable.finalY + 3;
        // Pasos, uno debajo de otro (si no caben, siguen en la página siguiente)
        doc.setFontSize(9.5); doc.setTextColor(...TINTA);
        if (steps.length) {
          need(6);
          y += 1.5; doc.setFont('helvetica', 'bold'); doc.text('Preparación', M, y); y += 4.8;
          steps.forEach((t, i) => {
            const lines = doc.splitTextToSize(clean(t), PW - 2 * M - 6);
            need(lines.length * 4.2 + 1);
            doc.setFont('helvetica', 'bold'); doc.text(`${i + 1}.`, M, y);
            doc.setFont('helvetica', 'normal'); doc.text(lines, M + 6, y);
            y += lines.length * 4.2 + 1.4;
          });
        }
        y += 1;
        doc.setDrawColor(225, 220, 208); doc.setLineWidth(0.2); doc.line(M, y, PW - M, y);
      }
    }
  }

  // Pie en todas las páginas
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text('Hecho con Baku', M, ph - 8);
    if (n > 1) doc.text(`${i} / ${n}`, pw - M, ph - 8, { align: 'right' });
  }
  const filename = `${week ? 'Menu-semana' : 'Menu'}-${shortDate(opts.dates[0]).replace(' ', '-')}.pdf`;
  return { blob: doc.output('blob'), filename, W, H };
}

// Compartir (WhatsApp, etc.) o, si el móvil no puede, descargar
export async function shareOrDownload({ blob, filename }, text) {
  const file = new File([blob], filename, { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename, text }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}
