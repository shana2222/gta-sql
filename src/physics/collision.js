export function resolveCircleRect(cx, cy, radius, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq >= radius * radius) {
    return { x: cx, y: cy, collided: false };
  }

  if (distSq > 1e-6) {
    const dist = Math.sqrt(distSq);
    const overlap = radius - dist;
    return {
      x: cx + (dx / dist) * overlap,
      y: cy + (dy / dist) * overlap,
      collided: true
    };
  }

  const left = cx - rect.x;
  const right = rect.x + rect.w - cx;
  const top = cy - rect.y;
  const bottom = rect.y + rect.h - cy;
  const minEdge = Math.min(left, right, top, bottom);

  if (minEdge === left) return { x: rect.x - radius, y: cy, collided: true };
  if (minEdge === right) return { x: rect.x + rect.w + radius, y: cy, collided: true };
  if (minEdge === top) return { x: cx, y: rect.y - radius, collided: true };
  return { x: cx, y: rect.y + rect.h + radius, collided: true };
}

export function resolveEntityCollisions(x, y, radius, colliders) {
  let nx = x;
  let ny = y;
  let collided = false;

  for (let pass = 0; pass < 2; pass++) {
    for (const rect of colliders) {
      const res = resolveCircleRect(nx, ny, radius, rect);
      nx = res.x;
      ny = res.y;
      if (res.collided) {
        collided = true;
      }
    }
  }

  return { x: nx, y: ny, collided };
}

export function resolveCircleOBB(cx, cy, radius, box) {
  const cos = Math.cos(box.angle || 0);
  const sin = Math.sin(box.angle || 0);
  const dx = cx - box.x;
  const dy = cy - box.y;

  const lx = dx * cos + dy * sin;
  const ly = -dx * sin + dy * cos;

  const localRect = {
    x: -box.length * 0.5,
    y: -box.width * 0.5,
    w: box.length,
    h: box.width
  };

  const res = resolveCircleRect(lx, ly, radius, localRect);
  if (!res.collided) {
    return { x: cx, y: cy, collided: false };
  }

  return {
    x: box.x + res.x * cos - res.y * sin,
    y: box.y + res.x * sin + res.y * cos,
    collided: true
  };
}

export function resolveCircleStaticObstacle(x, y, radius, obsX, obsY, obsRadius) {
  const minDist = radius + obsRadius;
  const dx = x - obsX;
  const dy = y - obsY;
  const dist = Math.hypot(dx, dy);
  if (dist >= minDist) {
    return { x, y, collided: false };
  }
  const nx = dist > 1e-4 ? dx / dist : 0;
  const ny = dist > 1e-4 ? dy / dist : 1;
  return {
    x: obsX + nx * minDist,
    y: obsY + ny * minDist,
    collided: true
  };
}

export function isInWater(x, y, cityMap) {
  return x < 0 || y < 0 || x > cityMap.worldWidth || y > cityMap.worldHeight;
}

export function resolveVehiclePairCollision(vA, vB) {
  const dx = vB.x - vA.x;
  const dy = vB.y - vA.y;
  const distSq = dx * dx + dy * dy;
  const minDist = vA.radius + vB.radius;

  if (distSq >= minDist * minDist) {
    return { collided: false, impactSpeed: 0 };
  }

  const dist = Math.sqrt(distSq) || 0.001;
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;

  vA.x -= nx * overlap * 0.5;
  vA.y -= ny * overlap * 0.5;
  vB.x += nx * overlap * 0.5;
  vB.y += ny * overlap * 0.5;

  const rvx = vB.vx - vA.vx;
  const rvy = vB.vy - vA.vy;
  const velAlongNormal = rvx * nx + rvy * ny;

  if (velAlongNormal > 0) {
    return { collided: true, impactSpeed: 0 };
  }

  const impactSpeed = -velAlongNormal;
  const impulse = -(1 + 0.35) * velAlongNormal * 0.5;
  vA.vx -= impulse * nx;
  vA.vy -= impulse * ny;
  vB.vx += impulse * nx;
  vB.vy += impulse * ny;

  vA.speed = Math.hypot(vA.vx, vA.vy);
  vB.speed = Math.hypot(vB.vx, vB.vy);

  return { collided: true, impactSpeed };
}

export function isPositionFree(x, y, radius, colliders, cityMap) {
  if (cityMap && typeof cityMap === 'object' && isInWater(x, y, cityMap)) {
    return false;
  }
  for (const rect of colliders) {
    const res = resolveCircleRect(x, y, radius, rect);
    if (res.collided) {
      return false;
    }
  }
  return true;
}
