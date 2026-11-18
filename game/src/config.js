// Pulsebloom tuning: every number the game balances with lives here.
export const ARENA_RADIUS = 300;
export const ARENA_CENTER = { x: 640, y: 380 };

export const PLAYER = {
  radius: 14,
  speed: 240,          // px per second
  dashSpeed: 620,
  dashSeconds: 0.16,
  dashCooldown: 1.1,
  fireInterval: 0.13,  // seconds between shots while held
  bulletSpeed: 520,
  bulletDamage: 1,
  maxHealth: 4,
};

export const BEAT = {
  bpmBase: 112,        // rises a little every wave
  bpmPerWave: 3,
  window: 0.14,        // seconds around the beat a dash counts as on-beat
};

export const SCORING = {
  kill: 10,
  onBeatDash: 25,
  comboStep: 0.1,      // +10% score per combo stack, capped
  comboCap: 50,
  waveClear: 150,
};

export const PALETTE = {
  bg: '#0b0e1a',
  grid: '#141a2e',
  arena: '#1b2440',
  player: '#48d8f0',
  playerGlow: 'rgba(72,216,240,0.35)',
  bullet: '#bff6ff',
  enemy: ['#f4527f', '#f79c42', '#9d5cf0'],
  enemyBloom: 'rgba(244,82,127,0.30)',
  pickup: '#ffd94a',
  text: '#dfe8ff',
  dim: '#8b96b8',
  good: '#6ee7a0',
  bad: '#ff6b6b',
};

export const ENEMY_KINDS = {
  drifter:  { radius: 14, speed: 70,  health: 2, score: 1, tint: 0 },
  spitter:  { radius: 12, speed: 55,  health: 2, score: 2, tint: 1, shotEvery: 2.4, bulletSpeed: 190 },
  brute:    { radius: 24, speed: 40,  health: 6, score: 4, tint: 2 },
  darter:   { radius: 10, speed: 150, health: 1, score: 2, tint: 0, lunge: true },
  bloomed:  { radius: 18, speed: 60,  health: 4, score: 3, tint: 2, boss: true },
};
