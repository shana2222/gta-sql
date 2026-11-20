import {
  bindHoverClearsKeyboardFocus,
  isKeyboardUiMode,
  onUiInputModeChange,
} from './input-mode.js?v=1';

export class AssetsRefreshDialogController {
  constructor() {
    this.screen = document.getElementById('assets-refresh-screen');
    this.barEl = document.getElementById('assets-refresh-bar');
    this.textEl = document.getElementById('assets-refresh-text');
    this.percentEl = document.getElementById('assets-refresh-percent');
    this.actionBtn = document.getElementById('assets-refresh-action-btn');

    this.isOpen = false;
    this.inProgress = false;
    this.abortController = null;

    this.actionBtn?.addEventListener('click', () => {
      if (this.inProgress) {
        this.cancel();
      } else {
        this.close();
      }
    });

    this.#onKeyDown = (e) => {
      if (!this.isOpen) return;
      if (e.code === 'Escape' || e.code === 'Backspace' || e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (this.inProgress) {
          this.cancel();
        } else {
          this.close();
        }
      }
    };
    window.addEventListener('keydown', this.#onKeyDown, true);
    bindHoverClearsKeyboardFocus(this.screen, () => this.#syncActionBtnHighlight());
    onUiInputModeChange(() => {
      if (this.isOpen) this.#syncActionBtnHighlight();
    });
  }

  #onKeyDown = null;

  #syncActionBtnHighlight() {
    if (!this.actionBtn) return;
    this.actionBtn.classList.toggle('menu-selected', isKeyboardUiMode());
  }

  open() {
    this.abortController?.abort();
    this.abortController = new AbortController();
    this.isOpen = true;
    this.inProgress = true;
    this.setProgress(0, 'Iniciando actualización de los recursos...');
    if (this.actionBtn) {
      this.actionBtn.textContent = 'Cancelar';
      this.actionBtn.className = 'secondary-button';
      this.#syncActionBtnHighlight();
    }
    this.screen?.classList.remove('hidden');
    return this.abortController.signal;
  }

  setProgress(percent, text) {
    const clamped = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
    if (this.barEl) this.barEl.style.width = `${clamped}%`;
    if (this.percentEl) this.percentEl.textContent = `${clamped}%`;
    if (this.textEl && text) this.textEl.textContent = text;
  }

  finish(text = '¡Recursos recargados y guardados en el navegador!') {
    this.inProgress = false;
    this.setProgress(100, text);
    if (this.actionBtn) {
      this.actionBtn.textContent = 'Cerrar';
      this.actionBtn.className = 'primary-button';
      this.#syncActionBtnHighlight();
    }
  }

  fail(text = 'No se pudieron recargar todos los recursos.') {
    this.inProgress = false;
    if (this.textEl) this.textEl.textContent = text;
    if (this.actionBtn) {
      this.actionBtn.textContent = 'Cerrar';
      this.actionBtn.className = 'secondary-button';
      this.#syncActionBtnHighlight();
    }
  }

  cancel() {
    if (!this.isOpen) return;
    this.inProgress = false;
    this.abortController?.abort();
    this.close();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.inProgress = false;
    this.abortController = null;
    this.screen?.classList.add('hidden');
  }

  updateInput(input) {
    if (!this.isOpen || !input) return;
    if (input.actionJustPressed || input.secondaryJustPressed) {
      if (this.inProgress) {
        this.cancel();
      } else {
        this.close();
      }
    }
  }
}
