// Reporte de avance del estudiante en PDF (jsPDF 2.5.1 desde cdnjs, CDN aprobado por Ceibal).
import { computeBadges } from './badges.js';
// Cada descarga queda registrada como una "entrega" numerada para seguir el avance en el tiempo.

const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
let loading = null;

function loadJsPdf() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = JSPDF_URL;
    s.async = true;
    s.onload = () => (window.jspdf?.jsPDF ? resolve(window.jspdf.jsPDF) : reject(new Error('jsPDF no cargó')));
    s.onerror = () => { loading = null; reject(new Error('No se pudo descargar jsPDF (¿sin internet?)')); };
    document.head.append(s);
  });
  return loading;
}

/** Las fuentes estándar del PDF solo tienen caracteres latinos: sacamos emojis y símbolos raros. */
function clean(text) {
  return String(text ?? '')
    .replace(/[✔✅]/g, 'OK')
    .replace(/[→➜]/g, '->')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF–—‘’“”•…]/g, '')
    .replace(/\s+\n/g, '\n');
}

function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).toUpperCase().padStart(8, '0');
}

function fmtDate(iso, withTime = false) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (x) => String(x).padStart(2, '0');
  const date = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  return withTime ? `${date} ${p(d.getHours())}:${p(d.getMinutes())}` : date;
}

function slug(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'estudiante';
}

/**
 * Registra una nueva entrega en `progress.entregas` y arma el PDF.
 * @returns {Promise<{ filename: string, entrega: object }>}
 */
export async function downloadProgressPdf({ student, progress, PHASES, MISSIONS, BONUS, CENTERS, save }) {
  const JsPDF = await loadJsPdf();

  // ---------- datos de la entrega ----------
  const now = new Date();
  const doneIds = PHASES.filter((p) => progress.completed[p.id]).map((p) => p.id);
  const bonusIds = BONUS.filter((p) => progress.completed[p.id]).map((p) => p.id);
  const grade = Math.round((doneIds.length / PHASES.length) * 100) / 10;
  progress.entregas = Array.isArray(progress.entregas) ? progress.entregas : [];
  const prev = progress.entregas[progress.entregas.length - 1] || null;
  const n = progress.entregas.length + 1;
  const code = `E${n}-${fnv(`${student.name}|${student.group}|${n}|${doneIds.join(',')}|${bonusIds.join(',')}|${now.toISOString()}`).replace(/(.{4})(.{4})/, '$1-$2')}`;
  const prevIds = new Set(prev?.ids || []);
  const nuevas = PHASES.filter((p) => progress.completed[p.id] && !prevIds.has(p.id));
  const nuevasBonus = BONUS.filter((p) => progress.completed[p.id] && !prevIds.has(p.id));
  const entrega = { n, fecha: now.toISOString(), nota: grade, fases: doneIds.length, bonus: bonusIds.length, ids: [...doneIds, ...bonusIds], code };

  // ---------- documento ----------
  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  const W = 210; const M = 14; const CW = W - M * 2; const BOTTOM = 282;
  let y = 0;
  const C = { ink: [27, 31, 36], muted: [91, 101, 112], amber: [184, 110, 0], green: [26, 127, 55], red: [180, 35, 24], line: [214, 209, 196], band: [13, 17, 23], ddl: [130, 80, 223], dml: [191, 57, 137], dql: [31, 111, 235] };
  const color = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const fill = (c) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c) => doc.setDrawColor(c[0], c[1], c[2]);
  const font = (style = 'normal', size = 10, fam = 'helvetica') => { doc.setFont(fam, style); doc.setFontSize(size); };

  const header = (first) => {
    fill(C.band); doc.rect(0, 0, W, first ? 30 : 14, 'F');
    color([255, 176, 0]); font('bold', first ? 18 : 11);
    doc.text('GTA SQL · Reporte de avance', M, first ? 13 : 9);
    color([230, 237, 243]); font('normal', first ? 10 : 8);
    doc.text(clean(`Bajo Mundo de Datos · Recurso educativo SHANUKI`), M, first ? 21 : 12.5);
    if (first) { font('bold', 10); color([0, 220, 240]); doc.text(clean(`Entrega N.º ${n}`), W - M, 13, { align: 'right' }); font('normal', 9); color([230, 237, 243]); doc.text(clean(fmtDate(entrega.fecha, true)), W - M, 21, { align: 'right' }); }
    y = first ? 38 : 22;
  };
  const ensure = (h) => { if (y + h > BOTTOM) { doc.addPage(); header(false); } };
  const section = (title) => {
    ensure(14);
    y += 3;
    color(C.amber); font('bold', 12); doc.text(clean(title), M, y);
    stroke(C.line); doc.setLineWidth(0.4); doc.line(M, y + 1.8, W - M, y + 1.8);
    y += 7;
  };
  const para = (text, { size = 10, style = 'normal', col = C.ink, indent = 0, lh = 4.6 } = {}) => {
    font(style, size); color(col);
    const lines = doc.splitTextToSize(clean(text), CW - indent);
    for (const ln of lines) { ensure(lh); doc.text(ln, M + indent, y); y += lh; }
  };

  header(true);

  // ---------- datos del estudiante ----------
  font('bold', 9); color(C.muted);
  doc.text('ESTUDIANTE', M, y); doc.text('GRUPO', M + 105, y); doc.text('CÓDIGO DE ENTREGA', M + 145, y);
  y += 5.5;
  font('bold', 13); color(C.ink);
  doc.text(clean(student.name || '(sin nombre)'), M, y, { maxWidth: 100 });
  doc.text(clean(student.group || '-'), M + 105, y, { maxWidth: 38 });
  font('bold', 10); doc.text(code, M + 145, y);
  y += 9;

  // ---------- nota y avance ----------
  stroke(C.line); fill([246, 245, 239]); doc.setLineWidth(0.3); doc.roundedRect(M, y, CW, 34, 3, 3, 'FD');
  color(C.amber); font('bold', 34); doc.text(grade.toFixed(1), M + 6, y + 19);
  const gw = doc.getTextWidth(grade.toFixed(1));
  color(C.muted); font('normal', 11); doc.text('/ 10', M + 6 + gw + 2, y + 19);
  font('normal', 9); doc.text(clean(`${doneIds.length} de ${PHASES.length} fases logradas`), M + 6, y + 27);
  doc.text('Nota = (fases logradas / 27) x 10', M + 6, y + 31.5);
  const bx = M + 70; let by = y + 7;
  for (const [k, col] of [['DDL', C.ddl], ['DML', C.dml], ['DQL', C.dql]]) {
    const all = PHASES.filter((p) => p.kind === k); const d = all.filter((p) => progress.completed[p.id]).length;
    color(C.ink); font('bold', 9); doc.text(k, bx, by + 3);
    fill([225, 228, 232]); doc.roundedRect(bx + 12, by, 82, 4, 1.5, 1.5, 'F');
    if (d) { fill(col); doc.roundedRect(bx + 12, by, Math.max(3, 82 * (d / all.length)), 4, 1.5, 1.5, 'F'); }
    font('normal', 9); color(C.muted); doc.text(`${d}/${all.length}`, bx + 98, by + 3.3);
    by += 8.5;
  }
  y += 41;

  // ---------- novedades ----------
  section(prev ? `Novedades desde la entrega N.º ${prev.n} (${fmtDate(prev.fecha)})` : 'Primera entrega');
  if (prev) {
    const delta = Math.round((grade - (prev.nota || 0)) * 10) / 10;
    para(`Nota anterior: ${Number(prev.nota || 0).toFixed(1)}  ->  nota actual: ${grade.toFixed(1)}  (${delta >= 0 ? '+' : ''}${delta.toFixed(1)})`, { style: 'bold' });
  }
  if (nuevas.length || nuevasBonus.length) {
    para(`Fases nuevas logradas: ${nuevas.length}${nuevasBonus.length ? ` · retos nerds nuevos: ${nuevasBonus.length}` : ''}`);
    for (const p of nuevas) para(`• Fase ${PHASES.indexOf(p) + 1} (${p.kind}) · ${p.title} · misión ${p.mission}`, { indent: 3, col: C.green });
    for (const p of nuevasBonus) para(`• Bonus ${CENTERS[p.center].name} · ${p.title}`, { indent: 3, col: C.green });
  } else {
    para(prev ? 'No hay fases nuevas desde la entrega anterior.' : 'Todavía no hay fases logradas.', { col: C.muted });
  }

  // ---------- tabla de fases ----------
  section('Fases de la práctica (historia principal)');
  const cols = [{ t: '#', w: 8 }, { t: 'Misión', w: 50 }, { t: 'Fase', w: 66 }, { t: 'Tipo', w: 14 }, { t: 'Estado', w: 20 }, { t: 'Lograda', w: 24 }];
  const drawHead = () => {
    ensure(8); fill([31, 38, 48]); doc.rect(M, y - 4.2, CW, 6.2, 'F');
    color([255, 255, 255]); font('bold', 8.5);
    let x = M + 1.5; for (const c of cols) { doc.text(c.t, x, y); x += c.w; }
    y += 5;
  };
  drawHead();
  PHASES.forEach((p, i) => {
    if (y + 5.5 > BOTTOM) { doc.addPage(); header(false); drawHead(); }
    const done = progress.completed[p.id];
    if (i % 2 === 0) { fill([246, 245, 239]); doc.rect(M, y - 3.8, CW, 5.4, 'F'); }
    font('normal', 8.5); color(C.ink);
    const cells = [String(i + 1), `${p.mission}. ${MISSIONS[p.mission]}`, p.title, p.kind, done ? 'Lograda' : 'Pendiente', done ? fmtDate(done) : '-'];
    let x = M + 1.5;
    cells.forEach((v, j) => {
      if (j === 4) { color(done ? C.green : C.muted); font('bold', 8.5); } else { color(C.ink); font('normal', 8.5); }
      doc.text(doc.splitTextToSize(clean(v), cols[j].w - 2)[0], x, y);
      x += cols[j].w;
    });
    y += 5.4;
  });

  // ---------- bonus ----------
  section(`Misiones nerds (bonus, no cambian la nota): ${bonusIds.length} de ${BONUS.length} retos`);
  for (const [key, c] of Object.entries(CENTERS)) {
    const all = BONUS.filter((p) => p.center === key); const d = all.filter((p) => progress.completed[p.id]).length;
    para(`• ${c.full}: ${d}/${all.length}${d === all.length ? ' (completa)' : ''}`, { indent: 1, col: d === all.length ? C.green : C.ink });
  }

  // ---------- insignias ----------
  const badges = computeBadges(progress);
  const won = badges.filter((b) => b.earned);
  section(`Insignias: ${won.length} de ${badges.length}`);
  if (!won.length) para('Todavía no ganó insignias.', { col: C.muted });
  else para(won.map((b) => `${b.name}${b.group === 'Misiones' ? ` (${b.title})` : ''}`).join(' · '), { col: C.green });

  // ---------- historial ----------
  const historial = [...progress.entregas, entrega];
  section('Historial de entregas');
  for (const e of historial) {
    para(`Entrega N.º ${e.n} · ${fmtDate(e.fecha, true)} · nota ${Number(e.nota).toFixed(1)} · ${e.fases} fases · ${e.bonus} retos nerds · código ${e.code}`, { size: 9, indent: 1, style: e.n === n ? 'bold' : 'normal' });
  }

  // ---------- evidencia ----------
  section('Evidencia: sentencias SQL correctas de cada fase lograda');
  const withCode = [...PHASES, ...BONUS].filter((p) => progress.completed[p.id]);
  if (!withCode.length) para('Todavía no hay evidencia.', { col: C.muted });
  for (const p of withCode) {
    const isBonus = Boolean(p.bonus);
    ensure(20);
    para(isBonus ? `Bonus ${CENTERS[p.center].name} · ${p.title}` : `Fase ${PHASES.indexOf(p) + 1} · ${p.kind} · ${p.title}`, { size: 9.5, style: 'bold' });
    const code = (progress.code[p.id] || []).slice(-6);
    if (!code.length) { para('(sin sentencias registradas en este dispositivo)', { size: 8.5, col: C.muted, indent: 3 }); y += 1; continue; }
    for (const sql of code) {
      doc.setFont('courier', 'normal'); doc.setFontSize(8);
      const lines = doc.splitTextToSize(clean(sql.endsWith(';') ? sql : `${sql};`), CW - 10);
      ensure(lines.length * 3.8 + 2);
      fill([243, 244, 246]); doc.rect(M + 3, y - 3, CW - 3, lines.length * 3.8 + 1.6, 'F');
      doc.setFont('courier', 'normal'); doc.setFontSize(8); color([17, 99, 41]);
      for (const ln of lines) { doc.text(ln, M + 5, y); y += 3.8; }
      y += 1.8;
    }
    y += 1;
  }

  // ---------- pie en todas las páginas ----------
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    stroke(C.line); doc.setLineWidth(0.3); doc.line(M, 288, W - M, 288);
    font('normal', 7.5); color(C.muted);
    doc.text(clean(`GTA SQL · ${student.name || ''} · ${student.group || ''} · Entrega N.º ${n} · ${code}`), M, 292);
    doc.text(`Página ${i} de ${pages}`, W - M, 292, { align: 'right' });
  }

  const filename = `GTA-SQL_${slug(student.name)}_${slug(student.group)}_entrega-${n}.pdf`;
  doc.save(filename);
  progress.entregas.push(entrega);
  save();
  return { filename, entrega };
}
