// Instructivo gráfico de controles (a pie y en auto), debajo del HUD de la izquierda.
const KEY_OPEN = 'gtasql.controls.open.v1';

const k = (t, wide = false) => `<kbd class="cg-key${wide ? ' wide' : ''}">${t}</kbd>`;
const arrows = `<span class="cg-arrows" aria-label="Flechas o W A S D">${k('▲')}<span>${k('◀')}${k('▼')}${k('▶')}</span></span>`;
const row = (keys, icon, text) => `<li><span class="cg-keys">${keys}</span><span class="cg-do"><span class="cg-ico" aria-hidden="true">${icon}</span>${text}</span></li>`;

function html() {
  return `
  <button type="button" class="cg-toggle" aria-expanded="true" aria-controls="cg-body">🎮 <b>Controles</b><span class="cg-caret" aria-hidden="true">▾</span></button>
  <div class="cg-body" id="cg-body">
    <section class="cg-card cg-foot" data-mode="foot">
      <h4><span aria-hidden="true">🚶</span> A pie <em class="cg-now">ahora</em></h4>
      <ul class="cg-kb">
        ${row(arrows + '<small>o WASD</small>', '👣', 'Caminar')}
        ${row(k('Espacio', true), '🚗', 'Subir al auto · hablar · entrar · agarrar')}
      </ul>
      <ul class="cg-touch">
        ${row('<span class="cg-stick" aria-hidden="true"></span>', '👣', 'Mové el joystick para caminar')}
        ${row('<span class="cg-btn">✋</span>', '🚗', 'Botón de acción: subir al auto, hablar, entrar')}
      </ul>
    </section>
    <section class="cg-card cg-car" data-mode="car">
      <h4><span aria-hidden="true">🚗</span> En auto <em class="cg-now">ahora</em></h4>
      <ul class="cg-kb">
        ${row(k('Espacio', true), '⏩', 'Acelerar')}
        ${row(k('Shift') + k('X'), '⏪', 'Frenar · marcha atrás')}
        ${row(`${k('◀')}${k('▶')}<small>o A D</small>`, '↩️', 'Doblar')}
        ${row(k('Espacio') + '<b>+</b>' + k('Shift'), '🚪', 'Bajarte del auto')}
      </ul>
      <ul class="cg-touch">
        ${row('<span class="cg-wheel" aria-hidden="true">⟲⟳</span>', '↩️', 'Deslizá el dedo a los costados para doblar')}
        ${row('<span class="cg-btn">✋</span>', '⏩', 'Botón de acción: acelerar')}
        ${row('<span class="cg-btn b">🛑</span>', '⏪', 'Frenar · marcha atrás')}
        ${row('<span class="cg-btn exit">🚪</span>', '🚶', 'Bajarte del auto')}
      </ul>
    </section>
    <section class="cg-card cg-all">
      <h4><span aria-hidden="true">🧰</span> Siempre</h4>
      <ul class="cg-grid">
        <li>${k('I')}<span>🎒 Objetos</span></li>
        <li>${k('M')}<span>🗺️ Mapa</span></li>
        <li>${k('Esc')}<span>⏸️ Menú</span></li>
        <li><kbd class="cg-key sql">SQL</kbd><span>💻 Terminal</span></li>
      </ul>
    </section>
  </div>`;
}

const isTouch = () => Boolean(window.matchMedia?.('(pointer: coarse)').matches);
function readOpen() {
  if (isTouch()) return false; // en celular/tablet arranca plegado para no tapar el joystick
  try { return localStorage.getItem(KEY_OPEN) !== '0'; } catch { return true; }
}
function saveOpen(v) { try { localStorage.setItem(KEY_OPEN, v ? '1' : '0'); } catch { /* sin almacenamiento */ } }

function mount() {
  const stack = document.getElementById('top-left-stack');
  if (!stack || document.getElementById('controls-guide')) return;
  const el = document.createElement('div');
  el.id = 'controls-guide';
  el.className = 'hud-pill cg-root';
  el.innerHTML = html();
  stack.append(el);
  // que los clics en el panel no muevan al personaje
  el.addEventListener('pointerdown', (e) => e.stopPropagation());

  const toggle = el.querySelector('.cg-toggle');
  const setOpen = (open) => {
    el.classList.toggle('closed', !open);
    toggle.setAttribute('aria-expanded', String(open));
    if (!isTouch()) saveOpen(open);
  };
  setOpen(readOpen());
  toggle.addEventListener('click', () => setOpen(el.classList.contains('closed')));
  // en pantallas táctiles se pliega solo al tocar fuera del panel (para jugar)
  document.addEventListener('pointerdown', (e) => {
    if (isTouch() && !el.contains(e.target) && !el.classList.contains('closed')) setOpen(false);
  }, true);

  const status = document.getElementById('vehicle-status');
  const sync = () => {
    const txt = (status?.textContent || '').trim().toLowerCase();
    const onFoot = !txt || txt.includes('a pie');
    el.dataset.mode = onFoot ? 'foot' : 'car';
  };
  sync();
  if (status) new MutationObserver(sync).observe(status, { childList: true, characterData: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
else mount();
