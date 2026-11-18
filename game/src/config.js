// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer letterboxes it to the window, so no rule below depends on screen size.

export const FIELD = { width: 1280, height: 720, centreX: 640, centreY: 360, margin: 40 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 15,
  speed: 350,
  hp: 3,
  hurtInvuln: 1.2,
  fireInterval: 0.16,
  bulletSpeed: 640,
  bulletDamage: 1,
  bulletRadius: 5,
  dashSpeed: 1050,
  dashTime: 0.16,
  dashCooldown: 1.1,
  dashBeatBonus: 50,
};

export const COMBO = { decaySeconds: 3, scorePerEnemy: 10 };

export const WAVES = { total: 10, bpmStart: 112, bpmPerWave: 3, spawnBeats: 2 };

/** Enemy archetypes: speed/hp scale mildly with wave. */
export const ENEMIES = {
  drifter: { radius: 16, hp: 2, speed: 65, speedPerWave: 9, score: 10 },
  dart: { radius: 11, hp: 1, chargeSpeed: 560, chargeTime: 0.5, telegraph: 0.65, speed: 60, score: 15 },
  bloom: { radius: 20, hp: 4, speed: 42, score: 25, shards: 2 },
  shard: { radius: 9, hp: 1, speed: 190, score: 5 },
  boss: { radius: 48, hp: 46, speed: 55, score: 300, burstShots: 8, burstBeatEvery: 2 },
};

export const BULLET = { enemySpeed: 260, enemyRadius: 7 };

export const SCORE_PER_BEAT_DASH = 50;

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'pulsebloom.best';

export const PALETTE = {
  backdrop: '#0b0e1a',
  arena: '#11152a',
  grid: '#1a2040',
  player: '#63e6ff',
  playerCore: '#eaffff',
  bullet: '#ffe08a',
  enemyA: '#ff5d8f',
  enemyB: '#ff9a5d',
  enemyC: '#c96bff',
  enemyBullet: '#ff7d7d',
  panel: 'rgba(16,20,40,0.88)',
  text: '#eef1ff',
  muted: '#8b93b3',
  good: '#7dffa8',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
