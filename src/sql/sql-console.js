// Terminal SQL del juego: consola por fases (misiones) + práctica libre + reporte de avance.
import { SqlEngine, splitStatements } from './sql-engine.js';
import { PHASES, MISSIONS, DB_NAME, phasesFor, rebuildState } from './challenges.js';
import { renderGuide } from './guide.js';

const KEY_DB = 'gtasql.db.v1';
const KEY_PROGRESS = 'gtasql.progress.v1';
const KEY_STUDENT = 'gtasql.student.v1';
const KEY_THEME = 'gtasql.theme.v1';

/* ---------------- persistencia (siempre con try/catch) ---------------- */
function load(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sin almacenamiento */ }
}

const progress = load(KEY_PROGRESS, { completed: {}, code: {} });
progress.completed = progress.completed || {};
progress.code = progress.code || {};
let engine = new SqlEngine(load(KEY_DB, null));

function persist() {
  save(KEY_DB, engine.serialize());
  save(KEY_PROGRESS, progress);
  refreshChips();
}

export function getGrade() {
  const done = PHASES.filter((p) => progress.completed[p.id]).length;
  return { done, total: PHASES.length, grade: Math.round((done / PHASES.length) * 100) / 10 };
}

/* ---------------- utilidades de DOM ---------------- */
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Contenedor donde montar la interfaz: el juego entra en pantalla completa sobre su "shell". */
function mountPoint() {
  return document.fullscreenElement || document.getElementById('game-shell') || document.querySelector('.game-shell') || document.body;
}
function mount(el) {
  const target = mountPoint();
  if (el.parentElement !== target) target.append(el);
}
if (typeof document !== 'undefined') {
  document.addEventListener('fullscreenchange', () => {
    for (const id of ['sqlc-root', 'sqlr-root', 'sqlc-toast']) { const el = document.getElementById(id); if (el) mount(el); }
  });
}

/* ---------------- tema claro / oscuro ---------------- */
function applyTheme(root) {
  const t = load(KEY_THEME, null);
  if (t) root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
}
function currentThemeIsDark(root) {
  const t = root.getAttribute('data-theme');
  if (t) return t === 'dark';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
}

/* ---------------- construcción de la interfaz ---------------- */
let ui = null;
let session = null; // { mode: 'mission'|'free', queue: [phase], index, onSolved, onCancel, solved }
const history = load('gtasql.history.v1', []);
let historyPos = -1;

function buildUi() {
  if (ui) return ui;
  const root = h('div', { class: 'sqlc-root', id: 'sqlc-root', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sqlc-title', hidden: true });
  applyTheme(root);

  const title = h('h2', { id: 'sqlc-title', class: 'sqlc-title' }, 'Terminal SQL');
  const subtitle = h('div', { class: 'sqlc-subtitle' });
  const gradeChip = h('button', { type: 'button', class: 'sqlc-chip', title: 'Ver mi reporte de avance', onclick: () => openReport() });
  const themeBtn = h('button', { type: 'button', class: 'sqlc-icon-btn', title: 'Cambiar tema claro/oscuro', 'aria-label': 'Cambiar tema claro u oscuro', onclick: () => {
    const dark = currentThemeIsDark(root);
    const next = dark ? 'light' : 'dark';
    save(KEY_THEME, next);
    applyTheme(root);
    if (reportEl) applyTheme(reportEl);
  } }, '◐');
  const schemaBtn = h('button', { type: 'button', class: 'sqlc-icon-btn', title: 'Mostrar / ocultar tablas', 'aria-label': 'Mostrar u ocultar el panel de tablas', onclick: () => root.classList.toggle('sqlc-show-schema') }, '🗂');
  const closeBtn = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-ghost', onclick: () => close(false) }, 'Salir ✕');
  const header = h('header', { class: 'sqlc-header' },
    h('div', { class: 'sqlc-brand' }, h('span', { class: 'sqlc-logo', 'aria-hidden': 'true' }, '▣'), h('div', {}, title, subtitle)),
    h('div', { class: 'sqlc-header-actions' }, gradeChip, schemaBtn, themeBtn, closeBtn));

  const steps = h('ol', { class: 'sqlc-steps', 'aria-label': 'Fases de esta misión' });
  const consigna = h('div', { class: 'sqlc-consigna' });
  const feedback = h('div', { class: 'sqlc-feedback', role: 'status', 'aria-live': 'polite' });
  const nextBtn = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-success', hidden: true, onclick: () => goNext() }, 'Continuar ▶');
  const guide = h('section', { class: 'sqlc-guide', 'aria-label': 'Instructivo de comandos SQL' });
  const credit = h('p', { class: 'shanuki-credit small', 'aria-label': 'Recurso SHANUKI', html: '<span class="sk-logo">SHANUKI</span>' });
  const left = h('section', { class: 'sqlc-left', 'aria-label': 'Consigna' }, steps, consigna, feedback, nextBtn, guide, credit);

  const log = h('div', { class: 'sqlc-log', 'aria-live': 'polite', 'aria-label': 'Resultados' });
  const editor = h('textarea', {
    class: 'sqlc-editor', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off',
    'aria-label': 'Escribí tu sentencia SQL', placeholder: 'mysql> Escribí tu sentencia SQL acá…  (Ctrl+Enter para ejecutar)',
  });
  const runBtn = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-primary', onclick: () => runEditor() }, '▶ Ejecutar');
  const copyBtn = h('button', { type: 'button', class: 'sqlc-btn', title: 'Copia las sentencias correctas de esta fase', onclick: () => copyPhaseCode() }, '⧉ Copiar código de esta fase');
  const clearBtn = h('button', { type: 'button', class: 'sqlc-btn', onclick: () => { log.replaceChildren(); editor.focus(); } }, 'Limpiar pantalla');
  const repairBtn = h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-warn', title: 'Vuelve la base al estado correcto de las fases que ya lograste', onclick: () => repairDb() }, '🛠 Reparar base');
  const toolbar = h('div', { class: 'sqlc-toolbar' }, runBtn, copyBtn, clearBtn, repairBtn);
  const right = h('section', { class: 'sqlc-right', 'aria-label': 'Consola' }, log, h('div', { class: 'sqlc-editor-wrap' }, h('span', { class: 'sqlc-prompt', 'aria-hidden': 'true' }, 'mysql>'), editor), toolbar);

  const schema = h('aside', { class: 'sqlc-schema', 'aria-label': 'Tablas de la base' });

  const main = h('div', { class: 'sqlc-main' }, left, right, schema);
  root.append(header, main);
  mount(root);

  // que el juego no reciba las teclas mientras escribimos
  root.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); close(false); }
  });
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runEditor(); return; }
    if ((e.ctrlKey || e.altKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      if (!history.length) return;
      if (e.key === 'ArrowUp') historyPos = historyPos < 0 ? history.length - 1 : Math.max(0, historyPos - 1);
      else historyPos = historyPos < 0 ? -1 : Math.min(history.length, historyPos + 1);
      editor.value = historyPos >= 0 && historyPos < history.length ? history[historyPos] : '';
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const s = editor.selectionStart;
      editor.setRangeText('  ', s, editor.selectionEnd, 'end');
    }
  });

  ui = { root, title, subtitle, gradeChip, steps, consigna, feedback, nextBtn, log, editor, schema, copyBtn, left, guide };
  return ui;
}

/* ---------------- botón flotante del HUD ---------------- */
let fab = null;
function buildFab() {
  if (fab || typeof document === 'undefined') return;
  const quick = document.querySelector('#hud-layer .hud-quick-actions');
  if (!quick) { setTimeout(buildFab, 300); return; }
  // Botón dentro del HUD (junto a Menú y Objetos): se oculta con el HUD y no tapa otras pantallas
  fab = h('button', { type: 'button', id: 'sql-hud-button', class: 'hud-pill pause-button sqlc-hud-btn', title: 'Terminal SQL: práctica libre y reporte de nota', 'aria-label': 'Abrir terminal SQL', onclick: () => openFreePractice() });
  fab.addEventListener('keydown', (e) => e.stopPropagation());
  fab.addEventListener('pointerdown', (e) => e.stopPropagation());
  quick.append(fab);
  refreshChips();
}

function refreshChips() {
  const { grade, done, total } = getGrade();
  const txt = `Nota ${grade.toFixed(1)}`;
  if (fab) {
    fab.innerHTML = `<svg class="sqlc-hud-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><ellipse cx="12" cy="5.5" rx="7" ry="2.8"/><path d="M5 5.5v13c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-13"/><path d="M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8"/></svg><span class="sqlc-hud-label">SQL</span><span class="sqlc-hud-grade">${grade.toFixed(1)}</span>`;
    fab.setAttribute('aria-label', `Abrir terminal SQL. ${txt}, ${done} de ${total} fases`);
  }
  if (ui) {
    ui.gradeChip.textContent = `📊 ${txt} · ${done}/${total}`;
  }
}

/* ---------------- render del panel izquierdo ---------------- */
function currentPhase() {
  return session?.mode === 'mission' ? session.queue[session.index] : null;
}

function renderLeft() {
  const u = buildUi();
  const p = currentPhase();
  u.steps.replaceChildren();
  u.feedback.className = 'sqlc-feedback';
  u.feedback.innerHTML = '';
  u.nextBtn.hidden = true;
  if (!p) {
    u.title.textContent = 'Terminal SQL — Práctica libre';
    u.subtitle.textContent = `Base: ${engine.state.current || '(ninguna en uso)'}  ·  Probá lo que quieras: no cambia tu nota.`;
    u.consigna.innerHTML = `<p><b>Cuartel del hacker.</b> Acá podés practicar cualquier sentencia sobre tu base <code>${DB_NAME}</code>.</p>
      <ul>
        <li><b>DDL</b>: <code>CREATE</code>, <code>ALTER</code>, <code>DROP</code>, <code>TRUNCATE</code>, <code>RENAME</code></li>
        <li><b>DML</b>: <code>INSERT</code>, <code>UPDATE</code>, <code>DELETE</code></li>
        <li><b>DQL</b>: <code>SELECT</code> con <code>WHERE</code>, <code>JOIN</code>, <code>GROUP BY</code>, <code>HAVING</code>, <code>ORDER BY</code>, <code>LIMIT</code>, subconsultas…</li>
        <li>Ayudas: <code>SHOW TABLES;</code> · <code>DESCRIBE tabla;</code> · <code>SHOW CREATE TABLE tabla;</code></li>
      </ul>
      <p class="sqlc-tip">¿Rompiste algo? <b>Reparar base</b> la deja como estaba según las fases que lograste.</p>
      <div class="sqlc-ideas"><b>Ideas para practicar:</b>
        <ol>
          <li>¿Qué vehículos son de color verde?</li>
          <li>¿Cuál es la misión con más estrellas? (<code>ORDER BY</code> + <code>LIMIT</code>)</li>
          <li>Promedio de respeto por banda (<code>AVG</code>).</li>
          <li>Miembros cuyo alias empieza con R (<code>LIKE</code>).</li>
          <li>Bandas sin miembros (<code>LEFT JOIN</code> … <code>IS NULL</code>).</li>
          <li>Creá una tabla <code>arma</code> relacionada con <code>miembro</code> y cargale datos.</li>
        </ol></div>`;
    u.copyBtn.hidden = true;
    renderGuide(u.guide, { kind: null });
    return;
  }
  u.copyBtn.hidden = false;
  const missionName = MISSIONS[p.mission] || '';
  const globalIdx = PHASES.indexOf(p) + 1;
  u.title.textContent = `Misión ${p.mission}: ${missionName}`;
  u.subtitle.textContent = `Fase ${globalIdx} de ${PHASES.length} · ${p.kind} · ${p.title}`;
  session.queue.forEach((q, i) => {
    const done = Boolean(progress.completed[q.id]);
    const cls = i === session.index ? 'current' : done ? 'done' : 'todo';
    u.steps.append(h('li', { class: `sqlc-step ${cls}`, title: q.title }, h('span', { class: 'sqlc-step-dot', 'aria-hidden': 'true' }, done ? '✔' : String(PHASES.indexOf(q) + 1)), h('span', { class: 'sqlc-step-label' }, q.title), done ? h('span', { class: 'sr-only' }, ' (lograda)') : null));
  });
  u.consigna.innerHTML = `<div class="sqlc-kind sqlc-kind-${p.kind.toLowerCase()}">${p.kind}</div><h3>${esc(p.title)}</h3>${p.consigna}`;
  renderGuide(u.guide, { kind: p.kind, phaseId: p.id });
  if (progress.completed[p.id]) showSuccess(p, true);
}

function showSuccess(p, already = false) {
  const u = ui;
  u.feedback.className = 'sqlc-feedback ok';
  const last = session.index >= session.queue.length - 1;
  u.feedback.innerHTML = already
    ? '✔ <b>Fase ya lograda.</b> Podés seguir practicando o continuar.'
    : `✔ <b>¡Fase lograda!</b> ${p.kind === 'DQL' ? 'La consulta devuelve exactamente lo pedido.' : 'La base quedó como pedía la consigna.'}`;
  u.nextBtn.hidden = false;
  u.nextBtn.textContent = last ? 'Volver a la misión ▶' : 'Siguiente fase ▶';
  if (!already) u.nextBtn.focus();
}

function showFail(msg) {
  ui.feedback.className = 'sqlc-feedback fail';
  ui.feedback.innerHTML = `<span class="sqlc-fb-icon" aria-hidden="true">🔎</span> <div>${msg}</div>`;
}

/* ---------------- panel de tablas ---------------- */
function renderSchema() {
  const u = buildUi();
  u.schema.replaceChildren();
  const st = engine.state;
  const dbName = st.current;
  u.schema.append(h('div', { class: 'sqlc-schema-title' }, '🗂 Tablas', h('small', {}, dbName ? ` (${dbName})` : ' (sin base en uso)')));
  if (!dbName) { u.schema.append(h('p', { class: 'sqlc-muted' }, 'Todavía no hay una base en uso.')); return; }
  const d = st.databases[dbName.toLowerCase()];
  const tables = Object.values(d?.tables || {});
  if (!tables.length) { u.schema.append(h('p', { class: 'sqlc-muted' }, 'La base está vacía: no tiene tablas.')); return; }
  for (const t of tables) {
    const pk = new Set(t.pk.map((c) => c.toLowerCase()));
    const fk = new Map();
    t.fks.forEach((f) => f.cols.forEach((c, i) => fk.set(c.toLowerCase(), `${f.refTable}.${f.refCols[i]}`)));
    const list = h('ul', {}, t.columns.map((c) => h('li', {},
      pk.has(c.name.toLowerCase()) ? h('span', { class: 'sqlc-badge pk', title: 'Clave primaria' }, 'PK') : null,
      fk.has(c.name.toLowerCase()) ? h('span', { class: 'sqlc-badge fk', title: `Clave foránea → ${fk.get(c.name.toLowerCase())}` }, 'FK') : null,
      h('span', { class: 'sqlc-colname' }, c.name), ' ', h('span', { class: 'sqlc-coltype' }, typeLabel(c.type)))));
    u.schema.append(h('details', { class: 'sqlc-table', open: true },
      h('summary', {}, t.name, h('span', { class: 'sqlc-rowcount' }, ` ${t.rows.length} fila${t.rows.length === 1 ? '' : 's'}`)), list));
  }
}
function typeLabel(t) {
  const b = t.base.toLowerCase();
  if (t.base === 'DECIMAL') return `decimal(${t.len},${t.scale})`;
  if (t.len != null && ['VARCHAR', 'CHAR'].includes(t.base)) return `${b}(${t.len})`;
  if (t.base === 'ENUM') return 'enum';
  return b;
}

/* ---------------- consola ---------------- */
function renderResult(r) {
  const block = h('div', { class: 'sqlc-entry' });
  block.append(h('pre', { class: 'sqlc-echo' }, `mysql> ${r.sql}`));
  if (r.kind === 'error') {
    block.append(h('div', { class: 'sqlc-err' }, r.error.toMysql()));
    if (r.error.hint) block.append(h('div', { class: 'sqlc-hint' }, `💡 ${r.error.hint}`));
  } else if (r.kind === 'rows') {
    if (!r.rows.length) {
      block.append(h('div', { class: 'sqlc-ok' }, 'Empty set'));
    } else {
      const table = h('table', { class: 'sqlc-result' },
        h('thead', {}, h('tr', {}, r.columns.map((c) => h('th', { scope: 'col' }, c)))),
        h('tbody', {}, r.rows.map((row) => h('tr', {}, row.map((v) => h('td', { class: v === null ? 'null' : typeof v === 'number' ? 'num' : '' }, v === null ? 'NULL' : formatCell(v)))))));
      block.append(h('div', { class: 'sqlc-table-wrap' }, table));
      block.append(h('div', { class: 'sqlc-ok' }, `${r.rows.length} row${r.rows.length === 1 ? '' : 's'} in set`));
    }
  } else {
    block.append(h('pre', { class: 'sqlc-ok' }, r.message));
  }
  return block;
}
function formatCell(v) {
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 10000) / 10000);
  return String(v);
}

function runEditor() {
  const u = buildUi();
  const text = u.editor.value;
  if (!text.trim()) { u.editor.focus(); return; }
  if (history[history.length - 1] !== text) { history.push(text); if (history.length > 60) history.shift(); save('gtasql.history.v1', history); }
  historyPos = -1;
  const results = engine.run(text);
  for (const r of results) u.log.append(renderResult(r));
  // estadística de copia: guardar sentencias correctas de la fase
  const p = currentPhase();
  if (p) {
    const okSql = results.filter((r) => r.kind !== 'error' && r.statement && !['showTables', 'showDatabases', 'describe', 'showCreate'].includes(r.statement.type)).map((r) => r.sql.trim());
    progress.code[p.id] = (progress.code[p.id] || []).concat(okSql).slice(-30);
  }
  u.log.scrollTop = u.log.scrollHeight;
  const hadError = results.some((r) => r.kind === 'error');
  if (!hadError) u.editor.value = '';
  // verificar fase
  if (p && !progress.completed[p.id]) {
    const verdict = p.check({ engine, state: engine.state, lastResults: results });
    if (verdict.ok) {
      progress.completed[p.id] = new Date().toISOString();
      showSuccess(p);
      renderStepsOnly();
    } else if (hadError) {
      showFail('La sentencia tiene un error (miralo en rojo en la consola). Leé la pista 💡 y corregila.');
    } else {
      showFail(verdict.msg);
    }
  }
  persist();
  renderSchema();
  if (!p) u.subtitle.textContent = `Base: ${engine.state.current || '(ninguna en uso)'}  ·  Probá lo que quieras: no cambia tu nota.`;
  u.editor.focus();
}

function renderStepsOnly() {
  const u = ui;
  [...u.steps.children].forEach((li, i) => {
    const q = session.queue[i];
    if (progress.completed[q.id]) {
      li.classList.add('done');
      li.querySelector('.sqlc-step-dot').textContent = '✔';
    }
  });
}

async function copyPhaseCode() {
  const p = currentPhase();
  if (!p) return;
  const code = (progress.code[p.id] || []).map((s) => (s.endsWith(';') ? s : `${s};`)).join('\n');
  if (!code) { showToast('Todavía no ejecutaste sentencias correctas en esta fase.'); return; }
  try {
    await navigator.clipboard.writeText(code);
    showToast('Código copiado ✔');
  } catch {
    ui.editor.value = code;
    ui.editor.select();
    showToast('No pude copiar automáticamente: el código quedó seleccionado en el editor.');
  }
}

function repairDb() {
  // eslint-disable-next-line no-alert
  if (!window.confirm('¿Reparar la base?\n\nSe borra lo que hiciste en la práctica libre y la base vuelve al estado correcto de las fases que ya lograste. Tu nota no cambia.')) return;
  const completedSet = new Set(PHASES.filter((p) => progress.completed[p.id]).map((p) => p.id));
  engine = new SqlEngine(rebuildState(completedSet));
  const p = currentPhase();
  p?.setup?.(engine);
  persist();
  renderSchema();
  ui.log.append(h('div', { class: 'sqlc-entry' }, h('div', { class: 'sqlc-ok' }, `🛠 Base reparada (${completedSet.size} fases aplicadas). Base en uso: ${engine.state.current || 'ninguna'}.`)));
  ui.log.scrollTop = ui.log.scrollHeight;
  if (p && !progress.completed[p.id]) { ui.feedback.className = 'sqlc-feedback'; ui.feedback.innerHTML = ''; }
}

let toastTimer = null;
function showToast(msg) {
  let t = document.getElementById('sqlc-toast');
  if (!t) { t = h('div', { id: 'sqlc-toast', class: 'sqlc-toast', role: 'status' }); mount(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------------- navegación ---------------- */
function goNext() {
  if (!session || session.mode !== 'mission') return;
  if (session.index < session.queue.length - 1) {
    session.index += 1;
    currentPhase()?.setup?.(engine);
    persist();
    renderLeft();
    renderSchema();
    ui.log.append(h('div', { class: 'sqlc-sep' }, `— Fase ${PHASES.indexOf(currentPhase()) + 1}: ${currentPhase().title} —`));
    ui.log.scrollTop = ui.log.scrollHeight;
    ui.editor.focus();
    return;
  }
  close(true);
}

function open() {
  const u = buildUi();
  mount(u.root);
  u.root.hidden = false;
  document.documentElement.classList.add('sqlc-open');
  window.__sqlConsoleOpen = true;
  refreshChips();
  renderLeft();
  renderSchema();
  setTimeout(() => u.editor.focus(), 30);
}

function close(solved) {
  if (!ui || ui.root.hidden) return;
  const s = session;
  if (s?.mode === 'mission' && !solved) {
    const pending = s.queue.filter((q) => !progress.completed[q.id]).length;
    if (pending > 0) {
      // eslint-disable-next-line no-alert
      if (!window.confirm(`Te ${pending === 1 ? 'falta 1 fase' : `faltan ${pending} fases`} de esta misión.\n¿Salir de la terminal? Vas a poder volver a abrirla desde la escena.`)) return;
    }
  }
  ui.root.hidden = true;
  document.documentElement.classList.remove('sqlc-open');
  session = null;
  // dejamos pasar un frame para que la tecla de acción no avance la escena
  setTimeout(() => { window.__sqlConsoleOpen = false; }, 120);
  if (s?.mode === 'free') s.onClose?.();
  if (s?.mode === 'mission') {
    const allDone = s.queue.every((q) => progress.completed[q.id]);
    if (allDone) s.onSolved?.(); else s.onCancel?.();
  }
}

/** Abre la terminal para los retos de una escena. Llama onSolved cuando todas las fases (y las anteriores pendientes) están logradas. */
export function openSqlChallenge(challengeId, { onSolved, onCancel } = {}) {
  if (String(challengeId).trim().toLowerCase() === 'libre') {
    openFreePractice({ onClose: onSolved });
    return;
  }
  const targets = phasesFor(challengeId);
  if (!targets.length) {
    console.warn(`[GTA SQL] Reto desconocido: ${challengeId}`);
    onSolved?.();
    return;
  }
  const lastIdx = Math.max(...targets.map((p) => PHASES.indexOf(p)));
  // fases pendientes hasta la última pedida (no se puede saltar adelante)
  const queue = PHASES.slice(0, lastIdx + 1).filter((p) => !progress.completed[p.id] || targets.includes(p));
  if (queue.every((p) => progress.completed[p.id])) {
    showToast('✔ Fases SQL de esta escena ya logradas.');
    onSolved?.();
    return;
  }
  const firstPending = queue.findIndex((p) => !progress.completed[p.id]);
  session = { mode: 'mission', queue, index: Math.max(0, firstPending), onSolved, onCancel };
  currentPhase()?.setup?.(engine);
  persist();
  open();
  ui.log.append(h('div', { class: 'sqlc-sep' }, `— Fase ${PHASES.indexOf(currentPhase()) + 1}: ${currentPhase().title} —`));
}

export function openFreePractice({ onClose } = {}) {
  if (ui && !ui.root.hidden) return;
  session = { mode: 'free', onClose };
  open();
}

/* ---------------- reporte de avance (estilo SHANUKI) ---------------- */
let reportEl = null;
function openReport() {
  if (reportEl) reportEl.remove();
  const student = load(KEY_STUDENT, { name: '', group: '' });
  const { grade, done, total } = getGrade();
  const nameIn = h('input', { type: 'text', value: student.name, placeholder: 'Nombre y apellido', 'aria-label': 'Nombre y apellido', oninput: (e) => { student.name = e.target.value; save(KEY_STUDENT, student); } });
  const groupIn = h('input', { type: 'text', value: student.group, placeholder: 'Grupo (ej: 2°ME)', 'aria-label': 'Grupo', oninput: (e) => { student.group = e.target.value; save(KEY_STUDENT, student); } });
  const rows = PHASES.map((p, i) => {
    const doneAt = progress.completed[p.id];
    return h('tr', { class: doneAt ? 'done' : '' },
      h('td', {}, String(i + 1)), h('td', {}, `${p.mission}. ${MISSIONS[p.mission]}`), h('td', {}, p.title), h('td', {}, p.kind),
      h('td', {}, doneAt ? '✔ Lograda' : '— Pendiente'));
  });
  const byKind = ['DDL', 'DML', 'DQL'].map((k) => {
    const all = PHASES.filter((p) => p.kind === k);
    const d = all.filter((p) => progress.completed[p.id]).length;
    return h('div', { class: 'sqlr-kind' }, h('b', {}, k), ` ${d}/${all.length}`, h('div', { class: 'sqlr-bar' }, h('span', { style: `width:${(d / all.length) * 100}%` })));
  });
  reportEl = h('div', { class: 'sqlr-root', id: 'sqlr-root', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Reporte de avance' },
    h('div', { class: 'sqlr-card' },
      h('div', { class: 'sqlr-head' },
        h('div', {}, h('div', { class: 'sqlr-kicker' }, 'GTA SQL · Reporte de avance'), h('h2', {}, 'Bajo Mundo de Datos')),
        h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-ghost sqlr-noprint', onclick: () => { reportEl.remove(); reportEl = null; } }, 'Cerrar ✕')),
      h('div', { class: 'sqlr-student' }, h('label', {}, 'Estudiante', nameIn), h('label', {}, 'Grupo', groupIn),
        h('div', { class: 'sqlr-date' }, `Fecha: ${new Date().toLocaleDateString('es-UY')}`)),
      h('div', { class: 'sqlr-summary' },
        h('div', { class: 'sqlr-grade' }, h('span', {}, grade.toFixed(1)), h('small', {}, '/ 10')),
        h('div', { class: 'sqlr-summary-text' }, h('p', {}, `${done} de ${total} fases logradas.`), h('p', { class: 'sqlr-formula' }, 'Nota = (fases logradas ÷ total) × 10'), ...byKind)),
      h('div', { class: 'sqlr-table-wrap' }, h('table', { class: 'sqlr-table' },
        h('thead', {}, h('tr', {}, ['#', 'Misión', 'Fase', 'Tipo', 'Estado'].map((x) => h('th', { scope: 'col' }, x)))), h('tbody', {}, rows))),
      h('p', { class: 'shanuki-credit sqlr-credit', html: 'Recurso educativo <span class="sk-logo">SHANUKI</span>' }),
      h('div', { class: 'sqlr-actions sqlr-noprint' },
        h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-primary', onclick: () => window.print() }, '🖨 Imprimir / Guardar PDF'),
        h('button', { type: 'button', class: 'sqlc-btn sqlc-btn-danger', onclick: () => resetAll() }, 'Borrar mi progreso SQL'))));
  applyTheme(reportEl);
  reportEl.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') { reportEl.remove(); reportEl = null; } });
  mount(reportEl);
  window.__sqlConsoleOpen = true;
  const obs = new MutationObserver(() => {
    if (!reportEl || !document.contains(reportEl)) {
      obs.disconnect();
      if (!ui || ui.root.hidden) setTimeout(() => { window.__sqlConsoleOpen = false; }, 120);
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  nameIn.focus();
}

function resetAll() {
  // eslint-disable-next-line no-alert
  if (!window.confirm('¿Borrar TODO tu progreso SQL y tu base de datos?\nEsto no se puede deshacer.')) return;
  progress.completed = {};
  progress.code = {};
  engine = new SqlEngine();
  persist();
  reportEl?.remove();
  reportEl = null;
  if (ui && !ui.root.hidden) { renderLeft(); renderSchema(); }
}

/* ---------------- arranque ---------------- */
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildFab);
  else buildFab();
  window.gtaSql = { openFreePractice, openSqlChallenge, getGrade, openReport };
}

export { splitStatements };
