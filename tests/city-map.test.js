import test from 'node:test';
import assert from 'node:assert/strict';
import { CityMap } from '../src/world/city-map.js';
import { TrafficManager } from '../src/world/traffic-manager.js';
import { Minimap } from '../src/ui/minimap.js';

test('gera cidade-base 16x16 com códigos únicos de ruas, casas, comércios e praças', () => {
  const map = new CityMap();
  assert.equal(map.blocks.length, 16);
  assert.equal(map.blocks[0].length, 16);

  const rua1 = map.resolveLocationCode('RUA-01');
  const casa1 = map.resolveLocationCode('CASA-01');
  const com1 = map.resolveLocationCode('COM-01');
  const praca1 = map.resolveLocationCode('PRACA-01');

  assert.equal(rua1.type, 'road');
  assert.equal(casa1.type, 'house');
  assert.equal(com1.type, 'commerce');
  assert.equal(praca1.type, 'plaza');

  assert.ok(casa1.interior.walls.length > 0);
  assert.ok(casa1.roofRect.w > 0);
  assert.ok(casa1.doormat.w > 0);

  const uniqueWidths = new Set(map.colWidths);
  const uniqueHeights = new Set(map.rowHeights);
  assert.ok(uniqueWidths.size > 1);
  assert.ok(uniqueHeights.size > 1);
});

test('sinaliza erro descritivo ao resolver código de local inexistente', () => {
  const map = new CityMap();
  assert.throws(() => map.resolveLocationCode('NAO-EXISTE-99'), /Código de lugar inexistente/);
  assert.throws(() => map.resolveLocationCode(''), /Código de lugar inválido/);
});

test('identifica entrada em interior térreo pelo getLocationAt', () => {
  const map = new CityMap();
  const casa = map.resolveLocationCode('CASA-01');
  const centerX = casa.bounds.x + casa.bounds.w * 0.5;
  const centerY = casa.bounds.y + casa.bounds.h * 0.5;

  const detected = map.getLocationAt(centerX, centerY);
  assert.equal(detected?.code, 'CASA-01');
});

test('gera veículos variados de cada tipo (carro, moto, van)', () => {
  const map = new CityMap();
  const kinds = new Set(map.vehicleSpawns.map((v) => v.kind));
  assert.ok(kinds.has('car'));
  assert.ok(kinds.has('moto'));
  assert.ok(kinds.has('van'));
});

test('gera hospitais espalhados pela cidade com telhado branco e interior acessível', () => {
  const map = new CityMap();
  const hospitals = [];
  for (const row of map.blocks) {
    for (const block of row) {
      for (const b of block.buildings) {
        if (b.type === 'hospital') hospitals.push(b);
      }
    }
  }

  assert.equal(hospitals.length, 12);
  const hosp1 = map.resolveLocationCode('HOSP-01');
  const hosp40 = map.resolveLocationCode('HOSP-12');
  assert.equal(hosp40.type, 'hospital');
  assert.equal(hosp1.type, 'hospital');
  assert.equal(hosp1.roofColor, '#ffffff');
  assert.ok(hosp1.interior.walls.length > 0);

  const detected = map.getLocationAt(
    hosp1.bounds.x + hosp1.bounds.w * 0.5,
    hosp1.bounds.y + hosp1.bounds.h * 0.5
  );
  assert.equal(detected?.code, 'HOSP-01');
  assert.equal(detected?.type, 'hospital');

  // Garante que locais usados pelas missões continuam válidos
  for (const code of ['CASA-01', 'COM-01', 'COM-14', 'COM-96', 'CASA-84', 'COM-182', 'CASA-181']) {
    assert.ok(map.resolveLocationCode(code));
  }
});

test('resolveItemLocation posiciona itens em praças, interiores e esquinas entre duas ruas', () => {
  const map = new CityMap();
  const plazaPt = map.resolveItemLocation('PRACA-03');
  assert.equal(plazaPt.kind, 'plaza');
  assert.ok(Number.isFinite(plazaPt.x) && Number.isFinite(plazaPt.y));

  const interiorPt = map.resolveItemLocation('HOSP-05');
  assert.equal(interiorPt.kind, 'interior');
  assert.equal(interiorPt.code, 'HOSP-05');

  const cornerPt = map.resolveItemLocation('RUA-04 x RUA-20 NE');
  assert.equal(cornerPt.kind, 'corner');
  const cornerLoc = map.getLocationAt(cornerPt.x, cornerPt.y);
  assert.equal(cornerLoc?.type, 'road');
  assert.ok(['RUA-04', 'RUA-20'].includes(cornerLoc?.code));
});

test('getLocationAt identifica a rua correspondente quando o jogador está na calçada', () => {
  const map = new CityMap();
  const block = map.blocks[1][1];
  const rx = map.blockXOffsets[1];
  const ry = map.blockYOffsets[1];
  const rw = map.colWidths[1];
  const rh = map.rowHeights[1];
  const northSidewalk = map.getLocationAt(rx + rw * 0.5, ry + 4);
  assert.equal(northSidewalk?.type, 'road');
  assert.equal(northSidewalk?.code, map.horizontalRoads[1].code);

  const westSidewalk = map.getLocationAt(rx + 4, ry + rh * 0.5);
  assert.equal(westSidewalk?.type, 'road');
  assert.equal(westSidewalk?.code, map.verticalRoads[1].code);
});

test('resolveItemLocation posiciona item interno perto da parede oposta à porta da construção', () => {
  const map = new CityMap();
  const byDoorSide = new Map();
  for (const row of map.blocks) {
    for (const block of row) {
      for (const b of block.buildings) {
        if (!byDoorSide.has(b.doorSide)) {
          byDoorSide.set(b.doorSide, b);
        }
      }
    }
  }

  for (const side of ['north', 'south', 'east', 'west']) {
    const b = byDoorSide.get(side);
    assert.ok(b, `esperado prédio com doorSide=${side}`);
    const pt = map.resolveItemLocation(b.code);
    assert.equal(pt.kind, 'interior');
    const { x, y, w, h } = b.bounds;
    if (side === 'north') assert.ok(pt.y > y + h * 0.5);
    if (side === 'south') assert.ok(pt.y < y + h * 0.55);
    if (side === 'west') assert.ok(pt.x > x + w * 0.5);
    if (side === 'east') assert.ok(pt.x < x + w * 0.5);
  }
});

test('divide a cidade em chunks ativos com cerca de 2 veículos variados por quarteirão dirigidos por NPCs', () => {
  const map = new CityMap();
  assert.equal(map.chunkCols * map.chunkRows, Math.ceil(map.gridBlocks / map.chunkBlockSize) ** 2);
  assert.equal(map.vehicleSpawns.length, map.gridBlocks * map.gridBlocks * 2);
  assert.ok(map.vehicleSpawns.every((v) => v.driver === 'npc' && v.isParked === false));

  const casa1 = map.resolveLocationCode('CASA-01');
  const localChunks = map.getActiveChunks(
    casa1.spawnPoint.x - 10,
    casa1.spawnPoint.y - 10,
    casa1.spawnPoint.x + 10,
    casa1.spawnPoint.y + 10,
    1,
  );
  assert.ok(localChunks.length >= 4 && localChunks.length <= 9);
  for (const chunk of localChunks) {
    assert.equal(chunk.vehicleSpawns.length, chunk.blocks.length * 2);
    assert.ok(chunk.trashBinSpawns.length > 0);
    const kinds = new Set(chunk.vehicleSpawns.map((v) => v.kind));
    assert.ok(kinds.size >= 2);
  }

  const traffic = new TrafficManager(map, { chunkManaged: true });
  assert.equal(traffic.pedestrians.length, 0);
  const nextKeys = new Set(localChunks.map((c) => c.key));
  traffic.syncPedestrianChunks(localChunks, nextKeys, { x: casa1.spawnPoint.x, y: casa1.spawnPoint.y });
  assert.ok(traffic.pedestrians.length > 0);

  // Ao mover para um chunk distante, os pedestres antigos fora da vizinhança são removidos
  const farCorner = map.resolveLocationCode('CASA-181');
  const farChunks = map.getActiveChunks(
    farCorner.spawnPoint.x - 10,
    farCorner.spawnPoint.y - 10,
    farCorner.spawnPoint.x + 10,
    farCorner.spawnPoint.y + 10,
    1,
  );
  const farKeys = new Set(farChunks.map((c) => c.key));
  traffic.syncPedestrianChunks(farChunks, farKeys, { x: farCorner.spawnPoint.x, y: farCorner.spawnPoint.y }, nextKeys);
  assert.ok(traffic.pedestrians.every((p) => farKeys.has(p.chunkKey)));
});

test('computeInitialExpandedView enquadra a maior dimensão mantendo jogador e destino visíveis', () => {
  const map = new CityMap();
  const minimap = new Minimap({ getContext: () => null });
  const canvas = { width: 300, height: 300 };

  // Jogador e destino próximos em tela retrato (iPhone)
  const nearPlayer = { x: map.worldWidth * 0.35, y: map.worldHeight * 0.2 };
  const nearObjective = { x: map.worldWidth * 0.55, y: map.worldHeight * 0.5 };
  const portraitView = minimap.computeInitialExpandedView(canvas, map, nearPlayer, nearObjective, 390, 844);
  assert.ok(portraitView.zoom > 1.3, `zoom deve preencher a maior dimensão (zoom=${portraitView.zoom})`);

  const baseScale = minimap.getExpandedBaseScale(canvas, map);
  const scale = baseScale * portraitView.zoom;
  const halfW = (canvas.width * 0.5) / scale;
  const halfH = (canvas.height * 0.5) / scale;
  assert.ok(Math.abs(nearPlayer.x - portraitView.centerX) <= halfW);
  assert.ok(Math.abs(nearPlayer.y - portraitView.centerY) <= halfH);
  assert.ok(Math.abs(nearObjective.x - portraitView.centerX) <= halfW);
  assert.ok(Math.abs(nearObjective.y - portraitView.centerY) <= halfH);

  // Jogador e destino em extremos opostos reduzem o zoom o suficiente para manter ambos visíveis
  const farPlayer = { x: map.worldWidth * 0.08, y: map.worldHeight * 0.1 };
  const farObjective = { x: map.worldWidth * 0.92, y: map.worldHeight * 0.9 };
  const farView = minimap.computeInitialExpandedView(canvas, map, farPlayer, farObjective, 390, 844);
  const farScale = baseScale * farView.zoom;
  const farHalfW = (canvas.width * 0.5) / farScale;
  assert.ok(Math.abs(farPlayer.x - farView.centerX) <= farHalfW);
  assert.ok(Math.abs(farObjective.x - farView.centerX) <= farHalfW);
});

test('getSurfaceAt diferencia asfalto, calçada e grama', () => {
  const map = new CityMap();
  const road = map.resolveLocationCode('RUA-01');
  assert.equal(map.getSurfaceAt(road.bounds.x + road.bounds.w * 0.5, road.bounds.y + road.bounds.h * 0.5), 'asphalt');

  const bx = map.blockXOffsets[0];
  const by = map.blockYOffsets[0];
  assert.equal(map.getSurfaceAt(bx + 6, by + 6), 'sidewalk');

  const plazaBlock = map.blocks.flat().find((b) => b.isPlaza && b.plaza);
  assert.ok(plazaBlock);
  const pb = plazaBlock.plaza.bounds;
  assert.equal(map.getSurfaceAt(pb.x + pb.w * 0.5, pb.y + pb.h * 0.5), 'grass');
});

test('resolveIndoorOppositePosition posiciona NPC na parede oposta à porta de uma casa com porta ao sul', () => {
  const map = new CityMap();
  const pos = map.resolveIndoorOppositePosition('CASA-01');
  const b = pos.building.bounds;
  assert.equal(pos.building.code, 'CASA-01');
  assert.equal(pos.building.doorSide, 'south');
  assert.ok(pos.y < b.y + b.h * 0.5, 'NPC deve ficar na metade norte (oposta à porta sul)');
  assert.ok(pos.x >= b.x && pos.x <= b.x + b.w);
  assert.equal(pos.angle, Math.PI * 0.5);
  assert.throws(() => map.resolveIndoorOppositePosition('RUA-04'));
});
