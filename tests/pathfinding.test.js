import test from 'node:test';
import assert from 'node:assert/strict';
import { CityMap } from '../src/world/city-map.js';
import { RoadPathfinder } from '../src/world/pathfinding.js';

test('calcula rota pelas ruas até o código de local alvo', () => {
  const map = new CityMap();
  const pathfinder = new RoadPathfinder(map);
  const start = map.resolveLocationCode('CASA-01').spawnPoint;

  const route = pathfinder.findRoute(start.x, start.y, 'PRACA-01');
  assert.ok(route.length >= 3);

  const dest = map.resolveLocationCode('PRACA-01').spawnPoint;
  const last = route[route.length - 1];
  assert.equal(last.x, dest.x);
  assert.equal(last.y, dest.y);
});

test('retorna lista vazia quando não há objetivo ativo', () => {
  const map = new CityMap();
  const pathfinder = new RoadPathfinder(map);
  const route = pathfinder.findRoute(100, 100, null);
  assert.deepEqual(route, []);
});
