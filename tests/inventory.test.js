import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Inventory,
  INVENTORY_CAPACITY,
  INVENTORY_COLUMNS,
  INVENTORY_ROWS,
} from '../src/core/inventory.js';
import { CityMap } from '../src/world/city-map.js';
import {
  parseStoryManifest,
  parseItemMarkdown,
  parseMissionMarkdown,
  StoryParseError,
} from '../src/story/story-parser.js';
import { collectStoryAssetUrls } from '../src/story/story-loader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storyDir = path.resolve(__dirname, '../story');

test('inventário inicia com 1 página de 10 slots (2x5) e cria nova página ao passar de 10 itens', () => {
  assert.equal(INVENTORY_COLUMNS, 5);
  assert.equal(INVENTORY_ROWS, 2);
  assert.equal(INVENTORY_CAPACITY, 10);

  const inv = new Inventory();
  assert.equal(inv.capacity, 10);
  assert.equal(inv.getPageCount(), 1);
  assert.equal(inv.getCount(), 0);
  assert.equal(inv.isFull(), false);

  for (let i = 0; i < 10; i += 1) {
    const res = inv.addItem({
      id: `item-${i}`,
      name: `Item ${i}`,
      description: 'Teste',
      imageUrl: `./story/assets/item-${i}.svg`,
    });
    assert.equal(res.ok, true);
    assert.equal(res.slotIndex, i);
    assert.equal(res.pageIndex, 0);
  }

  assert.equal(inv.getCount(), 10);
  assert.equal(inv.getPageCount(), 1);
  assert.equal(inv.isFull(), false);

  const page2Item = inv.addItem({ id: 'extra-11', name: 'Extra 11' });
  assert.equal(page2Item.ok, true);
  assert.equal(page2Item.slotIndex, 10);
  assert.equal(page2Item.pageIndex, 1);
  assert.equal(inv.getPageCount(), 2);
  assert.equal(inv.capacity, 20);
  assert.equal(inv.getPageSlots(0).length, 10);
  assert.equal(inv.getPageSlots(1).length, 10);
  assert.equal(inv.getPageSlots(1)[0].id, 'extra-11');

  const removedExtra = inv.removeItem('extra-11');
  assert.equal(removedExtra.ok, true);
  assert.equal(inv.getPageCount(), 1);
  assert.equal(inv.capacity, 10);

  const removed = inv.removeItem('item-3');
  assert.equal(removed.ok, true);
  assert.equal(removed.slotIndex, 3);
  assert.equal(inv.getCount(), 9);
  assert.equal(inv.hasItem('item-3'), false);
  assert.equal(inv.getItemAt(3).id, 'item-4');
  assert.equal(inv.getItemAt(9), null);

  const refill = inv.addItem({ id: 'novo', name: 'Novo' });
  assert.equal(refill.ok, true);
  assert.equal(refill.slotIndex, 9);
});

test('parser de itens e missões lê story/items/ e valida entrega da libreta na missão 01', () => {
  const cityMap = new CityMap();
  const manifest = parseStoryManifest(fs.readFileSync(path.join(storyDir, 'story.md'), 'utf8'), 'story.md');
  assert.ok(manifest.items.includes('libreta'));

  const itemsMap = new Map();
  for (const itemId of manifest.items) {
    const raw = fs.readFileSync(path.join(storyDir, 'items', `${itemId}.md`), 'utf8');
    const itemDef = parseItemMarkdown(raw, `items/${itemId}.md`);
    assert.equal(itemDef.id, itemId);
    assert.ok(itemDef.name);
    assert.ok(itemDef.image);
    assert.equal(fs.existsSync(path.join(storyDir, itemDef.image)), true, `Imagem ausente: ${itemDef.image}`);
    itemsMap.set(itemDef.id, { ...itemDef, imageUrl: `./story/${itemDef.image}` });
  }

  const mission1 = parseMissionMarkdown(
    fs.readFileSync(path.join(storyDir, 'missions', '01-libreta-quemada.md'), 'utf8'),
    'missions/01-libreta-quemada.md',
    cityMap,
  );
  assert.equal(mission1.pickupLocation, 'PRACA-01');
  assert.equal(mission1.giveItem, 'libreta');
  assert.equal(mission1.requireItem, 'libreta');
  assert.ok(mission1.deliveryPrompt.length > 0);
  assert.ok(mission1.wrongItemMessage.length > 0);
  assert.ok(mission1.outroCutscene.steps.some((step) => step.type === 'deliver' && step.itemId === 'libreta'));

  const assetUrls = collectStoryAssetUrls({ items: itemsMap, characters: new Map(), missions: [] });
  assert.ok(assetUrls.includes('./story/assets/item-libreta.svg'));
});

test('rejeita item sem campos obrigatórios ou caminho de imagem externo', () => {
  assert.throws(
    () => parseItemMarkdown('---\nid: sem-nome\n---\n', 'items/bad.md'),
    (err) => err instanceof StoryParseError,
  );
  assert.throws(
    () => parseItemMarkdown('---\nid: ext\nname: Externo\nimage: https://evil.com/a.png\n---\n', 'items/ext.md'),
    (err) => err instanceof StoryParseError,
  );
});

test('inventário preserva category e rarity dos itens extras', () => {
  const inv = new Inventory();
  inv.addItem({
    id: 'caixa-secreta',
    name: 'Caixa Secreta',
    category: 'missao',
    rarity: '',
  });
  inv.addItem({
    id: 'caneca-curso-em-video',
    name: 'Caneca Curso em Vídeo',
    category: 'extra',
    rarity: 'normal',
  });
  inv.addItem({
    id: 'chapeu-de-palha',
    name: 'Chapéu de Palha',
    category: 'extra',
    rarity: 'lendario',
  });

  const slots = inv.getSlots();
  assert.equal(slots[0].category, 'missao');
  assert.equal(slots[0].rarity, '');
  assert.equal(slots[1].category, 'extra');
  assert.equal(slots[1].rarity, 'normal');
  assert.equal(slots[2].category, 'extra');
  assert.equal(slots[2].rarity, 'lendario');
});

test('restorePreservingExtras mantém itens extras ao restaurar checkpoint ou reiniciar missão', () => {
  const inv = new Inventory();
  inv.addItem({ id: 'caixa-secreta', name: 'Caixa Secreta', category: 'missao' });
  inv.addItem({ id: 'caneca-curso-em-video', name: 'Caneca', category: 'extra', rarity: 'normal' });
  const checkpointSlots = inv.getSlots();

  inv.addItem({ id: 'pendrive-misterioso', name: 'Pendrive', category: 'missao' });
  inv.addItem({ id: 'chapeu-de-palha', name: 'Chapéu de Palha', category: 'extra', rarity: 'lendario' });

  inv.restorePreservingExtras(checkpointSlots);
  assert.equal(inv.hasItem('caixa-secreta'), true);
  assert.equal(inv.hasItem('pendrive-misterioso'), false);
  assert.equal(inv.hasItem('caneca-curso-em-video'), true);
  assert.equal(inv.hasItem('chapeu-de-palha'), true);
  assert.equal(inv.getCount(), 3);

  inv.restorePreservingExtras();
  assert.equal(inv.hasItem('caixa-secreta'), false);
  assert.equal(inv.hasItem('caneca-curso-em-video'), true);
  assert.equal(inv.hasItem('chapeu-de-palha'), true);
  assert.equal(inv.getCount(), 2);
});
