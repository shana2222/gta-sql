const BOAT_COLORS = ['#f8fafc', '#ef4444', '#38bdf8', '#facc15', '#2dd4bf', '#fb923c'];

export class BoatManager {
  constructor(cityMap, count = 50) {
    this.cityMap = cityMap;
    this.worldWidth = cityMap.worldWidth;
    this.worldHeight = cityMap.worldHeight;
    this.boats = [];
    this.#spawnBoats(count);
  }

  #getPerimeterLength(offset) {
    const spanX = this.worldWidth + offset * 2;
    const spanY = this.worldHeight + offset * 2;
    return 2 * (spanX + spanY);
  }

  #samplePerimeter(offset, dist, direction) {
    const minX = -offset;
    const minY = -offset;
    const maxX = this.worldWidth + offset;
    const maxY = this.worldHeight + offset;
    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const total = 2 * (spanX + spanY);
    const wrapped = ((dist % total) + total) % total;

    if (wrapped < spanX) {
      return {
        x: minX + wrapped,
        y: minY,
        angle: direction >= 0 ? 0 : Math.PI
      };
    }
    if (wrapped < spanX + spanY) {
      return {
        x: maxX,
        y: minY + (wrapped - spanX),
        angle: direction >= 0 ? Math.PI * 0.5 : -Math.PI * 0.5
      };
    }
    if (wrapped < 2 * spanX + spanY) {
      return {
        x: maxX - (wrapped - spanX - spanY),
        y: maxY,
        angle: direction >= 0 ? Math.PI : 0
      };
    }
    return {
      x: minX,
      y: maxY - (wrapped - 2 * spanX - spanY),
      angle: direction >= 0 ? -Math.PI * 0.5 : Math.PI * 0.5
    };
  }

  #spawnBoats(count) {
    const lanes = [
      { offset: 72, direction: 1, speedBase: 82 },
      { offset: 122, direction: -1, speedBase: 96 },
      { offset: 174, direction: 1, speedBase: 72 }
    ];

    for (let i = 0; i < count; i++) {
      const lane = lanes[i % lanes.length];
      const perimeter = this.#getPerimeterLength(lane.offset);
      const laneIndex = Math.floor(i / lanes.length);
      const boatsInLane = Math.ceil((count - (i % lanes.length)) / lanes.length);
      const progress = (laneIndex + 0.35) / Math.max(1, boatsInLane);
      const distance = progress * perimeter;
      const speed = lane.speedBase + (i % 4) * 9;
      const pose = this.#samplePerimeter(lane.offset, distance, lane.direction);

      this.boats.push({
        id: `boat-${i + 1}`,
        kind: 'boat',
        decorative: true,
        color: BOAT_COLORS[i % BOAT_COLORS.length],
        offset: lane.offset,
        direction: lane.direction,
        distance,
        speed,
        length: 40 + (i % 3) * 4,
        width: 18 + (i % 2) * 2,
        x: pose.x,
        y: pose.y,
        angle: pose.angle
      });
    }
  }

  update(dt) {
    for (const boat of this.boats) {
      const perimeter = this.#getPerimeterLength(boat.offset);
      boat.distance = ((boat.distance + boat.direction * boat.speed * dt) % perimeter + perimeter) % perimeter;
      const pose = this.#samplePerimeter(boat.offset, boat.distance, boat.direction);
      boat.x = pose.x;
      boat.y = pose.y;
      boat.angle = pose.angle;
    }
  }
}
