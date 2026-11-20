// Intérprete SQL propio (subconjunto estilo MySQL 8) para la práctica GTA SQL.
// Corre 100 % en el navegador, sin dependencias. Soporta DDL, DML y DQL de clase.

export class SqlError extends Error {
  constructor(code, state, message, hint = '') {
    super(message);
    this.code = code;
    this.state = state;
    this.hint = hint;
  }
  toMysql() {
    return `ERROR ${this.code} (${this.state}): ${this.message}`;
  }
}

/* ------------------------------------------------------------------ */
/* Pistas en español para cada error (lectura fácil)                   */
/* ------------------------------------------------------------------ */
const HINTS = {
  1007: 'Esa base de datos ya existe. No hace falta crearla de nuevo: usala con USE.',
  1008: 'Esa base de datos no existe. Revisá el nombre.',
  1046: 'Todavía no elegiste una base de datos. Usá USE nombre_de_la_base; primero.',
  1049: 'No existe una base con ese nombre. ¿La creaste antes con CREATE DATABASE?',
  1050: 'Ya hay una tabla con ese nombre. Si querés cambiarla, usá ALTER TABLE.',
  1051: 'Esa tabla no existe. Revisá el nombre con SHOW TABLES;',
  1052: 'Esa columna está en más de una tabla. Escribí tabla.columna para decir cuál querés.',
  1054: 'Esa columna no existe en la tabla. Revisá el nombre con DESCRIBE tabla;',
  1060: 'La tabla ya tiene una columna con ese nombre.',
  1062: 'Ya hay una fila con ese mismo valor en la clave primaria (o en un campo UNIQUE). Cada valor debe ser único.',
  1064: 'Hay un error de escritura en la sentencia. Revisá comas, paréntesis, comillas y palabras clave cerca del texto marcado.',
  1068: 'La tabla ya tiene clave primaria. Solo puede haber una.',
  1072: 'Esa columna no existe en la tabla. La clave tiene que usar columnas que ya estén definidas.',
  1091: 'No se encontró esa columna o restricción para borrar. Revisá el nombre.',
  1136: 'La cantidad de valores no coincide con la cantidad de columnas. Contá los valores de cada fila.',
  1146: 'Esa tabla no existe en la base actual. Revisá el nombre con SHOW TABLES;',
  1048: 'Esa columna es NOT NULL: no puede quedar vacía.',
  1364: 'Esa columna es obligatoria y no tiene valor por defecto. Incluí un valor para ella.',
  1366: 'Ese valor no es un número. Para columnas numéricas no uses texto.',
  1406: 'El texto es más largo que el tamaño de la columna. Revisá el largo de VARCHAR.',
  1265: 'El valor no entra en el tipo de la columna.',
  1264: 'El número es demasiado grande (o chico) para el tipo de la columna.',
  1292: 'La fecha no es válida. Usá el formato \'AAAA-MM-DD\', entre comillas.',
  1451: 'Otra tabla tiene filas que apuntan a esta fila. Primero borrá o cambiá las filas hijas.',
  1452: 'Ese valor apunta a una fila que no existe en la tabla referenciada. ¿Cargaste primero la tabla "padre"?',
  1701: 'No se puede vaciar una tabla que otra tabla referencia con FOREIGN KEY.',
  1822: 'La columna referenciada tiene que ser la clave primaria (o UNIQUE) de la otra tabla.',
  1824: 'La tabla referenciada no existe todavía. Creá primero la tabla "padre".',
  1828: 'No se puede borrar esa columna porque la usa una FOREIGN KEY de esta tabla.',
  1829: 'No se puede borrar esa columna porque otra tabla la referencia con FOREIGN KEY.',
  3730: 'Otra tabla tiene una FOREIGN KEY hacia esta. Borrá primero la tabla hija.',
  3780: 'La columna y la columna referenciada tienen tipos distintos. Deben tener el mismo tipo de dato.',
  3819: 'El valor no cumple la regla CHECK de la columna.',
  1111: 'Las funciones como COUNT o SUM no van en el WHERE. Para filtrar grupos usá HAVING.',
  1248: 'Toda subconsulta en el FROM necesita un alias.',
  1222: 'Las dos consultas del UNION deben tener la misma cantidad de columnas.',
};

function err(code, state, msg) {
  return new SqlError(code, state, msg, HINTS[code] || '');
}

/* ------------------------------------------------------------------ */
/* Tokenizador                                                         */
/* ------------------------------------------------------------------ */
const OPS = ['<=>', '<=', '>=', '<>', '!=', '||', '&&', '=', '<', '>', '(', ')', ',', ';', '*', '+', '-', '/', '%', '.'];

export function tokenize(src) {
  const tokens = [];
  let i = 0;
  let line = 1;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '\n') { line += 1; i += 1; continue; }
    if (/\s/.test(c)) { i += 1; continue; }
    if (c === '-' && src[i + 1] === '-' && (i + 2 >= n || /\s/.test(src[i + 2]))) {
      while (i < n && src[i] !== '\n') i += 1;
      continue;
    }
    if (c === '#') { while (i < n && src[i] !== '\n') i += 1; continue; }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      for (let k = i; k < stop; k += 1) if (src[k] === '\n') line += 1;
      i = stop;
      continue;
    }
    const start = i;
    if (c === "'" || c === '"') {
      let val = '';
      i += 1;
      let closed = false;
      while (i < n) {
        const ch = src[i];
        if (ch === '\\' && i + 1 < n) {
          const nx = src[i + 1];
          val += nx === 'n' ? '\n' : nx === 't' ? '\t' : nx;
          i += 2;
          continue;
        }
        if (ch === c) {
          if (src[i + 1] === c) { val += c; i += 2; continue; }
          closed = true;
          i += 1;
          break;
        }
        if (ch === '\n') line += 1;
        val += ch;
        i += 1;
      }
      if (!closed) {
        throw err(1064, '42000', `You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '${src.slice(start, start + 40)}' at line ${line}`);
      }
      tokens.push({ type: 'str', value: val, pos: start, end: i, line });
      continue;
    }
    if (c === '`') {
      const end = src.indexOf('`', i + 1);
      if (end === -1) {
        throw err(1064, '42000', `You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '${src.slice(start, start + 40)}' at line ${line}`);
      }
      tokens.push({ type: 'qid', value: src.slice(i + 1, end), pos: start, end: end + 1, line });
      i = end + 1;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i;
      while (j < n && /[0-9]/.test(src[j])) j += 1;
      if (src[j] === '.' && /[0-9]/.test(src[j + 1] || '')) {
        j += 1;
        while (j < n && /[0-9]/.test(src[j])) j += 1;
      } else if (src[j] === '.' && !/[A-Za-z_]/.test(src[j + 1] || '')) {
        j += 1;
      }
      if (/[eE]/.test(src[j] || '') && /[-+0-9]/.test(src[j + 1] || '')) {
        j += 1;
        if (/[-+]/.test(src[j])) j += 1;
        while (j < n && /[0-9]/.test(src[j])) j += 1;
      }
      if (/[A-Za-z_]/.test(src[j] || '')) {
        // identificador que empieza con número (ej: 1a) -> tratar como palabra
        while (j < n && /[A-Za-z0-9_$À-ɏ]/.test(src[j])) j += 1;
        tokens.push({ type: 'word', value: src.slice(i, j), pos: start, end: j, line });
      } else {
        tokens.push({ type: 'num', value: Number(src.slice(i, j)), raw: src.slice(i, j), pos: start, end: j, line });
      }
      i = j;
      continue;
    }
    if (/[A-Za-z_$À-ɏ]/.test(c)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_$À-ɏ]/.test(src[j])) j += 1;
      tokens.push({ type: 'word', value: src.slice(i, j), pos: start, end: j, line });
      i = j;
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (op) {
      tokens.push({ type: 'op', value: op, pos: start, end: i + op.length, line });
      i += op.length;
      continue;
    }
    throw err(1064, '42000', `You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '${src.slice(i, i + 40)}' at line ${line}`);
  }
  tokens.push({ type: 'eof', value: '', pos: n, end: n, line });
  return tokens;
}

/** Divide un texto en sentencias (por ; fuera de comillas). Devuelve [{text, start}] */
export function splitStatements(src) {
  const tokens = tokenize(src);
  const out = [];
  let startTok = 0;
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if ((t.type === 'op' && t.value === ';') || t.type === 'eof') {
      if (i > startTok) {
        const from = tokens[startTok].pos;
        const to = tokens[i - 1].end;
        out.push(src.slice(from, to));
      }
      startTok = i + 1;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Parser                                                              */
/* ------------------------------------------------------------------ */
const RESERVED = new Set([
  'SELECT', 'FROM', 'WHERE', 'GROUP', 'ORDER', 'HAVING', 'LIMIT', 'JOIN', 'INNER', 'LEFT', 'RIGHT',
  'ON', 'AS', 'UNION', 'AND', 'OR', 'NOT', 'SET', 'VALUES', 'VALUE', 'CROSS', 'OUTER', 'NATURAL', 'OFFSET',
  'ASC', 'DESC', 'BY', 'INTO', 'USING', 'IS', 'NULL', 'IN', 'LIKE', 'BETWEEN', 'XOR', 'DISTINCT',
  'CREATE', 'TABLE', 'DROP', 'ALTER', 'INSERT', 'UPDATE', 'DELETE', 'WHEN', 'THEN', 'ELSE', 'END', 'CASE',
  'FULL', 'ALL', 'EXISTS', 'DIV', 'MOD', 'REGEXP',
]);

const AGG_FUNCS = new Set(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'GROUP_CONCAT']);

class Parser {
  constructor(src) {
    this.src = src;
    this.tokens = tokenize(src);
    this.i = 0;
  }
  peek(o = 0) { return this.tokens[Math.min(this.i + o, this.tokens.length - 1)]; }
  next() { const t = this.tokens[this.i]; if (this.i < this.tokens.length - 1) this.i += 1; return t; }
  isKw(kw, o = 0) {
    const t = this.peek(o);
    return t.type === 'word' && t.value.toUpperCase() === kw;
  }
  isOp(op, o = 0) { const t = this.peek(o); return t.type === 'op' && t.value === op; }
  acceptKw(...kws) {
    for (const kw of kws) if (this.isKw(kw)) { return this.next(); }
    return null;
  }
  acceptOp(op) { if (this.isOp(op)) return this.next(); return null; }
  syntaxError(t = this.peek()) {
    const near = this.src.slice(t.pos, t.pos + 60);
    return err(1064, '42000', `You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '${near}' at line ${t.line}`);
  }
  expectKw(kw) {
    if (!this.isKw(kw)) throw this.syntaxError();
    return this.next();
  }
  expectOp(op) {
    if (!this.isOp(op)) throw this.syntaxError();
    return this.next();
  }
  ident() {
    const t = this.peek();
    if (t.type === 'qid') { this.next(); return t.value; }
    if (t.type === 'word' && !RESERVED.has(t.value.toUpperCase())) { this.next(); return t.value; }
    throw this.syntaxError();
  }
  identLoose() {
    // nombres que pueden coincidir con palabras no tan reservadas
    const t = this.peek();
    if (t.type === 'qid' || t.type === 'word') { this.next(); return t.value; }
    throw this.syntaxError();
  }
  atEnd() { return this.peek().type === 'eof' || this.isOp(';'); }
  expectEnd() {
    this.acceptOp(';');
    if (this.peek().type !== 'eof') throw this.syntaxError();
  }

  /* ---------- sentencias ---------- */
  statement() {
    const t = this.peek();
    if (t.type !== 'word') throw this.syntaxError();
    const kw = t.value.toUpperCase();
    let st;
    switch (kw) {
      case 'CREATE': st = this.createStmt(); break;
      case 'DROP': st = this.dropStmt(); break;
      case 'USE': this.next(); st = { type: 'use', name: this.identLoose() }; break;
      case 'SHOW': st = this.showStmt(); break;
      case 'DESCRIBE': case 'DESC': case 'EXPLAIN':
        this.next(); st = { type: 'describe', table: this.tableName() }; break;
      case 'ALTER': st = this.alterStmt(); break;
      case 'TRUNCATE': this.next(); this.acceptKw('TABLE'); st = { type: 'truncate', table: this.tableName() }; break;
      case 'RENAME': {
        this.next(); this.expectKw('TABLE');
        const from = this.tableName(); this.expectKw('TO');
        st = { type: 'renameTable', from, to: this.tableName() };
        break;
      }
      case 'INSERT': st = this.insertStmt(); break;
      case 'UPDATE': st = this.updateStmt(); break;
      case 'DELETE': st = this.deleteStmt(); break;
      case 'SELECT': st = this.selectStmt(); break;
      default:
        throw this.syntaxError();
    }
    this.expectEnd();
    return st;
  }

  tableName() {
    const a = this.identLoose();
    if (this.isOp('.')) { this.next(); const b = this.identLoose(); return { db: a, name: b }; }
    return { db: null, name: a };
  }

  createStmt() {
    this.expectKw('CREATE');
    if (this.acceptKw('DATABASE', 'SCHEMA')) {
      let ifNotExists = false;
      if (this.acceptKw('IF')) { this.expectKw('NOT'); this.expectKw('EXISTS'); ifNotExists = true; }
      const name = this.identLoose();
      while (!this.atEnd()) this.next(); // CHARACTER SET, COLLATE... se ignoran
      return { type: 'createDatabase', name, ifNotExists };
    }
    this.acceptKw('TEMPORARY');
    if (!this.acceptKw('TABLE')) throw this.syntaxError();
    let ifNotExists = false;
    if (this.acceptKw('IF')) { this.expectKw('NOT'); this.expectKw('EXISTS'); ifNotExists = true; }
    const table = this.tableName();
    this.expectOp('(');
    const columns = [];
    const constraints = [];
    do {
      if (this.isConstraintStart()) constraints.push(this.tableConstraint());
      else columns.push(this.columnDef());
    } while (this.acceptOp(','));
    this.expectOp(')');
    // opciones de tabla: ENGINE=InnoDB DEFAULT CHARSET=utf8 ...
    while (!this.atEnd()) {
      const t = this.next();
      if (t.type === 'op' && t.value !== '=' && t.value !== ',') throw this.syntaxError(t);
    }
    return { type: 'createTable', table, ifNotExists, columns, constraints };
  }

  isConstraintStart() {
    return this.isKw('PRIMARY') || this.isKw('FOREIGN') || this.isKw('CONSTRAINT') || this.isKw('CHECK')
      || ((this.isKw('UNIQUE') || this.isKw('KEY') || this.isKw('INDEX')) && !this.isOp(',', 1) && !this.isOp(')', 1)
        && (this.isOp('(', 1) || this.isKw('KEY', 1) || this.isKw('INDEX', 1) || this.peek(1).type === 'word' || this.peek(1).type === 'qid'));
  }

  identList() {
    this.expectOp('(');
    const cols = [];
    do {
      cols.push(this.identLoose());
      if (this.isOp('(')) { this.next(); this.next(); this.expectOp(')'); } // prefijo de índice
      this.acceptKw('ASC', 'DESC');
    } while (this.acceptOp(','));
    this.expectOp(')');
    return cols;
  }

  tableConstraint() {
    let name = null;
    if (this.acceptKw('CONSTRAINT')) {
      if (!this.isKw('PRIMARY') && !this.isKw('FOREIGN') && !this.isKw('UNIQUE') && !this.isKw('CHECK')) name = this.identLoose();
    }
    if (this.acceptKw('PRIMARY')) {
      this.expectKw('KEY');
      return { kind: 'pk', name, cols: this.identList() };
    }
    if (this.acceptKw('FOREIGN')) {
      this.expectKw('KEY');
      if (!this.isOp('(')) this.identLoose(); // nombre de índice opcional
      const cols = this.identList();
      const ref = this.referencesClause();
      return { kind: 'fk', name, cols, ...ref };
    }
    if (this.acceptKw('UNIQUE')) {
      this.acceptKw('KEY', 'INDEX');
      if (!this.isOp('(')) this.identLoose();
      return { kind: 'unique', name, cols: this.identList() };
    }
    if (this.acceptKw('CHECK')) {
      this.expectOp('(');
      const s = this.peek().pos;
      const expr = this.expr();
      const text = this.src.slice(s, this.tokens[this.i - 1].end);
      this.expectOp(')');
      return { kind: 'check', name, expr, text };
    }
    if (this.acceptKw('KEY', 'INDEX')) {
      if (!this.isOp('(')) this.identLoose();
      this.identList();
      return { kind: 'index' };
    }
    throw this.syntaxError();
  }

  referencesClause() {
    this.expectKw('REFERENCES');
    const refTable = this.tableName();
    const refCols = this.identList();
    let onDelete = 'RESTRICT';
    let onUpdate = 'RESTRICT';
    while (this.isKw('ON')) {
      this.next();
      const which = this.acceptKw('DELETE', 'UPDATE');
      if (!which) throw this.syntaxError();
      let action;
      if (this.acceptKw('CASCADE')) action = 'CASCADE';
      else if (this.acceptKw('RESTRICT')) action = 'RESTRICT';
      else if (this.acceptKw('SET')) {
        if (this.acceptKw('NULL')) action = 'SET NULL';
        else { this.expectKw('DEFAULT'); action = 'RESTRICT'; }
      } else if (this.acceptKw('NO')) { this.expectKw('ACTION'); action = 'RESTRICT'; }
      else throw this.syntaxError();
      if (which.value.toUpperCase() === 'DELETE') onDelete = action; else onUpdate = action;
    }
    return { refTable: refTable.name, refCols, onDelete, onUpdate };
  }

  dataType() {
    const t = this.peek();
    if (t.type !== 'word') throw this.syntaxError();
    let base = t.value.toUpperCase();
    this.next();
    const aliases = { INTEGER: 'INT', BOOL: 'TINYINT', BOOLEAN: 'TINYINT', NUMERIC: 'DECIMAL', DEC: 'DECIMAL', REAL: 'DOUBLE', MEDIUMINT: 'INT', TINYTEXT: 'TEXT', MEDIUMTEXT: 'TEXT', LONGTEXT: 'TEXT', TIMESTAMP: 'DATETIME' };
    const wasBool = base === 'BOOL' || base === 'BOOLEAN';
    if (base === 'DOUBLE' && this.isKw('PRECISION')) this.next();
    if (base === 'CHARACTER' && this.isKw('VARYING')) { this.next(); base = 'VARCHAR'; }
    base = aliases[base] || base;
    const known = ['INT', 'TINYINT', 'SMALLINT', 'BIGINT', 'DECIMAL', 'FLOAT', 'DOUBLE', 'VARCHAR', 'CHAR', 'TEXT', 'DATE', 'DATETIME', 'TIME', 'YEAR', 'ENUM'];
    if (!known.includes(base)) throw this.syntaxError(t);
    const type = { base };
    if (wasBool) type.len = 1;
    if (base === 'ENUM') {
      this.expectOp('(');
      type.values = [];
      do {
        const s = this.next();
        if (s.type !== 'str') throw this.syntaxError(s);
        type.values.push(s.value);
      } while (this.acceptOp(','));
      this.expectOp(')');
    } else if (this.isOp('(')) {
      this.next();
      const a = this.next();
      if (a.type !== 'num') throw this.syntaxError(a);
      type.len = a.value;
      if (this.acceptOp(',')) {
        const b = this.next();
        if (b.type !== 'num') throw this.syntaxError(b);
        type.scale = b.value;
      }
      this.expectOp(')');
    }
    if (base === 'VARCHAR' && type.len == null) throw this.syntaxError(this.peek());
    if (base === 'DECIMAL') { if (type.len == null) type.len = 10; if (type.scale == null) type.scale = 0; }
    if (this.acceptKw('UNSIGNED')) type.unsigned = true;
    this.acceptKw('SIGNED');
    this.acceptKw('ZEROFILL');
    // CHARACTER SET x / COLLATE x
    while (this.isKw('CHARACTER') || this.isKw('CHARSET') || this.isKw('COLLATE')) {
      if (this.acceptKw('CHARACTER')) this.expectKw('SET'); else this.next();
      this.identLoose();
    }
    return type;
  }

  columnDef() {
    const name = this.ident();
    const type = this.dataType();
    const col = { name, type, notNull: false, hasDefault: false, default: null, autoInc: false };
    const extras = { pk: false, unique: false, fk: null, checks: [] };
    for (;;) {
      if (this.acceptKw('NOT')) { this.expectKw('NULL'); col.notNull = true; continue; }
      if (this.acceptKw('NULL')) { continue; }
      if (this.acceptKw('DEFAULT')) {
        col.hasDefault = true;
        const neg = this.acceptOp('-');
        const t = this.next();
        if (t.type === 'num') col.default = neg ? -t.value : t.value;
        else if (t.type === 'str') col.default = t.value;
        else if (t.type === 'word' && t.value.toUpperCase() === 'NULL') col.default = null;
        else if (t.type === 'word' && ['CURRENT_TIMESTAMP', 'NOW', 'CURRENT_DATE', 'CURDATE'].includes(t.value.toUpperCase())) {
          col.default = { now: true };
          if (this.isOp('(')) { this.next(); this.expectOp(')'); }
        } else if (t.type === 'word' && ['TRUE', 'FALSE'].includes(t.value.toUpperCase())) col.default = t.value.toUpperCase() === 'TRUE' ? 1 : 0;
        else if (t.type === 'op' && t.value === '(') { const e = this.expr(); this.expectOp(')'); col.default = evalConst(e); }
        else throw this.syntaxError(t);
        continue;
      }
      if (this.acceptKw('AUTO_INCREMENT')) { col.autoInc = true; continue; }
      if (this.acceptKw('PRIMARY')) { this.expectKw('KEY'); extras.pk = true; continue; }
      if (this.acceptKw('UNIQUE')) { this.acceptKw('KEY'); extras.unique = true; continue; }
      if (this.isKw('REFERENCES')) { extras.fk = this.referencesClause(); continue; }
      if (this.acceptKw('CHECK')) {
        this.expectOp('(');
        const s = this.peek().pos;
        const expr = this.expr();
        const text = this.src.slice(s, this.tokens[this.i - 1].end);
        this.expectOp(')');
        extras.checks.push({ expr, text });
        continue;
      }
      if (this.acceptKw('CONSTRAINT')) {
        this.identLoose();
        continue;
      }
      if (this.acceptKw('COMMENT')) { const s = this.next(); if (s.type !== 'str') throw this.syntaxError(s); continue; }
      if (this.isKw('ON') && this.isKw('UPDATE', 1)) { this.next(); this.next(); this.next(); if (this.isOp('(')) { this.next(); this.expectOp(')'); } continue; }
      break;
    }
    return { col, extras };
  }

  dropStmt() {
    this.expectKw('DROP');
    if (this.acceptKw('DATABASE', 'SCHEMA')) {
      let ifExists = false;
      if (this.acceptKw('IF')) { this.expectKw('EXISTS'); ifExists = true; }
      return { type: 'dropDatabase', name: this.identLoose(), ifExists };
    }
    this.acceptKw('TEMPORARY');
    this.expectKw('TABLE');
    let ifExists = false;
    if (this.acceptKw('IF')) { this.expectKw('EXISTS'); ifExists = true; }
    const tables = [this.tableName()];
    while (this.acceptOp(',')) tables.push(this.tableName());
    this.acceptKw('CASCADE', 'RESTRICT');
    return { type: 'dropTable', tables, ifExists };
  }

  showStmt() {
    this.expectKw('SHOW');
    this.acceptKw('FULL');
    if (this.acceptKw('DATABASES', 'SCHEMAS')) return { type: 'showDatabases' };
    if (this.acceptKw('TABLES')) {
      let db = null;
      if (this.acceptKw('FROM', 'IN')) db = this.identLoose();
      return { type: 'showTables', db };
    }
    if (this.acceptKw('COLUMNS', 'FIELDS')) {
      this.acceptKw('FROM', 'IN') || (() => { throw this.syntaxError(); })();
      return { type: 'describe', table: this.tableName() };
    }
    if (this.acceptKw('CREATE')) {
      if (this.acceptKw('TABLE')) return { type: 'showCreate', table: this.tableName() };
      if (this.acceptKw('DATABASE', 'SCHEMA')) return { type: 'showCreateDb', name: this.identLoose() };
    }
    throw this.syntaxError();
  }

  alterStmt() {
    this.expectKw('ALTER');
    this.expectKw('TABLE');
    const table = this.tableName();
    const actions = [];
    do {
      actions.push(this.alterAction());
    } while (this.acceptOp(','));
    return { type: 'alterTable', table, actions };
  }

  alterAction() {
    if (this.acceptKw('ADD')) {
      if (this.isConstraintStart()) return { op: 'addConstraint', constraint: this.tableConstraint() };
      this.acceptKw('COLUMN');
      if (this.isOp('(')) {
        this.next();
        const defs = [];
        do defs.push(this.columnDef()); while (this.acceptOp(','));
        this.expectOp(')');
        return { op: 'addColumns', defs };
      }
      const def = this.columnDef();
      const pos = this.columnPosition();
      return { op: 'addColumns', defs: [def], pos };
    }
    if (this.acceptKw('DROP')) {
      if (this.acceptKw('PRIMARY')) { this.expectKw('KEY'); return { op: 'dropPk' }; }
      if (this.acceptKw('FOREIGN')) { this.expectKw('KEY'); return { op: 'dropFk', name: this.identLoose() }; }
      if (this.acceptKw('INDEX', 'KEY')) { return { op: 'dropIndex', name: this.identLoose() }; }
      if (this.acceptKw('CHECK', 'CONSTRAINT')) { return { op: 'dropConstraint', name: this.identLoose() }; }
      this.acceptKw('COLUMN');
      return { op: 'dropColumn', name: this.identLoose() };
    }
    if (this.acceptKw('MODIFY')) {
      this.acceptKw('COLUMN');
      const def = this.columnDef();
      return { op: 'modify', from: def.col.name, def, pos: this.columnPosition() };
    }
    if (this.acceptKw('CHANGE')) {
      this.acceptKw('COLUMN');
      const from = this.identLoose();
      const def = this.columnDef();
      return { op: 'modify', from, def, pos: this.columnPosition() };
    }
    if (this.acceptKw('RENAME')) {
      if (this.acceptKw('COLUMN')) {
        const from = this.identLoose();
        this.expectKw('TO');
        return { op: 'renameColumn', from, to: this.identLoose() };
      }
      this.acceptKw('TO', 'AS');
      return { op: 'renameTable', to: this.tableName() };
    }
    if (this.acceptKw('ALTER')) {
      this.acceptKw('COLUMN');
      const name = this.identLoose();
      if (this.acceptKw('SET')) {
        this.expectKw('DEFAULT');
        const neg = this.acceptOp('-');
        const t = this.next();
        let v;
        if (t.type === 'num') v = neg ? -t.value : t.value;
        else if (t.type === 'str') v = t.value;
        else if (t.type === 'word' && t.value.toUpperCase() === 'NULL') v = null;
        else throw this.syntaxError(t);
        return { op: 'setDefault', name, value: v };
      }
      this.expectKw('DROP'); this.expectKw('DEFAULT');
      return { op: 'dropDefault', name };
    }
    throw this.syntaxError();
  }

  columnPosition() {
    if (this.acceptKw('FIRST')) return { first: true };
    if (this.acceptKw('AFTER')) return { after: this.identLoose() };
    return null;
  }

  insertStmt() {
    this.expectKw('INSERT');
    const ignore = Boolean(this.acceptKw('IGNORE'));
    this.acceptKw('INTO');
    const table = this.tableName();
    let columns = null;
    if (this.isOp('(') && !this.isKw('SELECT', 1)) {
      columns = this.identList();
    }
    if (this.acceptKw('VALUES', 'VALUE')) {
      const rows = [];
      do {
        this.expectOp('(');
        const vals = [];
        if (!this.isOp(')')) {
          do {
            if (this.isKw('DEFAULT')) { this.next(); vals.push({ k: 'default' }); }
            else vals.push(this.expr());
          } while (this.acceptOp(','));
        }
        this.expectOp(')');
        rows.push(vals);
      } while (this.acceptOp(','));
      return { type: 'insert', table, columns, rows, ignore };
    }
    if (this.acceptKw('SET')) {
      const cols = [];
      const vals = [];
      do {
        cols.push(this.identLoose());
        this.expectOp('=');
        vals.push(this.expr());
      } while (this.acceptOp(','));
      return { type: 'insert', table, columns: cols, rows: [vals], ignore };
    }
    if (this.isKw('SELECT') || this.isOp('(')) {
      const paren = this.acceptOp('(');
      const select = this.selectStmt();
      if (paren) this.expectOp(')');
      return { type: 'insert', table, columns, select, ignore };
    }
    throw this.syntaxError();
  }

  updateStmt() {
    this.expectKw('UPDATE');
    const table = this.tableName();
    let alias = null;
    this.acceptKw('AS');
    if (this.peek().type === 'word' && !RESERVED.has(this.peek().value.toUpperCase())) alias = this.ident();
    this.expectKw('SET');
    const sets = [];
    do {
      let col = this.identLoose();
      if (this.acceptOp('.')) col = this.identLoose();
      this.expectOp('=');
      sets.push({ col, expr: this.isKw('DEFAULT') ? (this.next(), { k: 'default' }) : this.expr() });
    } while (this.acceptOp(','));
    let where = null;
    if (this.acceptKw('WHERE')) where = this.expr();
    const { orderBy, limit } = this.orderLimit();
    return { type: 'update', table, alias, sets, where, orderBy, limit };
  }

  deleteStmt() {
    this.expectKw('DELETE');
    this.expectKw('FROM');
    const table = this.tableName();
    let alias = null;
    this.acceptKw('AS');
    if (this.peek().type === 'word' && !RESERVED.has(this.peek().value.toUpperCase())) alias = this.ident();
    let where = null;
    if (this.acceptKw('WHERE')) where = this.expr();
    const { orderBy, limit } = this.orderLimit();
    return { type: 'delete', table, alias, where, orderBy, limit };
  }

  orderLimit() {
    let orderBy = null;
    let limit = null;
    let offset = 0;
    if (this.acceptKw('ORDER')) {
      this.expectKw('BY');
      orderBy = [];
      do {
        const e = this.expr();
        let desc = false;
        if (this.acceptKw('DESC')) desc = true; else this.acceptKw('ASC');
        orderBy.push({ expr: e, desc });
      } while (this.acceptOp(','));
    }
    if (this.acceptKw('LIMIT')) {
      const a = this.next();
      if (a.type !== 'num') throw this.syntaxError(a);
      limit = a.value;
      if (this.acceptOp(',')) {
        const b = this.next();
        if (b.type !== 'num') throw this.syntaxError(b);
        offset = a.value; limit = b.value;
      } else if (this.acceptKw('OFFSET')) {
        const b = this.next();
        if (b.type !== 'num') throw this.syntaxError(b);
        offset = b.value;
      }
    }
    return { orderBy, limit, offset };
  }

  selectStmt() {
    const first = this.selectCore();
    let node = first;
    const unions = [];
    while (this.isKw('UNION')) {
      this.next();
      const all = Boolean(this.acceptKw('ALL'));
      this.acceptKw('DISTINCT');
      const paren = this.acceptOp('(');
      const s = this.selectCore();
      if (paren) this.expectOp(')');
      unions.push({ all, select: s });
    }
    if (unions.length) {
      const { orderBy, limit, offset } = this.orderLimit();
      node = { type: 'union', first, unions, orderBy, limit, offset };
    }
    return node;
  }

  selectCore() {
    this.expectKw('SELECT');
    const distinct = Boolean(this.acceptKw('DISTINCT'));
    this.acceptKw('ALL');
    const items = [];
    do {
      const startTok = this.peek();
      if (this.isOp('*')) { this.next(); items.push({ star: true }); continue; }
      if ((this.peek().type === 'word' || this.peek().type === 'qid') && this.isOp('.', 1) && this.isOp('*', 2)) {
        const tname = this.identLoose(); this.next(); this.next();
        items.push({ star: true, table: tname });
        continue;
      }
      const e = this.expr();
      const text = this.src.slice(startTok.pos, this.tokens[this.i - 1].end);
      let alias = null;
      if (this.acceptKw('AS')) {
        const t = this.next();
        if (t.type === 'str' || t.type === 'qid' || t.type === 'word') alias = t.value; else throw this.syntaxError(t);
      } else if (this.peek().type === 'qid' || this.peek().type === 'str' || (this.peek().type === 'word' && !RESERVED.has(this.peek().value.toUpperCase()))) {
        alias = this.next().value;
      }
      items.push({ expr: e, alias, text });
    } while (this.acceptOp(','));

    let from = null;
    if (this.acceptKw('FROM')) from = this.fromClause();
    let where = null;
    if (this.acceptKw('WHERE')) where = this.expr();
    let groupBy = null;
    if (this.acceptKw('GROUP')) {
      this.expectKw('BY');
      groupBy = [];
      do { groupBy.push(this.expr()); this.acceptKw('ASC', 'DESC'); } while (this.acceptOp(','));
    }
    let having = null;
    if (this.acceptKw('HAVING')) having = this.expr();
    const { orderBy, limit, offset } = this.orderLimit();
    return { type: 'select', distinct, items, from, where, groupBy, having, orderBy, limit, offset };
  }

  tableRef() {
    if (this.isOp('(')) {
      this.next();
      const sub = this.selectStmt();
      this.expectOp(')');
      this.acceptKw('AS');
      if (!(this.peek().type === 'word' && !RESERVED.has(this.peek().value.toUpperCase())) && this.peek().type !== 'qid') {
        throw err(1248, '42000', 'Every derived table must have its own alias');
      }
      return { sub, alias: this.ident() };
    }
    const t = this.tableName();
    let alias = null;
    if (this.acceptKw('AS')) alias = this.ident();
    else if (this.peek().type === 'qid' || (this.peek().type === 'word' && !RESERVED.has(this.peek().value.toUpperCase()))) alias = this.ident();
    return { table: t, alias };
  }

  fromClause() {
    const first = this.tableRef();
    const joins = [];
    for (;;) {
      if (this.acceptOp(',')) { joins.push({ kind: 'cross', ref: this.tableRef(), on: null }); continue; }
      let kind = null;
      let natural = false;
      if (this.isKw('NATURAL')) { this.next(); natural = true; }
      if (this.acceptKw('INNER')) kind = 'inner';
      else if (this.acceptKw('CROSS')) kind = 'cross';
      else if (this.acceptKw('LEFT')) { this.acceptKw('OUTER'); kind = 'left'; }
      else if (this.acceptKw('RIGHT')) { this.acceptKw('OUTER'); kind = 'right'; }
      if (this.acceptKw('JOIN')) {
        kind = kind || 'inner';
        const ref = this.tableRef();
        let on = null;
        let using = null;
        if (this.acceptKw('ON')) on = this.expr();
        else if (this.acceptKw('USING')) using = this.identList();
        joins.push({ kind, ref, on, using, natural });
        continue;
      }
      if (kind || natural) throw this.syntaxError();
      break;
    }
    return { first, joins };
  }

  /* ---------- expresiones ---------- */
  expr() { return this.orExpr(); }
  orExpr() {
    let l = this.xorExpr();
    while (this.isKw('OR') || this.isOp('||')) { this.next(); l = { k: 'or', l, r: this.xorExpr() }; }
    return l;
  }
  xorExpr() {
    let l = this.andExpr();
    while (this.isKw('XOR')) { this.next(); l = { k: 'xor', l, r: this.andExpr() }; }
    return l;
  }
  andExpr() {
    let l = this.notExpr();
    while (this.isKw('AND') || this.isOp('&&')) { this.next(); l = { k: 'and', l, r: this.notExpr() }; }
    return l;
  }
  notExpr() {
    if (this.isKw('NOT')) { this.next(); return { k: 'not', e: this.notExpr() }; }
    return this.cmpExpr();
  }
  cmpExpr() {
    let l = this.addExpr();
    for (;;) {
      const t = this.peek();
      if (t.type === 'op' && ['=', '<>', '!=', '<', '>', '<=', '>=', '<=>'].includes(t.value)) {
        this.next();
        if (this.isKw('ANY') || this.isKw('SOME') || this.isKw('ALL')) {
          const q = this.next().value.toUpperCase();
          this.expectOp('(');
          const sub = this.selectStmt();
          this.expectOp(')');
          l = { k: 'quant', op: t.value, q: q === 'ALL' ? 'ALL' : 'ANY', l, sub };
          continue;
        }
        l = { k: 'cmp', op: t.value === '!=' ? '<>' : t.value, l, r: this.addExpr() };
        continue;
      }
      if (this.isKw('IS')) {
        this.next();
        const not = Boolean(this.acceptKw('NOT'));
        if (this.acceptKw('NULL')) { l = { k: 'isnull', e: l, not }; continue; }
        if (this.acceptKw('TRUE')) { l = { k: 'istrue', e: l, val: true, not }; continue; }
        if (this.acceptKw('FALSE')) { l = { k: 'istrue', e: l, val: false, not }; continue; }
        throw this.syntaxError();
      }
      let not = false;
      if (this.isKw('NOT') && (this.isKw('BETWEEN', 1) || this.isKw('IN', 1) || this.isKw('LIKE', 1) || this.isKw('REGEXP', 1))) { this.next(); not = true; }
      if (this.acceptKw('BETWEEN')) {
        const lo = this.addExpr();
        this.expectKw('AND');
        const hi = this.addExpr();
        l = { k: 'between', e: l, lo, hi, not };
        continue;
      }
      if (this.acceptKw('IN')) {
        this.expectOp('(');
        if (this.isKw('SELECT')) {
          const sub = this.selectStmt();
          this.expectOp(')');
          l = { k: 'in', e: l, sub, not };
        } else {
          const list = [];
          do list.push(this.expr()); while (this.acceptOp(','));
          this.expectOp(')');
          l = { k: 'in', e: l, list, not };
        }
        continue;
      }
      if (this.acceptKw('LIKE')) { l = { k: 'like', e: l, pat: this.addExpr(), not }; continue; }
      if (this.acceptKw('REGEXP')) { l = { k: 'regexp', e: l, pat: this.addExpr(), not }; continue; }
      if (not) throw this.syntaxError();
      break;
    }
    return l;
  }
  addExpr() {
    let l = this.mulExpr();
    while (this.isOp('+') || this.isOp('-')) { const op = this.next().value; l = { k: 'arith', op, l, r: this.mulExpr() }; }
    return l;
  }
  mulExpr() {
    let l = this.unary();
    while (this.isOp('*') || this.isOp('/') || this.isOp('%') || this.isKw('DIV') || this.isKw('MOD')) {
      const t = this.next();
      const op = t.type === 'word' ? t.value.toUpperCase() : t.value;
      l = { k: 'arith', op: op === 'MOD' ? '%' : op, l, r: this.unary() };
    }
    return l;
  }
  unary() {
    if (this.isOp('-')) { this.next(); return { k: 'neg', e: this.unary() }; }
    if (this.isOp('+')) { this.next(); return this.unary(); }
    return this.primary();
  }
  primary() {
    const t = this.peek();
    if (t.type === 'num') { this.next(); return { k: 'lit', v: t.value }; }
    if (t.type === 'str') { this.next(); return { k: 'lit', v: t.value }; }
    if (t.type === 'op' && t.value === '(') {
      this.next();
      if (this.isKw('SELECT')) {
        const sub = this.selectStmt();
        this.expectOp(')');
        return { k: 'sub', sub };
      }
      const e = this.expr();
      if (this.isOp(',')) {
        const list = [e];
        while (this.acceptOp(',')) list.push(this.expr());
        this.expectOp(')');
        return { k: 'row', list };
      }
      this.expectOp(')');
      return e;
    }
    if (t.type === 'word') {
      const up = t.value.toUpperCase();
      if (up === 'NULL') { this.next(); return { k: 'lit', v: null }; }
      if (up === 'TRUE') { this.next(); return { k: 'lit', v: 1 }; }
      if (up === 'FALSE') { this.next(); return { k: 'lit', v: 0 }; }
      if (up === 'EXISTS') {
        this.next(); this.expectOp('(');
        const sub = this.selectStmt();
        this.expectOp(')');
        return { k: 'exists', sub };
      }
      if (up === 'CASE') return this.caseExpr();
      if ((up === 'DATE' || up === 'TIMESTAMP') && this.peek(1).type === 'str') { this.next(); return { k: 'lit', v: this.next().value }; }
      if (up === 'CURRENT_DATE' || up === 'CURRENT_TIMESTAMP') {
        this.next();
        if (this.isOp('(')) { this.next(); this.expectOp(')'); }
        return { k: 'fn', name: up === 'CURRENT_DATE' ? 'CURDATE' : 'NOW', args: [] };
      }
      if (this.isOp('(', 1) && !RESERVED.has(up) || (this.isOp('(', 1) && (up === 'LEFT' || up === 'RIGHT' || up === 'MOD' || up === 'IN'))) {
        return this.funcCall();
      }
    }
    if (t.type === 'word' || t.type === 'qid') {
      if (t.type === 'word' && RESERVED.has(t.value.toUpperCase())) throw this.syntaxError(t);
      this.next();
      if (this.isOp('.')) {
        this.next();
        const c = this.peek();
        if (c.type !== 'word' && c.type !== 'qid') throw this.syntaxError(c);
        this.next();
        return { k: 'col', table: t.value, name: c.value };
      }
      return { k: 'col', table: null, name: t.value };
    }
    throw this.syntaxError(t);
  }
  caseExpr() {
    this.expectKw('CASE');
    let base = null;
    if (!this.isKw('WHEN')) base = this.expr();
    const whens = [];
    while (this.acceptKw('WHEN')) {
      const w = this.expr();
      this.expectKw('THEN');
      whens.push({ w, t: this.expr() });
    }
    let els = null;
    if (this.acceptKw('ELSE')) els = this.expr();
    this.expectKw('END');
    return { k: 'case', base, whens, els };
  }
  funcCall() {
    const name = this.next().value.toUpperCase();
    this.expectOp('(');
    if (AGG_FUNCS.has(name)) {
      if (name === 'COUNT' && this.isOp('*')) {
        this.next(); this.expectOp(')');
        return { k: 'agg', name, star: true };
      }
      const distinct = Boolean(this.acceptKw('DISTINCT'));
      this.acceptKw('ALL');
      const arg = this.expr();
      let sep = ',';
      if (name === 'GROUP_CONCAT' && this.acceptKw('SEPARATOR')) sep = this.next().value;
      this.expectOp(')');
      return { k: 'agg', name, arg, distinct, sep };
    }
    const args = [];
    if (!this.isOp(')')) {
      do args.push(this.expr()); while (this.acceptOp(','));
    }
    this.expectOp(')');
    return { k: 'fn', name, args };
  }
}

export function parseStatement(sql) {
  const p = new Parser(sql);
  return p.statement();
}

/* ------------------------------------------------------------------ */
/* Valores                                                             */
/* ------------------------------------------------------------------ */
function isNum(v) { return typeof v === 'number'; }
function toNum(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const m = String(v).trim().match(/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?/);
  return m ? Number(m[0]) : 0;
}
function looksNumeric(s) { return /^\s*[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?\s*$/.test(String(s)); }

export function compareValues(a, b) {
  if (a === null || b === null || a === undefined || b === undefined) return null;
  if (isNum(a) || isNum(b)) {
    const x = toNum(a); const y = toNum(b);
    return x < y ? -1 : x > y ? 1 : 0;
  }
  const x = String(a).toLowerCase().replace(/\s+$/, '');
  const y = String(b).toLowerCase().replace(/\s+$/, '');
  return x < y ? -1 : x > y ? 1 : 0;
}

function truthy(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v !== 0;
  return toNum(v) !== 0;
}
function boolToNum(b) { return b === null ? null : (b ? 1 : 0); }

function likeToRegex(pat) {
  let re = '';
  const s = String(pat);
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === '\\' && i + 1 < s.length) { re += s[i + 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); i += 1; }
    else if (ch === '%') re += '[\\s\\S]*';
    else if (ch === '_') re += '[\\s\\S]';
    else re += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`, 'i');
}

function todayStr() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function nowStr() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${todayStr()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function evalConst(e) {
  return evalExpr(e, { resolve: () => { throw err(1054, '42S22', 'Unknown column in default'); } });
}

function formatNumberForText(v) {
  if (typeof v !== 'number') return String(v);
  if (Number.isInteger(v)) return String(v);
  return String(Math.round(v * 1e10) / 1e10);
}

const SCALAR_FUNCS = {
  UPPER: (a) => (a[0] === null ? null : String(a[0]).toUpperCase()),
  UCASE: (a) => (a[0] === null ? null : String(a[0]).toUpperCase()),
  LOWER: (a) => (a[0] === null ? null : String(a[0]).toLowerCase()),
  LCASE: (a) => (a[0] === null ? null : String(a[0]).toLowerCase()),
  LENGTH: (a) => (a[0] === null ? null : new TextEncoder().encode(String(a[0])).length),
  CHAR_LENGTH: (a) => (a[0] === null ? null : String(a[0]).length),
  CONCAT: (a) => (a.some((x) => x === null) ? null : a.map(formatNumberForText).join('')),
  CONCAT_WS: (a) => (a[0] === null ? null : a.slice(1).filter((x) => x !== null).map(formatNumberForText).join(String(a[0]))),
  ROUND: (a) => { if (a[0] === null) return null; const d = a[1] == null ? 0 : toNum(a[1]); const f = 10 ** d; return Math.round(toNum(a[0]) * f) / f; },
  TRUNCATE: (a) => { if (a[0] === null) return null; const f = 10 ** toNum(a[1] || 0); return Math.trunc(toNum(a[0]) * f) / f; },
  FLOOR: (a) => (a[0] === null ? null : Math.floor(toNum(a[0]))),
  CEIL: (a) => (a[0] === null ? null : Math.ceil(toNum(a[0]))),
  CEILING: (a) => (a[0] === null ? null : Math.ceil(toNum(a[0]))),
  ABS: (a) => (a[0] === null ? null : Math.abs(toNum(a[0]))),
  MOD: (a) => (a[0] === null || a[1] === null ? null : toNum(a[0]) % toNum(a[1])),
  POWER: (a) => toNum(a[0]) ** toNum(a[1]),
  POW: (a) => toNum(a[0]) ** toNum(a[1]),
  SQRT: (a) => Math.sqrt(toNum(a[0])),
  IFNULL: (a) => (a[0] === null ? a[1] : a[0]),
  COALESCE: (a) => { for (const x of a) if (x !== null) return x; return null; },
  NULLIF: (a) => (compareValues(a[0], a[1]) === 0 ? null : a[0]),
  IF: (a) => (truthy(a[0]) ? a[1] : a[2]),
  NOW: () => nowStr(),
  SYSDATE: () => nowStr(),
  CURDATE: () => todayStr(),
  YEAR: (a) => (a[0] === null ? null : Number(String(a[0]).slice(0, 4))),
  MONTH: (a) => (a[0] === null ? null : Number(String(a[0]).slice(5, 7))),
  DAY: (a) => (a[0] === null ? null : Number(String(a[0]).slice(8, 10))),
  DAYOFMONTH: (a) => (a[0] === null ? null : Number(String(a[0]).slice(8, 10))),
  DATE: (a) => (a[0] === null ? null : String(a[0]).slice(0, 10)),
  DATEDIFF: (a) => { if (a[0] === null || a[1] === null) return null; return Math.round((Date.parse(String(a[0]).slice(0, 10)) - Date.parse(String(a[1]).slice(0, 10))) / 86400000); },
  SUBSTRING: (a) => { if (a[0] === null) return null; const s = String(a[0]); const st = toNum(a[1]); const from = st > 0 ? st - 1 : Math.max(0, s.length + st); return a[2] == null ? s.slice(from) : s.substr(from, toNum(a[2])); },
  SUBSTR: (a) => SCALAR_FUNCS.SUBSTRING(a),
  LEFT: (a) => (a[0] === null ? null : String(a[0]).slice(0, toNum(a[1]))),
  RIGHT: (a) => (a[0] === null ? null : (toNum(a[1]) <= 0 ? '' : String(a[0]).slice(-toNum(a[1])))),
  TRIM: (a) => (a[0] === null ? null : String(a[0]).trim()),
  LTRIM: (a) => (a[0] === null ? null : String(a[0]).replace(/^\s+/, '')),
  RTRIM: (a) => (a[0] === null ? null : String(a[0]).replace(/\s+$/, '')),
  REPLACE: (a) => (a[0] === null ? null : String(a[0]).split(String(a[1])).join(String(a[2]))),
  REVERSE: (a) => (a[0] === null ? null : [...String(a[0])].reverse().join('')),
  DATABASE: (a, ctx) => ctx.engine?.state.current ?? null,
  VERSION: () => '8.0.36-gta-sql',
  RAND: () => Math.random(),
  GREATEST: (a) => (a.some((x) => x === null) ? null : a.reduce((m, x) => (compareValues(x, m) > 0 ? x : m))),
  LEAST: (a) => (a.some((x) => x === null) ? null : a.reduce((m, x) => (compareValues(x, m) < 0 ? x : m))),
};

function evalExpr(e, ctx) {
  switch (e.k) {
    case 'lit': return e.v;
    case 'col': return ctx.resolve(e.table, e.name);
    case 'default': return null;
    case 'neg': { const v = evalExpr(e.e, ctx); return v === null ? null : -toNum(v); }
    case 'not': { const v = truthy(evalExpr(e.e, ctx)); return v === null ? null : boolToNum(!v); }
    case 'and': {
      const a = truthy(evalExpr(e.l, ctx));
      if (a === false) return 0;
      const b = truthy(evalExpr(e.r, ctx));
      if (b === false) return 0;
      if (a === null || b === null) return null;
      return 1;
    }
    case 'or': {
      const a = truthy(evalExpr(e.l, ctx));
      if (a === true) return 1;
      const b = truthy(evalExpr(e.r, ctx));
      if (b === true) return 1;
      if (a === null || b === null) return null;
      return 0;
    }
    case 'xor': {
      const a = truthy(evalExpr(e.l, ctx)); const b = truthy(evalExpr(e.r, ctx));
      if (a === null || b === null) return null;
      return boolToNum(a !== b);
    }
    case 'cmp': {
      const a = evalExpr(e.l, ctx); const b = evalExpr(e.r, ctx);
      if (e.op === '<=>') { if (a === null || b === null) return boolToNum(a === null && b === null); }
      const c = compareValues(a, b);
      if (c === null) return null;
      switch (e.op) {
        case '=': case '<=>': return boolToNum(c === 0);
        case '<>': return boolToNum(c !== 0);
        case '<': return boolToNum(c < 0);
        case '>': return boolToNum(c > 0);
        case '<=': return boolToNum(c <= 0);
        case '>=': return boolToNum(c >= 0);
        default: return null;
      }
    }
    case 'quant': {
      const a = evalExpr(e.l, ctx);
      const vals = ctx.subquery(e.sub).rows.map((r) => r[0]);
      const test = (b) => {
        const c = compareValues(a, b);
        if (c === null) return null;
        return { '=': c === 0, '<>': c !== 0, '<': c < 0, '>': c > 0, '<=': c <= 0, '>=': c >= 0 }[e.op];
      };
      if (e.q === 'ALL') { for (const v of vals) if (test(v) === false) return 0; return 1; }
      for (const v of vals) if (test(v) === true) return 1;
      return 0;
    }
    case 'isnull': { const v = evalExpr(e.e, ctx); const r = v === null || v === undefined; return boolToNum(e.not ? !r : r); }
    case 'istrue': { const v = truthy(evalExpr(e.e, ctx)); const r = v === e.val; return boolToNum(e.not ? !r : r); }
    case 'between': {
      const v = evalExpr(e.e, ctx); const lo = evalExpr(e.lo, ctx); const hi = evalExpr(e.hi, ctx);
      const a = compareValues(v, lo); const b = compareValues(v, hi);
      if (a === null || b === null) return null;
      const r = a >= 0 && b <= 0;
      return boolToNum(e.not ? !r : r);
    }
    case 'in': {
      const v = evalExpr(e.e, ctx);
      if (v === null) return null;
      const vals = e.sub ? ctx.subquery(e.sub).rows.map((r) => r[0]) : e.list.map((x) => evalExpr(x, ctx));
      let sawNull = false;
      for (const x of vals) {
        const c = compareValues(v, x);
        if (c === 0) return boolToNum(!e.not);
        if (c === null) sawNull = true;
      }
      if (sawNull) return null;
      return boolToNum(e.not);
    }
    case 'like': {
      const v = evalExpr(e.e, ctx); const p = evalExpr(e.pat, ctx);
      if (v === null || p === null) return null;
      const r = likeToRegex(p).test(formatNumberForText(v));
      return boolToNum(e.not ? !r : r);
    }
    case 'regexp': {
      const v = evalExpr(e.e, ctx); const p = evalExpr(e.pat, ctx);
      if (v === null || p === null) return null;
      const r = new RegExp(String(p), 'i').test(String(v));
      return boolToNum(e.not ? !r : r);
    }
    case 'arith': {
      const a = evalExpr(e.l, ctx); const b = evalExpr(e.r, ctx);
      if (a === null || b === null) return null;
      const x = toNum(a); const y = toNum(b);
      switch (e.op) {
        case '+': return x + y;
        case '-': return x - y;
        case '*': return x * y;
        case '/': return y === 0 ? null : x / y;
        case 'DIV': return y === 0 ? null : Math.trunc(x / y);
        case '%': return y === 0 ? null : x % y;
        default: return null;
      }
    }
    case 'fn': {
      const f = SCALAR_FUNCS[e.name];
      if (!f) throw err(1305, '42000', `FUNCTION ${ctx.engine?.state.current || 'db'}.${e.name.toLowerCase()} does not exist`);
      return f(e.args.map((a) => evalExpr(a, ctx)), ctx);
    }
    case 'agg': {
      if (!ctx.groupRows) {
        throw err(1111, 'HY000', 'Invalid use of group function');
      }
      return evalAggregate(e, ctx);
    }
    case 'case': {
      if (e.base) {
        const b = evalExpr(e.base, ctx);
        for (const w of e.whens) if (compareValues(b, evalExpr(w.w, ctx)) === 0) return evalExpr(w.t, ctx);
      } else {
        for (const w of e.whens) if (truthy(evalExpr(w.w, ctx))) return evalExpr(w.t, ctx);
      }
      return e.els ? evalExpr(e.els, ctx) : null;
    }
    case 'sub': {
      const r = ctx.subquery(e.sub);
      if (r.columns.length !== 1) throw err(1241, '21000', 'Operand should contain 1 column(s)');
      if (r.rows.length > 1) throw err(1242, '21000', 'Subquery returns more than 1 row');
      return r.rows.length ? r.rows[0][0] : null;
    }
    case 'exists': return boolToNum(ctx.subquery(e.sub).rows.length > 0);
    case 'row': throw err(1241, '21000', 'Operand should contain 1 column(s)');
    default: throw err(1064, '42000', 'Unsupported expression');
  }
}

function evalAggregate(e, ctx) {
  const rows = ctx.groupRows;
  if (e.star) return rows.length;
  let vals = rows.map((r) => evalExpr(e.arg, ctx.rowCtx(r))).filter((v) => v !== null && v !== undefined);
  if (e.distinct) {
    const seen = [];
    vals = vals.filter((v) => { if (seen.some((s) => compareValues(s, v) === 0)) return false; seen.push(v); return true; });
  }
  switch (e.name) {
    case 'COUNT': return vals.length;
    case 'SUM': return vals.length ? vals.reduce((s, v) => s + toNum(v), 0) : null;
    case 'AVG': return vals.length ? vals.reduce((s, v) => s + toNum(v), 0) / vals.length : null;
    case 'MIN': return vals.length ? vals.reduce((m, v) => (compareValues(v, m) < 0 ? v : m)) : null;
    case 'MAX': return vals.length ? vals.reduce((m, v) => (compareValues(v, m) > 0 ? v : m)) : null;
    case 'GROUP_CONCAT': return vals.length ? vals.map(formatNumberForText).join(e.sep) : null;
    default: return null;
  }
}

function hasAggregate(e) {
  if (!e || typeof e !== 'object') return false;
  if (e.k === 'agg') return true;
  if (e.k === 'sub' || e.k === 'exists') return false;
  for (const key of Object.keys(e)) {
    const v = e[key];
    if (key === 'sub') continue;
    if (Array.isArray(v)) { if (v.some((x) => (x && typeof x === 'object' && (x.k ? hasAggregate(x) : (x.w ? hasAggregate(x.w) || hasAggregate(x.t) : false))))) return true; }
    else if (v && typeof v === 'object' && v.k && hasAggregate(v)) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */
const INT_RANGES = {
  TINYINT: [-128, 127, 255], SMALLINT: [-32768, 32767, 65535], INT: [-2147483648, 2147483647, 4294967295],
  BIGINT: [-9223372036854775808, 9223372036854775807, 18446744073709551615], YEAR: [1901, 2155, 2155],
};

export function typeCategory(type) {
  const b = type.base;
  if (['INT', 'TINYINT', 'SMALLINT', 'BIGINT', 'YEAR'].includes(b)) return 'int';
  if (['DECIMAL', 'FLOAT', 'DOUBLE'].includes(b)) return 'decimal';
  if (['VARCHAR', 'CHAR', 'TEXT', 'ENUM'].includes(b)) return 'text';
  if (['DATE', 'DATETIME'].includes(b)) return 'date';
  if (b === 'TIME') return 'time';
  return 'other';
}

export function typeToString(type) {
  const b = type.base.toLowerCase();
  if (type.base === 'ENUM') return `enum(${type.values.map((v) => `'${v}'`).join(',')})`;
  if (type.base === 'DECIMAL') return `decimal(${type.len},${type.scale})${type.unsigned ? ' unsigned' : ''}`;
  if (type.base === 'TINYINT' && type.len === 1) return 'tinyint(1)';
  if (['VARCHAR', 'CHAR'].includes(type.base)) return `${b}(${type.len ?? 1})`;
  if ((type.base === 'FLOAT' || type.base === 'DOUBLE') && type.len != null) return `${b}(${type.len}${type.scale != null ? `,${type.scale}` : ''})`;
  return b + (type.unsigned ? ' unsigned' : '');
}

function normalizeDate(v, withTime) {
  const s = String(v).trim();
  const m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/) || s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1) return null;
  const dim = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  if (d > dim) return null;
  const p = (x) => String(x).padStart(2, '0');
  const date = `${String(y).padStart(4, '0')}-${p(mo)}-${p(d)}`;
  if (!withTime) return date;
  const hh = Number(m[4] || 0); const mi = Number(m[5] || 0); const ss = Number(m[6] || 0);
  if (hh > 23 || mi > 59 || ss > 59) return null;
  return `${date} ${p(hh)}:${p(mi)}:${p(ss)}`;
}

/** Convierte un valor al tipo de la columna. Lanza SqlError estilo MySQL (modo estricto). */
export function coerceValue(v, col, rowNum = 1) {
  if (v === null || v === undefined) return null;
  if (v && typeof v === 'object' && v.now) v = nowStr();
  const t = col.type;
  const cat = typeCategory(t);
  if (cat === 'int') {
    let n;
    if (typeof v === 'number') n = v;
    else if (looksNumeric(v)) n = Number(String(v).trim());
    else if (String(v).trim() === '') throw err(1366, 'HY000', `Incorrect integer value: '${v}' for column '${col.name}' at row ${rowNum}`);
    else throw err(1366, 'HY000', `Incorrect integer value: '${v}' for column '${col.name}' at row ${rowNum}`);
    n = Math.round(n);
    const r = INT_RANGES[t.base] || INT_RANGES.INT;
    const min = t.unsigned ? 0 : r[0];
    const max = t.unsigned ? r[2] : r[1];
    if (n < min || n > max) throw err(1264, '22003', `Out of range value for column '${col.name}' at row ${rowNum}`);
    return n;
  }
  if (cat === 'decimal') {
    let n;
    if (typeof v === 'number') n = v;
    else if (looksNumeric(v)) n = Number(String(v).trim());
    else throw err(1366, 'HY000', `Incorrect decimal value: '${v}' for column '${col.name}' at row ${rowNum}`);
    if (t.base === 'DECIMAL') {
      const f = 10 ** t.scale;
      n = Math.round(n * f) / f;
      const maxInt = 10 ** (t.len - t.scale);
      if (Math.abs(n) >= maxInt) throw err(1264, '22003', `Out of range value for column '${col.name}' at row ${rowNum}`);
    }
    if (t.unsigned && n < 0) throw err(1264, '22003', `Out of range value for column '${col.name}' at row ${rowNum}`);
    return n;
  }
  if (cat === 'text') {
    const s = typeof v === 'number' ? formatNumberForText(v) : String(v);
    if (t.base === 'ENUM') {
      const found = t.values.find((x) => x.toLowerCase() === s.toLowerCase());
      if (!found) throw err(1265, '01000', `Data truncated for column '${col.name}' at row ${rowNum}`);
      return found;
    }
    const max = t.base === 'TEXT' ? 65535 : (t.len ?? 1);
    if ([...s].length > max) throw err(1406, '22001', `Data too long for column '${col.name}' at row ${rowNum}`);
    return t.base === 'CHAR' ? s.replace(/\s+$/, '') : s;
  }
  if (cat === 'date') {
    const d = normalizeDate(v, t.base === 'DATETIME');
    if (!d) throw err(1292, '22007', `Incorrect ${t.base === 'DATETIME' ? 'datetime' : 'date'} value: '${v}' for column '${col.name}' at row ${rowNum}`);
    return d;
  }
  if (cat === 'time') {
    const s = String(v).trim();
    if (!/^\d{1,3}:\d{2}(:\d{2})?$/.test(s)) throw err(1292, '22007', `Incorrect time value: '${v}' for column '${col.name}' at row ${rowNum}`);
    return s.length === 5 ? `${s}:00` : s;
  }
  return v;
}

function implicitDefault(col) {
  const cat = typeCategory(col.type);
  if (cat === 'int' || cat === 'decimal') return 0;
  if (cat === 'date') return col.type.base === 'DATETIME' ? '0000-00-00 00:00:00' : '0000-00-00';
  if (col.type.base === 'ENUM') return col.type.values[0];
  return '';
}

/* ------------------------------------------------------------------ */
/* Motor                                                               */
/* ------------------------------------------------------------------ */
const lc = (s) => String(s).toLowerCase();
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function fmtKeyVal(v) { return v === null ? 'NULL' : formatNumberForText(v); }

export class SqlEngine {
  constructor(state) {
    this.state = state ? clone(state) : { databases: {}, current: null };
  }

  serialize() { return clone(this.state); }

  /* --------- helpers de esquema --------- */
  db(name) {
    const n = name ?? this.state.current;
    if (!n) throw err(1046, '3D000', 'No database selected');
    const d = this.state.databases[lc(n)];
    if (!d) throw err(1049, '42000', `Unknown database '${n}'`);
    return d;
  }
  findTable(tref, mustExist = true) {
    const d = this.db(tref.db);
    const t = d.tables[lc(tref.name)];
    if (!t && mustExist) throw err(1146, '42S02', `Table '${d.name}.${tref.name}' doesn't exist`);
    return t || null;
  }
  colIndex(table, name, clause = 'field list') {
    const idx = table.columns.findIndex((c) => lc(c.name) === lc(name));
    if (idx === -1) throw err(1054, '42S22', `Unknown column '${name}' in '${clause}'`);
    return idx;
  }
  /** Lista de [tabla, fk] que referencian a `table` en la misma base */
  referencingFks(dbObj, table) {
    const out = [];
    for (const t of Object.values(dbObj.tables)) {
      for (const fk of t.fks) if (lc(fk.refTable) === lc(table.name)) out.push([t, fk]);
    }
    return out;
  }

  /* --------- API pública --------- */
  /** Ejecuta un texto con una o varias sentencias. Devuelve un array de resultados. Se detiene en el primer error. */
  run(text) {
    const results = [];
    let statements;
    try {
      statements = splitStatements(text);
    } catch (e) {
      if (e instanceof SqlError) return [{ kind: 'error', sql: text.trim(), error: e }];
      throw e;
    }
    if (statements.length === 0) {
      return [{ kind: 'error', sql: '', error: err(1065, '42000', 'Query was empty') }];
    }
    for (const sql of statements) {
      const r = this.executeOne(sql);
      results.push(r);
      if (r.kind === 'error') break;
    }
    return results;
  }

  executeOne(sql) {
    const snapshot = clone(this.state);
    try {
      const st = parseStatement(sql);
      const res = this.exec(st, sql);
      return { sql, statement: st, ...res };
    } catch (e) {
      this.state = snapshot;
      if (e instanceof SqlError) return { kind: 'error', sql, error: e };
      return { kind: 'error', sql, error: new SqlError(1105, 'HY000', `Unknown error: ${e?.message || e}`, 'Error interno del simulador. Probá escribir la sentencia de otra forma y avisale a tu docente.') };
    }
  }

  exec(st, sql) {
    switch (st.type) {
      case 'createDatabase': {
        const key = lc(st.name);
        if (this.state.databases[key]) {
          if (st.ifNotExists) return { kind: 'ok', message: 'Query OK, 1 row affected, 1 warning', affected: 0 };
          throw err(1007, 'HY000', `Can't create database '${st.name}'; database exists`);
        }
        this.state.databases[key] = { name: st.name, tables: {} };
        return { kind: 'ok', message: 'Query OK, 1 row affected', affected: 1 };
      }
      case 'dropDatabase': {
        const key = lc(st.name);
        if (!this.state.databases[key]) {
          if (st.ifExists) return { kind: 'ok', message: 'Query OK, 0 rows affected, 1 warning' };
          throw err(1008, 'HY000', `Can't drop database '${st.name}'; database doesn't exist`);
        }
        const n = Object.keys(this.state.databases[key].tables).length;
        delete this.state.databases[key];
        if (lc(this.state.current || '') === key) this.state.current = null;
        return { kind: 'ok', message: `Query OK, ${n} row${n === 1 ? '' : 's'} affected` };
      }
      case 'use': {
        const d = this.state.databases[lc(st.name)];
        if (!d) throw err(1049, '42000', `Unknown database '${st.name}'`);
        this.state.current = d.name;
        return { kind: 'ok', message: 'Database changed' };
      }
      case 'showDatabases': {
        const rows = [['information_schema'], ['mysql'], ...Object.values(this.state.databases).map((d) => [d.name])];
        rows.sort((a, b) => compareValues(a[0], b[0]));
        return { kind: 'rows', columns: ['Database'], rows };
      }
      case 'showTables': {
        const d = this.db(st.db);
        const rows = Object.values(d.tables).map((t) => [t.name]).sort((a, b) => compareValues(a[0], b[0]));
        return { kind: 'rows', columns: [`Tables_in_${d.name}`], rows };
      }
      case 'describe': return this.describe(st);
      case 'showCreate': {
        const t = this.findTable(st.table);
        return { kind: 'rows', columns: ['Table', 'Create Table'], rows: [[t.name, this.createTableText(t)]] };
      }
      case 'showCreateDb': {
        const d = this.db(st.name);
        return { kind: 'rows', columns: ['Database', 'Create Database'], rows: [[d.name, `CREATE DATABASE \`${d.name}\``]] };
      }
      case 'createTable': return this.createTable(st);
      case 'dropTable': return this.dropTable(st);
      case 'truncate': {
        const d = this.db(st.table.db);
        const t = this.findTable(st.table);
        const refs = this.referencingFks(d, t).filter(([ct]) => ct !== t);
        if (refs.length) {
          const [ct, fk] = refs[0];
          throw err(1701, '42000', `Cannot truncate a table referenced in a foreign key constraint (\`${d.name}\`.\`${ct.name}\`, CONSTRAINT \`${fk.name}\`)`);
        }
        t.rows = [];
        t.autoIncNext = 1;
        return { kind: 'ok', message: 'Query OK, 0 rows affected' };
      }
      case 'renameTable': return this.renameTable(st.from, st.to);
      case 'alterTable': return this.alterTable(st);
      case 'insert': return this.insert(st);
      case 'update': return this.update(st);
      case 'delete': return this.delete(st);
      case 'select': case 'union': {
        const r = this.select(st, null);
        return { kind: 'rows', columns: r.columns, rows: r.rows };
      }
      default: throw err(1064, '42000', 'Unsupported statement');
    }
  }

  describe(st) {
    const t = this.findTable(st.table);
    const fkCols = new Set(t.fks.flatMap((f) => f.cols.map(lc)));
    const uniCols = new Set(t.uniques.filter((u) => u.cols.length === 1).map((u) => lc(u.cols[0])));
    const rows = t.columns.map((c) => {
      let key = '';
      if (t.pk.map(lc).includes(lc(c.name))) key = 'PRI';
      else if (uniCols.has(lc(c.name))) key = 'UNI';
      else if (fkCols.has(lc(c.name))) key = 'MUL';
      const isPk = t.pk.map(lc).includes(lc(c.name));
      let def = c.hasDefault ? (c.default && typeof c.default === 'object' ? 'CURRENT_TIMESTAMP' : c.default) : null;
      if (def !== null && typeof def === 'number') def = formatNumberForText(def);
      return [c.name, typeToString(c.type), c.notNull || isPk ? 'NO' : 'YES', key, def, c.autoInc ? 'auto_increment' : ''];
    });
    return { kind: 'rows', columns: ['Field', 'Type', 'Null', 'Key', 'Default', 'Extra'], rows };
  }

  createTableText(t) {
    const lines = t.columns.map((c) => {
      let s = `  \`${c.name}\` ${typeToString(c.type)}`;
      if (c.notNull || t.pk.map(lc).includes(lc(c.name))) s += ' NOT NULL';
      if (c.autoInc) s += ' AUTO_INCREMENT';
      if (c.hasDefault) s += ` DEFAULT ${c.default === null ? 'NULL' : typeof c.default === 'object' ? 'CURRENT_TIMESTAMP' : `'${c.default}'`}`;
      return s;
    });
    if (t.pk.length) lines.push(`  PRIMARY KEY (${t.pk.map((c) => `\`${c}\``).join(',')})`);
    for (const u of t.uniques) lines.push(`  UNIQUE KEY \`${u.name}\` (${u.cols.map((c) => `\`${c}\``).join(',')})`);
    for (const f of t.fks) {
      let s = `  CONSTRAINT \`${f.name}\` FOREIGN KEY (${f.cols.map((c) => `\`${c}\``).join(',')}) REFERENCES \`${f.refTable}\` (${f.refCols.map((c) => `\`${c}\``).join(',')})`;
      if (f.onDelete !== 'RESTRICT') s += ` ON DELETE ${f.onDelete}`;
      if (f.onUpdate !== 'RESTRICT') s += ` ON UPDATE ${f.onUpdate}`;
      lines.push(s);
    }
    for (const c of t.checks) lines.push(`  CONSTRAINT \`${c.name}\` CHECK (${c.text})`);
    return `CREATE TABLE \`${t.name}\` (\n${lines.join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
  }

  nextConstraintName(d, table, kind) {
    const existing = new Set();
    for (const t of Object.values(d.tables)) {
      for (const f of t.fks) existing.add(lc(f.name));
      for (const c of t.checks) existing.add(lc(c.name));
    }
    for (const f of table.fks) existing.add(lc(f.name));
    for (const c of table.checks) existing.add(lc(c.name));
    let n = 1;
    while (existing.has(lc(`${table.name}_${kind}_${n}`))) n += 1;
    return `${table.name}_${kind}_${n}`;
  }

  validateFk(d, table, fk) {
    for (const c of fk.cols) {
      if (!table.columns.some((x) => lc(x.name) === lc(c))) throw err(1072, '42000', `Key column '${c}' doesn't exist in table`);
    }
    const parent = lc(fk.refTable) === lc(table.name) ? table : d.tables[lc(fk.refTable)];
    if (!parent) throw err(1824, 'HY000', `Failed to open the referenced table '${fk.refTable}'`);
    fk.refTable = parent.name;
    if (fk.cols.length !== fk.refCols.length) throw err(1239, '42000', `Incorrect foreign key definition for '${fk.name}': Key reference and table reference don't match`);
    for (let i = 0; i < fk.refCols.length; i += 1) {
      const pc = parent.columns.find((x) => lc(x.name) === lc(fk.refCols[i]));
      if (!pc) throw err(1822, 'HY000', `Failed to add the foreign key constraint. Missing column '${fk.refCols[i]}' for constraint '${fk.name}' in the referenced table '${parent.name}'`);
      fk.refCols[i] = pc.name;
      const cc = table.columns.find((x) => lc(x.name) === lc(fk.cols[i]));
      fk.cols[i] = cc.name;
      const ca = typeCategory(cc.type); const pa = typeCategory(pc.type);
      const compatible = ca === pa || (ca === 'int' && pa === 'int');
      if (!compatible || (ca === 'text' && pa === 'text' && (cc.type.base === 'ENUM') !== (pc.type.base === 'ENUM'))) {
        throw err(3780, 'HY000', `Referencing column '${cc.name}' and referenced column '${pc.name}' in foreign key constraint '${fk.name}' are incompatible.`);
      }
    }
    const refSet = fk.refCols.map(lc).join(',');
    const indexed = parent.pk.map(lc).join(',') === refSet
      || parent.uniques.some((u) => u.cols.map(lc).join(',') === refSet)
      || lc(parent.pk[0] || '') === lc(fk.refCols[0]);
    if (!indexed) {
      throw err(1822, 'HY000', `Failed to add the foreign key constraint. Missing index for constraint '${fk.name}' in the referenced table '${parent.name}'`);
    }
  }

  createTable(st) {
    const d = this.db(st.table.db);
    const key = lc(st.table.name);
    if (d.tables[key]) {
      if (st.ifNotExists) return { kind: 'ok', message: 'Query OK, 0 rows affected, 1 warning' };
      throw err(1050, '42S01', `Table '${d.tables[key].name}' already exists`);
    }
    const table = { name: st.table.name, columns: [], pk: [], uniques: [], fks: [], checks: [], rows: [], autoIncNext: 1 };
    const pendingFks = [];
    for (const { col, extras } of st.columns) {
      if (table.columns.some((c) => lc(c.name) === lc(col.name))) throw err(1060, '42S21', `Duplicate column name '${col.name}'`);
      table.columns.push(col);
      if (extras.pk) {
        if (table.pk.length) throw err(1068, '42000', 'Multiple primary key defined');
        table.pk = [col.name];
      }
      if (extras.unique) table.uniques.push({ name: col.name, cols: [col.name] });
      if (extras.fk) pendingFks.push({ name: null, cols: [col.name], ...extras.fk });
      for (const ch of extras.checks) table.checks.push({ name: null, expr: ch.expr, text: ch.text });
    }
    for (const c of st.constraints) {
      if (c.kind === 'pk') {
        if (table.pk.length) throw err(1068, '42000', 'Multiple primary key defined');
        table.pk = c.cols.map((n) => table.columns[this.keyColIndex(table, n)].name);
      } else if (c.kind === 'unique') {
        const cols = c.cols.map((n) => table.columns[this.keyColIndex(table, n)].name);
        table.uniques.push({ name: c.name || cols[0], cols });
      } else if (c.kind === 'fk') {
        pendingFks.push({ name: c.name, cols: c.cols, refTable: c.refTable, refCols: c.refCols, onDelete: c.onDelete, onUpdate: c.onUpdate });
      } else if (c.kind === 'check') {
        table.checks.push({ name: c.name, expr: c.expr, text: c.text });
      }
    }
    for (const c of table.columns) if (table.pk.map(lc).includes(lc(c.name))) c.notNull = true;
    for (const fk of pendingFks) {
      fk.name = fk.name || this.nextConstraintName(d, table, 'ibfk');
      this.validateFk(d, table, fk);
      table.fks.push(fk);
    }
    for (const ch of table.checks) {
      ch.name = ch.name || this.nextConstraintName(d, table, 'chk');
      this.checkExprColumns(table, ch.expr);
    }
    d.tables[key] = table;
    return { kind: 'ok', message: 'Query OK, 0 rows affected' };
  }

  keyColIndex(table, name) {
    const idx = table.columns.findIndex((c) => lc(c.name) === lc(name));
    if (idx === -1) throw err(1072, '42000', `Key column '${name}' doesn't exist in table`);
    return idx;
  }

  checkExprColumns(table, expr) {
    const walk = (e) => {
      if (!e || typeof e !== 'object') return;
      if (e.k === 'col') {
        if (!table.columns.some((c) => lc(c.name) === lc(e.name))) throw err(1054, '42S22', `Unknown column '${e.name}' in 'check constraint'`);
        return;
      }
      for (const v of Object.values(e)) {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === 'object') walk(v);
      }
    };
    walk(expr);
  }

  dropTable(st) {
    const d = this.db(st.tables[0].db);
    const dropping = new Set(st.tables.map((t) => lc(t.name)));
    for (const tref of st.tables) {
      const t = d.tables[lc(tref.name)];
      if (!t) {
        if (st.ifExists) continue;
        throw err(1051, '42S02', `Unknown table '${d.name}.${tref.name}'`);
      }
      for (const [ct, fk] of this.referencingFks(d, t)) {
        if (ct === t || dropping.has(lc(ct.name))) continue;
        throw err(3730, 'HY000', `Cannot drop table '${t.name}' referenced by a foreign key constraint '${fk.name}' on table '${ct.name}'.`);
      }
    }
    for (const tref of st.tables) delete d.tables[lc(tref.name)];
    return { kind: 'ok', message: 'Query OK, 0 rows affected' };
  }

  renameTable(fromRef, toRef) {
    const d = this.db(fromRef.db);
    const t = this.findTable(fromRef);
    if (d.tables[lc(toRef.name)]) throw err(1050, '42S01', `Table '${toRef.name}' already exists`);
    for (const [, fk] of this.referencingFks(d, t)) fk.refTable = toRef.name;
    delete d.tables[lc(t.name)];
    t.name = toRef.name;
    d.tables[lc(t.name)] = t;
    return { kind: 'ok', message: 'Query OK, 0 rows affected' };
  }

  alterTable(st) {
    const d = this.db(st.table.db);
    let t = this.findTable(st.table);
    for (const a of st.actions) {
      switch (a.op) {
        case 'addColumns': {
          let insertAt = t.columns.length;
          if (a.pos?.first) insertAt = 0;
          else if (a.pos?.after) insertAt = this.colIndex(t, a.pos.after) + 1;
          for (const { col, extras } of a.defs) {
            if (t.columns.some((c) => lc(c.name) === lc(col.name))) throw err(1060, '42S21', `Duplicate column name '${col.name}'`);
            if (extras.pk) {
              if (t.pk.length) throw err(1068, '42000', 'Multiple primary key defined');
              col.notNull = true;
            }
            let fill = col.hasDefault ? coerceValue(col.default, col) : null;
            if (fill === null && col.notNull && !col.autoInc) fill = implicitDefault(col);
            t.columns.splice(insertAt, 0, col);
            t.rows.forEach((r, i) => r.splice(insertAt, 0, col.autoInc ? i + 1 : fill));
            insertAt += 1;
            if (extras.pk) { t.pk = [col.name]; this.assertUnique(t, t.pk, 'PRIMARY'); }
            if (extras.unique) { t.uniques.push({ name: col.name, cols: [col.name] }); this.assertUnique(t, [col.name], col.name); }
            if (extras.fk) {
              const fk = { name: this.nextConstraintName(d, t, 'ibfk'), cols: [col.name], ...extras.fk };
              this.validateFk(d, t, fk);
              t.fks.push(fk);
              this.assertFkData(d, t, fk);
            }
            for (const ch of extras.checks) {
              const c = { name: this.nextConstraintName(d, t, 'chk'), expr: ch.expr, text: ch.text };
              t.checks.push(c);
              this.assertChecks(t, t.rows);
            }
          }
          break;
        }
        case 'dropColumn': {
          const idx = t.columns.findIndex((c) => lc(c.name) === lc(a.name));
          if (idx === -1) throw err(1091, '42000', `Can't DROP '${a.name}'; check that column/key exists`);
          const own = t.fks.find((f) => f.cols.map(lc).includes(lc(a.name)));
          if (own) throw err(1828, 'HY000', `Cannot drop column '${t.columns[idx].name}': needed in a foreign key constraint '${own.name}'`);
          for (const [ct, fk] of this.referencingFks(d, t)) {
            if (fk.refCols.map(lc).includes(lc(a.name))) {
              throw err(1829, 'HY000', `Cannot drop column '${t.columns[idx].name}': needed in a foreign key constraint '${fk.name}' of table '${ct.name}'`);
            }
          }
          if (t.columns.length === 1) throw err(1090, '42000', "You can't delete all columns with ALTER TABLE; use DROP TABLE instead");
          t.columns.splice(idx, 1);
          t.rows.forEach((r) => r.splice(idx, 1));
          t.pk = t.pk.filter((c) => lc(c) !== lc(a.name));
          t.uniques = t.uniques.map((u) => ({ ...u, cols: u.cols.filter((c) => lc(c) !== lc(a.name)) })).filter((u) => u.cols.length);
          t.checks = t.checks.filter((c) => !JSON.stringify(c.expr).toLowerCase().includes(`"name":"${lc(a.name)}"`));
          break;
        }
        case 'modify': {
          const idx = t.columns.findIndex((c) => lc(c.name) === lc(a.from));
          if (idx === -1) throw err(1054, '42S22', `Unknown column '${a.from}' in '${t.name}'`);
          const old = t.columns[idx];
          const { col, extras } = a.def;
          if (lc(col.name) !== lc(old.name) && t.columns.some((c, i) => i !== idx && lc(c.name) === lc(col.name))) {
            throw err(1060, '42S21', `Duplicate column name '${col.name}'`);
          }
          const isPk = t.pk.map(lc).includes(lc(old.name));
          if (isPk) col.notNull = true;
          // re-convertir datos existentes
          t.rows.forEach((r, i) => {
            let v = r[idx];
            if (v === null && col.notNull) {
              throw err(1265, '01000', `Data truncated for column '${col.name}' at row ${i + 1}`);
            }
            try { v = coerceValue(v, col, i + 1); } catch (e) {
              if (e.code === 1406) throw err(1265, '01000', `Data truncated for column '${col.name}' at row ${i + 1}`);
              throw e;
            }
            r[idx] = v;
          });
          // tipo compatible con FKs
          const renameRefs = (oldName, newName) => {
            t.pk = t.pk.map((c) => (lc(c) === lc(oldName) ? newName : c));
            t.uniques.forEach((u) => { u.cols = u.cols.map((c) => (lc(c) === lc(oldName) ? newName : c)); });
            t.fks.forEach((f) => { f.cols = f.cols.map((c) => (lc(c) === lc(oldName) ? newName : c)); });
            for (const [, fk] of this.referencingFks(d, t)) fk.refCols = fk.refCols.map((c) => (lc(c) === lc(oldName) ? newName : c));
          };
          t.columns[idx] = col;
          if (old.name !== col.name) renameRefs(old.name, col.name);
          for (const f of t.fks) if (f.cols.map(lc).includes(lc(col.name))) this.validateFk(d, t, f);
          for (const [ct, fk] of this.referencingFks(d, t)) if (fk.refCols.map(lc).includes(lc(col.name))) this.validateFk(d, ct, fk);
          if (extras.pk) {
            if (t.pk.length && !isPk) throw err(1068, '42000', 'Multiple primary key defined');
            t.pk = [col.name];
            this.assertUnique(t, t.pk, 'PRIMARY');
          }
          if (extras.unique) { t.uniques.push({ name: col.name, cols: [col.name] }); this.assertUnique(t, [col.name], col.name); }
          if (extras.fk) {
            const fk = { name: this.nextConstraintName(d, t, 'ibfk'), cols: [col.name], ...extras.fk };
            this.validateFk(d, t, fk); t.fks.push(fk); this.assertFkData(d, t, fk);
          }
          break;
        }
        case 'renameColumn': {
          const idx = this.colIndex(t, a.from, t.name);
          if (t.columns.some((c, i) => i !== idx && lc(c.name) === lc(a.to))) throw err(1060, '42S21', `Duplicate column name '${a.to}'`);
          const oldName = t.columns[idx].name;
          t.columns[idx] = { ...t.columns[idx], name: a.to };
          t.pk = t.pk.map((c) => (lc(c) === lc(oldName) ? a.to : c));
          t.uniques.forEach((u) => { u.cols = u.cols.map((c) => (lc(c) === lc(oldName) ? a.to : c)); });
          t.fks.forEach((f) => { f.cols = f.cols.map((c) => (lc(c) === lc(oldName) ? a.to : c)); });
          for (const [, fk] of this.referencingFks(d, t)) fk.refCols = fk.refCols.map((c) => (lc(c) === lc(oldName) ? a.to : c));
          break;
        }
        case 'renameTable': {
          this.renameTable({ db: st.table.db, name: t.name }, a.to);
          t = this.findTable({ db: st.table.db, name: a.to.name });
          break;
        }
        case 'addConstraint': {
          const c = a.constraint;
          if (c.kind === 'pk') {
            if (t.pk.length) throw err(1068, '42000', 'Multiple primary key defined');
            const cols = c.cols.map((n) => t.columns[this.keyColIndex(t, n)].name);
            for (const cn of cols) {
              const i = this.colIndex(t, cn);
              if (t.rows.some((r) => r[i] === null)) throw err(1138, '22004', 'Invalid use of NULL value');
              t.columns[i].notNull = true;
            }
            t.pk = cols;
            this.assertUnique(t, cols, 'PRIMARY');
          } else if (c.kind === 'unique') {
            const cols = c.cols.map((n) => t.columns[this.keyColIndex(t, n)].name);
            t.uniques.push({ name: c.name || cols[0], cols });
            this.assertUnique(t, cols, c.name || cols[0]);
          } else if (c.kind === 'fk') {
            const fk = { name: c.name || this.nextConstraintName(d, t, 'ibfk'), cols: c.cols, refTable: c.refTable, refCols: c.refCols, onDelete: c.onDelete, onUpdate: c.onUpdate };
            if (t.fks.some((f) => lc(f.name) === lc(fk.name))) throw err(1826, 'HY000', `Duplicate foreign key constraint name '${fk.name}'`);
            this.validateFk(d, t, fk);
            t.fks.push(fk);
            this.assertFkData(d, t, fk);
          } else if (c.kind === 'check') {
            this.checkExprColumns(t, c.expr);
            t.checks.push({ name: c.name || this.nextConstraintName(d, t, 'chk'), expr: c.expr, text: c.text });
            this.assertChecks(t, t.rows);
          }
          break;
        }
        case 'dropPk': {
          if (!t.pk.length) throw err(1091, '42000', "Can't DROP 'PRIMARY'; check that column/key exists");
          for (const [ct, fk] of this.referencingFks(d, t)) {
            if (ct !== t) throw err(1553, 'HY000', `Cannot drop index 'PRIMARY': needed in a foreign key constraint`);
            void fk;
          }
          t.pk = [];
          break;
        }
        case 'dropFk': {
          const i = t.fks.findIndex((f) => lc(f.name) === lc(a.name));
          if (i === -1) throw err(1091, '42000', `Can't DROP '${a.name}'; check that column/key exists`);
          t.fks.splice(i, 1);
          break;
        }
        case 'dropIndex': {
          const i = t.uniques.findIndex((u) => lc(u.name) === lc(a.name));
          if (i === -1) {
            if (t.fks.some((f) => lc(f.name) === lc(a.name))) break;
            throw err(1091, '42000', `Can't DROP '${a.name}'; check that column/key exists`);
          }
          t.uniques.splice(i, 1);
          break;
        }
        case 'dropConstraint': {
          const before = t.checks.length + t.fks.length + t.uniques.length;
          t.checks = t.checks.filter((c) => lc(c.name) !== lc(a.name));
          t.fks = t.fks.filter((c) => lc(c.name) !== lc(a.name));
          t.uniques = t.uniques.filter((c) => lc(c.name) !== lc(a.name));
          if (before === t.checks.length + t.fks.length + t.uniques.length) throw err(3940, 'HY000', `Constraint '${a.name}' does not exist.`);
          break;
        }
        case 'setDefault': {
          const i = this.colIndex(t, a.name, t.name);
          t.columns[i].hasDefault = true;
          t.columns[i].default = a.value;
          break;
        }
        case 'dropDefault': {
          const i = this.colIndex(t, a.name, t.name);
          t.columns[i].hasDefault = false;
          t.columns[i].default = null;
          break;
        }
        default: throw err(1064, '42000', 'Unsupported ALTER');
      }
    }
    // reordenamiento por FIRST/AFTER en MODIFY/CHANGE
    for (const a of st.actions) {
      if (a.op === 'modify' && a.pos) this.moveColumn(t, a.def.col.name, a.pos);
    }
    return { kind: 'ok', message: 'Query OK, 0 rows affected\nRecords: 0  Duplicates: 0  Warnings: 0' };
  }

  moveColumn(t, name, pos) {
    const idx = t.columns.findIndex((c) => lc(c.name) === lc(name));
    if (idx === -1) return;
    const [col] = t.columns.splice(idx, 1);
    const vals = t.rows.map((r) => r.splice(idx, 1)[0]);
    let to = 0;
    if (pos.after) to = this.colIndex(t, pos.after) + 1;
    t.columns.splice(to, 0, col);
    t.rows.forEach((r, i) => r.splice(to, 0, vals[i]));
  }

  rowCheckCtx(t, row) {
    return {
      engine: this,
      resolve: (tbl, name) => {
        const i = t.columns.findIndex((c) => lc(c.name) === lc(name));
        if (i === -1) throw err(1054, '42S22', `Unknown column '${name}' in 'check constraint'`);
        return row[i];
      },
      subquery: () => { throw err(3815, 'HY000', 'Subqueries are not allowed in check constraints'); },
    };
  }

  assertChecks(t, rows) {
    for (const row of rows) {
      for (const ch of t.checks) {
        const v = truthy(evalExpr(ch.expr, this.rowCheckCtx(t, row)));
        if (v === false) throw err(3819, 'HY000', `Check constraint '${ch.name}' is violated.`);
      }
    }
  }

  assertUnique(t, cols, keyName, rows = t.rows) {
    const idxs = cols.map((c) => this.colIndex(t, c));
    const seen = [];
    for (const r of rows) {
      const key = idxs.map((i) => r[i]);
      if (key.some((v) => v === null)) continue;
      if (seen.some((k) => k.every((v, j) => compareValues(v, key[j]) === 0))) {
        const label = keyName === 'PRIMARY' ? `${t.name}.PRIMARY` : `${t.name}.${keyName}`;
        throw err(1062, '23000', `Duplicate entry '${key.map(fmtKeyVal).join('-')}' for key '${label}'`);
      }
      seen.push(key);
    }
  }

  fkFailText(d, t, fk) {
    return `(\`${d.name}\`.\`${t.name}\`, CONSTRAINT \`${fk.name}\` FOREIGN KEY (${fk.cols.map((c) => `\`${c}\``).join(', ')}) REFERENCES \`${fk.refTable}\` (${fk.refCols.map((c) => `\`${c}\``).join(', ')})${fk.onDelete !== 'RESTRICT' ? ` ON DELETE ${fk.onDelete}` : ''}${fk.onUpdate !== 'RESTRICT' ? ` ON UPDATE ${fk.onUpdate}` : ''})`;
  }

  assertFkData(d, t, fk, rows = t.rows) {
    const parent = d.tables[lc(fk.refTable)];
    const ci = fk.cols.map((c) => this.colIndex(t, c));
    const pi = fk.refCols.map((c) => this.colIndex(parent, c));
    for (const r of rows) {
      const key = ci.map((i) => r[i]);
      if (key.some((v) => v === null)) continue;
      const ok = parent.rows.some((pr) => pi.every((p, j) => compareValues(pr[p], key[j]) === 0));
      if (!ok) throw err(1452, '23000', `Cannot add or update a child row: a foreign key constraint fails ${this.fkFailText(d, t, fk)}`);
    }
  }

  validateTable(d, t) {
    for (const r of t.rows) {
      t.columns.forEach((c, i) => {
        if (r[i] === null && (c.notNull || t.pk.map(lc).includes(lc(c.name)))) {
          throw err(1048, '23000', `Column '${c.name}' cannot be null`);
        }
      });
    }
    if (t.pk.length) this.assertUnique(t, t.pk, 'PRIMARY');
    for (const u of t.uniques) this.assertUnique(t, u.cols, u.name);
    this.assertChecks(t, t.rows);
    for (const fk of t.fks) this.assertFkData(d, t, fk);
  }

  insert(st) {
    const d = this.db(st.table.db);
    const t = this.findTable(st.table);
    let colIdx;
    if (st.columns) {
      colIdx = st.columns.map((c) => this.colIndex(t, c));
    } else {
      colIdx = t.columns.map((_, i) => i);
    }
    let valueRows;
    if (st.select) {
      const r = this.select(st.select, null);
      if (r.columns.length !== colIdx.length) throw err(1136, '21S01', "Column count doesn't match value count at row 1");
      valueRows = r.rows.map((row) => row.map((v) => ({ k: 'lit', v })));
    } else {
      valueRows = st.rows;
    }
    const newRows = [];
    const ctx = { engine: this, resolve: (tb, name) => { throw err(1054, '42S22', `Unknown column '${name}' in 'field list'`); }, subquery: (s) => this.select(s, null) };
    valueRows.forEach((vals, ri) => {
      if (vals.length !== colIdx.length) throw err(1136, '21S01', `Column count doesn't match value count at row ${ri + 1}`);
      const row = t.columns.map(() => undefined);
      vals.forEach((ve, j) => {
        const i = colIdx[j];
        if (ve.k === 'default') { row[i] = undefined; return; }
        const v = evalExpr(ve, ctx);
        row[i] = v === null ? null : coerceValue(v, t.columns[i], ri + 1);
      });
      t.columns.forEach((c, i) => {
        if (row[i] === undefined) {
          if (c.autoInc) row[i] = null;
          else if (c.hasDefault) row[i] = coerceValue(c.default, c, ri + 1);
          else if (c.notNull || t.pk.map(lc).includes(lc(c.name))) throw err(1364, 'HY000', `Field '${c.name}' doesn't have a default value`);
          else row[i] = null;
        }
        if (c.autoInc && (row[i] === null || row[i] === 0)) {
          row[i] = t.autoIncNext;
        }
        if (c.autoInc && typeof row[i] === 'number') t.autoIncNext = Math.max(t.autoIncNext, row[i] + 1);
        if (row[i] === null && (c.notNull || t.pk.map(lc).includes(lc(c.name)))) {
          throw err(1048, '23000', `Column '${c.name}' cannot be null`);
        }
      });
      newRows.push(row);
    });
    const all = t.rows.concat(newRows);
    if (t.pk.length) this.assertUnique(t, t.pk, 'PRIMARY', all);
    for (const u of t.uniques) this.assertUnique(t, u.cols, u.name, all);
    this.assertChecks(t, newRows);
    const backup = t.rows;
    t.rows = all;
    try {
      for (const fk of t.fks) this.assertFkData(d, t, fk, newRows);
    } catch (e) { t.rows = backup; throw e; }
    const n = newRows.length;
    let message = `Query OK, ${n} row${n === 1 ? '' : 's'} affected`;
    if (n > 1) message += `\nRecords: ${n}  Duplicates: 0  Warnings: 0`;
    return { kind: 'ok', message, affected: n, table: t.name };
  }

  tableRowCtx(t, alias, row) {
    return {
      engine: this,
      resolve: (tbl, name) => {
        if (tbl && lc(tbl) !== lc(t.name) && lc(tbl) !== lc(alias || '')) throw err(1054, '42S22', `Unknown column '${tbl}.${name}' in 'where clause'`);
        const i = t.columns.findIndex((c) => lc(c.name) === lc(name));
        if (i === -1) throw err(1054, '42S22', `Unknown column '${tbl ? `${tbl}.` : ''}${name}' in 'where clause'`);
        return row[i];
      },
      subquery: (s) => this.select(s, null),
    };
  }

  matchingRowIndexes(t, alias, where, orderBy, limit) {
    let idxs = t.rows.map((_, i) => i);
    if (where) idxs = idxs.filter((i) => truthy(evalExpr(where, this.tableRowCtx(t, alias, t.rows[i]))) === true);
    if (orderBy) {
      idxs.sort((a, b) => {
        for (const o of orderBy) {
          const c = compareValues(evalExpr(o.expr, this.tableRowCtx(t, alias, t.rows[a])), evalExpr(o.expr, this.tableRowCtx(t, alias, t.rows[b])));
          if (c) return o.desc ? -c : c;
        }
        return 0;
      });
    }
    if (limit != null) idxs = idxs.slice(0, limit);
    return idxs;
  }

  update(st) {
    const d = this.db(st.table.db);
    const t = this.findTable(st.table);
    const setIdx = st.sets.map((s) => this.colIndex(t, s.col));
    const idxs = this.matchingRowIndexes(t, st.alias, st.where, st.orderBy, st.limit);
    let changed = 0;
    const oldRows = t.rows.map((r) => r.slice());
    idxs.forEach((ri, n) => {
      const row = t.rows[ri];
      const newRow = row.slice();
      st.sets.forEach((s, j) => {
        const ctx = this.tableRowCtx(t, st.alias, newRow);
        const c = t.columns[setIdx[j]];
        let v = s.expr.k === 'default' ? (c.hasDefault ? c.default : null) : evalExpr(s.expr, ctx);
        if (v === null && (c.notNull || t.pk.map(lc).includes(lc(c.name)))) throw err(1048, '23000', `Column '${c.name}' cannot be null`);
        v = coerceValue(v, c, n + 1);
        newRow[setIdx[j]] = v;
      });
      if (newRow.some((v, i) => compareValues(v, row[i]) !== 0 && !(v === null && row[i] === null) || (v === null) !== (row[i] === null) || (typeof v === 'string' && typeof row[i] === 'string' && v !== row[i]))) changed += 1;
      t.rows[ri] = newRow;
    });
    if (t.pk.length) this.assertUnique(t, t.pk, 'PRIMARY');
    for (const u of t.uniques) this.assertUnique(t, u.cols, u.name);
    this.assertChecks(t, idxs.map((i) => t.rows[i]));
    for (const fk of t.fks) this.assertFkData(d, t, fk, idxs.map((i) => t.rows[i]));
    // efectos sobre tablas hijas (si cambió una clave referenciada)
    for (const [ct, fk] of this.referencingFks(d, t)) {
      const pi = fk.refCols.map((c) => this.colIndex(t, c));
      const ci = fk.cols.map((c) => this.colIndex(ct, c));
      for (const ri of idxs) {
        const oldKey = pi.map((p) => oldRows[ri][p]);
        const newKey = pi.map((p) => t.rows[ri][p]);
        if (oldKey.every((v, j) => compareValues(v, newKey[j]) === 0 && String(v) === String(newKey[j]))) continue;
        const stillThere = t.rows.some((r) => pi.every((p, j) => compareValues(r[p], oldKey[j]) === 0));
        if (stillThere) continue;
        const kids = ct.rows.filter((r) => ci.every((c, j) => compareValues(r[c], oldKey[j]) === 0));
        if (!kids.length) continue;
        if (fk.onUpdate === 'CASCADE') kids.forEach((r) => ci.forEach((c, j) => { r[c] = newKey[j]; }));
        else if (fk.onUpdate === 'SET NULL') kids.forEach((r) => ci.forEach((c) => { r[c] = null; }));
        else throw err(1451, '23000', `Cannot delete or update a parent row: a foreign key constraint fails ${this.fkFailText(d, ct, fk)}`);
      }
    }
    return { kind: 'ok', message: `Query OK, ${changed} row${changed === 1 ? '' : 's'} affected\nRows matched: ${idxs.length}  Changed: ${changed}  Warnings: 0`, affected: changed, matched: idxs.length, table: t.name };
  }

  delete(st) {
    const d = this.db(st.table.db);
    const t = this.findTable(st.table);
    const idxs = this.matchingRowIndexes(t, st.alias, st.where, st.orderBy, st.limit);
    const n = this.deleteRows(d, t, idxs);
    return { kind: 'ok', message: `Query OK, ${n} row${n === 1 ? '' : 's'} affected`, affected: n, table: t.name };
  }

  deleteRows(d, t, idxs, depth = 0) {
    if (!idxs.length) return 0;
    if (depth > 15) throw err(3008, 'HY000', 'Foreign key cascade delete/update exceeds max depth of 15.');
    const set = new Set(idxs);
    const removed = t.rows.filter((_, i) => set.has(i));
    t.rows = t.rows.filter((_, i) => !set.has(i));
    for (const [ct, fk] of this.referencingFks(d, t)) {
      const pi = fk.refCols.map((c) => this.colIndex(t, c));
      const ci = fk.cols.map((c) => this.colIndex(ct, c));
      const kidIdx = [];
      ct.rows.forEach((r, i) => {
        const key = ci.map((c) => r[c]);
        if (key.some((v) => v === null)) return;
        const pointsToRemoved = removed.some((pr) => pi.every((p, j) => compareValues(pr[p], key[j]) === 0));
        const stillHasParent = t.rows.some((pr) => pi.every((p, j) => compareValues(pr[p], key[j]) === 0));
        if (pointsToRemoved && !stillHasParent) kidIdx.push(i);
      });
      if (!kidIdx.length) continue;
      if (fk.onDelete === 'CASCADE') this.deleteRows(d, ct, kidIdx, depth + 1);
      else if (fk.onDelete === 'SET NULL') kidIdx.forEach((i) => ci.forEach((c) => { ct.rows[i][c] = null; }));
      else throw err(1451, '23000', `Cannot delete or update a parent row: a foreign key constraint fails ${this.fkFailText(d, ct, fk)}`);
    }
    return removed.length;
  }

  /* --------- SELECT --------- */
  select(st, outer) {
    if (st.type === 'union') return this.selectUnion(st, outer);
    // 1) FROM
    let sources = [];
    let combos = [[]];
    const loadRef = (ref) => {
      if (ref.sub) {
        const r = this.select(ref.sub, outer);
        return { alias: ref.alias, name: ref.alias, cols: r.columns, rows: r.rows, pk: [] };
      }
      const t = this.findTable(ref.table);
      return { alias: ref.alias || t.name, name: t.name, cols: t.columns.map((c) => c.name), rows: t.rows, pk: t.pk };
    };
    if (st.from) {
      const first = loadRef(st.from.first);
      sources.push(first);
      combos = first.rows.map((r) => [r]);
      for (const j of st.from.joins) {
        const src = loadRef(j.ref);
        if (sources.some((s) => lc(s.alias) === lc(src.alias))) throw err(1066, '42000', `Not unique table/alias: '${src.alias}'`);
        const newSources = sources.concat([src]);
        let on = j.on;
        if (j.using || j.natural) {
          const cols = j.using || src.cols.filter((c) => sources.some((s) => s.cols.some((x) => lc(x) === lc(c))));
          on = cols.reduce((acc, c) => {
            const left = sources.find((s) => s.cols.some((x) => lc(x) === lc(c)));
            const cond = { k: 'cmp', op: '=', l: { k: 'col', table: left.alias, name: c }, r: { k: 'col', table: src.alias, name: c } };
            return acc ? { k: 'and', l: acc, r: cond } : cond;
          }, null);
        }
        const test = (combo) => (on ? truthy(evalExpr(on, this.makeRowCtx(newSources, combo, outer, 'on clause'))) === true : true);
        const out = [];
        if (j.kind === 'right') {
          for (const rr of src.rows) {
            let matched = false;
            for (const c of combos) {
              const combo = c.concat([rr]);
              if (test(combo)) { out.push(combo); matched = true; }
            }
            if (!matched) out.push(sources.map(() => null).concat([rr]));
          }
        } else {
          for (const c of combos) {
            let matched = false;
            for (const rr of src.rows) {
              const combo = c.concat([rr]);
              if (test(combo)) { out.push(combo); matched = true; }
            }
            if (!matched && j.kind === 'left') out.push(c.concat([null]));
          }
        }
        sources = newSources;
        combos = out;
      }
    }
    // validar columnas en la lista aunque no haya filas
    const rowCtx = (combo, clause) => this.makeRowCtx(sources, combo, outer, clause);
    const dummy = sources.map(() => null);
    const validate = (e, clause) => {
      if (!e) return;
      const walk = (x) => {
        if (!x || typeof x !== 'object') return;
        if (x.k === 'col') { rowCtx(dummy, clause).resolve(x.table, x.name, true); return; }
        if (x.k === 'sub' || x.k === 'exists') return;
        if (x.sub && x.k === 'in') { walk(x.e); return; }
        for (const v of Object.values(x)) {
          if (Array.isArray(v)) v.forEach(walk);
          else if (v && typeof v === 'object') walk(v);
        }
      };
      walk(e);
    };
    // 2) WHERE
    if (st.where) {
      if (hasAggregate(st.where)) throw err(1111, 'HY000', 'Invalid use of group function');
      validate(st.where, 'where clause');
      combos = combos.filter((c) => truthy(evalExpr(st.where, rowCtx(c, 'where clause'))) === true);
    }
    // 3) expandir columnas
    const items = [];
    for (const it of st.items) {
      if (it.star) {
        if (!sources.length) throw err(1096, 'HY000', 'No tables used');
        const srcs = it.table ? sources.filter((s) => lc(s.alias) === lc(it.table)) : sources;
        if (it.table && !srcs.length) throw err(1051, '42S02', `Unknown table '${it.table}'`);
        for (const s of srcs) {
          for (const c of s.cols) items.push({ expr: { k: 'col', table: s.alias, name: c }, header: c });
        }
      } else {
        let header = it.alias;
        if (!header) header = it.expr.k === 'col' ? it.expr.name : it.text;
        items.push({ expr: it.expr, header, alias: it.alias });
      }
    }
    for (const it of items) validate(it.expr, 'field list');
    const aliasMap = new Map();
    items.forEach((it, i) => { if (it.alias) aliasMap.set(lc(it.alias), i); });

    const grouped = Boolean(st.groupBy) || items.some((it) => hasAggregate(it.expr)) || hasAggregate(st.having)
      || (st.orderBy || []).some((o) => hasAggregate(o.expr));

    let outRows = [];
    let sortKeys = [];
    const resolveOrderExpr = (e) => {
      if (e.k === 'lit' && typeof e.v === 'number') {
        const i = e.v - 1;
        if (i < 0 || i >= items.length) throw err(1054, '42S22', `Unknown column '${e.v}' in 'order clause'`);
        return { idx: i };
      }
      if (e.k === 'col' && !e.table && aliasMap.has(lc(e.name))) return { idx: aliasMap.get(lc(e.name)) };
      if (e.k === 'col' && !e.table) {
        // nombre de columna que coincide con un encabezado
        const hit = items.findIndex((it) => it.expr.k === 'col' && lc(it.expr.name) === lc(e.name));
        if (hit !== -1 && !sources.some((s) => s.cols.some((c) => lc(c) === lc(e.name)))) return { idx: hit };
      }
      return { expr: e };
    };
    const orderSpecs = (st.orderBy || []).map((o) => ({ ...resolveOrderExpr(o.expr), desc: o.desc }));
    for (const o of orderSpecs) if (o.expr && !grouped) validate(o.expr, 'order clause');

    if (grouped) {
      const groups = [];
      if (st.groupBy) {
        const gExprs = st.groupBy.map((g) => {
          if (g.k === 'lit' && typeof g.v === 'number') return items[g.v - 1]?.expr || g;
          if (g.k === 'col' && !g.table && aliasMap.has(lc(g.name)) && !sources.some((s) => s.cols.some((c) => lc(c) === lc(g.name)))) return items[aliasMap.get(lc(g.name))].expr;
          return g;
        });
        gExprs.forEach((g) => validate(g, 'group statement'));
        for (const c of combos) {
          const key = gExprs.map((g) => evalExpr(g, rowCtx(c, 'group statement')));
          let grp = groups.find((x) => x.key.every((v, i) => (v === null && key[i] === null) || compareValues(v, key[i]) === 0));
          if (!grp) { grp = { key, rows: [] }; groups.push(grp); }
          grp.rows.push(c);
        }
      } else {
        groups.push({ key: [], rows: combos });
      }
      const groupCtx = (g) => {
        const base = rowCtx(g.rows[0] || dummy, 'field list');
        return { ...base, groupRows: g.rows, rowCtx: (c) => rowCtx(c, 'field list') };
      };
      for (const g of groups) {
        const ctx = groupCtx(g);
        const vals = items.map((it) => evalExpr(it.expr, ctx));
        if (st.having) {
          const hctx = {
            ...ctx,
            resolve: (tbl, name, check) => {
              if (!tbl && aliasMap.has(lc(name))) return vals[aliasMap.get(lc(name))];
              return ctx.resolve(tbl, name, check);
            },
          };
          if (truthy(evalExpr(st.having, hctx)) !== true) continue;
        }
        outRows.push(vals);
        sortKeys.push(orderSpecs.map((o) => (o.idx != null ? vals[o.idx] : evalExpr(o.expr, ctx))));
      }
    } else {
      for (const c of combos) {
        const ctx = rowCtx(c, 'field list');
        const vals = items.map((it) => evalExpr(it.expr, ctx));
        outRows.push(vals);
        sortKeys.push(orderSpecs.map((o) => (o.idx != null ? vals[o.idx] : evalExpr(o.expr, rowCtx(c, 'order clause')))));
      }
    }
    // DISTINCT
    if (st.distinct) {
      const keep = [];
      const keepKeys = [];
      outRows.forEach((r, i) => {
        if (!keep.some((k) => k.every((v, j) => (v === null && r[j] === null) || (v !== null && r[j] !== null && compareValues(v, r[j]) === 0)))) {
          keep.push(r); keepKeys.push(sortKeys[i]);
        }
      });
      outRows = keep; sortKeys = keepKeys;
    }
    // ORDER BY
    if (orderSpecs.length) {
      const order = outRows.map((_, i) => i);
      order.sort((a, b) => {
        for (let k = 0; k < orderSpecs.length; k += 1) {
          const x = sortKeys[a][k]; const y = sortKeys[b][k];
          let c;
          if (x === null && y === null) c = 0;
          else if (x === null) c = -1;
          else if (y === null) c = 1;
          else c = compareValues(x, y);
          if (c) return orderSpecs[k].desc ? -c : c;
        }
        return a - b;
      });
      outRows = order.map((i) => outRows[i]);
    }
    if (st.limit != null) outRows = outRows.slice(st.offset || 0, (st.offset || 0) + st.limit);
    return { columns: items.map((it) => it.header), rows: outRows, ordered: orderSpecs.length > 0 };
  }

  selectUnion(st, outer) {
    const first = this.select(st.first, outer);
    let rows = first.rows.slice();
    let distinctAll = false;
    for (const u of st.unions) {
      const r = this.select(u.select, outer);
      if (r.columns.length !== first.columns.length) throw err(1222, '21000', 'The used SELECT statements have a different number of columns');
      rows = rows.concat(r.rows);
      if (!u.all) distinctAll = true;
    }
    if (distinctAll) {
      const keep = [];
      for (const r of rows) if (!keep.some((k) => k.every((v, j) => compareValues(v, r[j]) === 0 || (v === null && r[j] === null)))) keep.push(r);
      rows = keep;
    }
    if (st.orderBy) {
      const specs = st.orderBy.map((o) => {
        let idx = -1;
        if (o.expr.k === 'lit') idx = o.expr.v - 1;
        else if (o.expr.k === 'col') idx = first.columns.findIndex((c) => lc(c) === lc(o.expr.name));
        if (idx < 0) throw err(1054, '42S22', `Unknown column '${o.expr.name || ''}' in 'order clause'`);
        return { idx, desc: o.desc };
      });
      rows.sort((a, b) => {
        for (const s of specs) { const c = compareValues(a[s.idx], b[s.idx]) ?? 0; if (c) return s.desc ? -c : c; }
        return 0;
      });
    }
    if (st.limit != null) rows = rows.slice(st.offset || 0, (st.offset || 0) + st.limit);
    return { columns: first.columns, rows, ordered: Boolean(st.orderBy) };
  }

  makeRowCtx(sources, combo, outer, clause) {
    const self = this;
    const ctx = {
      engine: this,
      resolve(tbl, name, checkOnly) {
        let hits = [];
        sources.forEach((s, si) => {
          if (tbl && lc(s.alias) !== lc(tbl) && !(lc(s.name) === lc(tbl) && lc(s.alias) === lc(s.name))) return;
          const ci = s.cols.findIndex((c) => lc(c) === lc(name));
          if (ci !== -1) hits.push([si, ci]);
        });
        if (tbl && !hits.length && sources.some((s) => lc(s.name) === lc(tbl) && lc(s.alias) !== lc(tbl))) {
          hits = [];
        }
        if (hits.length > 1) throw err(1052, '23000', `Column '${name}' in ${clause} is ambiguous`);
        if (!hits.length) {
          if (outer) return outer.resolve(tbl, name, checkOnly);
          throw err(1054, '42S22', `Unknown column '${tbl ? `${tbl}.` : ''}${name}' in '${clause}'`);
        }
        const [si, ci] = hits[0];
        const row = combo[si];
        return row ? row[ci] : null;
      },
      subquery(s) { return self.select(s, ctx); },
    };
    return ctx;
  }
}

/* ------------------------------------------------------------------ */
/* Utilidades para verificar consignas                                 */
/* ------------------------------------------------------------------ */
export function getTable(state, dbName, tableName) {
  const d = state.databases[lc(dbName)];
  if (!d) return null;
  return d.tables[lc(tableName)] || null;
}

export function getColumn(table, name) {
  return table?.columns.find((c) => lc(c.name) === lc(name)) || null;
}
