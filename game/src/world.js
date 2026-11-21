// Quiet Hands — the level grid: tiles, collision and line of sight.
// One clear job: everything that asks "can I stand / see through here?"
// goes through this module, so guards, the player and the renderer agree.
import { TILE, COLS, ROWS } from './config.js';

export class World {
  constructor(levelDef) {
    this.rows = levelDef.map;
    this.chips = [];
    this.exit = null;
    this.playerStart = null;
    this.guardSpawns = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = this.rows[y][x];
        if (c === 'P') this.playerStart = { x, y };
        else if (c === '*') this.chips.push({ tx: x, ty: y, taken: false });
        else if (c === 'E') this.exit = { x, y };
        else if (c === 'G') this.guardSpawns.push({ x, y });
      }
    }
  }

  tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
    return this.rows[ty][tx];
  }

  isSolid(tx, ty) {
    const t = this.tileAt(tx, ty);
    return t === '#' || t === 'C';
  }

  blocksSight(tx, ty) {
    const t = this.tileAt(tx, ty);
    return t === '#' || t === 'C' || t === 'B';
  }

  isBush(tx, ty) {
    return this.tileAt(tx, ty) === 'B';
  }

  // Circle (in pixels) against solid tiles; returns the position after sliding.
  moveCircle(px, py, dx, dy, radius) {
    let nx = px + dx;
    if (!this.circleHitsSolid(nx, py, radius)) px = nx;
    let ny = py + dy;
    if (!this.circleHitsSolid(px, ny, radius)) py = ny;
    return { x: px, y: py };
  }

  circleHitsSolid(px, py, radius) {
    const x0 = Math.floor((px - radius) / TILE);
    const x1 = Math.floor((px + radius) / TILE);
    const y0 = Math.floor((py - radius) / TILE);
    const y1 = Math.floor((py + radius) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!this.isSolid(tx, ty)) continue;
        const cx = Math.max(tx * TILE, Math.min(px, tx * TILE + TILE));
        const cy = Math.max(ty * TILE, Math.min(py, ty * TILE + TILE));
        const ddx = px - cx;
        const ddy = py - cy;
        if (ddx * ddx + ddy * ddy < radius * radius) return true;
      }
    }
    return false;
  }

  // Bresenham-style sampling: true when no sight-blocking tile sits between
  // the two pixel points. Bushes block sight both ways, so a player inside a
  // bush is hidden and a guard inside one is blind past it.
  hasLineOfSight(x0, y0, x1, y1) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / (TILE / 3)));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const tx = Math.floor((x0 + (x1 - x0) * t) / TILE);
      const ty = Math.floor((y0 + (y1 - y0) * t) / TILE);
      if (this.blocksSight(tx, ty)) return false;
    }
    return true;
  }

  // Breadth-first path over walkable tiles; used by chasing guards so they
  // route around walls instead of pushing into them.
  findPath(sx, sy, tx, ty) {
    const key = (x, y) => y * COLS + x;
    const prev = new Map();
    const queue = [[sx, sy]];
    prev.set(key(sx, sy), null);
    while (queue.length) {
      const [x, y] = queue.shift();
      if (x === tx && y === ty) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (this.isSolid(nx, ny) || prev.has(key(nx, ny))) continue;
        prev.set(key(nx, ny), [x, y]);
        queue.push([nx, ny]);
      }
    }
    if (!prev.has(key(tx, ty))) return null;
    const path = [];
    let cur = [tx, ty];
    while (cur) {
      path.unshift(cur);
      cur = prev.get(key(cur[0], cur[1]));
    }
    return path;
  }
}
