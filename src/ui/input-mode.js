let listenersAttached = false;
let currentMode = detectInitialMode();
const subscribers = new Set();

function detectInitialMode() {
  if (typeof window === 'undefined') return 'keyboard';
  const coarse = Boolean(window.matchMedia?.('(pointer: coarse)')?.matches);
  const fine = Boolean(window.matchMedia?.('(pointer: fine)')?.matches);
  const hasTouch =
    'ontouchstart' in window ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  if ((coarse || hasTouch) && !fine) {
    return 'touch';
  }
  return 'keyboard';
}

function notify() {
  for (const fn of subscribers) {
    try {
      fn(currentMode);
    } catch {
      // ignora erro em assinante
    }
  }
}

export function setUiInputMode(mode) {
  if (mode !== 'keyboard' && mode !== 'mouse' && mode !== 'touch') return;
  if (currentMode === mode) return;
  currentMode = mode;
  notify();
}

export function getUiInputMode() {
  return currentMode;
}

export function isKeyboardUiMode() {
  return currentMode === 'keyboard';
}

export function ensureUiInputModeListeners() {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;

  window.addEventListener('touchstart', () => setUiInputMode('touch'), { passive: true, capture: true });
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') {
      setUiInputMode('touch');
    } else if (e.pointerType === 'mouse') {
      setUiInputMode('mouse');
    }
  }, { passive: true, capture: true });

  window.addEventListener('keydown', (e) => {
    if ([
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'Enter',
      'Space',
      'Tab',
      'Escape',
    ].includes(e.code)) {
      setUiInputMode('keyboard');
    }
  }, { capture: true });
}

export function onUiInputModeChange(fn) {
  ensureUiInputModeListeners();
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function bindHoverClearsKeyboardFocus(containerEl, onClear) {
  ensureUiInputModeListeners();
  if (!containerEl) return;
  containerEl.addEventListener('pointerover', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const btn = e.target?.closest?.('button');
    if (!btn || btn.disabled) return;
    setUiInputMode('mouse');
    onClear?.(btn);
  });
}
