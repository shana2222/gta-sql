import { INVENTORY_PAGE_SIZE, INVENTORY_COLUMNS } from '../core/inventory.js?v=20';
import { destroySpeechBubble, spawnTypewriterSpeechBubble } from './speech-bubble.js?v=1';

export class InventoryController {
  constructor() {
    this.screen = document.getElementById('inventory-screen');
    this.titleEl = document.getElementById('inventory-title');
    this.subtitleEl = document.getElementById('inventory-subtitle');
    this.countEl = document.getElementById('inventory-count');
    this.gridEl = document.getElementById('inventory-grid');
    this.prevPageBtn = document.getElementById('inventory-prev-page');
    this.nextPageBtn = document.getElementById('inventory-next-page');
    this.pageLabelEl = document.getElementById('inventory-page-label');
    this.detailNameEl = document.getElementById('inventory-detail-name');
    this.detailDescEl = document.getElementById('inventory-detail-desc');
    this.feedbackEl = document.getElementById('inventory-feedback');
    this.deliverBtn = document.getElementById('inventory-deliver-btn');
    this.closeBtn = document.getElementById('inventory-close-btn');
    this.speechLayer = document.getElementById('inventory-speech-layer');
    this.activeSpeechBubble = null;

    this.isOpen = false;
    this.mode = 'browse';
    this.inventory = null;
    this.currentPage = 0;
    this.selectedIndex = 0;
    this.expectedItemId = '';
    this.wrongItemMessage = '';
    this.wrongItemMessages = [];
    this.lastWrongItemMessage = '';
    this.onDeliver = null;
    this.onClose = null;

    this.prevLeft = false;
    this.prevRight = false;
    this.prevUp = false;
    this.prevDown = false;
    this.prevPageInput = false;
    this.nextPageInput = false;
    this.prevAction = false;
    this.prevSecondary = false;

    this.prevPageBtn?.addEventListener('click', () => this.prevPage());
    this.nextPageBtn?.addEventListener('click', () => this.nextPage());
    this.deliverBtn?.addEventListener('click', () => this.confirmDelivery());
    this.closeBtn?.addEventListener('click', () => this.close());
  }

  openBrowse(inventory, onClose = null) {
    this.inventory = inventory;
    this.mode = 'browse';
    this.expectedItemId = '';
    this.wrongItemMessage = '';
    this.wrongItemMessages = [];
    this.lastWrongItemMessage = '';
    this.onDeliver = null;
    this.onClose = onClose;

    this.titleEl.textContent = 'INVENTARIO';
    this.subtitleEl.textContent = 'Elegí un objeto para ver los detalles.';
    this.deliverBtn.classList.add('hidden');
    this.closeBtn.textContent = 'Cerrar';
    this.#hideFeedback();
    this.#selectInitialSlot();
    this.#openScreen();
  }

  openDelivery(inventory, options = {}) {
    const {
      prompt = 'Elegí el objeto correcto para entregar:',
      expectedItemId = '',
      wrongItemMessage = '¡Ese no es el objeto que busco!',
      wrongItemMessages = [],
      onDeliver = null,
      onCancel = null,
    } = options;

    this.inventory = inventory;
    this.mode = 'delivery';
    this.expectedItemId = expectedItemId;
    this.wrongItemMessage = wrongItemMessage;
    this.wrongItemMessages = Array.isArray(wrongItemMessages) ? wrongItemMessages : [];
    this.lastWrongItemMessage = '';
    this.onDeliver = onDeliver;
    this.onClose = onCancel;

    this.titleEl.textContent = 'ENTREGAR OBJETO';
    this.subtitleEl.textContent = prompt;
    this.deliverBtn.classList.remove('hidden');
    this.closeBtn.textContent = 'Volver';
    this.#hideFeedback();
    this.#selectInitialSlot();
    this.#openScreen();
  }

  #getPageSize() {
    return this.inventory?.pageSize || INVENTORY_PAGE_SIZE;
  }

  #getTotalPages() {
    return this.inventory?.getPageCount?.() || 1;
  }

  #openScreen() {
    this.isOpen = true;
    this.prevAction = true;
    this.prevSecondary = true;
    this.prevLeft = false;
    this.prevRight = false;
    this.prevUp = false;
    this.prevDown = false;
    this.prevPageInput = false;
    this.nextPageInput = false;
    this.render();
    this.screen.classList.remove('hidden');
  }

  #selectInitialSlot() {
    const slots = this.inventory?.getSlots() || [];
    const firstOccupied = slots.findIndex(Boolean);
    this.selectedIndex = firstOccupied >= 0 ? firstOccupied : 0;
    this.currentPage = Math.floor(this.selectedIndex / this.#getPageSize());
  }

  #showFeedback(message) {
    if (!this.feedbackEl) return;
    this.feedbackEl.textContent = message;
    this.feedbackEl.classList.remove('hidden');
  }

  #hideFeedback() {
    if (!this.feedbackEl) return;
    this.feedbackEl.textContent = '';
    this.feedbackEl.classList.add('hidden');
  }

  #clearSpeechBubble() {
    if (!this.activeSpeechBubble) return;
    destroySpeechBubble(this.activeSpeechBubble);
    this.activeSpeechBubble = null;
  }

  #pickWrongItemMessage() {
    const validLines = this.wrongItemMessages.filter((msg) => {
      const s = String(msg || '').trim();
      return s.length > 0 && s.length <= 60;
    });
    const missionMsg = String(this.wrongItemMessage || '').trim();
    const pool = [...validLines];
    if (missionMsg && missionMsg.length <= 60 && !pool.includes(missionMsg)) {
      pool.push(missionMsg);
    }
    if (pool.length === 0) {
      return '¡Ese no es el objeto que busco!';
    }
    const candidates = pool.length > 1
      ? pool.filter((m) => m !== this.lastWrongItemMessage)
      : pool;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    this.lastWrongItemMessage = chosen;
    return chosen;
  }

  #showSlotSpeechBubble(slotIndex, message) {
    this.#clearSpeechBubble();
    const normalizedText = String(message || '').trim();
    if (!normalizedText || normalizedText.length > 60) return;
    const pageSize = this.#getPageSize();
    const localIdx = slotIndex - this.currentPage * pageSize;
    const slotBtn = this.gridEl?.children?.[localIdx];
    const rect = slotBtn?.getBoundingClientRect?.();
    if (!this.speechLayer || !rect || rect.width <= 0) {
      this.#showFeedback(message);
      return;
    }

    this.activeSpeechBubble = spawnTypewriterSpeechBubble({
      layer: this.speechLayer,
      text: normalizedText,
      x: rect.left + rect.width * 0.5,
      y: rect.top,
      holdMs: 5000,
      onRemove: (removed) => {
        if (this.activeSpeechBubble === removed) {
          this.activeSpeechBubble = null;
        }
      },
    });
  }

  goToPage(pageIndex) {
    if (!this.inventory) return;
    const totalPages = this.#getTotalPages();
    const targetPage = Math.max(0, Math.min(totalPages - 1, Math.floor(pageIndex) || 0));
    if (targetPage === this.currentPage) return;

    const pageSize = this.#getPageSize();
    const localOffset = ((this.selectedIndex % pageSize) + pageSize) % pageSize;
    this.currentPage = targetPage;
    this.selectedIndex = targetPage * pageSize + localOffset;
    this.#clearSpeechBubble();
    this.#hideFeedback();
    this.render();
  }

  prevPage() {
    this.goToPage(this.currentPage - 1);
  }

  nextPage() {
    this.goToPage(this.currentPage + 1);
  }

  selectSlot(index) {
    const cap = this.inventory?.capacity || INVENTORY_PAGE_SIZE;
    this.selectedIndex = Math.max(0, Math.min(cap - 1, index));
    this.currentPage = Math.floor(this.selectedIndex / this.#getPageSize());
    this.#hideFeedback();
    this.render();
  }

  confirmDelivery() {
    if (!this.isOpen || this.mode !== 'delivery' || !this.inventory) return;
    const item = this.inventory.getItemAt(this.selectedIndex);
    if (!item) {
      this.#showFeedback('Elegí un espacio con un objeto para entregar.');
      return;
    }
    if (this.expectedItemId && item.id !== this.expectedItemId) {
      this.#hideFeedback();
      this.#showSlotSpeechBubble(this.selectedIndex, this.#pickWrongItemMessage());
      return;
    }

    this.#clearSpeechBubble();
    const removed = this.inventory.removeItemAt(this.selectedIndex);
    const deliverCb = this.onDeliver;
    this.isOpen = false;
    this.onDeliver = null;
    this.onClose = null;
    this.screen.classList.add('hidden');
    deliverCb?.(removed.item || item);
  }

  close() {
    if (!this.isOpen) return;
    this.#clearSpeechBubble();
    this.isOpen = false;
    this.screen.classList.add('hidden');
    const cb = this.onClose;
    this.onClose = null;
    this.onDeliver = null;
    cb?.();
  }

  render() {
    if (!this.gridEl || !this.inventory) return;
    const pageSize = this.#getPageSize();
    const totalPages = this.#getTotalPages();
    this.currentPage = Math.max(0, Math.min(totalPages - 1, this.currentPage));
    const pageStart = this.currentPage * pageSize;
    const pageSlots = this.inventory.getPageSlots(this.currentPage);
    const count = this.inventory.getCount();
    this.countEl.textContent = `${count} / ${this.inventory.capacity}`;

    if (this.pageLabelEl) {
      this.pageLabelEl.textContent = `Página ${this.currentPage + 1} / ${totalPages}`;
    }
    if (this.prevPageBtn) {
      this.prevPageBtn.disabled = this.currentPage <= 0;
    }
    if (this.nextPageBtn) {
      this.nextPageBtn.disabled = this.currentPage >= totalPages - 1;
    }

    this.gridEl.replaceChildren();
    pageSlots.forEach((item, localIdx) => {
      const globalIdx = pageStart + localIdx;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'inventory-slot';
      if (item) {
        btn.classList.add('occupied');
        if (item.category === 'extra' && item.rarity) {
          btn.classList.add(`rarity-${item.rarity}`);
        } else if (item.category !== 'extra') {
          btn.classList.add('category-missao');
        }
      }
      if (globalIdx === this.selectedIndex) btn.classList.add('selected');
      btn.setAttribute('role', 'gridcell');
      btn.setAttribute('aria-label', item ? item.name : `Espacio ${globalIdx + 1} vacío`);

      if (item) {
        if (item.imageUrl) {
          const img = document.createElement('img');
          img.className = 'inventory-slot-img';
          img.src = item.imageUrl;
          img.alt = item.name;
          btn.appendChild(img);
        }
      } else {
        const emptyMark = document.createElement('span');
        emptyMark.className = 'inventory-slot-empty';
        emptyMark.textContent = String(globalIdx + 1);
        btn.appendChild(emptyMark);
      }

      btn.addEventListener('click', () => {
        if (this.mode === 'delivery' && globalIdx === this.selectedIndex && item) {
          this.confirmDelivery();
        } else {
          this.selectSlot(globalIdx);
        }
      });

      this.gridEl.appendChild(btn);
    });

    const RARITY_LABELS = {
      normal: 'Normal',
      especial: 'Especial',
      lendario: 'Legendario',
    };
    const selected = this.inventory.getItemAt(this.selectedIndex);
    if (selected) {
      this.detailNameEl.replaceChildren();
      const titleSpan = document.createElement('span');
      titleSpan.textContent = selected.name;
      this.detailNameEl.appendChild(titleSpan);
      if (selected.category === 'extra' && selected.rarity && RARITY_LABELS[selected.rarity]) {
        const raritySpan = document.createElement('span');
        raritySpan.className = `inventory-detail-rarity rarity-${selected.rarity}`;
        raritySpan.textContent = RARITY_LABELS[selected.rarity];
        this.detailNameEl.appendChild(raritySpan);
      } else if (selected.category !== 'extra') {
        const missionSpan = document.createElement('span');
        missionSpan.className = 'inventory-detail-rarity category-missao';
        missionSpan.textContent = 'Misión';
        this.detailNameEl.appendChild(missionSpan);
      }
      this.detailDescEl.textContent = selected.description || 'Objeto de misión.';
    } else {
      this.detailNameEl.textContent = 'Espacio vacío';
      this.detailDescEl.textContent = 'No hay ningún objeto guardado en este espacio.';
    }
    if (this.detailDescEl) {
      this.detailDescEl.scrollTop = 0;
    }
  }

  updateInput(inputState) {
    if (!this.isOpen || !this.inventory) return;
    const left = Boolean(inputState.moveX < -0.5);
    const right = Boolean(inputState.moveX > 0.5);
    const up = Boolean(inputState.moveY < -0.5);
    const down = Boolean(inputState.moveY > 0.5);
    const prevPage = Boolean(inputState.prevPagePressed);
    const nextPage = Boolean(inputState.nextPagePressed);
    const action = Boolean(inputState.actionPressed ?? inputState.action);
    const secondary = Boolean(inputState.secondary);

    const pageSize = this.#getPageSize();
    const totalPages = this.#getTotalPages();
    const pageStart = this.currentPage * pageSize;
    const localIdx = ((this.selectedIndex - pageStart) % pageSize + pageSize) % pageSize;
    const localCol = localIdx % INVENTORY_COLUMNS;
    const localRow = Math.floor(localIdx / INVENTORY_COLUMNS);

    if (prevPage && !this.prevPageInput) {
      this.prevPage();
    } else if (nextPage && !this.nextPageInput) {
      this.nextPage();
    } else if (left && !this.prevLeft) {
      if (localCol === 0 && this.currentPage > 0) {
        const targetPage = this.currentPage - 1;
        this.selectSlot(targetPage * pageSize + localRow * INVENTORY_COLUMNS + (INVENTORY_COLUMNS - 1));
      } else {
        this.selectSlot(pageStart + ((localIdx - 1 + pageSize) % pageSize));
      }
    } else if (right && !this.prevRight) {
      if (localCol === INVENTORY_COLUMNS - 1 && this.currentPage < totalPages - 1) {
        const targetPage = this.currentPage + 1;
        this.selectSlot(targetPage * pageSize + localRow * INVENTORY_COLUMNS);
      } else {
        this.selectSlot(pageStart + ((localIdx + 1) % pageSize));
      }
    } else if (up && !this.prevUp) {
      this.selectSlot(pageStart + ((localIdx - INVENTORY_COLUMNS + pageSize) % pageSize));
    } else if (down && !this.prevDown) {
      this.selectSlot(pageStart + ((localIdx + INVENTORY_COLUMNS) % pageSize));
    }

    if (action && !this.prevAction) {
      if (this.mode === 'delivery') {
        this.confirmDelivery();
      } else {
        this.close();
      }
    } else if (secondary && !this.prevSecondary) {
      this.close();
    }

    this.prevLeft = left;
    this.prevRight = right;
    this.prevUp = up;
    this.prevDown = down;
    this.prevPageInput = prevPage;
    this.nextPageInput = nextPage;
    this.prevAction = action;
    this.prevSecondary = secondary;
  }
}
