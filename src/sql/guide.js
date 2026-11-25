// Instructivo visual de comandos SQL (panel izquierdo de la terminal).
// Los ejemplos usan OTRA base (una pizzería) para no dar la solución de las fases.

const KW = new Set(['CREATE', 'DATABASE', 'USE', 'TABLE', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'NOT', 'NULL', 'ALTER', 'ADD',
  'MODIFY', 'DROP', 'COLUMN', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'WHERE', 'DELETE', 'FROM', 'SELECT', 'ORDER', 'BY',
  'ASC', 'DESC', 'JOIN', 'ON', 'AND', 'OR', 'GROUP', 'HAVING', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'AS', 'LIKE', 'BETWEEN',
  'IN', 'IS', 'LIMIT', 'DISTINCT', 'CHECK', 'DESCRIBE', 'SHOW', 'TABLES', 'TRUNCATE', 'CHANGE', 'INNER', 'LEFT']);
const TYPES = new Set(['INT', 'VARCHAR', 'DECIMAL', 'DATE', 'TEXT', 'CHAR']);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Colorea SQL. Los «marcadores» se muestran como fichas para completar. */
function hl(sql) {
  return esc(sql)
    .replace(/«([^»]+)»/g, '<span class="g-ph">$1</span>')
    .replace(/'[^']*'/g, (m) => `<span class="g-str">${m}</span>`)
    .replace(/\b([A-Za-z_]+)\b(?![^<]*>)/g, (w) => {
      const up = w.toUpperCase();
      if (w === up && KW.has(up)) return `<span class="g-kw">${w}</span>`;
      if (w === up && TYPES.has(up)) return `<span class="g-type">${w}</span>`;
      return w;
    })
    .replace(/(?<![\w-])(\d+(?:\.\d+)?)(?![\w-])(?![^<]*>)/g, '<span class="g-num">$1</span>');
}

/** Mini tabla gráfica. rows: arrays; marcas por fila: {cls:'new'|'del'|'dim'|'hit', cells:[...], mark:{i:'chg'}} */
function mini(title, cols, rows, opts = {}) {
  const head = cols.map((c) => {
    const badge = c.pk ? '<i class="g-b pk">🔑</i>' : c.fk ? '<i class="g-b fk">🔗</i>' : c.add ? '<i class="g-b add">+</i>' : c.mod ? '<i class="g-b mod">✎</i>' : c.del ? '<i class="g-b del">−</i>' : '';
    const cls = [c.pick ? 'pick' : '', c.add ? 'col-add' : '', c.mod ? 'col-mod' : '', c.del ? 'col-del' : ''].join(' ');
    return `<th class="${cls}">${badge}${esc(c.n ?? c)}</th>`;
  }).join('');
  const body = rows.map((r) => {
    const cells = r.cells || r;
    return `<tr class="${r.cls || ''}">${cells.map((v, i) => `<td class="${r.chg === i ? 'chg' : ''} ${cols[i]?.pick ? 'pick' : ''} ${r.key === i ? 'key-' + (r.kc || 'a') : ''}">${esc(v)}</td>`).join('')}</tr>`;
  }).join('');
  return `<div class="g-mini ${opts.cls || ''}">${title ? `<div class="g-mini-t">${esc(title)}</div>` : ''}<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}
const arrow = (txt = '') => `<div class="g-arrow" aria-hidden="true"><span>${esc(txt)}</span>➜</div>`;
const note = (txt, kind = 'tip') => `<div class="g-note g-${kind}">${txt}</div>`;

/* ------------------------------------------------------------------ */
/* Tarjetas                                                            */
/* ------------------------------------------------------------------ */
const CARDS = {
  /* ============================ DDL ============================ */
  'create-db': {
    kind: 'DDL', icon: '🏗️', name: 'CREATE DATABASE · USE', what: 'Crear una base y elegirla para trabajar',
    syntax: 'CREATE DATABASE «nombre_base»;\nUSE «nombre_base»;',
    visual: `<div class="g-row"><div class="g-db">🛢️<b>pizzeria</b><small>creada</small></div>${arrow('USE')}<div class="g-db on">🛢️<b>pizzeria</b><small>✔ en uso</small></div></div>`,
    example: 'CREATE DATABASE pizzeria;\nUSE pizzeria;',
    tips: ['Sin <b>USE</b>, MySQL no sabe en qué base crear las tablas (error 1046).', 'Para ver las bases: <code>SHOW DATABASES;</code>'],
  },
  'create-table': {
    kind: 'DDL', icon: '🧱', name: 'CREATE TABLE', what: 'Crear una tabla: sus columnas, tipos y reglas',
    syntax: 'CREATE TABLE «tabla» (\n  «columna» «TIPO» «restricción»,\n  «columna» «TIPO»,\n  ...\n);',
    visual: `${mini('pizza', [{ n: 'id_pizza', pk: true }, 'nombre', 'precio'], [['', '', '']], { cls: 'empty' })}
      <div class="g-types">
        <span><b class="g-type">INT</b> número entero <i>12</i></span>
        <span><b class="g-type">VARCHAR(n)</b> texto de hasta n letras <i>'Muzzarella'</i></span>
        <span><b class="g-type">DECIMAL(p,d)</b> número con coma <i>450.50</i></span>
        <span><b class="g-type">DATE</b> fecha <i>'2027-05-20'</i></span>
      </div>
      <div class="g-types">
        <span><b class="g-kw">PRIMARY KEY</b> 🔑 identifica la fila, no se repite</span>
        <span><b class="g-kw">NOT NULL</b> ⛔ no puede quedar vacía</span>
      </div>`,
    example: 'CREATE TABLE pizza (\n  id_pizza INT PRIMARY KEY,\n  nombre VARCHAR(40) NOT NULL,\n  precio DECIMAL(8,2)\n);',
    tips: ['Las columnas se separan con <b>coma</b>. La última no lleva coma.', 'Mirá cómo quedó con <code>DESCRIBE pizza;</code>'],
  },
  'keys': {
    kind: 'DDL', icon: '🔗', name: 'PRIMARY KEY · FOREIGN KEY', what: 'Relacionar tablas: la hija apunta a la madre',
    syntax: 'FOREIGN KEY («columna») REFERENCES «tabla_madre»(«columna_pk»)',
    visual: `<div class="g-row g-rel">
        ${mini('pizza (madre)', [{ n: 'id_pizza', pk: true }, 'nombre'], [{ cells: ['1', 'Muzzarella'], key: 0, kc: 'a' }, { cells: ['2', 'Napolitana'], key: 0, kc: 'b' }])}
        <svg class="g-svg" viewBox="0 0 60 60" aria-hidden="true"><path d="M58 30 H6" stroke="currentColor" stroke-width="3" fill="none" marker-end="url(#gah)"/><defs><marker id="gah" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="currentColor"/></marker></defs></svg>
        ${mini('pedido (hija)', [{ n: 'id_pedido', pk: true }, { n: 'id_pizza', fk: true }], [{ cells: ['10', '1'], key: 1, kc: 'a' }, { cells: ['11', '2'], key: 1, kc: 'b' }, { cells: ['12', '1'], key: 1, kc: 'a' }])}
      </div>
      <div class="g-types"><span>🔑 <b>PK</b>: único, identifica cada fila</span><span>🔗 <b>FK</b>: solo valores que existen en la madre</span><span>🔑🔑 <b>PK compuesta</b>: <code>PRIMARY KEY (col1, col2)</code></span></div>`,
    example: 'CREATE TABLE pedido (\n  id_pedido INT PRIMARY KEY,\n  id_pizza INT,\n  FOREIGN KEY (id_pizza) REFERENCES pizza(id_pizza)\n);',
    tips: ['La FK y la columna a la que apunta deben tener el <b>mismo tipo</b> (error 3780).', 'Primero se crea la tabla madre, después la hija (error 1824).'],
  },
  'alter': {
    kind: 'DDL', icon: '🛠️', name: 'ALTER TABLE', what: 'Cambiar una tabla que ya existe, sin borrarla',
    syntax: 'ALTER TABLE «tabla» ADD «columna» «TIPO»;\nALTER TABLE «tabla» MODIFY «columna» «TIPO_NUEVO»;\nALTER TABLE «tabla» DROP COLUMN «columna»;',
    visual: `<div class="g-row">
      ${mini('ADD', ['id_pizza', 'nombre', { n: 'picante', add: true }], [['1', 'Muzza', '']])}
      ${mini('MODIFY', ['id_pizza', { n: 'nombre', mod: true }], [['1', 'VARCHAR(40)→(80)']])}
      ${mini('DROP COLUMN', ['id_pizza', 'nombre', { n: 'oferta', del: true }], [['1', 'Muzza', '—']])}
    </div>`,
    example: 'ALTER TABLE pizza ADD picante VARCHAR(2);\nALTER TABLE pizza MODIFY nombre VARCHAR(80);\nALTER TABLE pizza DROP COLUMN picante;',
    tips: ['<b>ADD</b> agrega · <b>MODIFY</b> cambia el tipo · <b>DROP COLUMN</b> quita.', 'Los datos de las otras columnas no se pierden.'],
  },
  'drop': {
    kind: 'DDL', icon: '💣', name: 'DROP TABLE', what: 'Eliminar una tabla entera (estructura y datos)',
    syntax: 'DROP TABLE «tabla»;',
    visual: `<div class="g-compare">
      <div><b class="g-kw">DELETE FROM</b><small>borra filas</small>${mini('', ['id', 'nombre'], [{ cells: ['1', 'Muzza'], cls: 'del' }, { cells: ['2', 'Napo'], cls: 'del' }])}<small>la tabla sigue ✔</small></div>
      <div><b class="g-kw">DROP TABLE</b><small>borra la tabla</small><div class="g-gone">🧱💥<br>la tabla<br>ya no existe</div></div>
    </div>`,
    example: 'DROP TABLE promociones;',
    tips: ['No se puede borrar una tabla madre si una hija la referencia (error 3730).', '⚠️ No tiene vuelta atrás.'],
  },

  /* ============================ DML ============================ */
  'insert': {
    kind: 'DML', icon: '➕', name: 'INSERT INTO', what: 'Agregar filas nuevas',
    syntax: 'INSERT INTO «tabla» («col1», «col2», ...)\nVALUES («valor1», «valor2», ...),\n       («valor1», «valor2», ...);',
    visual: `${mini('pizza', [{ n: 'id_pizza', pk: true }, 'nombre', 'precio'], [['1', 'Muzzarella', '400'], { cells: ['2', 'Napolitana', '450'], cls: 'new' }, { cells: ['3', 'Fugazza', '420'], cls: 'new' }])}
      <div class="g-types"><span><b class="g-str">'texto'</b> entre comillas simples</span><span><b class="g-num">450</b> números sin comillas</span><span><b class="g-str">'2027-05-20'</b> fechas AAAA-MM-DD</span></div>`,
    example: "INSERT INTO pizza (id_pizza, nombre, precio)\nVALUES (2, 'Napolitana', 450),\n       (3, 'Fugazza', 420);",
    tips: ['Si no ponés la lista de columnas, los valores van <b>en el orden</b> de la tabla.', 'Orden de carga: primero la <b>madre</b>, después la <b>hija</b> (error 1452).'],
  },
  'update': {
    kind: 'DML', icon: '✏️', name: 'UPDATE … SET … WHERE', what: 'Cambiar datos de filas que ya existen',
    syntax: 'UPDATE «tabla»\nSET «columna» = «valor_nuevo»\nWHERE «condición»;',
    visual: `<div class="g-row">${mini('antes', ['id', 'nombre', 'precio'], [['1', 'Muzzarella', '400'], ['2', 'Napolitana', '450']])}${arrow('WHERE id = 2')}${mini('después', ['id', 'nombre', 'precio'], [['1', 'Muzzarella', '400'], { cells: ['2', 'Napolitana', '500'], chg: 2 }])}</div>
      ${note('⚠️ <b>Sin WHERE</b> se cambian <b>todas</b> las filas.', 'warn')}`,
    example: 'UPDATE pizza\nSET precio = 500\nWHERE id_pizza = 2;\n\n-- con cálculo:\nUPDATE pizza SET precio = precio + 50 WHERE id_pizza = 1;',
    tips: ['Se pueden cambiar varias columnas: <code>SET a = 1, b = 2</code>', 'Revisá antes con un SELECT y el mismo WHERE.'],
  },
  'delete': {
    kind: 'DML', icon: '🗑️', name: 'DELETE FROM … WHERE', what: 'Borrar filas',
    syntax: 'DELETE FROM «tabla»\nWHERE «condición»;',
    visual: `${mini('pizza', ['id', 'nombre'], [['1', 'Muzzarella'], { cells: ['2', 'Napolitana'], cls: 'del' }, ['3', 'Fugazza']])}
      <div class="g-steps"><span class="g-step">1️⃣ borrar la <b>hija</b> (pedido)</span>➜<span class="g-step">2️⃣ borrar la <b>madre</b> (pizza)</span></div>
      ${note('⚠️ <b>Sin WHERE</b> se borran <b>todas</b> las filas.', 'warn')}`,
    example: 'DELETE FROM pedido WHERE id_pizza = 2;\nDELETE FROM pizza WHERE id_pizza = 2;',
    tips: ['Si otra tabla apunta a esa fila, MySQL no deja borrarla (error 1451).'],
  },

  /* ============================ DQL ============================ */
  'order': {
    kind: 'DQL', icon: '🧭', name: 'Orden de las cláusulas', what: 'Siempre se escriben en este orden',
    syntax: '',
    visual: `<div class="g-pipe">${['SELECT', 'FROM', 'JOIN … ON', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT'].map((k, i) => `<span class="g-pipe-s s${i}">${k}</span>`).join('<b>›</b>')}</div>
      <div class="g-types"><span>Solo <b>SELECT</b> y <b>FROM</b> son obligatorias.</span></div>`,
    example: '', tips: [],
  },
  'select': {
    kind: 'DQL', icon: '🔍', name: 'SELECT … FROM', what: 'Mostrar columnas de una tabla',
    syntax: 'SELECT «columna1», «columna2»\nFROM «tabla»;',
    visual: `${mini('pizza', [{ n: 'id_pizza' }, { n: 'nombre', pick: true }, { n: 'precio', pick: true }], [['1', 'Muzzarella', '400'], ['2', 'Napolitana', '450']])}
      <div class="g-types"><span><b class="g-kw">*</b> = todas las columnas</span><span><b class="g-kw">AS</b> pone otro nombre: <code>precio AS valor</code></span></div>`,
    example: 'SELECT nombre, precio FROM pizza;\nSELECT * FROM pizza;',
    tips: ['SELECT solo <b>mira</b>: nunca cambia los datos.'],
  },
  'where': {
    kind: 'DQL', icon: '🧹', name: 'WHERE', what: 'Filtrar: quedarse solo con algunas filas',
    syntax: 'SELECT «columnas» FROM «tabla»\nWHERE «condición» AND «condición»;',
    visual: `${mini('WHERE precio > 420', ['id', 'nombre', 'precio'], [{ cells: ['1', 'Muzzarella', '400'], cls: 'dim' }, { cells: ['2', 'Napolitana', '450'], cls: 'hit' }, { cells: ['3', 'Fugazza', '420'], cls: 'dim' }])}
      <div class="g-chips">${['=', '<>', '>', '<', '>=', '<=', 'AND', 'OR', 'NOT', "LIKE 'Mu%'", 'BETWEEN 1 AND 5', "IN ('a','b')", 'IS NULL'].map((o) => `<code>${esc(o)}</code>`).join('')}</div>
      <div class="g-types"><span><b>AND</b>: se cumplen las dos</span><span><b>OR</b>: alcanza con una</span><span><b>&gt; 2</b> no incluye al 2 · <b>&gt;= 2</b> sí</span></div>`,
    example: "SELECT nombre FROM pizza\nWHERE precio > 420 AND nombre LIKE 'N%';",
    tips: ['Los textos van entre comillas: <code>WHERE nombre = \'Fugazza\'</code>'],
  },
  'orderby': {
    kind: 'DQL', icon: '↕️', name: 'ORDER BY', what: 'Ordenar el resultado',
    syntax: 'SELECT «columnas» FROM «tabla»\nORDER BY «columna» DESC;',
    visual: `<div class="g-row">${mini('ASC ⬆ (menor a mayor)', ['nombre', 'precio'], [['Muzzarella', '400'], ['Fugazza', '420'], ['Napolitana', '450']])}${mini('DESC ⬇ (mayor a menor)', ['nombre', 'precio'], [['Napolitana', '450'], ['Fugazza', '420'], ['Muzzarella', '400']])}</div>`,
    example: 'SELECT nombre, precio FROM pizza ORDER BY precio DESC;',
    tips: ['Si no ponés nada, ordena <b>ASC</b>.', 'Va <b>al final</b> de la consulta (antes de LIMIT).'],
  },
  'join': {
    kind: 'DQL', icon: '🧩', name: 'JOIN … ON', what: 'Unir dos tablas por la columna que comparten',
    syntax: 'SELECT «t1.col», «t2.col»\nFROM «tabla1» t1\nJOIN «tabla2» t2 ON t1.«fk» = t2.«pk»;',
    visual: `<div class="g-row g-rel">
        ${mini('pedido', ['id_pedido', { n: 'id_pizza', fk: true }], [{ cells: ['10', '1'], key: 1, kc: 'a' }, { cells: ['11', '2'], key: 1, kc: 'b' }])}
        <div class="g-plus">⨝</div>
        ${mini('pizza', [{ n: 'id_pizza', pk: true }, 'nombre'], [{ cells: ['1', 'Muzzarella'], key: 0, kc: 'a' }, { cells: ['2', 'Napolitana'], key: 0, kc: 'b' }])}
      </div>
      <div class="g-row">${arrow('ON pedido.id_pizza = pizza.id_pizza')}${mini('resultado', ['id_pedido', 'nombre'], [{ cells: ['10', 'Muzzarella'], cls: 'hit' }, { cells: ['11', 'Napolitana'], cls: 'hit' }])}</div>
      ${note('⚠️ <b>Sin ON</b> se mezcla cada fila con todas las otras (producto cartesiano).', 'warn')}`,
    example: 'SELECT p.id_pedido, z.nombre\nFROM pedido p\nJOIN pizza z ON p.id_pizza = z.id_pizza;',
    tips: ['Para 3 tablas, agregá otro <code>JOIN … ON …</code>', 'Los alias cortos (p, z) ahorran escribir.', 'También vale: <code>FROM a, b WHERE a.x = b.x</code>'],
  },
  'aggregate': {
    kind: 'DQL', icon: '🧮', name: 'COUNT · SUM · AVG · MIN · MAX', what: 'Calcular un valor con muchas filas',
    syntax: 'SELECT COUNT(*), SUM(«columna») FROM «tabla»;',
    visual: `<div class="g-row">${mini('pizza', ['nombre', 'precio'], [['Muzzarella', '400'], ['Napolitana', '450'], ['Fugazza', '420']])}${arrow()}<div class="g-agg">
      <span><b>COUNT(*)</b> = 3</span><span><b>SUM(precio)</b> = 1270</span><span><b>AVG(precio)</b> ≈ 423</span><span><b>MIN</b> = 400 · <b>MAX</b> = 450</span></div></div>`,
    example: 'SELECT COUNT(*) AS cantidad, SUM(precio) AS total FROM pizza;',
    tips: ['Muchas filas ➜ <b>una</b> fila de resultado.'],
  },
  'groupby': {
    kind: 'DQL', icon: '🗂️', name: 'GROUP BY · HAVING', what: 'Calcular por grupos y filtrar grupos',
    syntax: 'SELECT «columna», COUNT(*)\nFROM «tabla»\nGROUP BY «columna»\nHAVING COUNT(*) > «n»;',
    visual: `<div class="g-row">${mini('pedido', ['id_pedido', 'id_pizza'], [{ cells: ['10', '1'], key: 1, kc: 'a' }, { cells: ['11', '2'], key: 1, kc: 'b' }, { cells: ['12', '1'], key: 1, kc: 'a' }])}${arrow('GROUP BY id_pizza')}${mini('resultado', ['id_pizza', 'COUNT(*)'], [{ cells: ['1', '2'], key: 0, kc: 'a' }, { cells: ['2', '1'], key: 0, kc: 'b' }])}</div>
      <div class="g-compare small"><div><b class="g-kw">WHERE</b><small>filtra <b>filas</b>, antes de agrupar</small></div><div><b class="g-kw">HAVING</b><small>filtra <b>grupos</b>, después de agrupar</small></div></div>`,
    example: 'SELECT id_pizza, COUNT(*) AS pedidos\nFROM pedido\nGROUP BY id_pizza\nHAVING COUNT(*) > 1;',
    tips: ['Una fila de resultado <b>por cada grupo</b>.', 'COUNT, SUM… no van en el WHERE (error 1111).'],
  },
};

/** Qué tarjetas conviene abrir en cada fase (solo orientan; no dan la respuesta). */
const PHASE_CARDS = {
  'crear-bd': ['create-db'], 'tabla-banda': ['create-table'], 'tabla-miembro': ['create-table', 'keys'],
  'tabla-vehiculo': ['keys'], 'tabla-mision': ['create-table'], 'tabla-participa': ['keys'],
  'alter-add': ['alter'], 'alter-modify': ['alter'], 'alter-drop': ['alter'], 'drop-table': ['drop'],
  'insert-banda': ['insert'], 'insert-miembro': ['insert'], 'insert-vehiculo': ['insert'], 'insert-mision': ['insert'], 'insert-participa': ['insert'],
  'update-respeto': ['update'], 'update-color': ['update'], 'update-recompensa': ['update'], 'delete-kobra': ['delete'],
  'q-vehiculos': ['select'], 'q-misiones-ricas': ['where'], 'q-ranking': ['orderby'],
  'q-alias-banda': ['join'], 'q-misiones-vera': ['join', 'where'],
  'q-contar': ['groupby'], 'q-total': ['aggregate'], 'q-having': ['groupby'],
};

const KIND_INFO = {
  DDL: { label: 'DDL', sub: 'Definir la estructura', icon: '🏗️' },
  DML: { label: 'DML', sub: 'Manejar los datos', icon: '✏️' },
  DQL: { label: 'DQL', sub: 'Consultar', icon: '🔍' },
};

function cardHtml(key, c, open, star) {
  return `<details class="g-card g-card-${c.kind.toLowerCase()}${star ? ' star' : ''}" ${open ? 'open' : ''} data-card="${key}">
    <summary><span class="g-icon" aria-hidden="true">${c.icon}</span><span class="g-sum"><b>${esc(c.name)}</b><small>${esc(c.what)}</small></span>${star ? '<span class="g-star" title="Útil para esta fase">⭐ esta fase</span>' : ''}</summary>
    <div class="g-body">
      ${c.syntax ? `<div class="g-label">Sintaxis</div><pre class="g-code g-syntax">${hl(c.syntax)}</pre>` : ''}
      <div class="g-visual">${c.visual}</div>
      ${c.example ? `<div class="g-label">Ejemplo <small>(base de una pizzería)</small></div><pre class="g-code">${hl(c.example)}</pre>` : ''}
      ${c.tips?.length ? `<ul class="g-tips">${c.tips.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}
    </div></details>`;
}

let currentTab = null;

/** Dibuja el instructivo dentro de `container`. Con `kind`, abre la pestaña de esa fase. */
export function renderGuide(container, { kind = null, phaseId = null } = {}) {
  if (kind) currentTab = kind;
  const tab = currentTab || 'DDL';
  const starred = new Set(PHASE_CARDS[phaseId] || []);
  const tabs = Object.entries(KIND_INFO).map(([k, info]) => `<button type="button" role="tab" class="g-tab g-tab-${k.toLowerCase()}${k === tab ? ' on' : ''}" aria-selected="${k === tab}" data-tab="${k}"><span aria-hidden="true">${info.icon}</span> ${info.label}<small>${info.sub}</small></button>`).join('');
  const cards = Object.entries(CARDS).filter(([, c]) => c.kind === tab)
    .map(([key, c]) => cardHtml(key, c, starred.has(key) || (!starred.size && key === 'order'), starred.has(key))).join('');
  container.innerHTML = `<div class="g-head"><span aria-hidden="true">📘</span> Instructivo de comandos</div>
    <div class="g-tabs" role="tablist" aria-label="Tipo de comandos">${tabs}</div>
    <div class="g-legend"><span class="g-ph">así</span> = lo completás vos · <span class="g-kw">PALABRA</span> = palabra clave · <span class="g-str">'texto'</span> = texto</div>
    <div class="g-cards">${cards}</div>`;
  container.querySelectorAll('.g-tab').forEach((b) => b.addEventListener('click', () => {
    currentTab = b.dataset.tab;
    renderGuide(container, { phaseId });
  }));
}
