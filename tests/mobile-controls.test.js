import test from 'node:test';
import assert from 'node:assert/strict';

function createMockElement(tag = 'div') {
  const classes = new Set();
  const listeners = new Map();
  return {
    tagName: tag.toUpperCase(),
    dataset: {},
    style: {},
    textContent: '',
    children: [],
    rect: { left: 0, top: 0, width: 100, height: 100 },
    classList: {
      add(...names) { names.forEach((n) => classes.add(n)); },
      remove(...names) { names.forEach((n) => classes.delete(n)); },
      toggle(name, force) {
        if (force === undefined) {
          if (classes.has(name)) { classes.delete(name); return false; }
          classes.add(name); return true;
        }
        if (force) classes.add(name);
        else classes.delete(name);
        return Boolean(force);
      },
      contains(n) { return classes.has(n); },
    },
    attributes: {},
    setAttribute(k, v) { this.attributes[k] = String(v); },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    dispatchEvent(type, event = {}) {
      const ev = { preventDefault() {}, ...event };
      for (const fn of listeners.get(type) || []) {
        fn(ev);
      }
    },
    click() {
      this.dispatchEvent('click');
    },
    getBoundingClientRect() {
      return this.rect;
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
}

function setupGlobals({ width = 844, height = 390, portrait = false, maxTouchPoints = 5 } = {}) {
  const windowListeners = new Map();
  const elements = new Map();
  let fullscreenEl = null;
  let requestFullscreenCount = 0;
  let exitFullscreenCount = 0;

  const makeEl = (id) => {
    const el = createMockElement('div');
    el.id = id;
    elements.set(id, el);
    return el;
  };

  const shell = makeEl('game-shell');
  shell.requestFullscreen = async () => {
    requestFullscreenCount += 1;
    fullscreenEl = shell;
  };

  const ids = [
    'game-canvas', 'hud-layer', 'start-screen', 'start-button', 'loading-screen',
    'loading-bar', 'loading-text', 'error-screen', 'error-message', 'location-code',
    'vehicle-status', 'objective-hint', 'health-fill', 'health-value',
    'vehicle-health-badge', 'vehicle-health-fill', 'vehicle-health-value',
    'gameover-screen', 'gameover-reason', 'restart-button', 'damage-flash',
    'start-title', 'start-subtitle', 'start-splash', 'mission-complete-screen',
    'mission-complete-title', 'mission-complete-subtitle', 'mission-complete-btn',
    'portrait-warning',
  ];
  for (const id of ids) makeEl(id);
  elements.get('portrait-warning').classList.add('hidden');

  const state = { width, height, portrait };

  globalThis.window = {
    innerWidth: width,
    innerHeight: height,
    ontouchstart: {},
    addEventListener(type, fn) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(fn);
    },
    dispatchEvent(type, event = {}) {
      const ev = { preventDefault() {}, ...event };
      for (const fn of windowListeners.get(type) || []) {
        fn(ev);
      }
    },
    matchMedia(query) {
      if (query === '(orientation: portrait)') {
        return { matches: state.portrait, addEventListener() {} };
      }
      if (query === '(pointer: coarse)') {
        return { matches: maxTouchPoints > 0, addEventListener() {} };
      }
      return { matches: false, addEventListener() {} };
    },
  };

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { maxTouchPoints, getGamepads: () => [] },
  });

  globalThis.document = {
    getElementById: (id) => elements.get(id) || null,
    addEventListener() {},
    get fullscreenElement() { return fullscreenEl; },
    exitFullscreen: async () => {
      exitFullscreenCount += 1;
      fullscreenEl = null;
    },
  };

  return {
    elements,
    state,
    getStats: () => ({
      fullscreenEl,
      requestFullscreenCount,
      exitFullscreenCount,
    }),
  };
}

test('direcional analógico virtual produz vetor contínuo com deadzone, multi-toque com A/B e retorno ao centro', async () => {
  setupGlobals();
  const { InputManager } = await import('../src/input/input-manager.js');

  const touchContainer = createMockElement('div');
  touchContainer.classList.add('hidden');

  const analog = createMockElement('div');
  analog.rect = { left: 20, top: 200, width: 120, height: 120 }; // centro (80, 260), maxRadius = 45.6
  const knob = createMockElement('div');

  const btnAction = createMockElement('button');
  btnAction.dataset.btn = 'action';
  const btnSecondary = createMockElement('button');
  btnSecondary.dataset.btn = 'secondary';

  touchContainer.querySelector = (sel) => {
    if (sel === '#touch-analog') return analog;
    if (sel === '#touch-analog-knob') return knob;
    return null;
  };
  touchContainer.querySelectorAll = (sel) => (sel === '.touch-btn' ? [btnAction, btnSecondary] : []);

  const input = new InputManager(touchContainer);
  assert.equal(touchContainer.classList.contains('hidden'), false);

  // Dentro da deadzone: movimento deve ser zero
  analog.dispatchEvent('pointerdown', { pointerId: 1, clientX: 82, clientY: 260 });
  let snap = input.update(0.016);
  assert.equal(snap.moveX, 0);
  assert.equal(snap.moveY, 0);

  // Arrastando para direita-baixo enquanto pressiona botão A (multi-toque)
  window.dispatchEvent('pointermove', { pointerId: 1, clientX: 120, clientY: 280 });
  btnAction.dispatchEvent('pointerdown', { pointerId: 2 });
  snap = input.update(0.016);
  assert.ok(snap.moveX > 0.6, `esperado moveX > 0.6, recebido ${snap.moveX}`);
  assert.ok(snap.moveY > 0.25, `esperado moveY > 0.25, recebido ${snap.moveY}`);
  assert.equal(snap.actionPressed, true);
  assert.equal(snap.actionJustPressed, true);
  assert.equal(snap.secondaryPressed, false);

  // Pressionando B também
  btnSecondary.dispatchEvent('pointerdown', { pointerId: 3 });
  snap = input.update(0.016);
  assert.equal(snap.secondaryPressed, true);
  assert.equal(snap.secondaryJustPressed, true);

  // Soltando analógico e botões: volta ao centro
  window.dispatchEvent('pointerup', { pointerId: 1 });
  window.dispatchEvent('pointerup', { pointerId: 2 });
  window.dispatchEvent('pointerup', { pointerId: 3 });
  snap = input.update(0.016);
  assert.equal(snap.moveX, 0);
  assert.equal(snap.moveY, 0);
  assert.equal(snap.actionPressed, false);
  assert.equal(snap.secondaryPressed, false);
  assert.equal(knob.style.transform, 'translate(0px, 0px)');
});

test('inicia em fullscreen tanto em modo retrato quanto em paisagem sem bloquear orientação', async () => {
  const env = setupGlobals({ width: 390, height: 844, portrait: true, maxTouchPoints: 5 });
  const { HudController } = await import('../src/ui/hud-controller.js');

  const hud = new HudController();
  let started = false;
  hud.onStartClick(() => {
    started = true;
  });

  // Ao clicar em iniciar no modo retrato, entra em fullscreen normalmente
  env.elements.get('start-button').click();
  assert.equal(started, true);
  assert.equal(env.getStats().requestFullscreenCount, 1);
  assert.ok(env.getStats().fullscreenEl !== null);

  // Ao girar entre retrato e paisagem, não sai do fullscreen
  env.state.portrait = false;
  window.innerWidth = 844;
  window.innerHeight = 390;
  window.dispatchEvent('resize');
  assert.equal(env.getStats().exitFullscreenCount, 0);
  assert.ok(env.getStats().fullscreenEl !== null);
});

test('modo dirigir transforma analógico em volante horizontal e alterna botões de caminhada/direção', async () => {
  setupGlobals();
  const { InputManager } = await import('../src/input/input-manager.js');

  const touchContainer = createMockElement('div');
  touchContainer.classList.add('hidden');

  const analog = createMockElement('div');
  analog.rect = { left: 20, top: 200, width: 120, height: 120 }; // centro x=80, maxRadius=45.6
  const knob = createMockElement('div');
  const wheel = createMockElement('svg');

  const btnAction = createMockElement('button');
  btnAction.dataset.btn = 'action';
  const handIcon = createMockElement('svg');
  const accelIcon = createMockElement('svg');
  accelIcon.classList.add('hidden');

  const btnSecondary = createMockElement('button');
  btnSecondary.dataset.btn = 'secondary';
  btnSecondary.classList.add('hidden');

  const btnExit = createMockElement('button');
  btnExit.dataset.btn = 'exit';
  btnExit.classList.add('hidden');

  touchContainer.querySelector = (sel) => {
    if (sel === '#touch-analog') return analog;
    if (sel === '#touch-analog-knob') return knob;
    if (sel === '#touch-steering-wheel') return wheel;
    if (sel === '[data-btn="action"]') return btnAction;
    if (sel === '[data-btn="secondary"]') return btnSecondary;
    if (sel === '[data-btn="exit"]') return btnExit;
    if (sel === '.touch-icon-hand') return handIcon;
    if (sel === '.touch-icon-accel') return accelIcon;
    return null;
  };
  touchContainer.querySelectorAll = (sel) => (sel === '.touch-btn' ? [btnAction, btnSecondary, btnExit] : []);

  const input = new InputManager(touchContainer);

  // Entra no modo direção
  input.setDrivingMode(true);
  assert.equal(touchContainer.classList.contains('driving-mode'), true);
  assert.equal(btnSecondary.classList.contains('hidden'), false);
  assert.equal(btnExit.classList.contains('hidden'), false);
  assert.equal(handIcon.classList.contains('hidden'), true);
  assert.equal(accelIcon.classList.contains('hidden'), false);

  // Toque inicial no volante ancora no ponto do dedo (sem guinada brusca) e arraste diagonal esterça só na horizontal
  analog.dispatchEvent('pointerdown', { pointerId: 10, clientX: 95, clientY: 250 });
  let snap = input.update(0.016);
  assert.equal(snap.moveX, 0);
  assert.equal(snap.moveY, 0);

  window.dispatchEvent('pointermove', { pointerId: 10, clientX: 140, clientY: 220 });
  snap = input.update(0.016);
  assert.ok(snap.moveX > 0.9, `esperado moveX > 0.9, recebido ${snap.moveX}`);
  assert.equal(snap.moveY, 0);
  assert.ok(wheel.style.transform.includes('rotate('));

  // Botão de sair dispara exitJustPressed
  btnExit.dispatchEvent('pointerdown', { pointerId: 11 });
  snap = input.update(0.016);
  assert.equal(snap.exitJustPressed, true);

  // Volta para caminhada: oculta frear e sair, restaura ícone de mão
  window.dispatchEvent('pointerup', { pointerId: 10 });
  window.dispatchEvent('pointerup', { pointerId: 11 });
  input.setDrivingMode(false);
  assert.equal(touchContainer.classList.contains('driving-mode'), false);
  assert.equal(btnSecondary.classList.contains('hidden'), true);
  assert.equal(btnExit.classList.contains('hidden'), true);
  assert.equal(handIcon.classList.contains('hidden'), false);
  assert.equal(accelIcon.classList.contains('hidden'), true);
  assert.equal(wheel.style.transform, 'rotate(0deg)');
});

test('teclado e joystick controlam caminhada e direção normalmente', async () => {
  setupGlobals({ maxTouchPoints: 0 });
  const { InputManager } = await import('../src/input/input-manager.js');

  let activeGamepad = null;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { maxTouchPoints: 0, getGamepads: () => [activeGamepad] },
  });

  const input = new InputManager(null);

  // Teclado: WASD / Setas + Espaço + Shift
  window.dispatchEvent('keydown', { code: 'KeyD' });
  window.dispatchEvent('keydown', { code: 'KeyW' });
  window.dispatchEvent('keydown', { code: 'Space' });
  let snap = input.update(0.016);
  assert.ok(snap.moveX > 0.7 && snap.moveY < -0.7);
  assert.equal(snap.actionPressed, true);
  assert.equal(snap.actionJustPressed, true);

  // Combo Espaço + Shift no teclado para sair do veículo
  window.dispatchEvent('keydown', { code: 'ShiftLeft' });
  snap = input.update(0.016);
  assert.equal(snap.secondaryPressed, true);
  assert.equal(snap.comboExitJustPressed, true);

  window.dispatchEvent('keyup', { code: 'KeyD' });
  window.dispatchEvent('keyup', { code: 'KeyW' });
  window.dispatchEvent('keyup', { code: 'Space' });
  window.dispatchEvent('keyup', { code: 'ShiftLeft' });

  // Joystick: analógico, gatilhos R2/L2 e botão Y (sair)
  activeGamepad = {
    connected: true,
    axes: [-0.8, 0.5],
    buttons: [
      { pressed: false }, // 0: A
      { pressed: false }, // 1: B
      { pressed: false }, // 2: X
      { pressed: true },  // 3: Y (sair)
      { pressed: false }, // 4
      { pressed: false }, // 5
      { pressed: false }, // 6: L2
      { pressed: true },  // 7: R2 (acelerar)
    ],
  };

  snap = input.update(0.016);
  assert.ok(snap.moveX < -0.7);
  assert.ok(snap.moveY > 0.4);
  assert.equal(snap.actionPressed, true);
  assert.equal(snap.exitJustPressed, true);
});

test('input-mode oculta destaque no toque, limpa seleção padrão ao passar o mouse e reativa no teclado', async () => {
  setupGlobals({ maxTouchPoints: 0 });
  const {
    getUiInputMode,
    isKeyboardUiMode,
    setUiInputMode,
    onUiInputModeChange,
  } = await import('../src/ui/input-mode.js');

  setUiInputMode('keyboard');
  const seen = [];
  const unsubscribe = onUiInputModeChange((mode) => seen.push(mode));
  assert.equal(getUiInputMode(), 'keyboard');
  assert.equal(isKeyboardUiMode(), true);

  setUiInputMode('mouse');
  assert.equal(getUiInputMode(), 'mouse');
  assert.equal(isKeyboardUiMode(), false);

  setUiInputMode('touch');
  assert.equal(getUiInputMode(), 'touch');
  assert.equal(isKeyboardUiMode(), false);

  setUiInputMode('keyboard');
  assert.equal(isKeyboardUiMode(), true);
  assert.deepEqual(seen, ['mouse', 'touch', 'keyboard']);
  unsubscribe();
});
