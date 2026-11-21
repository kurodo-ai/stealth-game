// Quiet Hands — everything the eye sees, drawn on one canvas.
// One clear job: paint the level, the vision cones, the actors, the HUD and
// every screen, from game state alone. No logic lives here.
import { TILE, COLS, ROWS, VIEW_W, VIEW_H, GUARD_VIEW_RANGE, GUARD_VIEW_HALF_ANGLE, PALETTE } from './config.js';
import { GUARD_STATE } from './guard.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
  }

  draw(state) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    this.drawFloor(state.world);
    this.drawExit(state.world);
    this.drawChips(state.world);
    this.drawCones(state.guards);
    this.drawWallsAndCover(state.world);
    this.drawPebbles(state.pebbles);
    this.drawGuards(state.guards);
    this.drawPlayer(state.player);
    this.drawNoiseRing(state.player);
    this.drawHud(state);
    if (state.screen === 'title') this.drawTitle(state);
    if (state.screen === 'briefing') this.drawBriefing(state);
    if (state.screen === 'caught') this.drawCaught(state);
    if (state.screen === 'levelclear') this.drawLevelClear(state);
    if (state.screen === 'win') this.drawWin(state);
    if (state.screen === 'paused') this.drawPaused();
  }

  drawFloor(world) {
    const ctx = this.ctx;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = world.tileAt(x, y);
        ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.floor : PALETTE.floorAlt;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        if (t === 'B') {
          ctx.fillStyle = PALETTE.bush;
          ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
          ctx.fillStyle = PALETTE.bushLeaf;
          for (const [ox, oy, r] of [[10, 12, 7], [26, 10, 8], [20, 26, 7], [30, 28, 6]]) {
            ctx.beginPath();
            ctx.arc(x * TILE + ox, y * TILE + oy, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }

  drawExit(world) {
    const ctx = this.ctx;
    const { x, y } = world.exit;
    const cx = x * TILE + TILE / 2;
    const cy = y * TILE + TILE / 2;
    const pulse = 0.75 + Math.sin(performance.now() / 300) * 0.25;
    ctx.fillStyle = PALETTE.exit;
    ctx.globalAlpha = 0.25 + 0.2 * pulse;
    ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = PALETTE.exit;
    ctx.lineWidth = 3;
    ctx.strokeRect(x * TILE + 4, y * TILE + 4, TILE - 8, TILE - 8);
    ctx.fillStyle = '#eafff3';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', cx, cy);
  }

  drawChips(world) {
    const ctx = this.ctx;
    for (const chip of world.chips) {
      if (chip.taken) continue;
      const cx = chip.tx * TILE + TILE / 2;
      const cy = chip.ty * TILE + TILE / 2;
      const bob = Math.sin(performance.now() / 250 + chip.tx) * 2;
      ctx.fillStyle = PALETTE.chip;
      ctx.beginPath();
      ctx.arc(cx, cy + bob, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a5c00';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('◆', cx, cy + bob);
    }
  }

  drawCones(guards) {
    const ctx = this.ctx;
    for (const g of guards) {
      // Faint patrol route: dots and a dashed line through the waypoints,
      // so the player can learn a patrol before stepping into it.
      if (g.state !== GUARD_STATE.CHASE) {
        ctx.strokeStyle = 'rgba(248, 113, 113, 0.28)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        g.waypoints.forEach((w, i) => {
          if (i === 0) ctx.moveTo(w.x, w.y);
          else ctx.lineTo(w.x, w.y);
        });
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(248, 113, 113, 0.4)';
        for (const w of g.waypoints) {
          ctx.beginPath();
          ctx.arc(w.x, w.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const alerted = g.state === GUARD_STATE.CHASE;
      const suspicious = g.state === GUARD_STATE.SUSPICIOUS;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.arc(g.x, g.y, GUARD_VIEW_RANGE, g.dir - GUARD_VIEW_HALF_ANGLE, g.dir + GUARD_VIEW_HALF_ANGLE);
      ctx.closePath();
      ctx.fillStyle = alerted ? PALETTE.coneAlert : PALETTE.coneCalm;
      ctx.fill();
      ctx.strokeStyle = alerted ? PALETTE.coneAlertEdge : PALETTE.coneEdge;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (suspicious || alerted) {
        // A "?" or "!" over a guard who heard or saw something.
        ctx.fillStyle = alerted ? '#ef4444' : '#facc15';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(alerted ? '!' : '?', g.x, g.y - 18);
      }
    }
  }

  drawWallsAndCover(world) {
    const ctx = this.ctx;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = world.tileAt(x, y);
        if (t === '#') {
          ctx.fillStyle = PALETTE.wall;
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
          ctx.fillStyle = PALETTE.wallTop;
          ctx.fillRect(x * TILE, y * TILE, TILE, 5);
        } else if (t === 'C') {
          ctx.fillStyle = PALETTE.crate;
          ctx.fillRect(x * TILE + 3, y * TILE + 3, TILE - 6, TILE - 6);
          ctx.strokeStyle = PALETTE.crateTop;
          ctx.lineWidth = 2;
          ctx.strokeRect(x * TILE + 6, y * TILE + 6, TILE - 12, TILE - 12);
          ctx.beginPath();
          ctx.moveTo(x * TILE + 3, y * TILE + 3);
          ctx.lineTo(x * TILE + TILE - 3, y * TILE + TILE - 3);
          ctx.moveTo(x * TILE + TILE - 3, y * TILE + 3);
          ctx.lineTo(x * TILE + 3, y * TILE + TILE - 3);
          ctx.stroke();
        }
      }
    }
  }

  drawPebbles(pebbles) {
    const ctx = this.ctx;
    for (const p of pebbles) {
      const k = Math.min(1, p.t / p.duration);
      const px = p.x + (p.tx - p.x) * k;
      const py = p.y + (p.ty - p.y) * k - Math.sin(k * Math.PI) * 26;
      ctx.fillStyle = '#d6dee8';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawGuards(guards) {
    const ctx = this.ctx;
    for (const g of guards) {
      // Body: a red disc with a dark visor pointing where he looks.
      ctx.fillStyle = GUARD_STATE.CHASE === g.state ? '#dc2626' : PALETTE.guard;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.guardDark;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      const vx = Math.cos(g.dir);
      const vy = Math.sin(g.dir);
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(g.x + vx * 7, g.y + vy * 7, 5, 0, Math.PI * 2);
      ctx.fill();
      // Detection ring: how close this guard is to raising the alarm.
      if (g.suspicion > 2) {
        ctx.strokeStyle = g.suspicion >= 100 ? '#ef4444' : '#facc15';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(g.x, g.y, 19, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * g.suspicion) / 100);
        ctx.stroke();
      }
    }
  }

  drawPlayer(player) {
    const ctx = this.ctx;
    ctx.fillStyle = player.hiddenInBush ? 'rgba(45, 212, 191, 0.45)' : PALETTE.player;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.playerDark;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Facing tick, so movement direction reads at a glance.
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + player.dirX * 16, player.y + player.dirY * 16);
    ctx.stroke();
  }

  drawNoiseRing(player) {
    if (!player.moving || player.noiseRadius <= 0) return;
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.noiseRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawHud(state) {
    const ctx = this.ctx;
    ctx.fillStyle = PALETTE.hudBg;
    ctx.fillRect(0, 0, VIEW_W, 44);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const level = state.levelDef;
    ctx.fillText(`${level.name}  ·  Level ${state.levelIndex + 1}/3`, 14, 23);
    const chipsGot = state.world.chips.filter((c) => c.taken).length;
    ctx.fillStyle = PALETTE.chip;
    ctx.fillText(`◆ ${chipsGot}/${level.chipsToWin}`, 250, 23);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`● pebbles ${state.player.pebbles}`, 360, 23);
    ctx.fillText(`time ${state.timerText}`, 500, 23);
    // Detection meter: the eye of the level.
    const d = state.detection;
    ctx.fillStyle = '#334155';
    ctx.fillRect(640, 14, 220, 16);
    ctx.fillStyle = d >= 100 ? '#ef4444' : d > 45 ? '#facc15' : '#37c978';
    ctx.fillRect(640, 14, (220 * Math.min(100, d)) / 100, 16);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.strokeRect(640, 14, 220, 16);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(d >= 100 ? 'SPOTTED!' : d > 45 ? 'suspicious…' : 'unseen', 872, 23);
    // Controls live on the bottom edge, clear of the meter.
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WASD / arrows move · Shift run · C sneak · Space / click: throw pebble · P pause · M mute', VIEW_W / 2, VIEW_H - 14);
    ctx.textAlign = 'left';
    if (state.toast) {
      ctx.fillStyle = 'rgba(10, 14, 20, 0.8)';
      const w = ctx.measureText(state.toast).width + 28;
      ctx.fillRect((VIEW_W - w) / 2, 56, w, 30);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.toast, VIEW_W / 2, 72);
      ctx.textAlign = 'left';
    }
  }

  overlayPanel(title, lines, hint) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(8, 12, 18, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(16, 22, 30, 0.95)';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    const w = 640;
    const h = 130 + lines.length * 30;
    const x = (VIEW_W - w) / 2;
    const y = (VIEW_H - h) / 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, VIEW_W / 2, y + 48);
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.textDim;
    lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, y + 96 + i * 30));
    if (hint) {
      ctx.fillStyle = PALETTE.chip;
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(hint, VIEW_W / 2, y + h - 26);
    }
    ctx.textAlign = 'left';
  }

  drawTitle(state) {
    this.overlayPanel(
      'QUIET HANDS',
      [
        'A top-down stealth game. Stay out of the yellow cones,',
        'hide in the bushes, throw pebbles to pull guards away,',
        'collect every ◆, then reach the EXIT unseen.',
        '',
        'Three levels. One pair of quiet hands.',
      ],
      'Press Enter to begin',
    );
  }

  drawBriefing(state) {
    const level = state.levelDef;
    this.overlayPanel(
      `Level ${state.levelIndex + 1} — ${level.name}`,
      [level.briefing, '', `${level.chipsToWin} chip${level.chipsToWin > 1 ? 's' : ''} to collect · ${level.pebbles} pebbles · ${level.guards.length} guards on patrol`],
      'Press Enter to start',
    );
  }

  drawCaught(state) {
    this.overlayPanel(
      'CAUGHT',
      [`A guard got a hand on you on ${state.levelDef.name}.`, `Attempts on this level: ${state.attempts}`],
      'Press R to try again',
    );
  }

  drawLevelClear(state) {
    this.overlayPanel(
      'CLEAN GETAWAY',
      [`${state.levelDef.name} cleared in ${state.timerText}.`, state.levelIndex + 1 < 3 ? 'One more floor to go.' : 'That was the last floor.'],
      'Press Enter for the next level',
    );
  }

  drawWin(state) {
    this.overlayPanel(
      'GHOST — NEVER SEEN',
      [`All three levels cleared in ${state.timerText}.`, `Caught ${state.totalCaught} time${state.totalCaught === 1 ? '' : 's'} · ${state.totalPebblesThrown} pebbles thrown.`],
      'Press Enter to play again',
    );
  }

  drawPaused() {
    this.overlayPanel('PAUSED', ['Take a breath. The guards are waiting.'], 'Press P to resume');
  }
}
