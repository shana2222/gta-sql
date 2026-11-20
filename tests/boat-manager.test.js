import test from 'node:test';
import assert from 'node:assert/strict';
import { CityMap } from '../src/world/city-map.js';
import { BoatManager } from '../src/world/boat-manager.js';
import { isInWater } from '../src/physics/collision.js';
import { findNearestVehicle } from '../src/physics/vehicle-physics.js';

test('barcos decorativos circulam sempre na água, paralelos às bordas da ilha e sem entrada do jogador', () => {
  const cityMap = new CityMap();
  const manager = new BoatManager(cityMap, 12);

  assert.equal(manager.boats.length, 12);

  for (let step = 0; step < 240; step++) {
    manager.update(0.5);
    for (const boat of manager.boats) {
      assert.equal(boat.decorative, true);
      assert.equal(isInWater(boat.x, boat.y, cityMap), true);
      const cos = Math.abs(Math.cos(boat.angle));
      const sin = Math.abs(Math.sin(boat.angle));
      assert.ok(cos > 0.999 || sin > 0.999, `ângulo não paralelo às bordas: ${boat.angle}`);
    }
  }

  const b0 = manager.boats[0];
  const nearest = findNearestVehicle(b0.x, b0.y, []);
  assert.equal(nearest, null);
});
