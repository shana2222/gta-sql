import {
  bindHoverClearsKeyboardFocus,
  isKeyboardUiMode,
  onUiInputModeChange,
  setUiInputMode,
} from './input-mode.js?v=1';

const DEFAULT_HINT =
  'Desplazate con el mouse, el dedo o las flechas. Si el sitio no carga acá, usá "Abrir en el navegador externo".';

export class WebModalController {
  constructor() {
    this.screen = document.getElementById('web-modal-screen');
    this.stageEl = this.screen?.querySelector('.web-modal-stage') || null;
    this.titleEl = document.getElementById('web-modal-title');
    this.urlEl = document.getElementById('web-modal-url');
    this.iframe = document.getElementById('web-modal-iframe');
    this.loadingEl = document.getElementById('web-modal-loading');
    this.externalBtn = document.getElementById('web-modal-external-btn');
    this.closeBtn = document.getElementById('web-modal-close-btn');
    this.hintEl = document.getElementById('web-modal-hint');
    this.actionsEl = this.screen?.querySelector('.web-modal-actions') || null;

    this.active = false;
    this.url = '';
    this.onClose = null;
    this.loadTimer = null;
    this.selectedButtonIndex = 1;
    this.prevAction = false;
    this.prevSecondary = false;
    this.prevLeft = false;
    this.prevRight = false;

    this.externalBtn?.addEventListener('click', () => this.openExternal());
    this.closeBtn?.addEventListener('click', () => this.close());
    this.iframe?.addEventListener('load', () => {
      if (!this.active) return;
      clearTimeout(this.loadTimer);
      this.loadingEl?.classList.add('hidden');
    });
    bindHoverClearsKeyboardFocus(this.actionsEl, () => this.#syncButtonSelection());
    onUiInputModeChange(() => {
      if (this.active) this.#syncButtonSelection();
    });

    this.handleResize = () => {
      if (this.active) this.#updateIframeScale();
    };

    this.handleKeyDown = (event) => {
      if (!this.active) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setUiInputMode('keyboard');
        this.selectedButtonIndex = 0;
        this.#syncButtonSelection();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setUiInputMode('keyboard');
        this.selectedButtonIndex = 1;
        this.#syncButtonSelection();
        return;
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'PageUp' || event.key === 'PageDown') {
        const delta =
          event.key === 'ArrowUp'
            ? -80
            : event.key === 'ArrowDown'
              ? 80
              : event.key === 'PageUp'
                ? -320
                : 320;
        this.#tryScrollSameOrigin(delta);
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        const activeEl = document.activeElement;
        if (activeEl === this.externalBtn || activeEl === this.closeBtn) return;
        event.preventDefault();
        if (this.selectedButtonIndex === 0) {
          this.openExternal();
        } else {
          this.close();
        }
      }
    };
  }

  #updateIframeScale() {
    if (!this.iframe || !this.stageEl) return;
    const stageWidth = this.stageEl.clientWidth;
    if (!stageWidth) return;
    const targetVirtualWidth = 1120;
    const scale = Math.min(0.8, Math.max(0.45, stageWidth / targetVirtualWidth));
    const sizePct = `${(100 / scale).toFixed(4)}%`;
    this.iframe.style.width = sizePct;
    this.iframe.style.height = sizePct;
    this.iframe.style.transform = `scale(${scale.toFixed(4)})`;
  }

  #getButtons() {
    return [this.externalBtn, this.closeBtn].filter(Boolean);
  }

  #syncButtonSelection() {
    const showFocus = isKeyboardUiMode();
    this.#getButtons().forEach((btn, idx) => {
      btn.classList.toggle('selected', showFocus && idx === this.selectedButtonIndex);
    });
  }

  #tryScrollSameOrigin(deltaY) {
    try {
      this.iframe?.contentWindow?.scrollBy?.(0, deltaY);
    } catch {
      // Cross-origin iframe: rolagem nativa é tratada pelo navegador dentro do iframe.
    }
  }

  open(url, label = 'SITIO EXTERNO', options = {}) {
    if (!this.screen || !this.iframe) return;
    let parsed;
    try {
      parsed = new URL(String(url || '').trim());
    } catch {
      return;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;

    this.active = true;
    this.url = parsed.href;
    this.onClose = typeof options.onClose === 'function' ? options.onClose : null;
    this.selectedButtonIndex = 1;
    this.prevAction = true;
    this.prevSecondary = true;
    this.prevLeft = false;
    this.prevRight = false;

    if (this.titleEl) this.titleEl.textContent = label || 'SITIO EXTERNO';
    if (this.urlEl) this.urlEl.textContent = this.url;
    if (this.hintEl) this.hintEl.textContent = DEFAULT_HINT;
    if (this.loadingEl) {
      this.loadingEl.textContent = 'Cargando sitio...';
      this.loadingEl.classList.remove('hidden');
    }
    clearTimeout(this.loadTimer);
    this.loadTimer = setTimeout(() => {
      if (!this.active || !this.loadingEl) return;
      this.loadingEl.textContent =
        'El sitio está tardando en responder o bloqueó la vista interna. Podés esperar o hacer clic en "Abrir en el navegador externo".';
    }, 6000);
    this.iframe.src = this.url;
    this.screen.classList.remove('hidden');
    this.#syncButtonSelection();

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('resize', this.handleResize);
    requestAnimationFrame(() => {
      this.#updateIframeScale();
      try {
        this.iframe?.focus();
      } catch {
        // Ignora caso o navegador restrinja foco automático em iframe.
      }
    });
  }

  openExternal() {
    if (!this.url) return;
    if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
      Promise.resolve(document.exitFullscreen()).catch(() => {});
    }
    const popup = window.open(this.url, '_blank', 'noopener,noreferrer');
    if (!popup && this.hintEl) {
      this.hintEl.textContent =
        'El navegador bloqueó la nueva ventana. Permití las ventanas emergentes para este sitio y probá de nuevo.';
    }
  }

  updateInput(inputState) {
    if (!this.active || !inputState) return;
    const left = Boolean(inputState.moveX < -0.5);
    const right = Boolean(inputState.moveX > 0.5);
    const action = Boolean(inputState.actionPressed ?? inputState.action);
    const secondary = Boolean(inputState.secondaryPressed ?? inputState.secondary);

    if (left && !this.prevLeft) {
      setUiInputMode('keyboard');
      this.selectedButtonIndex = 0;
      this.#syncButtonSelection();
    }
    if (right && !this.prevRight) {
      setUiInputMode('keyboard');
      this.selectedButtonIndex = 1;
      this.#syncButtonSelection();
    }
    if (Math.abs(inputState.moveY || 0) > 0.25) {
      this.#tryScrollSameOrigin(inputState.moveY * 18);
    }
    if (action && !this.prevAction) {
      if (this.selectedButtonIndex === 0) {
        this.openExternal();
      } else {
        this.close();
      }
    } else if (secondary && !this.prevSecondary) {
      this.close();
    }

    this.prevLeft = left;
    this.prevRight = right;
    this.prevAction = action;
    this.prevSecondary = secondary;
  }

  close() {
    if (!this.active) return;
    this.active = false;
    clearTimeout(this.loadTimer);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('resize', this.handleResize);
    if (this.iframe) {
      this.iframe.src = 'about:blank';
      this.iframe.style.width = '';
      this.iframe.style.height = '';
      this.iframe.style.transform = '';
    }
    this.loadingEl?.classList.add('hidden');
    this.screen?.classList.add('hidden');
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
  }
}
