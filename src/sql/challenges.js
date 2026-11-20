// Fases (retos) de la práctica GTA SQL: DDL → DML → DQL.
// Cada fase se verifica sobre el ESTADO REAL de la base simulada o sobre el
// RESULTADO de la consulta, nunca sobre el texto escrito.
import { SqlEngine, getTable, getColumn, typeCategory, compareValues } from './sql-engine.js';

export const DB_NAME = 'bajo_mundo';

/* ------------------------------------------------------------------ */
/* Datos del expediente (lo que el estudiante debe cargar)             */
/* ------------------------------------------------------------------ */
export const DATA = {
  banda: {
    cols: ['id_banda', 'nombre', 'territorio'],
    rows: [
      [1, 'Familia Ceibo', 'Barrio Ceibo'],
      [2, 'Los Halcones', 'Colina Norte'],
      [3, 'Vagos del Puerto', 'Puerto Este'],
    ],
  },
  miembro: {
    cols: ['alias', 'respeto', 'rol', 'id_banda'],
    rows: [
      ['Vera', 95, 'Jefa', 1],
      ['Chispa', 65, 'Subjefe', 1],
      ['Rayo', 40, 'Matón', 1],
      ['Kobra', 70, 'Jefe', 2],
      ['Pepe', 60, 'Traficante', 3],
      ['Byte', 10, 'Hacker', 1],
    ],
  },
  vehiculo: {
    cols: ['matricula', 'modelo', 'color', 'alias_dueno'],
    rows: [
      ['FENIX01', 'Fénix GT', 'Verde', 'Vera'],
      ['CEIBO01', 'Sedán Ceibo', 'Verde', 'Chispa'],
      ['BAGUAL69', 'Pickup Bagual', 'Marrón', 'Rayo'],
      ['TAHONA01', 'Coupé Tahona', 'Morado', 'Kobra'],
    ],
  },
  mision: {
    cols: ['id_mision', 'nombre_clave', 'recompensa', 'estrellas'],
    rows: [
      [1, 'Asalto al Tren', 50000, 3],
      [2, 'Golpe en el Puerto', 15000, 4],
      [3, 'Robo al Casino', 250000, 5],
    ],
  },
  participa_mision: {
    cols: ['alias_miembro', 'id_mision', 'fecha'],
    rows: [
      ['Vera', 1, '2027-03-01'],
      ['Rayo', 1, '2027-03-01'],
      ['Chispa', 2, '2027-04-10'],
      ['Rayo', 2, '2027-04-10'],
      ['Vera', 3, '2027-06-20'],
    ],
  },
};

function sqlLit(v) {
  return typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
}
function insertSql(table, rows) {
  return `INSERT INTO ${table} (${DATA[table].cols.join(', ')}) VALUES\n${rows.map((r) => `  (${r.map(sqlLit).join(', ')})`).join(',\n')};`;
}

/** Tabla HTML del expediente para mostrar en la consigna */
function dossier(table, rows = DATA[table].rows, cols = DATA[table].cols) {
  const head = cols.map((c) => `<th>${c}</th>`).join('');
  const body = rows.map((r) => `<tr>${r.map((v) => `<td>${v}</td>`).join('')}</tr>`).join('');
  return `<div class="sqlc-dossier"><div class="sqlc-dossier-title">📁 Expediente: ${table}</div><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/* ------------------------------------------------------------------ */
/* Ayudantes de verificación                                           */
/* ------------------------------------------------------------------ */
const lc = (s) => String(s ?? '').toLowerCase();
const ok = (msg = '') => ({ ok: true, msg });
const no = (msg) => ({ ok: false, msg });

const CAT_LABEL = { int: 'número entero (INT)', decimal: 'número', text: 'texto (VARCHAR)', date: 'fecha (DATE)' };

function tableOf(state, name) { return getTable(state, DB_NAME, name); }

function checkDbSelected(state) {
  if (!state.databases[DB_NAME]) return no(`Todavía no existe la base <b>${DB_NAME}</b>. Revisá la fase 1.`);
  if (lc(state.current) !== DB_NAME) return no(`La base <b>${DB_NAME}</b> existe, pero no está en uso. ¿Qué comando sirve para <b>elegir</b> la base con la que vas a trabajar?`);
  return null;
}

/** spec: { name, cols: [{name, cats:[...], notNull?}], pk: [...], fks: [{col, ref}] } */
function checkTableSpec(state, spec) {
  const pre = checkDbSelected(state);
  if (pre) return pre;
  const t = tableOf(state, spec.name);
  if (!t) return no(`No encuentro la tabla <b>${spec.name}</b> en la base. Revisá que el nombre esté bien escrito (SHOW TABLES; te muestra las tablas).`);
  for (const c of spec.cols) {
    const col = getColumn(t, c.name);
    if (!col) return no(`A la tabla <b>${t.name}</b> le falta la columna <b>${c.name}</b>. Mirá su estructura con <code>DESCRIBE ${t.name};</code>`);
    const cat = typeCategory(col.type);
    if (!c.cats.includes(cat)) {
      return no(`La columna <b>${c.name}</b> tiene un tipo que no sirve para ese dato. Debería guardar ${c.cats.map((x) => CAT_LABEL[x]).join(' o ')}. Podés cambiarla con ALTER TABLE ... MODIFY, o borrar la tabla y crearla de nuevo.`);
    }
    if (c.minLen && col.type.base !== 'TEXT' && (col.type.len ?? 1) < c.minLen) {
      return no(`La columna <b>${c.name}</b> es demasiado corta: no entran ${c.minLen} caracteres. Revisá el número entre paréntesis.`);
    }
    if (c.notNull && !col.notNull && !t.pk.map(lc).includes(lc(c.name))) {
      return no(`La columna <b>${c.name}</b> tiene que ser obligatoria (no puede quedar vacía). ¿Qué restricción impide valores nulos?`);
    }
  }
  if (spec.pk) {
    const pk = t.pk.map(lc).sort().join(',');
    const want = spec.pk.map(lc).sort().join(',');
    if (!pk) return no(`La tabla <b>${t.name}</b> no tiene clave primaria. ¿Qué columna (o columnas) identifica a cada fila sin repetirse?`);
    if (pk !== want) {
      return spec.pk.length > 1
        ? no(`La clave primaria de <b>${t.name}</b> no es la correcta. Pensá: una misma fila se identifica por <b>dos</b> columnas juntas (clave compuesta).`)
        : no(`La clave primaria de <b>${t.name}</b> está en otra columna. ¿Cuál es el identificador único según la consigna?`);
    }
  }
  for (const fk of spec.fks || []) {
    const found = t.fks.find((f) => f.cols.length === 1 && lc(f.cols[0]) === lc(fk.col));
    if (!found) return no(`La columna <b>${fk.col}</b> de <b>${t.name}</b> todavía no está conectada con la tabla <b>${fk.ref}</b>. ¿Qué restricción crea esa relación?`);
    if (lc(found.refTable) !== lc(fk.ref)) return no(`La clave foránea de <b>${fk.col}</b> apunta a la tabla <b>${found.refTable}</b>, pero debería apuntar a <b>${fk.ref}</b>.`);
  }
  return null;
}

function norm(v) {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'number') return String(Math.round(v * 100) / 100);
  const s = String(v).trim();
  if (/^[-+]?\d+(\.\d+)?$/.test(s)) return String(Math.round(Number(s) * 100) / 100);
  return s.toLowerCase().normalize('NFC');
}

/** Verifica que la tabla tenga exactamente las filas esperadas (comparación flexible). */
function checkRows(state, tableName, expectedRows, { label = 'fila', exact = true } = {}) {
  const pre = checkDbSelected(state);
  if (pre) return pre;
  const t = tableOf(state, tableName);
  if (!t) return no(`No encuentro la tabla <b>${tableName}</b>. ¿La borraste? Podés usar el botón <b>Reparar base</b>.`);
  const cols = DATA[tableName].cols;
  const idx = cols.map((c) => t.columns.findIndex((x) => lc(x.name) === lc(c)));
  const missingCol = idx.findIndex((i) => i === -1);
  if (missingCol !== -1) return no(`La tabla <b>${tableName}</b> no tiene la columna <b>${cols[missingCol]}</b>. Usá el botón <b>Reparar base</b>.`);
  const pkCount = tableName === 'participa_mision' ? 2 : 1;
  const keyOf = (r) => r.slice(0, pkCount).map(norm).join('|');
  const actual = t.rows.map((r) => idx.map((i) => r[i]));
  for (const exp of expectedRows) {
    const found = actual.find((r) => keyOf(r) === keyOf(exp));
    const keyTxt = exp.slice(0, pkCount).join(' / ');
    if (!found) return no(`Falta cargar la ${label} <b>${keyTxt}</b> en <b>${tableName}</b>. Compará tu tabla con el expediente (<code>SELECT * FROM ${tableName};</code>).`);
    for (let j = pkCount; j < cols.length; j += 1) {
      if (norm(found[j]) !== norm(exp[j])) {
        return no(`En la ${label} <b>${keyTxt}</b>, el dato <b>${cols[j]}</b> no coincide con el expediente. Revisalo con atención (¿hay un error de tipeo?).`);
      }
    }
  }
  if (exact && actual.length > expectedRows.length) {
    const extra = actual.find((r) => !expectedRows.some((e) => keyOf(e) === keyOf(r)));
    return no(`La tabla <b>${tableName}</b> tiene ${label === 'fila' ? 'filas' : `${label}s`} de más${extra ? ` (por ejemplo <b>${extra.slice(0, pkCount).join(' / ')}</b>)` : ''}. Solo tienen que estar las del expediente.`);
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Comparación de resultados de consultas                              */
/* ------------------------------------------------------------------ */
function columnValues(rows, k) { return rows.map((r) => norm(r[k])); }
function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  const x = [...a].sort(); const y = [...b].sort();
  return x.every((v, i) => v === y[i]);
}

/**
 * Compara el resultado del estudiante con el esperado. Permite: otro orden de
 * columnas, alias, columnas extra (gana el estudiante), y otro orden de filas
 * si la consigna no pide orden.
 */
export function compareResults(student, expected, { ordered = false } = {}) {
  if (student.rows.length > expected.rows.length) return { ok: false, reason: 'more' };
  if (student.rows.length < expected.rows.length) return { ok: false, reason: student.rows.length === 0 ? 'empty' : 'fewer' };
  const m = expected.columns.length;
  const cands = [];
  for (let j = 0; j < m; j += 1) {
    const ev = columnValues(expected.rows, j);
    const list = [];
    for (let k = 0; k < student.columns.length; k += 1) {
      if (sameMultiset(columnValues(student.rows, k), ev)) list.push(k);
    }
    if (!list.length) return { ok: false, reason: 'missingCol', col: expected.columns[j], colIndex: j };
    cands.push(list);
  }
  const expTuples = expected.rows.map((r) => r.map(norm).join('¦'));
  let sawUnordered = false;
  const assign = [];
  const used = new Set();
  const tryAssign = (j) => {
    if (j === m) {
      const stTuples = student.rows.map((r) => assign.map((k) => norm(r[k])).join('¦'));
      if (!sameMultiset(stTuples, expTuples)) return false;
      if (ordered && !stTuples.every((t, i) => t === expTuples[i])) { sawUnordered = true; return false; }
      return true;
    }
    for (const k of cands[j]) {
      if (used.has(k)) continue;
      used.add(k); assign.push(k);
      if (tryAssign(j + 1)) return true;
      used.delete(k); assign.pop();
    }
    return false;
  };
  if (tryAssign(0)) return { ok: true };
  if (sawUnordered) return { ok: false, reason: 'order' };
  return { ok: false, reason: 'mixed' };
}

function lastSelect(ctx) {
  const rs = (ctx.lastResults || []).filter((r) => r.kind === 'rows' && (r.statement?.type === 'select' || r.statement?.type === 'union'));
  return rs.length ? rs[rs.length - 1] : null;
}

function makeQueryCheck(spec) {
  return (ctx) => {
    const pre = checkDbSelected(ctx.state);
    if (pre) return pre;
    const res = lastSelect(ctx);
    if (!res) return no('Esta fase se resuelve con una consulta <b>SELECT</b>. Escribila y ejecutala para ver el resultado.');
    const ref = new SqlEngine(ctx.state);
    const [expected] = ref.run(spec.solution);
    if (!expected || expected.kind !== 'rows') {
      return no('Tu base cambió y ya no tiene la estructura de la misión (¿borraste o renombraste algo en la práctica libre?). Tocá <b>Reparar base</b> y volvé a intentar.');
    }
    if (expected.rows.length === 0) {
      return no('Tu base no tiene los datos que necesita esta consulta. Tocá <b>Reparar base</b> para recuperarlos.');
    }
    const cmp = compareResults(res, expected, { ordered: Boolean(spec.ordered) });
    if (cmp.ok) return ok(spec.success || '');
    const h = spec.hints || {};
    switch (cmp.reason) {
      case 'more': return no(h.more || `Tu consulta devolvió <b>${res.rows.length}</b> filas, y la consigna pide menos. Revisá el filtro: ¿qué condición deja solo las filas pedidas?`);
      case 'fewer': return no(h.fewer || `Tu consulta devolvió <b>${res.rows.length}</b> filas: faltan filas. ¿Tu condición es demasiado estricta?`);
      case 'empty': return no(h.empty || 'Tu consulta no devolvió ninguna fila. Revisá la condición del WHERE: ¿el valor está bien escrito?');
      case 'missingCol': return no((h.missingCol && h.missingCol(cmp.col)) || `Falta un dato en el resultado: no aparece la columna <b>${spec.colLabels?.[cmp.colIndex] || cmp.col}</b> (o sus valores no son los correctos).`);
      case 'order': return no(h.order || 'Las filas son correctas, pero el <b>orden</b> no es el que pide la consigna. ¿Qué cláusula ordena el resultado, y en qué sentido?');
      default: return no(h.mixed || 'Las columnas tienen los datos correctos por separado, pero las filas no coinciden. Revisá cómo unís las tablas (la condición del JOIN / ON).');
    }
  };
}

/* ------------------------------------------------------------------ */
/* Fases                                                               */
/* ------------------------------------------------------------------ */
const EXPECTED_MIEMBRO_FINAL = DATA.miembro.rows.filter((r) => r[0] !== 'Kobra').map((r) => (r[0] === 'Rayo' ? ['Rayo', 55, 'Matón', 1] : r));
const EXPECTED_VEHICULO_FINAL = DATA.vehiculo.rows.filter((r) => r[0] !== 'TAHONA01').map((r) => (r[0] === 'BAGUAL69' ? ['BAGUAL69', 'Pickup Bagual', 'Negro', 'Rayo'] : r));
const EXPECTED_MISION_FINAL = DATA.mision.rows.map((r) => (r[0] === 2 ? [2, 'Golpe en el Puerto', 20000, 4] : r));

export const PHASES = [
  /* ===================== MISIÓN 1 — DDL ===================== */
  {
    id: 'crear-bd', mission: 1, kind: 'DDL', title: 'Crear la base de datos',
    consigna: `<p>La libreta de la banda se quemó. Hay que guardar todo en una <b>base de datos</b>.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> creá una base de datos llamada <code>bajo_mundo</code> y ponela <b>en uso</b>.</p>
      <p class="sqlc-tip">Son dos sentencias. Podés escribirlas juntas, separadas por <code>;</code></p>`,
    solution: 'CREATE DATABASE bajo_mundo;\nUSE bajo_mundo;',
    check: ({ state }) => {
      if (!state.databases[DB_NAME]) return no('Todavía no existe una base llamada <b>bajo_mundo</b>. ¿Qué comando DDL <b>crea</b> una base de datos? Revisá también que el nombre esté bien escrito.');
      return checkDbSelected(state) || ok();
    },
  },
  {
    id: 'tabla-banda', mission: 1, kind: 'DDL', title: 'Tabla BANDA',
    consigna: `<p>Cada <b>banda</b> tiene un código único, un nombre y el territorio que controla.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> creá la tabla <code>banda</code> con estas columnas:</p>
      <ul><li><code>id_banda</code> → número entero, <b>clave primaria</b></li>
      <li><code>nombre</code> → texto de hasta 50 letras, <b>obligatorio</b> (no puede quedar vacío)</li>
      <li><code>territorio</code> → texto de hasta 50 letras</li></ul>`,
    solution: 'CREATE TABLE banda (\n  id_banda INT PRIMARY KEY,\n  nombre VARCHAR(50) NOT NULL,\n  territorio VARCHAR(50)\n);',
    check: ({ state }) => checkTableSpec(state, {
      name: 'banda',
      cols: [{ name: 'id_banda', cats: ['int'] }, { name: 'nombre', cats: ['text'], notNull: true, minLen: 20 }, { name: 'territorio', cats: ['text'], minLen: 15 }],
      pk: ['id_banda'],
    }) || ok(),
  },
  {
    id: 'tabla-miembro', mission: 1, kind: 'DDL', title: 'Tabla MIEMBRO (con clave foránea)',
    consigna: `<p>Una banda tiene muchos <b>miembros</b>, pero cada miembro es leal a <b>una sola</b> banda.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> creá la tabla <code>miembro</code>:</p>
      <ul><li><code>alias</code> → texto (hasta 30), <b>clave primaria</b></li>
      <li><code>respeto</code> → número entero (del 1 al 100)</li>
      <li><code>rol</code> → texto (hasta 30)</li>
      <li><code>id_banda</code> → número entero, <b>clave foránea</b> que apunta a <code>banda(id_banda)</code></li></ul>
      <p class="sqlc-tip">⭐ Desafío extra (opcional): agregá una regla <code>CHECK</code> para que el respeto quede entre 1 y 100.</p>`,
    solution: 'CREATE TABLE miembro (\n  alias VARCHAR(30) PRIMARY KEY,\n  respeto INT CHECK (respeto BETWEEN 1 AND 100),\n  rol VARCHAR(30),\n  id_banda INT,\n  FOREIGN KEY (id_banda) REFERENCES banda(id_banda)\n);',
    check: ({ state }) => checkTableSpec(state, {
      name: 'miembro',
      cols: [{ name: 'alias', cats: ['text'], minLen: 6 }, { name: 'respeto', cats: ['int'] }, { name: 'rol', cats: ['text'], minLen: 10 }, { name: 'id_banda', cats: ['int'] }],
      pk: ['alias'],
      fks: [{ col: 'id_banda', ref: 'banda' }],
    }) || ok(),
  },

  /* ===================== MISIÓN 2 — DDL ===================== */
  {
    id: 'tabla-vehiculo', mission: 2, kind: 'DDL', title: 'Tabla VEHICULO',
    consigna: `<p>Un miembro puede tener varios <b>vehículos</b>, pero cada vehículo tiene <b>un solo dueño</b>.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> creá la tabla <code>vehiculo</code>:</p>
      <ul><li><code>matricula</code> → texto (hasta 10), <b>clave primaria</b></li>
      <li><code>modelo</code> → texto (hasta 40)</li>
      <li><code>color</code> → texto (hasta 20)</li>
      <li><code>alias_dueno</code> → texto (hasta 30), <b>clave foránea</b> hacia <code>miembro(alias)</code></li></ul>
      <p class="sqlc-tip">Ojo: la clave foránea y la columna a la que apunta deben tener el <b>mismo tipo</b> de dato.</p>`,
    solution: 'CREATE TABLE vehiculo (\n  matricula VARCHAR(10) PRIMARY KEY,\n  modelo VARCHAR(40),\n  color VARCHAR(20),\n  alias_dueno VARCHAR(30),\n  FOREIGN KEY (alias_dueno) REFERENCES miembro(alias)\n);',
    check: ({ state }) => checkTableSpec(state, {
      name: 'vehiculo',
      cols: [{ name: 'matricula', cats: ['text'], minLen: 8 }, { name: 'modelo', cats: ['text'], minLen: 13 }, { name: 'color', cats: ['text'], minLen: 6 }, { name: 'alias_dueno', cats: ['text'], minLen: 6 }],
      pk: ['matricula'],
      fks: [{ col: 'alias_dueno', ref: 'miembro' }],
    }) || ok(),
  },
  {
    id: 'tabla-mision', mission: 2, kind: 'DDL', title: 'Tabla MISION',
    consigna: `<p>El negocio se mueve con <b>misiones</b> (golpes).</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> creá la tabla <code>mision</code>:</p>
      <ul><li><code>id_mision</code> → número entero, <b>clave primaria</b></li>
      <li><code>nombre_clave</code> → texto (hasta 50)</li>
      <li><code>recompensa</code> → dinero en dólares (podés usar <code>INT</code> o <code>DECIMAL(10,2)</code>)</li>
      <li><code>estrellas</code> → número entero (nivel de búsqueda policial, de 1 a 6)</li></ul>`,
    solution: 'CREATE TABLE mision (\n  id_mision INT PRIMARY KEY,\n  nombre_clave VARCHAR(50),\n  recompensa DECIMAL(10,2),\n  estrellas INT\n);',
    check: ({ state }) => checkTableSpec(state, {
      name: 'mision',
      cols: [{ name: 'id_mision', cats: ['int'] }, { name: 'nombre_clave', cats: ['text'], minLen: 18 }, { name: 'recompensa', cats: ['int', 'decimal'] }, { name: 'estrellas', cats: ['int'] }],
      pk: ['id_mision'],
    }) || ok(),
  },
  {
    id: 'tabla-participa', mission: 2, kind: 'DDL', title: 'Tabla PARTICIPA_MISION (relación N:M)',
    consigna: `<p>En una misión participan <b>varios</b> miembros, y un miembro participa en <b>muchas</b> misiones. Además interesa la <b>fecha</b>.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> creá la tabla intermedia <code>participa_mision</code>:</p>
      <ul><li><code>alias_miembro</code> → clave foránea hacia <code>miembro(alias)</code></li>
      <li><code>id_mision</code> → clave foránea hacia <code>mision(id_mision)</code></li>
      <li><code>fecha</code> → tipo fecha</li>
      <li>La <b>clave primaria</b> está formada por <b>las dos</b> columnas: <code>alias_miembro</code> y <code>id_mision</code></li></ul>`,
    solution: 'CREATE TABLE participa_mision (\n  alias_miembro VARCHAR(30),\n  id_mision INT,\n  fecha DATE,\n  PRIMARY KEY (alias_miembro, id_mision),\n  FOREIGN KEY (alias_miembro) REFERENCES miembro(alias),\n  FOREIGN KEY (id_mision) REFERENCES mision(id_mision)\n);',
    check: ({ state }) => checkTableSpec(state, {
      name: 'participa_mision',
      cols: [{ name: 'alias_miembro', cats: ['text'], minLen: 6 }, { name: 'id_mision', cats: ['int'] }, { name: 'fecha', cats: ['date'] }],
      pk: ['alias_miembro', 'id_mision'],
      fks: [{ col: 'alias_miembro', ref: 'miembro' }, { col: 'id_mision', ref: 'mision' }],
    }) || ok(),
  },

  /* ===================== MISIÓN 3 — DDL (ALTER / DROP) ===================== */
  {
    id: 'alter-add', mission: 3, kind: 'DDL', title: 'ALTER TABLE … ADD',
    consigna: `<p>La jefa quiere poder llamar a cada miembro.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> agregá a la tabla <code>miembro</code> una columna <code>telefono</code> de texto (hasta 20 caracteres).</p>
      <p class="sqlc-tip">No borres la tabla: <b>modificá</b> su estructura.</p>`,
    solution: 'ALTER TABLE miembro ADD telefono VARCHAR(20);',
    check: ({ state }) => {
      const pre = checkDbSelected(state); if (pre) return pre;
      const t = tableOf(state, 'miembro');
      if (!t) return no('No encuentro la tabla <b>miembro</b>.');
      const c = getColumn(t, 'telefono');
      if (!c) return no('La tabla <b>miembro</b> todavía no tiene la columna <b>telefono</b>. ¿Qué sentencia cambia la estructura de una tabla que ya existe?');
      if (typeCategory(c.type) !== 'text') return no('La columna <b>telefono</b> tiene que ser de texto: un teléfono puede empezar con 0 o llevar un +.');
      return ok();
    },
  },
  {
    id: 'alter-modify', mission: 3, kind: 'DDL', title: 'ALTER TABLE … MODIFY',
    consigna: `<p>Los nombres en clave se hicieron más largos. Ahora tienen hasta <b>100</b> caracteres.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> cambiá la columna <code>nombre_clave</code> de la tabla <code>mision</code> para que sea texto de hasta 100 caracteres.</p>`,
    solution: 'ALTER TABLE mision MODIFY nombre_clave VARCHAR(100);',
    check: ({ state }) => {
      const pre = checkDbSelected(state); if (pre) return pre;
      const t = tableOf(state, 'mision');
      if (!t) return no('No encuentro la tabla <b>mision</b>.');
      const c = getColumn(t, 'nombre_clave');
      if (!c) return no('La tabla <b>mision</b> ya no tiene la columna <b>nombre_clave</b>. Si la renombraste, volvé a dejarle ese nombre.');
      if (typeCategory(c.type) !== 'text') return no('La columna <b>nombre_clave</b> tiene que seguir siendo de texto.');
      if (c.type.base !== 'TEXT' && (c.type.len ?? 0) < 100) return no(`La columna <b>nombre_clave</b> todavía admite solo ${c.type.len} caracteres. ¿Qué número va entre los paréntesis del tipo?`);
      return ok();
    },
  },
  {
    id: 'alter-drop', mission: 3, kind: 'DDL', title: 'ALTER TABLE … DROP COLUMN',
    consigna: `<p>¡Alerta! La policía puede rastrear los teléfonos. Mejor no guardarlos.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> eliminá la columna <code>telefono</code> de la tabla <code>miembro</code> (la tabla debe seguir existiendo).</p>`,
    solution: 'ALTER TABLE miembro DROP COLUMN telefono;',
    check: ({ state }) => {
      const pre = checkDbSelected(state); if (pre) return pre;
      const t = tableOf(state, 'miembro');
      if (!t) return no('¡La tabla <b>miembro</b> desapareció! Solo había que sacar una columna. Tocá <b>Reparar base</b>.');
      if (getColumn(t, 'telefono')) return no('La columna <b>telefono</b> sigue en la tabla <b>miembro</b>. ¿Qué palabra de ALTER TABLE <b>quita</b> una columna?');
      for (const c of ['alias', 'respeto', 'rol', 'id_banda']) if (!getColumn(t, c)) return no(`Se borró la columna <b>${c}</b>, que sí hacía falta. Tocá <b>Reparar base</b>.`);
      return ok();
    },
  },
  {
    id: 'drop-table', mission: 3, kind: 'DDL', title: 'DROP TABLE',
    consigna: `<p>Rayo creó a escondidas una tabla <code>chismes</code> con rumores de la banda. Si cae en manos de la policía, estamos fritos.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> eliminá por completo la tabla <code>chismes</code> (estructura y datos).</p>
      <p class="sqlc-tip">Podés mirarla antes con <code>SELECT * FROM chismes;</code></p>`,
    setup: (engine) => {
      const st = engine.state;
      if (st.databases[DB_NAME] && !tableOf(st, 'chismes')) {
        const prev = st.current;
        engine.run(`USE ${DB_NAME};
          CREATE TABLE chismes (id INT PRIMARY KEY, texto VARCHAR(80));
          INSERT INTO chismes VALUES (1, 'Chispa le tiene miedo a las palomas'), (2, 'Rayo choca el auto todos los martes'), (3, 'Anoche entró una paloma al taller de Chispa');`);
        st.current = prev;
        engine.state.current = prev;
      }
    },
    solution: 'DROP TABLE chismes;',
    check: ({ state }) => {
      const pre = checkDbSelected(state); if (pre) return pre;
      if (tableOf(state, 'chismes')) return no('La tabla <b>chismes</b> sigue existiendo. Ojo: borrar las filas no alcanza, hay que eliminar <b>la tabla</b>.');
      for (const t of ['banda', 'miembro', 'vehiculo', 'mision', 'participa_mision']) if (!tableOf(state, t)) return no(`¡Se borró también la tabla <b>${t}</b>! Tocá <b>Reparar base</b>.`);
      return ok();
    },
  },

  /* ===================== MISIÓN 4 — DML (INSERT) ===================== */
  {
    id: 'insert-banda', mission: 4, kind: 'DML', title: 'INSERT en BANDA',
    consigna: `<p>Llegó el informe de inteligencia. Hay que cargar las bandas de la ciudad.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> insertá estas 3 bandas en la tabla <code>banda</code>.</p>${dossier('banda')}
      <p class="sqlc-tip">Los textos van entre comillas simples: <code>'Familia Ceibo'</code>. Los números, sin comillas.</p>`,
    solution: insertSql('banda', DATA.banda.rows),
    check: ({ state }) => checkRows(state, 'banda', DATA.banda.rows, { label: 'banda' }) || ok(),
  },
  {
    id: 'insert-miembro', mission: 4, kind: 'DML', title: 'INSERT en MIEMBRO',
    consigna: `<p>Ahora los miembros activos. ¡Y vos también entrás a la banda!</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> insertá los 6 miembros en la tabla <code>miembro</code>.</p>${dossier('miembro')}
      <p class="sqlc-tip">Si aparece el error 1452, el <code>id_banda</code> apunta a una banda que no existe.</p>`,
    solution: insertSql('miembro', DATA.miembro.rows),
    check: ({ state }) => checkRows(state, 'miembro', DATA.miembro.rows, { label: 'miembro' }) || ok(),
  },
  {
    id: 'insert-vehiculo', mission: 4, kind: 'DML', title: 'INSERT en VEHICULO',
    consigna: `<p>Reporte del garaje: estos son los vehículos y sus dueños.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> insertá los 4 vehículos en la tabla <code>vehiculo</code>.</p>${dossier('vehiculo')}`,
    solution: insertSql('vehiculo', DATA.vehiculo.rows),
    check: ({ state }) => checkRows(state, 'vehiculo', DATA.vehiculo.rows, { label: 'vehículo' }) || ok(),
  },

  /* ===================== MISIÓN 5 — DML (INSERT N:M) ===================== */
  {
    id: 'insert-mision', mission: 5, kind: 'DML', title: 'INSERT en MISION',
    consigna: `<p>Estos son los golpes planeados.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> insertá las 3 misiones en la tabla <code>mision</code>.</p>${dossier('mision')}
      <p class="sqlc-tip">La recompensa es un número: escribila sin <code>$</code> ni puntos de miles.</p>`,
    solution: insertSql('mision', DATA.mision.rows),
    check: ({ state }) => checkRows(state, 'mision', DATA.mision.rows, { label: 'misión' }) || ok(),
  },
  {
    id: 'insert-participa', mission: 5, kind: 'DML', title: 'INSERT en PARTICIPA_MISION',
    consigna: `<p>¿Quién participó en cada golpe y cuándo?</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> insertá las 5 participaciones en <code>participa_mision</code>.</p>${dossier('participa_mision')}
      <p class="sqlc-tip">Las fechas van entre comillas, con formato <code>'AAAA-MM-DD'</code>.</p>`,
    solution: insertSql('participa_mision', DATA.participa_mision.rows),
    check: ({ state }) => checkRows(state, 'participa_mision', DATA.participa_mision.rows, { label: 'participación' }) || ok(),
  },

  /* ===================== MISIÓN 6 — DML (UPDATE / DELETE) ===================== */
  {
    id: 'update-respeto', mission: 6, kind: 'DML', title: 'UPDATE: subir el respeto',
    consigna: `<p>Rayo se ganó el respeto de la calle.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> cambiá el <code>respeto</code> de <b>Rayo</b> a <b>55</b>. Los demás miembros no cambian.</p>
      <p class="sqlc-tip">⚠️ Un UPDATE sin condición cambia <b>todas</b> las filas.</p>`,
    solution: "UPDATE miembro SET respeto = 55 WHERE alias = 'Rayo';",
    check: ({ state }) => {
      const exp = DATA.miembro.rows.map((r) => (r[0] === 'Rayo' ? ['Rayo', 55, 'Matón', 1] : r));
      const t = tableOf(state, 'miembro');
      if (t) {
        const ri = t.columns.findIndex((c) => lc(c.name) === 'respeto');
        const changedOthers = t.rows.filter((r) => lc(r[0]) !== 'rayo').some((r) => {
          const e = DATA.miembro.rows.find((x) => lc(x[0]) === lc(r[0]));
          return e && norm(e[1]) !== norm(r[ri]);
        });
        if (changedOthers) return no('Cambiaste el respeto de <b>otros</b> miembros también. Revisá la condición: ¿tu UPDATE tiene un WHERE que elija solo a Rayo? (Si hace falta, tocá <b>Reparar base</b>.)');
      }
      return checkRows(state, 'miembro', exp, { label: 'miembro' }) || ok();
    },
  },
  {
    id: 'update-color', mission: 6, kind: 'DML', title: 'UPDATE: pintar la pickup',
    consigna: `<p>La policía busca una <b>pickup marrón</b>. Hay que pintarla urgente.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> el vehículo de matrícula <b>BAGUAL69</b> ahora es de color <b>Negro</b>.</p>`,
    solution: "UPDATE vehiculo SET color = 'Negro' WHERE matricula = 'BAGUAL69';",
    check: ({ state }) => {
      const exp = DATA.vehiculo.rows.map((r) => (r[0] === 'BAGUAL69' ? ['BAGUAL69', 'Pickup Bagual', 'Negro', 'Rayo'] : r));
      const t = tableOf(state, 'vehiculo');
      if (t) {
        const ci = t.columns.findIndex((c) => lc(c.name) === 'color');
        const others = t.rows.filter((r) => lc(r[0]) !== 'bagual69');
        if (others.length && others.every((r) => lc(r[ci]) === 'negro')) return no('¡Pintaste de negro <b>todos</b> los vehículos! Revisá el WHERE de tu UPDATE. (Tocá <b>Reparar base</b> para volver atrás.)');
      }
      return checkRows(state, 'vehiculo', exp, { label: 'vehículo' }) || ok();
    },
  },
  {
    id: 'update-recompensa', mission: 6, kind: 'DML', title: 'UPDATE con cálculo',
    consigna: `<p>El cliente del <b>Golpe en el Puerto</b> subió la paga.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> sumale <b>5000</b> dólares a la recompensa de la misión 2 (Golpe en el Puerto).</p>
      <p class="sqlc-tip">Podés usar el valor actual de la columna dentro del SET: <code>columna = columna + …</code></p>`,
    solution: 'UPDATE mision SET recompensa = recompensa + 5000 WHERE id_mision = 2;',
    check: ({ state }) => {
      const t = tableOf(state, 'mision');
      if (t) {
        const ri = t.columns.findIndex((c) => lc(c.name) === 'recompensa');
        const m2 = t.rows.find((r) => norm(r[0]) === '2');
        if (m2 && Number(m2[ri]) > 20000) return no('La recompensa de la misión 2 quedó <b>más alta</b> de lo pedido. ¿Ejecutaste el UPDATE más de una vez? Tocá <b>Reparar base</b> y hacelo una sola vez.');
        const others = t.rows.filter((r) => norm(r[0]) !== '2');
        if (others.some((r) => { const e = DATA.mision.rows.find((x) => norm(x[0]) === norm(r[0])); return e && norm(e[2]) !== norm(r[ri]); })) {
          return no('Cambiaste la recompensa de <b>otras</b> misiones. ¿Tu UPDATE elige solo la misión 2? (Tocá <b>Reparar base</b>.)');
        }
      }
      return checkRows(state, 'mision', EXPECTED_MISION_FINAL, { label: 'misión' }) || ok();
    },
  },
  {
    id: 'delete-kobra', mission: 6, kind: 'DML', title: 'DELETE (y la clave foránea)',
    consigna: `<p>¡Atraparon a <b>Kobra</b>! Hay que borrar todo rastro de él.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> eliminá a <b>Kobra</b> de la tabla <code>miembro</code> y también su vehículo (<b>TAHONA01</b>) de la tabla <code>vehiculo</code>.</p>
      <p class="sqlc-tip">Si aparece el error 1451, pensá: ¿qué fila hay que borrar <b>primero</b>, la del padre o la del hijo?</p>`,
    solution: "DELETE FROM vehiculo WHERE matricula = 'TAHONA01';\nDELETE FROM miembro WHERE alias = 'Kobra';",
    check: ({ state }) => {
      const tv = tableOf(state, 'vehiculo');
      const tm = tableOf(state, 'miembro');
      if (tm && tm.rows.length < EXPECTED_MIEMBRO_FINAL.length) return no('Borraste <b>más</b> miembros de los pedidos. Revisá el WHERE de tu DELETE. (Tocá <b>Reparar base</b> para recuperarlos.)');
      if (tv && tv.rows.length < EXPECTED_VEHICULO_FINAL.length) return no('Borraste <b>más</b> vehículos de los pedidos. Revisá el WHERE. (Tocá <b>Reparar base</b>.)');
      if (tv && tv.rows.some((r) => lc(r[0]) === 'tahona01')) return no('El vehículo <b>TAHONA01</b> sigue en la tabla <b>vehiculo</b>.');
      if (tm && tm.rows.some((r) => lc(r[0]) === 'kobra')) return no('<b>Kobra</b> sigue en la tabla <b>miembro</b>.');
      return checkRows(state, 'miembro', EXPECTED_MIEMBRO_FINAL, { label: 'miembro' })
        || checkRows(state, 'vehiculo', EXPECTED_VEHICULO_FINAL, { label: 'vehículo' }) || ok();
    },
  },

  /* ===================== MISIÓN 7 — DQL básico ===================== */
  {
    id: 'q-vehiculos', mission: 7, kind: 'DQL', title: 'SELECT: listar vehículos',
    consigna: `<p>La jefa quiere ver el garaje.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> listá <b>todos</b> los vehículos registrados mostrando su <b>modelo</b> y su <b>color</b>.</p>`,
    solution: 'SELECT modelo, color FROM vehiculo;',
    colLabels: ['modelo', 'color'],
  },
  {
    id: 'q-misiones-ricas', mission: 7, kind: 'DQL', title: 'SELECT con WHERE y AND',
    consigna: `<p>Solo nos interesan los golpes grandes.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> mostrá las misiones que dan una recompensa <b>mayor a 40000</b> y que generan <b>más de 2</b> estrellas de policía.</p>
      <p class="sqlc-tip">Mostrá al menos el nombre en clave de cada misión.</p>`,
    solution: 'SELECT nombre_clave FROM mision WHERE recompensa > 40000 AND estrellas > 2;',
    colLabels: ['nombre_clave'],
    hints: { more: 'Aparecen misiones de más. ¿Tu WHERE controla <b>las dos</b> condiciones a la vez (recompensa y estrellas)? Ojo: "más de 2" no incluye al 2.' },
  },
  {
    id: 'q-ranking', mission: 7, kind: 'DQL', title: 'SELECT con ORDER BY',
    consigna: `<p>¿Quién manda en la calle?</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> listá a los miembros (su <b>alias</b> y su <b>respeto</b>) ordenados por respeto <b>de mayor a menor</b>.</p>`,
    solution: 'SELECT alias, respeto FROM miembro ORDER BY respeto DESC;',
    ordered: true,
    colLabels: ['alias', 'respeto'],
  },

  /* ===================== MISIÓN 8 — DQL con JOIN ===================== */
  {
    id: 'q-alias-banda', mission: 8, kind: 'DQL', title: 'JOIN: miembro + banda',
    consigna: `<p>El alias solo no alcanza: queremos saber de qué banda es cada uno.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> mostrá el <b>alias</b> de cada miembro junto al <b>nombre de la banda</b> a la que pertenece.</p>
      <p class="sqlc-tip">El nombre de la banda está en otra tabla. ¿Qué columna tienen en común?</p>`,
    solution: 'SELECT m.alias, b.nombre FROM miembro m JOIN banda b ON m.id_banda = b.id_banda;',
    colLabels: ['alias', 'nombre de la banda'],
    hints: { more: 'Salen <b>muchas más</b> filas de las que hay miembros: parece que se combinaron todas las filas con todas. ¿Escribiste la condición que une las dos tablas (ON o WHERE)?' },
  },
  {
    id: 'q-misiones-vera', mission: 8, kind: 'DQL', title: 'JOIN de 3 tablas',
    consigna: `<p>Vera quiere su historial.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> listá el <b>nombre en clave</b> de las misiones en las que participó <b>'Vera'</b>, mostrando también la <b>recompensa</b>.</p>
      <p class="sqlc-tip">Quién participó está en <code>participa_mision</code>; el nombre y la recompensa, en <code>mision</code>.</p>`,
    solution: "SELECT mi.nombre_clave, mi.recompensa FROM mision mi JOIN participa_mision p ON p.id_mision = mi.id_mision WHERE p.alias_miembro = 'Vera';",
    colLabels: ['nombre_clave', 'recompensa'],
    hints: {
      more: 'Aparecen misiones de más. ¿Filtraste solo las participaciones de Vera? ¿Uniste bien las tablas?',
      fewer: 'Faltan misiones. Vera participó en varias: revisá la condición de unión entre <b>mision</b> y <b>participa_mision</b>.',
    },
  },

  /* ===================== MISIÓN 9 — DQL con funciones de agregado ===================== */
  {
    id: 'q-contar', mission: 9, kind: 'DQL', title: 'COUNT + GROUP BY',
    consigna: `<p>¿Qué banda tiene más gente?</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> contá cuántos miembros tiene cada banda, mostrando el <b>id de la banda</b> y la <b>cantidad</b>.</p>`,
    solution: 'SELECT id_banda, COUNT(*) AS cantidad FROM miembro GROUP BY id_banda;',
    colLabels: ['id_banda', 'cantidad'],
    hints: {
      fewer: 'Te dio una sola fila: contaste a todos juntos. ¿Qué cláusula separa las filas en grupos, uno por banda?',
      empty: 'No salió ninguna fila. Revisá si filtraste de más.',
    },
  },
  {
    id: 'q-total', mission: 9, kind: 'DQL', title: 'SUM: el botín total',
    consigna: `<p>Hora de contar la plata.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> calculá la <b>suma total</b> de las recompensas de todas las misiones (una sola fila, un solo número).</p>`,
    solution: 'SELECT SUM(recompensa) AS total FROM mision;',
    colLabels: ['total'],
    hints: { more: 'Te salieron varias filas: estás mostrando cada recompensa por separado. ¿Qué función las <b>suma</b> en un solo valor?' },
  },
  {
    id: 'q-having', mission: 9, kind: 'DQL', title: 'GROUP BY + HAVING',
    consigna: `<p>Último informe antes del gran golpe.</p>
      <p class="sqlc-goal">🎯 <b>Objetivo:</b> mostrá el <b>nombre</b> de las bandas que tienen <b>más de 1</b> miembro.</p>
      <p class="sqlc-tip">Para filtrar <b>grupos</b> (no filas) se usa una cláusula especial, distinta de WHERE.</p>`,
    solution: 'SELECT b.nombre FROM banda b JOIN miembro m ON m.id_banda = b.id_banda GROUP BY b.id_banda, b.nombre HAVING COUNT(*) > 1;',
    colLabels: ['nombre de la banda'],
    hints: {
      more: 'Aparecen bandas de más. ¿Filtraste los grupos para quedarte solo con los que tienen <b>más de 1</b> miembro?',
      missingCol: () => 'La cantidad de filas está bien, pero falta el <b>nombre</b> de la banda en el resultado (el id solo no alcanza).',
    },
  },
];

// Las fases DQL se verifican comparando resultados
for (const p of PHASES) {
  if (!p.check) p.check = makeQueryCheck(p);
}

export const MISSIONS = {
  1: 'La libreta quemada', 2: 'El garaje y los golpes', 3: 'Cambio de planes',
  4: 'Reclutamiento', 5: 'El libro de golpes', 6: 'Ajuste de cuentas',
  7: 'Informe para la jefa', 8: 'Conexiones', 9: 'El gran golpe',
};

/** Mapea el id de reto de la historia (- SQL: id) a fases. Un id de misión ("mision-3") abre todas sus fases. */
export function phasesFor(challengeId) {
  const id = String(challengeId).trim().toLowerCase();
  const m = id.match(/^mision-(\d+)$/);
  if (m) return PHASES.filter((p) => p.mission === Number(m[1]));
  return PHASES.filter((p) => p.id === id);
}

/** Reconstruye la base aplicando las soluciones de referencia de las fases completas (en orden). */
export function rebuildState(completedIds) {
  const engine = new SqlEngine();
  for (const p of PHASES) {
    if (!completedIds.has(p.id)) break;
    if (p.kind === 'DQL') continue;
    p.setup?.(engine);
    engine.run(p.solution);
  }
  if (engine.state.databases[DB_NAME]) engine.state.current = engine.state.databases[DB_NAME].name;
  return engine.state;
}

export { compareValues };
