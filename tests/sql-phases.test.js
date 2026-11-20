import test from 'node:test';
import assert from 'node:assert/strict';
import { SqlEngine } from '../src/sql/sql-engine.js';
import { PHASES, rebuildState } from '../src/sql/challenges.js';

function runPhase(engine, p, sql) {
  const results = engine.run(sql);
  return { results, verdict: p.check({ engine, state: engine.state, lastResults: results }) };
}

test('cada fase falla antes y pasa con la solución de referencia', () => {
  const engine = new SqlEngine();
  for (const p of PHASES) {
    p.setup?.(engine);
    const before = p.check({ engine, state: engine.state, lastResults: [] });
    assert.equal(before.ok, false, `${p.id} no debería pasar antes`);
    const { results, verdict } = runPhase(engine, p, p.solution);
    const errs = results.filter((r) => r.kind === 'error');
    assert.equal(errs.length, 0, `${p.id}: ${errs.map((e) => e.error.toMysql()).join(' ')}`);
    assert.equal(verdict.ok, true, `${p.id}: ${verdict.msg}`);
  }
});

test('reparar base reconstruye el estado final', () => {
  const all = new Set(PHASES.map((p) => p.id));
  const st = rebuildState(all);
  const e = new SqlEngine(st);
  const [r] = e.run('SELECT COUNT(*) FROM miembro');
  assert.equal(r.rows[0][0], 5);
});

test('todas las misiones parsean y cada SQL: apunta a fases existentes', async () => {
  const fs = await import('node:fs');
  const { parseMissionMarkdown, parseEncounterMarkdown } = await import('../src/story/story-parser.js');
  const { phasesFor } = await import('../src/sql/challenges.js');
  const dir = new URL('../story/missions/', import.meta.url);
  const used = new Set();
  for (const f of fs.readdirSync(dir)) {
    const txt = fs.readFileSync(new URL(f, dir), 'utf8');
    const m = f.startsWith('extra-') ? parseEncounterMarkdown(txt, f) : parseMissionMarkdown(txt, f);
    const cuts = [m.introCutscene, m.outroCutscene, m.cutscene].filter(Boolean);
    for (const c of cuts) for (const st of c.steps) if (st.type === 'sql') {
      if (st.challengeId !== 'libre') { assert.ok(phasesFor(st.challengeId).length > 0, `${f}: ${st.challengeId}`); used.add(st.challengeId); }
    }
  }
  assert.equal(used.size, 9);
});

// Variantes correctas (otra forma de escribir) y errores típicos por fase
const VARIANTS = {
  'crear-bd': { ok: ['create   database BAJO_MUNDO ;\nuse bajo_mundo'], bad: ['CREATE DATABASE bajo_mundo'] },
  'tabla-banda': { ok: ['create table BANDA(\n id_banda integer not null,\n nombre varchar(60) not null,\n territorio text,\n primary key (id_banda))'], bad: ['CREATE TABLE banda (id_banda INT PRIMARY KEY, nombre VARCHAR(50), territorio VARCHAR(50))', 'CREATE TABLE banda (id_banda INT, nombre VARCHAR(50) NOT NULL, territorio VARCHAR(50))'] },
  'tabla-miembro': { ok: ['CREATE TABLE miembro (alias VARCHAR(30), respeto TINYINT, rol VARCHAR(30), id_banda INT, PRIMARY KEY(alias), CONSTRAINT fk_banda FOREIGN KEY (id_banda) REFERENCES banda(id_banda))'], bad: ['CREATE TABLE miembro (alias VARCHAR(30) PRIMARY KEY, respeto INT, rol VARCHAR(30), id_banda INT)'] },
  'tabla-vehiculo': { ok: ['CREATE TABLE vehiculo (matricula CHAR(10) PRIMARY KEY, modelo VARCHAR(50), color VARCHAR(20), alias_dueno VARCHAR(30) REFERENCES miembro(alias))'], bad: ['CREATE TABLE vehiculo (matricula VARCHAR(10) PRIMARY KEY, modelo VARCHAR(40), color VARCHAR(20), alias_dueno INT, FOREIGN KEY (alias_dueno) REFERENCES miembro(alias))'] },
  'tabla-mision': { ok: ['CREATE TABLE mision (id_mision INT AUTO_INCREMENT PRIMARY KEY, nombre_clave VARCHAR(50), recompensa INT, estrellas INT CHECK (estrellas BETWEEN 1 AND 6))'], bad: ['CREATE TABLE mision (id_mision INT PRIMARY KEY, nombre_clave VARCHAR(50), recompensa VARCHAR(20), estrellas INT)'] },
  'tabla-participa': { ok: ['CREATE TABLE participa_mision (alias_miembro VARCHAR(30) REFERENCES miembro(alias), id_mision INT, fecha DATE, FOREIGN KEY (id_mision) REFERENCES mision(id_mision), PRIMARY KEY (id_mision, alias_miembro))'], bad: ['CREATE TABLE participa_mision (alias_miembro VARCHAR(30) PRIMARY KEY, id_mision INT, fecha DATE, FOREIGN KEY (alias_miembro) REFERENCES miembro(alias), FOREIGN KEY (id_mision) REFERENCES mision(id_mision))'] },
  'alter-add': { ok: ['alter table miembro add column telefono varchar(15) after rol'], bad: [] },
  'alter-modify': { ok: ['ALTER TABLE mision CHANGE nombre_clave nombre_clave VARCHAR(120)'], bad: ['ALTER TABLE mision MODIFY nombre_clave VARCHAR(80)'] },
  'alter-drop': { ok: ['ALTER TABLE miembro DROP telefono'], bad: [] },
  'drop-table': { ok: ['drop table if exists chismes'], bad: ['DELETE FROM chismes'] },
  'insert-banda': { ok: ["insert into banda values (3,'vagos del puerto','Puerto Este'),(1,'Familia Ceibo','Barrio Ceibo');\nINSERT INTO banda (territorio, nombre, id_banda) VALUES ('Colina Norte','Los Halcones',2)"], bad: ["INSERT INTO banda VALUES (1,'Familia Ceibo','Barrio Ceibo'),(2,'Los Halcones','Colina Nrte'),(3,'Vagos del Puerto','Puerto Este')"] },
  'insert-miembro': { ok: null, bad: ["INSERT INTO miembro VALUES ('Vera',95,'Jefa',1)"] },
  'insert-vehiculo': { ok: null, bad: [] },
  'insert-mision': { ok: ["INSERT INTO mision VALUES (1,'Asalto al Tren','50000',3),(2,'Golpe en el Puerto',15000.00,4),(3,'Robo al Casino',250000,5)"], bad: [] },
  'insert-participa': { ok: null, bad: [] },
  'update-respeto': { ok: ["update miembro set respeto=respeto+15 where alias like 'rayo'"], bad: ['UPDATE miembro SET respeto = 55'] },
  'update-color': { ok: ["UPDATE vehiculo SET color='negro' WHERE modelo='Pickup Bagual'"], bad: ["UPDATE vehiculo SET color='Negro'"] },
  'update-recompensa': { ok: ['UPDATE mision SET recompensa = 20000 WHERE nombre_clave = \'Golpe en el Puerto\''], bad: ['UPDATE mision SET recompensa = recompensa + 5000'] },
  'delete-kobra': { ok: ["DELETE FROM vehiculo WHERE alias_dueno='Kobra'; DELETE FROM miembro WHERE alias='Kobra'"], bad: ["DELETE FROM miembro WHERE alias='Kobra'"] },
  'q-vehiculos': { ok: ['select color, modelo as m from vehiculo order by color', 'SELECT * FROM vehiculo'], bad: ["SELECT modelo FROM vehiculo", "SELECT modelo, color FROM vehiculo WHERE color='Verde'"] },
  'q-misiones-ricas': { ok: ['SELECT * FROM mision WHERE estrellas >= 3 AND recompensa > 40000', 'select nombre_clave, recompensa from mision where not (recompensa <= 40000 or estrellas <= 2)'], bad: ['SELECT nombre_clave FROM mision WHERE recompensa > 40000 OR estrellas > 2', 'SELECT nombre_clave FROM mision'] },
  'q-ranking': { ok: ['SELECT respeto, alias FROM miembro ORDER BY 1 DESC', 'select * from miembro order by respeto desc'], bad: ['SELECT alias, respeto FROM miembro ORDER BY respeto', 'SELECT alias, respeto FROM miembro'] },
  'q-alias-banda': { ok: ['SELECT b.nombre, alias FROM miembro, banda b WHERE miembro.id_banda = b.id_banda', 'SELECT alias, nombre FROM banda NATURAL JOIN miembro', 'select m.alias, b.nombre from banda b inner join miembro m using (id_banda)'], bad: ['SELECT alias, nombre FROM miembro, banda'] },
  'q-misiones-vera': { ok: ["SELECT nombre_clave, recompensa FROM mision WHERE id_mision IN (SELECT id_mision FROM participa_mision WHERE alias_miembro = 'vera')", "SELECT m.alias, mi.nombre_clave, mi.recompensa FROM miembro m JOIN participa_mision p ON m.alias=p.alias_miembro JOIN mision mi ON mi.id_mision=p.id_mision WHERE m.alias='Vera'"], bad: ["SELECT nombre_clave, recompensa FROM mision"] },
  'q-contar': { ok: ['SELECT COUNT(alias) AS total, id_banda FROM miembro GROUP BY id_banda ORDER BY total DESC', 'select b.id_banda, count(*) from banda b join miembro m on m.id_banda=b.id_banda group by b.id_banda'], bad: ['SELECT COUNT(*) FROM miembro', 'SELECT id_banda FROM miembro GROUP BY id_banda'] },
  'q-total': { ok: ['select sum(recompensa) from mision'], bad: ['SELECT recompensa FROM mision', 'SELECT COUNT(recompensa) FROM mision'] },
  'q-having': { ok: ['SELECT nombre FROM banda WHERE id_banda IN (SELECT id_banda FROM miembro GROUP BY id_banda HAVING COUNT(*) > 1)', 'SELECT b.nombre, COUNT(*) c FROM banda b JOIN miembro m ON b.id_banda=m.id_banda GROUP BY b.nombre HAVING c > 1'], bad: ['SELECT b.nombre FROM banda b JOIN miembro m ON b.id_banda=m.id_banda GROUP BY b.nombre', 'SELECT id_banda FROM miembro GROUP BY id_banda HAVING COUNT(*) > 1'] },
};

test('variantes correctas pasan y errores típicos no pasan (sin mostrar la solución)', () => {
  let engine = new SqlEngine();
  for (const p of PHASES) {
    p.setup?.(engine);
    const v = VARIANTS[p.id] || {};
    for (const bad of v.bad || []) {
      const trial = new SqlEngine(engine.serialize());
      p.setup?.(trial);
      const results = trial.run(bad);
      const verdict = p.check({ engine: trial, state: trial.state, lastResults: results });
      assert.equal(verdict.ok, false, `${p.id} no debería pasar con: ${bad}`);
      assert.ok(verdict.msg && !verdict.msg.includes(p.solution.split('\n')[0]), `${p.id}: el mensaje no debe contener la solución`);
    }
    for (const good of v.ok || []) {
      const trial = new SqlEngine(engine.serialize());
      p.setup?.(trial);
      const results = trial.run(good);
      const errs = results.filter((r) => r.kind === 'error').map((r) => r.error.toMysql());
      assert.deepEqual(errs, [], `${p.id}: ${good}`);
      const verdict = p.check({ engine: trial, state: trial.state, lastResults: results });
      assert.equal(verdict.ok, true, `${p.id} debería pasar con: ${good} → ${verdict.msg}`);
    }
    engine.run(p.solution);
  }
});
