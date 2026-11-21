// Quiet Hands — shared tuning numbers and palette.
// One clear job: every magic number the rest of the game uses lives here,
// so balance changes never touch game logic.
export const TILE = 40;
export const COLS = 32;
export const ROWS = 20;
export const VIEW_W = COLS * TILE; // 1280
export const VIEW_H = ROWS * TILE; // 800

export const PLAYER_WALK_SPEED = 150;
export const PLAYER_RUN_SPEED = 250;
export const PLAYER_SNEAK_SPEED = 92;

export const NOISE_WALK = 42;
export const NOISE_RUN = 135;
export const NOISE_SNEAK = 0;
export const NOISE_PEBBLE = 170;

export const GUARD_PATROL_SPEED = 78;
export const GUARD_CHASE_SPEED = 168;
export const GUARD_VIEW_RANGE = 205;
export const GUARD_VIEW_HALF_ANGLE = 0.62; // about 35 degrees each side
export const GUARD_HEAR_RANGE = 190;

export const DETECT_FILL_CLOSE = 95; // per second, point blank
export const DETECT_FILL_FAR = 34; // per second, at the edge of the cone
export const DETECT_DRAIN = 26; // per second while unseen
export const DETECT_SNEAK_FACTOR = 0.5; // crouched player is harder to spot
export const DETECT_BUSH_FACTOR = 0.12; // hidden in a bush, almost invisible
export const ALARM_HOLD_SECONDS = 6; // guards keep hunting this long after losing sight
export const CATCH_DISTANCE = 26;

export const PALETTE = {
  floor: '#232a33',
  floorAlt: '#20262e',
  floorLight: '#2b333d',
  wall: '#4a5568',
  wallTop: '#5d6b80',
  crate: '#7a5c33',
  crateTop: '#96742f',
  bush: '#2e5d3a',
  bushLeaf: '#3f7d4e',
  exit: '#37c978',
  chip: '#ffd166',
  player: '#2dd4bf',
  playerDark: '#0f766e',
  guard: '#f87171',
  guardDark: '#991b1b',
  coneCalm: 'rgba(250, 204, 21, 0.20)',
  coneEdge: 'rgba(250, 204, 21, 0.55)',
  coneAlert: 'rgba(239, 68, 68, 0.30)',
  coneAlertEdge: 'rgba(239, 68, 68, 0.7)',
  hudBg: 'rgba(10, 14, 20, 0.78)',
  text: '#e8eef4',
  textDim: '#9fb0c0',
  danger: '#f87171',
};
