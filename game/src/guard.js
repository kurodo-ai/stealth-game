// Quiet Hands — the guard: patrols, looks, listens, chases.
// One clear job: one guard's brain. States: patrol → suspicious (heard or
// glimpsed something) → chase (saw the player clearly) → back to patrol.
import {
  TILE,
  GUARD_PATROL_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_VIEW_RANGE,
  GUARD_VIEW_HALF_ANGLE,
  GUARD_HEAR_RANGE,
  DETECT_FILL_CLOSE,
  DETECT_FILL_FAR,
  DETECT_DRAIN,
  DETECT_SNEAK_FACTOR,
  DETECT_BUSH_FACTOR,
  ALARM_HOLD_SECONDS,
} from './config.js';

export const GUARD_STATE = { PATROL: 'patrol', SUSPICIOUS: 'suspicious', CHASE: 'chase' };

export class Guard {
  constructor(def, speedScale, world) {
    this.world = world;
    this.speedScale = speedScale;
    this.spawn = def.spawn;
    this.x = (def.spawn[0] + 0.5) * TILE;
    this.y = (def.spawn[1] + 0.5) * TILE;
    this.waypoints = def.waypoints.map(([tx, ty]) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }));
    this.pause = def.pause;
    this.wpIndex = 1 % this.waypoints.length;
    this.dir = 0; // facing angle, radians
    this.state = GUARD_STATE.PATROL;
    this.waitTimer = 0;
    this.suspicion = 0; // 0..100, the shared detection meter's per-guard view
    this.lastSeen = null; // {x, y} of the player, when last clearly seen
    this.investigate = null; // {x, y} to walk to and look around
    this.lookTimer = 0;
    this.alarmTimer = 0;
    this.chasePath = null;
    this.chasePathIndex = 0;
    this.repathTimer = 0;
    this.stepTimer = 0;
    this.glimpseTimer = 0;
    this.turnToFace(this.waypoints[this.wpIndex]);
  }

  turnToFace(target) {
    this.dir = Math.atan2(target.y - this.y, target.x - this.x);
  }

  // How well this guard can see the player right now: 0 when out of the
  // cone, blocked, or hidden; up to 1 when close and in plain view.
  visibilityOf(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > GUARD_VIEW_RANGE) return 0;
    if (dist > 34) {
      const ang = Math.atan2(dy, dx);
      let diff = ang - this.dir;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) > GUARD_VIEW_HALF_ANGLE) return 0;
    }
    if (!this.world.hasLineOfSight(this.x, this.y, player.x, player.y)) return 0;
    const closeness = 1 - dist / GUARD_VIEW_RANGE;
    let factor = player.sneaking ? DETECT_SNEAK_FACTOR : 1;
    if (player.hiddenInBush) factor *= DETECT_BUSH_FACTOR;
    return closeness * factor;
  }

  hearNoise(nx, ny, radius) {
    const dist = Math.hypot(nx - this.x, ny - this.y);
    if (dist > Math.max(GUARD_HEAR_RANGE, radius)) return;
    if (this.state === GUARD_STATE.CHASE) return;
    this.investigate = { x: nx, y: ny };
    this.state = GUARD_STATE.SUSPICIOUS;
    this.lookTimer = 0;
    this.chasePath = null;
  }

  update(dt, player, onSpotted) {
    // --- vision feeds the detection meter ---
    const vis = this.visibilityOf(player);
    if (vis > 0) {
      const rate = DETECT_FILL_FAR + (DETECT_FILL_CLOSE - DETECT_FILL_FAR) * vis;
      this.suspicion = Math.min(100, this.suspicion + rate * dt);
      this.lastSeen = { x: player.x, y: player.y };
      this.alarmTimer = ALARM_HOLD_SECONDS;
      if (this.suspicion >= 100 && this.state !== GUARD_STATE.CHASE) {
        this.state = GUARD_STATE.CHASE;
        this.chasePath = null;
        onSpotted();
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - DETECT_DRAIN * dt);
      if (this.alarmTimer > 0) this.alarmTimer -= dt;
    }

    // --- state behaviour ---
    // A glimpse (meter past halfway, not yet a full spot) makes a patrolling
    // guard stop and double-take toward the player: a fair warning that
    // also tells the player they were almost seen.
    if (this.state === GUARD_STATE.PATROL && this.suspicion > 45 && this.glimpseTimer <= 0) {
      this.glimpseTimer = 0.7;
      this.turnToFace(player);
    }
    if (this.state === GUARD_STATE.PATROL && this.glimpseTimer > 0) {
      this.glimpseTimer -= dt;
      this.moving = false;
    } else if (this.state === GUARD_STATE.PATROL) this.updatePatrol(dt);
    else if (this.state === GUARD_STATE.SUSPICIOUS) this.updateSuspicious(dt);
    else this.updateChase(dt, player);

    // --- footsteps, louder the closer the player is ---
    const speed = this.state === GUARD_STATE.CHASE ? GUARD_CHASE_SPEED : GUARD_PATROL_SPEED;
    this.stepTimer -= dt;
    if (this.stepTimer <= 0 && this.moving) {
      this.stepTimer = this.state === GUARD_STATE.CHASE ? 0.32 : 0.55;
      this.footstepDistance = Math.hypot(player.x - this.x, player.y - this.y);
      this.justStepped = true;
    }
  }

  moveToward(tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return true;
    const step = Math.min(dist, speed * this.speedScale * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    if (!this.world.circleHitsSolid(nx, ny, 13)) {
      this.x = nx;
      this.y = ny;
      this.moving = true;
      this.dir = Math.atan2(dy, dx);
      return dist - step < 3;
    }
    return false;
  }

  updatePatrol(dt) {
    this.moving = false;
    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
      // Look around while waiting at a waypoint: a slow sweep.
      this.dir += dt * 0.9;
      return;
    }
    const target = this.waypoints[this.wpIndex];
    if (this.moveToward(target.x, target.y, GUARD_PATROL_SPEED, dt)) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      this.waitTimer = this.pause;
    }
  }

  updateSuspicious(dt) {
    this.moving = false;
    if (!this.investigate) {
      this.state = GUARD_STATE.PATROL;
      return;
    }
    const arrived = this.moveToward(this.investigate.x, this.investigate.y, GUARD_PATROL_SPEED * 1.25, dt);
    if (arrived) {
      this.lookTimer += dt;
      this.dir += dt * 1.6; // scan the area, then give up
      if (this.lookTimer > 2.4) {
        this.investigate = null;
        this.state = GUARD_STATE.PATROL;
      }
    }
  }

  updateChase(dt, player) {
    this.moving = false;
    const target = this.lastSeen && this.alarmTimer > 0 ? this.lastSeen : { x: player.x, y: player.y };
    this.repathTimer -= dt;
    if (!this.chasePath || this.repathTimer <= 0) {
      this.repathTimer = 0.5;
      const sx = Math.floor(this.x / TILE);
      const sy = Math.floor(this.y / TILE);
      const tx = Math.floor(target.x / TILE);
      const ty = Math.floor(target.y / TILE);
      const path = this.world.findPath(sx, sy, tx, ty);
      this.chasePath = path ? path.slice(1) : null;
      this.chasePathIndex = 0;
    }
    let dest = target;
    if (this.chasePath && this.chasePathIndex < this.chasePath.length) {
      const [tx, ty] = this.chasePath[this.chasePathIndex];
      dest = { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
      if (Math.hypot(dest.x - this.x, dest.y - this.y) < 8) this.chasePathIndex++;
    }
    this.moveToward(dest.x, dest.y, GUARD_CHASE_SPEED, dt);
    if (this.alarmTimer <= 0 && this.suspicion < 30) {
      // Lost the trail: go look where the player was last seen, then patrol.
      this.investigate = this.lastSeen ? { ...this.lastSeen } : null;
      this.state = this.investigate ? GUARD_STATE.SUSPICIOUS : GUARD_STATE.PATROL;
      this.chasePath = null;
      this.lookTimer = 0;
    }
  }

  reset() {
    this.x = (this.spawn[0] + 0.5) * TILE;
    this.y = (this.spawn[1] + 0.5) * TILE;
    this.wpIndex = 1 % this.waypoints.length;
    this.state = GUARD_STATE.PATROL;
    this.suspicion = 0;
    this.lastSeen = null;
    this.investigate = null;
    this.alarmTimer = 0;
    this.chasePath = null;
    this.waitTimer = 0;
    this.turnToFace(this.waypoints[this.wpIndex]);
  }
}
