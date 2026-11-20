import {
  bindHoverClearsKeyboardFocus,
  isKeyboardUiMode,
  onUiInputModeChange,
  setUiInputMode,
} from './input-mode.js?v=1';

export class ConfirmDialogController {
  constructor() {
    this.screen = document.getElementById('confirm-screen');
    this.titleEl = document.getElementById('confirm-title');
    this.messageEl = document.getElementById('confirm-message');
    this.cancelBtn = document.getElementById('confirm-cancel-btn');
    this.acceptBtn = document.getElementById('confirm-accept-btn');

    this.isOpen = false;
    this.selectedIndex = 0;
    this.onConfirmCallback = null;
    this.onCancelCallback = null;
    this.prevPrev = false;
    this.prevNext = false;

    this.cancelBtn?.addEventListener('click', () => this.close(false));
    this.acceptBtn?.addEventListener('click', () => this.close(true));
    this.screen?.addEventListener('click', (e) => {
      if (e.target === this.screen) {
        this.close(false);
      }
    });

    this.#onKeyDown = (e) => {
      if (!this.isOpen) return;
      if (
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowUp' ||
        e.code === 'KeyA' ||
        e.code === 'KeyW'
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.moveSelection(-1);
      } else if (
        e.code === 'ArrowRight' ||
        e.code === 'ArrowDown' ||
        e.code === 'KeyD' ||
        e.code === 'KeyS'
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.moveSelection(1);
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.activateSelection();
      } else if (e.code === 'Escape' || e.code === 'Backspace') {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.close(false);
      }
    };
    window.addEventListener('keydown', this.#onKeyDown, true);
    bindHoverClearsKeyboardFocus(this.screen, () => this.highlightSelection());
    onUiInputModeChange(() => {
      if (this.isOpen) this.highlightSelection();
    });
  }

  #onKeyDown = null;

  getButtons() {
    return [this.cancelBtn, this.acceptBtn].filter(Boolean);
  }

  highlightSelection() {
    const buttons = this.getButtons();
    buttons.forEach((btn) => btn.classList.remove('menu-selected'));
    if (!isKeyboardUiMode() || buttons.length === 0) return;
    this.selectedIndex = Math.max(0, Math.min(this.selectedIndex, buttons.length - 1));
    buttons[this.selectedIndex].classList.add('menu-selected');
  }

  moveSelection(delta) {
    setUiInputMode('keyboard');
    const buttons = this.getButtons();
    if (buttons.length === 0) return;
    this.selectedIndex = (this.selectedIndex + delta + buttons.length) % buttons.length;
    this.highlightSelection();
  }

  activateSelection() {
    const buttons = this.getButtons();
    buttons[this.selectedIndex]?.click();
  }

  open({
    title = 'CONFIRMAR',
    message = '¿Seguro que querés continuar?',
    cancelLabel = 'Cancelar',
    confirmLabel = 'Confirmar',
    onConfirm = null,
    onCancel = null,
  } = {}) {
    if (!this.screen) {
      onConfirm?.();
      return;
    }
    if (this.titleEl) this.titleEl.textContent = title;
    if (this.messageEl) this.messageEl.textContent = message;
    if (this.cancelBtn) this.cancelBtn.textContent = cancelLabel;
    if (this.acceptBtn) this.acceptBtn.textContent = confirmLabel;

    this.onConfirmCallback = onConfirm;
    this.onCancelCallback = onCancel;
    this.isOpen = true;
    this.selectedIndex = 0;
    this.prevPrev = true;
    this.prevNext = true;
    this.screen.classList.remove('hidden');
    this.highlightSelection();
  }

  close(confirmed = false) {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.screen?.classList.add('hidden');
    this.getButtons().forEach((btn) => btn.classList.remove('menu-selected'));
    const onConfirm = this.onConfirmCallback;
    const onCancel = this.onCancelCallback;
    this.onConfirmCallback = null;
    this.onCancelCallback = null;
    if (confirmed) {
      onConfirm?.();
    } else {
      onCancel?.();
    }
  }

  updateInput(input) {
    if (!this.isOpen || !input) return;
    const prev = Boolean(input.moveX < -0.5 || input.moveY < -0.5);
    const next = Boolean(input.moveX > 0.5 || input.moveY > 0.5);

    if (prev && !this.prevPrev) {
      this.moveSelection(-1);
    }
    if (next && !this.prevNext) {
      this.moveSelection(1);
    }

    if (input.actionJustPressed) {
      this.activateSelection();
    } else if (input.secondaryJustPressed) {
      this.close(false);
    }

    this.prevPrev = prev;
    this.prevNext = next;
  }
}
