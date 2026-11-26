// Insignias que se ganan con el avance SQL (se muestran en el inventario y en el PDF).
import { PHASES, MISSIONS, BONUS, CENTERS } from './challenges.js';
import { STREET_CHALLENGES } from './street-challenges.js';

const MISSION_ICONS = { 1: '📓', 2: '🔑', 3: '🛠️', 4: '🤝', 5: '📒', 6: '⚖️', 7: '📊', 8: '🧩', 9: '🎰' };
const KIND = {
  DDL: { icon: '🏗️', name: 'Arquitecta DDL', desc: 'Completaste todas las fases de DDL: crear, modificar y borrar estructuras.' },
  DML: { icon: '✏️', name: 'Operadora DML', desc: 'Completaste todas las fases de DML: insertar, actualizar y borrar datos.' },
  DQL: { icon: '🔍', name: 'Detective DQL', desc: 'Completaste todas las fases de DQL: consultas, JOIN y agregados.' },
};

export function computeBadges(progress) {
  const done = (p) => Boolean(progress?.completed?.[p.id]);
  const list = [];
  for (const m of Object.keys(MISSIONS).map(Number)) {
    const ph = PHASES.filter((p) => p.mission === m);
    const d = ph.filter(done).length;
    list.push({
      id: `mision-${m}`, group: 'Misiones', icon: MISSION_ICONS[m] || '⭐', name: `Misión ${m}`, title: MISSIONS[m],
      earned: d === ph.length, progress: `${d}/${ph.length}`,
      desc: d === ph.length ? `Completaste la misión ${m}: ${MISSIONS[m]}.` : `Completá las ${ph.length} fases SQL de la misión ${m} (${MISSIONS[m]}).`,
    });
  }
  for (const [k, info] of Object.entries(KIND)) {
    const ph = PHASES.filter((p) => p.kind === k);
    const d = ph.filter(done).length;
    list.push({ id: `kind-${k}`, group: 'Habilidades', icon: info.icon, name: info.name, title: k, earned: d === ph.length, progress: `${d}/${ph.length}`, desc: d === ph.length ? info.desc : `Completá las ${ph.length} fases de ${k} (llevás ${d}).` });
  }
  for (const [key, c] of Object.entries(CENTERS)) {
    const ph = BONUS.filter((p) => p.center === key);
    const d = ph.filter(done).length;
    list.push({ id: `nerd-${key}`, group: 'Misiones nerds', icon: c.icon, name: c.name, title: c.full, earned: d === ph.length && ph.length > 0, progress: `${d}/${ph.length}`, desc: d === ph.length ? `Completaste la misión nerd de ${c.full}.` : `Hablá con ${c.npc} en ${c.full} y resolvé sus ${ph.length} retos.` });
  }
  const st = progress?.street || {};
  const distinct = Object.keys(st.solved || {}).length;
  const helped = st.helped || 0;
  list.push({ id: 'calle-vecino', group: 'Calle', icon: '🤝', name: 'Buen vecino', title: 'Mini retos de la calle', earned: helped >= 5, progress: `${Math.min(helped, 5)}/5`, desc: helped >= 5 ? 'Ayudaste a 5 personas en la calle.' : `Ayudá a 5 personas que te pidan ayuda en la calle (llevás ${helped}).` });
  list.push({ id: 'calle-heroe', group: 'Calle', icon: '🦸', name: 'Héroe de Santa Bruma', title: 'Mini retos de la calle', earned: distinct >= STREET_CHALLENGES.length, progress: `${distinct}/${STREET_CHALLENGES.length}`, desc: distinct >= STREET_CHALLENGES.length ? 'Resolviste todos los mini retos de la calle.' : `Resolvé los ${STREET_CHALLENGES.length} mini retos distintos de la calle (llevás ${distinct}).` });
  return list;
}

export function earnedIds(progress) {
  return new Set(computeBadges(progress).filter((b) => b.earned).map((b) => b.id));
}
