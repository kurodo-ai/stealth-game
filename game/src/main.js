// Quiet Hands — the game itself: state machine, input, loop, scoring.
// One clear job: own the screens (title → briefing → playing → caught /
// level clear → win), step the world, and hand the renderer a state to paint.
import { TILE, VIEW_W, VIEW_H, CATCH_DISTANCE, GUARD_VIEW_RANGE } from './config.js';
import { LEVELS } from './levels.js';
import { World } from './world.js';
import { Guard, GUARD_STATE } from './guard.js';
import { Player } from './player.js';
import { Renderer } from './render.js';
import { SoundEngine } from './audio.js';

const SCREENS = ['title', 'briefing', 'playing', 'caught', 'levelclear', 'win', 'paused'];

export class Game {
  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    this.sound = new SoundEngine();
    this.input = { up: false, down: false, left: false, right: false, run: false, sneak: false };
    this.screen = 'title';
    this.levelIndex = 0;
    this.attempts = 1;
    this.totalCaught = 0;
    this.totalPebblesThrown = 0;
    this.levelTime = 0;
    this.totalTime = 0;
    this.pebbles = [];
    this.toast = '';
    this.toastTimer = 0;
    this.mouse = { x: 0, y: 0 };
    this.loadLevel(0);
    this.attachInput(canvas);
    this.lastTick = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  get levelDef() {
    return LEVELS[this.levelIndex];
  }

  get detection() {
    if (!this.guards.length) return 0;
    return Math.max(...this.guards.map((g) => g.suspicion));
  }

  get timerText() {
    const t = this.screen === 'win' ? this.totalTime : this.levelTime;
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.levelDefRef = LEVELS[index];
    this.world = new World(LEVELS[index]);
    this.player = new Player(this.world);
    this.player.pebbles = LEVELS[index].pebbles;
    this.guards = LEVELS[index].guards.map((g) => new Guard(g, LEVELS[index].guardSpeed, this.world));
    this.pebbles = [];
    this.levelTime = 0;
    this.attempts = 1;
  }

  attachInput(canvas) {
    const keys = {
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
      ShiftLeft: 'run', ShiftRight: 'run',
      KeyC: 'sneak',
    };
    window.addEventListener('keydown', (e) => {
      this.sound.ensure();
      if (keys[e.code] !== undefined) {
        this.input[keys[e.code]] = true;
        e.preventDefault();
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.screen === 'playing') this.throwPebbleAt(this.mouse.x, this.mouse.y);
      }
      if (e.code === 'Enter') this.advance();
      if (e.code === 'KeyR' && (this.screen === 'caught' || this.screen === 'playing')) this.retryLevel();
      if (e.code === 'KeyM') {
        const muted = this.sound.toggleMute();
        this.showToast(muted ? 'Sound off' : 'Sound on');
      }
      if (e.code === 'KeyP') {
        if (this.screen === 'playing') this.screen = 'paused';
        else if (this.screen === 'paused') this.screen = 'playing';
      }
    });
    window.addEventListener('keyup', (e) => {
      if (keys[e.code] !== undefined) this.input[keys[e.code]] = false;
    });
    // Alt-tabbing away mid-sneak should not get the player caught.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.screen === 'playing') this.screen = 'paused';
    });
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * VIEW_W;
      this.mouse.y = ((e.clientY - rect.top) / rect.height) * VIEW_H;
    });
    canvas.addEventListener('click', (e) => {
      this.sound.ensure();
      if (this.screen !== 'playing') {
        this.advance();
        return;
      }
      this.throwPebbleAt(this.mouse.x, this.mouse.y);
    });
  }

  advance() {
    if (this.screen === 'title') {
      this.screen = 'briefing';
    } else if (this.screen === 'briefing') {
      this.screen = 'playing';
      const level = this.levelDef;
      this.showToast(`${level.chipsToWin} chip${level.chipsToWin > 1 ? 's' : ''} to collect — then reach the EXIT`);
    } else if (this.screen === 'levelclear') {
      if (this.levelIndex + 1 < LEVELS.length) {
        this.loadLevel(this.levelIndex + 1);
        this.screen = 'briefing';
      } else {
        this.screen = 'win';
      }
    } else if (this.screen === 'win') {
      this.totalCaught = 0;
      this.totalPebblesThrown = 0;
      this.totalTime = 0;
      this.loadLevel(0);
      this.screen = 'title';
    } else if (this.screen === 'caught') {
      this.retryLevel();
    }
  }

  retryLevel() {
    this.loadLevel(this.levelIndex);
    this.screen = 'playing';
  }

  throwPebbleAt(x, y) {
    const pebble = this.player.throwPebble(x, y);
    if (!pebble) {
      this.showToast('No pebbles left');
      return;
    }
    this.totalPebblesThrown += 1;
    this.pebbles.push(pebble);
    this.sound.pebbleThrow();
  }

  showToast(text) {
    this.toast = text;
    this.toastTimer = 2.2;
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.lastTick) / 1000);
    this.lastTick = now;
    if (this.screen === 'playing') this.update(dt);
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toast = '';
    }
    this.renderer.draw(this);
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.levelTime += dt;

    // --- player ---
    this.player.update(dt, this.input);
    if (this.player.justStepped) this.sound.step(this.player.running);
    // Running is loud: guards in earshot turn toward the noise.
    if (this.player.moving && this.player.noiseRadius > 0) {
      for (const g of this.guards) {
        const d = Math.hypot(g.x - this.player.x, g.y - this.player.y);
        if (d < this.player.noiseRadius + 60 && g.state === GUARD_STATE.PATROL) {
          g.hearNoise(this.player.x, this.player.y, this.player.noiseRadius);
        }
      }
    }

    // --- pebbles ---
    for (const p of this.pebbles) p.t += dt;
    for (const p of this.pebbles.filter((p) => p.t >= p.duration && !p.landed)) {
      p.landed = true;
      this.sound.pebbleLand();
      for (const g of this.guards) g.hearNoise(p.tx, p.ty, p.noiseRadius);
    }
    this.pebbles = this.pebbles.filter((p) => p.t < p.duration + 0.4);

    // --- guards ---
    let spotted = false;
    for (const g of this.guards) {
      g.update(dt, this.player, () => {
        spotted = true;
      });
      if (g.justStepped) {
        const d = Math.hypot(g.x - this.player.x, g.y - this.player.y);
        this.sound.guardStep(d);
        g.justStepped = false;
      }
    }
    if (spotted && !this.alertPlayed) {
      this.sound.alert();
      this.showToast('Spotted! Break line of sight!');
      this.alertPlayed = true;
    }
    if (this.detection < 40) this.alertPlayed = false;

    // --- caught? ---
    const anyChasing = this.guards.some((g) => g.state === GUARD_STATE.CHASE);
    if (anyChasing) {
      for (const g of this.guards) {
        if (Math.hypot(g.x - this.player.x, g.y - this.player.y) < CATCH_DISTANCE) {
          this.caught();
          return;
        }
      }
    }

    // --- pickups ---
    for (const chip of this.world.chips) {
      if (chip.taken) continue;
      const cx = chip.tx * TILE + TILE / 2;
      const cy = chip.ty * TILE + TILE / 2;
      if (Math.hypot(cx - this.player.x, cy - this.player.y) < 26) {
        chip.taken = true;
        this.sound.pickup();
        const left = this.world.chips.filter((c) => !c.taken).length;
        this.showToast(left === 0 ? 'All chips collected — reach the EXIT!' : `Chip secured (${this.world.chips.filter((c) => c.taken).length}/${this.world.chips.length})`);
      }
    }

    // --- exit ---
    const allTaken = this.world.chips.every((c) => c.taken);
    if (allTaken) {
      const ex = this.world.exit.x * TILE + TILE / 2;
      const ey = this.world.exit.y * TILE + TILE / 2;
      if (Math.hypot(ex - this.player.x, ey - this.player.y) < 26) {
        this.totalTime += this.levelTime;
        this.sound.levelClear();
        this.screen = this.levelIndex + 1 < LEVELS.length ? 'levelclear' : 'win';
        if (this.screen === 'win') this.sound.gameWin();
      }
    }
  }

  caught() {
    this.totalCaught += 1;
    this.attempts += 1;
    this.sound.caught();
    this.screen = 'caught';
  }

  // Staged states for screenshots: real game states, set up through the same
  // code paths as play. ?shot=start|play|hunt|clear
  applyShot(name) {
    if (name === 'start') {
      this.loadLevel(0);
      this.screen = 'title';
    } else if (name === 'play') {
      this.loadLevel(0);
      this.screen = 'playing';
      // Player mid-room, one guard's cone sweeping across the path ahead.
      this.player.x = 10.5 * TILE;
      this.player.y = 9.5 * TILE;
      this.player.dirX = 1;
      this.player.dirY = 0;
      const g = this.guards[0];
      g.x = 12.5 * TILE;
      g.y = 13.5 * TILE;
      g.dir = -Math.PI / 2;
      g.state = GUARD_STATE.PATROL;
      const g2 = this.guards[1];
      g2.x = 24.5 * TILE;
      g2.y = 6.5 * TILE;
      g2.dir = Math.PI;
      g2.suspicion = 62;
      g2.state = GUARD_STATE.SUSPICIOUS;
      this.showToast('Stay out of the yellow cones');
    } else if (name === 'hunt') {
      this.loadLevel(1);
      this.screen = 'playing';
      this.player.x = 6.5 * TILE;
      this.player.y = 15.5 * TILE;
      this.player.dirX = 0;
      this.player.dirY = -1;
      this.player.sneaking = true;
      for (const g of this.guards) {
        g.state = GUARD_STATE.CHASE;
        g.suspicion = 100;
        g.lastSeen = { x: this.player.x, y: this.player.y };
        g.alarmTimer = 6;
      }
      this.guards[0].x = 8.5 * TILE;
      this.guards[0].y = 14.5 * TILE;
      this.guards[0].dir = Math.PI;
      this.showToast('Spotted! Break line of sight!');
    } else if (name === 'clear') {
      this.loadLevel(0);
      this.world.chips.forEach((c) => { c.taken = true; });
      this.levelTime = 87.4;
      this.screen = 'levelclear';
    }
  }
}

// Boot: the page owns the canvas; the game owns everything else.
const canvas = document.getElementById('game');
const game = new Game(canvas);
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) game.applyShot(shot);
// Debug handle for automated playtests: read state, never write the game.
window.__game = game;
