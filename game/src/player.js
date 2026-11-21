// Quiet Hands — the player: movement, stance, noise and pebbles.
// One clear job: turn keys and clicks into a body in the level, and tell the
// rest of the game how loud that body is being.
import { TILE, PLAYER_WALK_SPEED, PLAYER_RUN_SPEED, PLAYER_SNEAK_SPEED, NOISE_WALK, NOISE_RUN, NOISE_SNEAK, NOISE_PEBBLE } from './config.js';

export class Player {
  constructor(world) {
    this.world = world;
    this.reset();
  }

  reset() {
    const s = this.world.playerStart;
    this.x = (s.x + 0.5) * TILE;
    this.y = (s.y + 0.5) * TILE;
    this.dirX = 0;
    this.dirY = 1;
    this.moving = false;
    this.running = false;
    this.sneaking = false;
    this.hiddenInBush = false;
    this.noiseRadius = 0;
    this.pebbles = 0;
    this.stepTimer = 0;
    this.justStepped = false;
  }

  update(dt, input) {
    const left = input.left ? -1 : 0;
    const right = input.right ? 1 : 0;
    const up = input.up ? -1 : 0;
    const down = input.down ? 1 : 0;
    let mx = left + right;
    let my = up + down;
    const len = Math.hypot(mx, my);
    this.moving = len > 0;
    this.justStepped = false;
    if (!this.moving) {
      this.noiseRadius = 0;
      return;
    }
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    this.sneaking = !!input.sneak;
    this.running = !!input.run && !this.sneaking;
    const speed = this.sneaking ? PLAYER_SNEAK_SPEED : this.running ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED;
    const moved = this.world.moveCircle(this.x, this.y, mx * speed * dt, my * speed * dt, 13);
    this.x = moved.x;
    this.y = moved.y;
    this.dirX = mx;
    this.dirY = my;
    this.noiseRadius = this.sneaking ? NOISE_SNEAK : this.running ? NOISE_RUN : NOISE_WALK;
    const tx = Math.floor(this.x / TILE);
    const ty = Math.floor(this.y / TILE);
    this.hiddenInBush = this.world.isBush(tx, ty);
    this.stepTimer -= dt;
    const interval = this.running ? 0.26 : this.sneaking ? 0.55 : 0.38;
    if (this.stepTimer <= 0) {
      this.stepTimer = interval;
      this.justStepped = true;
    }
  }

  // Throw a pebble toward a pixel point; it lands, makes noise, and every
  // guard in earshot walks over to look. Returns the pebble or null.
  throwPebble(targetX, targetY) {
    if (this.pebbles <= 0) return null;
    this.pebbles -= 1;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const range = Math.min(dist, 260);
    return {
      x: this.x,
      y: this.y,
      tx: this.x + (dx / dist) * range,
      ty: this.y + (dy / dist) * range,
      t: 0,
      duration: 0.45,
      noiseRadius: NOISE_PEBBLE,
    };
  }
}
