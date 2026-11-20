export const INVENTORY_COLUMNS = 5;
export const INVENTORY_ROWS = 2;
export const INVENTORY_PAGE_SIZE = INVENTORY_COLUMNS * INVENTORY_ROWS;
export const INVENTORY_CAPACITY = INVENTORY_PAGE_SIZE;

export class Inventory {
  constructor(pageSize = INVENTORY_PAGE_SIZE) {
    this.pageSize = Math.max(1, Math.floor(pageSize));
    this.slots = new Array(this.pageSize).fill(null);
  }

  get capacity() {
    return this.slots.length;
  }

  getPageCount() {
    return Math.max(1, Math.ceil(this.slots.length / this.pageSize));
  }

  getPageSlots(pageIndex = 0) {
    const totalPages = this.getPageCount();
    const clampedPage = Math.max(0, Math.min(totalPages - 1, Math.floor(pageIndex) || 0));
    const start = clampedPage * this.pageSize;
    return this.slots
      .slice(start, start + this.pageSize)
      .map((item) => (item ? { ...item } : null));
  }

  getCount() {
    let count = 0;
    for (const slot of this.slots) {
      if (slot) count += 1;
    }
    return count;
  }

  isFull() {
    return false;
  }

  getSlots() {
    return this.slots.map((item) => (item ? { ...item } : null));
  }

  getItemAt(index) {
    if (index < 0 || index >= this.slots.length) return null;
    const item = this.slots[index];
    return item ? { ...item } : null;
  }

  hasItem(itemId) {
    if (!itemId) return false;
    return this.slots.some((slot) => slot?.id === itemId);
  }

  findSlotIndex(itemId) {
    if (!itemId) return -1;
    return this.slots.findIndex((slot) => slot?.id === itemId);
  }

  #compactSlots() {
    const items = this.slots.filter(Boolean);
    const totalPages = Math.max(1, Math.ceil(items.length / this.pageSize));
    const targetLength = totalPages * this.pageSize;
    this.slots = new Array(targetLength).fill(null);
    for (let i = 0; i < items.length; i += 1) {
      this.slots[i] = items[i];
    }
  }

  addItem(itemDef) {
    if (!itemDef || !itemDef.id) {
      return { ok: false, reason: 'invalid_item', slotIndex: -1, pageIndex: 0 };
    }
    let freeIndex = this.slots.findIndex((slot) => slot === null);
    if (freeIndex === -1) {
      freeIndex = this.slots.length;
      for (let i = 0; i < this.pageSize; i += 1) {
        this.slots.push(null);
      }
    }
    this.slots[freeIndex] = {
      id: String(itemDef.id),
      name: String(itemDef.name || itemDef.id),
      description: String(itemDef.description || ''),
      imageUrl: String(itemDef.imageUrl || ''),
      category: String(itemDef.category || 'missao'),
      rarity: String(itemDef.rarity || ''),
    };
    return {
      ok: true,
      reason: 'added',
      slotIndex: freeIndex,
      pageIndex: Math.floor(freeIndex / this.pageSize),
    };
  }

  removeItem(itemId) {
    const index = this.findSlotIndex(itemId);
    if (index === -1) {
      return { ok: false, item: null, slotIndex: -1 };
    }
    const removed = this.slots[index];
    this.slots[index] = null;
    this.#compactSlots();
    return { ok: true, item: removed, slotIndex: index };
  }

  removeItemAt(index) {
    if (index < 0 || index >= this.slots.length || !this.slots[index]) {
      return { ok: false, item: null, slotIndex: -1 };
    }
    const removed = this.slots[index];
    this.slots[index] = null;
    this.#compactSlots();
    return { ok: true, item: removed, slotIndex: index };
  }

  clear() {
    this.slots = new Array(this.pageSize).fill(null);
  }

  restorePreservingExtras(checkpointSlots = []) {
    const extras = this.slots.filter((item) => item && item.category === 'extra');
    this.clear();
    if (Array.isArray(checkpointSlots)) {
      for (const item of checkpointSlots) {
        if (item && !this.hasItem(item.id)) {
          this.addItem(item);
        }
      }
    }
    for (const extra of extras) {
      if (!this.hasItem(extra.id)) {
        this.addItem(extra);
      }
    }
  }
}
