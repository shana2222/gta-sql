import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAVE_STORAGE_KEY,
  createSaveSnapshot,
  saveGameState,
  loadGameState,
  clearGameState,
  formatContinueLabel,
} from '../src/core/save-state.js';

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

test('salva, carrega e limpa estado do jogo e inventário com escopo por história', () => {
  const storage = createMemoryStorage();
  const snapshot = createSaveSnapshot({
    storyKey: 'Missão Vibe Coding',
    currentMissionIndex: 2,
    freeRoamMode: false,
    itemPickedUp: true,
    inventorySlots: [
      { id: 'caixa-secreta', name: 'Caixa', description: 'Desc', imageUrl: './story/items/caixa.png', category: 'missao', rarity: '' },
      { id: 'mouse-ouro', name: 'Mouse', description: 'Raro', imageUrl: './story/items/mouse.png', category: 'extra', rarity: 'raro' },
      null,
    ],
    collectedExtraIds: ['mouse-ouro'],
    completedNpcPoints: [{ x: 100, y: 200 }],
    player: { x: 450, y: 820, angle: 1.5, health: 87 },
  });

  assert.equal(saveGameState(snapshot, storage), true);
  assert.ok(storage.getItem(SAVE_STORAGE_KEY));

  const loaded = loadGameState('Missão Vibe Coding', storage);
  assert.ok(loaded);
  assert.equal(loaded.currentMissionIndex, 2);
  assert.equal(loaded.itemPickedUp, true);
  assert.equal(loaded.inventorySlots[1].rarity, 'raro');
  assert.deepEqual(loaded.collectedExtraIds, ['mouse-ouro']);
  assert.equal(loaded.player.x, 450);
  assert.equal(loaded.player.health, 87);

  assert.equal(loadGameState('Outra História', storage), null);
  assert.equal(clearGameState(storage), true);
  assert.equal(loadGameState('Missão Vibe Coding', storage), null);
});

test('formatContinueLabel exibe missão atual ou modo livre', () => {
  assert.equal(formatContinueLabel(null), 'Entrar a la ciudad');
  assert.equal(formatContinueLabel({ currentMissionIndex: 1, freeRoamMode: false }), 'Continuar (Misión 2)');
  assert.equal(formatContinueLabel({ currentMissionIndex: 4, freeRoamMode: true }), 'Continuar (modo libre)');
});

test('persiste missões desbloqueadas e mantém apenas a primeira missão no novo jogo', () => {
  const storage = createMemoryStorage();
  const initial = createSaveSnapshot({
    storyKey: 'Missão Vibe Coding',
    currentMissionIndex: 0,
    player: { x: 10, y: 20, angle: 0, health: 100 },
  });
  saveGameState(initial, storage);
  const loadedInitial = loadGameState('Missão Vibe Coding', storage);
  assert.deepEqual(loadedInitial.unlockedMissionIndices, [0]);

  const progressed = createSaveSnapshot({
    storyKey: 'Missão Vibe Coding',
    currentMissionIndex: 1,
    unlockedMissionIndices: [0, 1],
    player: { x: 30, y: 40, angle: 0, health: 95 },
  });
  saveGameState(progressed, storage);
  const loadedProgressed = loadGameState('Missão Vibe Coding', storage);
  assert.deepEqual(loadedProgressed.unlockedMissionIndices, [0, 1]);

  // Save antigo sem campo unlockedMissionIndices mantém missões até currentMissionIndex
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify({
    version: 1,
    storyKey: 'Missão Vibe Coding',
    currentMissionIndex: 2,
    freeRoamMode: false,
    player: { x: 50, y: 60, angle: 0, health: 100 },
  }));
  const loadedLegacy = loadGameState('Missão Vibe Coding', storage);
  assert.deepEqual(loadedLegacy.unlockedMissionIndices, [0, 1, 2]);
});
