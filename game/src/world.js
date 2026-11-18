// The whole simulation in one pure-ish module: a run's state machine, the player,
// enemies, bullets and particles, all stepped at a fixed 60 Hz.
import { ARENA_RADIUS, ARENA_CENTER, PLAYER, BEAT, SCORING } from './config.js';
import { wavePlan, bpmForWave, enemySpec } from './waves.js';
import { rollOffers, boonByKey } from './upgrades.js';

export const STATE = { TITLE: 'title', PLAYING: 'playing', UPGRADE: 'upgrade', PAUSED: 'paused', GAME_OVER: 'game_over', VICTORY: 'victory' };

export function newRun(seed) {
  return {
    seed,
    state: STATE.TITLE,
    wave: 1,
    score: 0,
    best: Number(localStorage.getItem('pulsebloom.best') || 0),
    combo: 0,
    scoreMul: 1,
    beatDashBonus: SCORING.onBeatDash,
    beatFlash: 0,
    time: 0,
    waveTime: 0,
    plan: wavePlan(1),
    planIndex: 0,
    player: {
      x: ARENA_CENTER.x, y: ARENA_CENTER.y + 160,
      vx: 0, vy: 0,
      radius: PLAYER.radius,
      health: PLAYER.maxHealth, maxHealth: PLAYER.maxHealth,
      speed: PLAYER.speed, fireInterval: PLAYER.fireInterval,
      bulletSpeed: PLAYER.bulletSpeed, pierce: 0, spread: 0,
      dashTimer: 0, dashCooldown: 0, dashing: false,
      fireTimer: 0, aim: -Math.PI / 2,
      invuln: 0,
    },
    enemies: [], bullets: [], enemyBullets: [], particles: [], floaters: [],
    offers: [], taken: {},
    message: '', messageTimer: 0,
    stats: { kills: 0, dashes: 0, onBeatDashes: 0 },
  };
}

export function startRun(s) { s.state = STATE.PLAYING; s.waveTime = 0; s.message = 'Wave 1'; s.messageTimer = 2; }
export const isBossWave = (s) => s.plan.isBoss;

function spawnEnemy(s, spec) {
  const e = enemySpec(spec.kind);
  const a = s.random.angle();
  s.enemies.push({
    kind: spec.kind, spec: e, boss: spec.boss,
    x: ARENA_CENTER.x + Math.cos(a) * ARENA_RADIUS,
    y: ARENA_CENTER.y + Math.sin(a) * ARENA_RADIUS,
    health: e.health, shotTimer: e.shotEvery || 0,
    bloom: 0.8, // seconds of bloom-in before it acts
    lungeTimer: e.lunge ? 1.5 : 0,
  });
}

function addParticles(s, x, y, tint, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = s.random.angle(), sp = s.random.range(40, 200);
    s.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: s.random.range(0.3, 0.7), tint });
  }
}

function floatText(s, x, y, text, tint) {
  s.floaters.push({ x, y, text, tint, life: 0.9 });
}

export function addScore(s, base) {
  s.combo = Math.min(SCORING.comboCap, s.combo + 1);
  const gain = Math.round(base * (1 + s.combo * SCORING.comboStep) * s.scoreMul);
  s.score += gain;
  return gain;
}

function hurtPlayer(s, audio) {
  const p = s.player;
  if (p.invuln > 0 || p.dashing) return;
  p.health--;
  p.invuln = 1.2;
  s.combo = 0;
  audio.hurt();
  addParticles(s, p.x, p.y, '#ff6b6b', 16);
  if (p.health <= 0) endRun(s, false);
  else { s.message = 'Ouch!'; s.messageTimer = 1; }
}

function endRun(s, won) {
  s.stats.won = won;
  if (s.score > s.best) { s.best = s.score; localStorage.setItem('pulsebloom.best', String(s.best)); }
  s.state = won ? STATE.VICTORY : STATE.GAME_OVER;
}

export function nextWave(s) {
  s.wave++;
  if (s.wave > 10) { endRun(s, true); return; }
  s.plan = wavePlan(s.wave);
  s.planIndex = 0;
  s.waveTime = 0;
  s.state = STATE.PLAYING;
  s.message = s.plan.isBoss ? `Wave ${s.wave} — BOSS` : `Wave ${s.wave}`;
  s.messageTimer = 2;
}

// One fixed 60 Hz step. audio and input come from main.js; only the player's
// dash checks the beat, everything else is deterministic from state.
export function step(s, dt, input, audio, onBeat) {
  s.time += dt;
  s.beatFlash = Math.max(0, s.beatFlash - dt * 3);
  s.messageTimer = Math.max(0, s.messageTimer - dt);

  const p = s.player;
  p.invuln = Math.max(0, p.invuln - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);

  // movement
  let mx = 0, my = 0;
  if (input.down('KeyW', 'ArrowUp')) my -= 1;
  if (input.down('KeyS', 'ArrowDown')) my += 1;
  if (input.down('KeyA', 'ArrowLeft')) mx -= 1;
  if (input.down('KeyD', 'ArrowRight')) mx += 1;
  const len = Math.hypot(mx, my) || 1;
  p.aim = Math.atan2(input.mouse.y - p.y, input.mouse.x - p.x);

  if (p.dashing) {
    p.dashTimer -= dt;
    if (p.dashTimer <= 0) p.dashing = false;
  } else {
    p.vx = (mx / len) * p.speed;
    p.vy = (my / len) * p.speed;
  }
  if (input.pressed('Space') && p.dashCooldown <= 0 && !p.dashing) {
    const a = (mx || my) ? Math.atan2(my, mx) : p.aim;
    p.vx = Math.cos(a) * PLAYER.dashSpeed;
    p.vy = Math.sin(a) * PLAYER.dashSpeed;
    p.dashing = true;
    p.dashTimer = PLAYER.dashSeconds;
    p.dashCooldown = PLAYER.dashCooldown;
    s.stats.dashes++;
    if (onBeat) {
      s.stats.onBeatDashes++;
      const gain = addScore(s, s.beatDashBonus);
      floatText(s, p.x, p.y - 30, `ON BEAT +${gain}`, '#ffd94a');
      s.beatFlash = 1;
    }
    audio.dash();
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  // stay in the arena
  const dx = p.x - ARENA_CENTER.x, dy = p.y - ARENA_CENTER.y;
  const dist = Math.hypot(dx, dy);
  if (dist > ARENA_RADIUS - p.radius) {
    p.x = ARENA_CENTER.x + (dx / dist) * (ARENA_RADIUS - p.radius);
    p.y = ARENA_CENTER.y + (dy / dist) * (ARENA_RADIUS - p.radius);
  }

  // firing
  p.fireTimer -= dt;
  if (input.mouse.down && p.fireTimer <= 0) {
    p.fireTimer = p.fireInterval;
    const n = 1 + p.spread;
    for (let i = 0; i < n; i++) {
      const spread = n > 1 ? (i - (n - 1) / 2) * 0.12 : 0;
      s.bullets.push({ x: p.x, y: p.y, vx: Math.cos(p.aim + spread) * p.bulletSpeed, vy: Math.sin(p.aim + spread) * p.bulletSpeed, pierce: p.pierce, hit: new Set() });
    }
    audio.shoot();
  }

  // bullets
  for (const b of s.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt;
  }
  s.bullets = s.bullets.filter((b) => Math.hypot(b.x - ARENA_CENTER.x, b.y - ARENA_CENTER.y) < ARENA_RADIUS + 60);

  // spawns
  s.waveTime += dt;
  while (s.planIndex < s.plan.spawns.length && s.waveTime >= s.plan.spawns[s.planIndex].at) {
    spawnEnemy(s, s.plan.spawns[s.planIndex]);
    s.planIndex++;
  }

  // enemies
  for (const e of s.enemies) {
    if (e.bloom > 0) { e.bloom -= dt; continue; }
    const ex = p.x - e.x, ey = p.y - e.y;
    const ed = Math.hypot(ex, ey) || 1;
    let sp = e.spec.speed * (1 + s.wave * 0.03);
    if (e.spec.lunge) {
      e.lungeTimer -= dt;
      if (e.lungeTimer <= 0) { e.lungeTimer = 1.8; e.lungeVx = (ex / ed) * 340; e.lungeVy = (ey / ed) * 340; }
      if (e.lungeVx !== undefined) { e.x += e.lungeVx * dt; e.y += e.lungeVy * dt; sp = 0; }
    }
    if (sp) { e.x += (ex / ed) * sp * dt; e.y += (ey / ed) * sp * dt; }
    if (e.spec.shotEvery) {
      e.shotTimer -= dt;
      if (e.shotTimer <= 0) {
        e.shotTimer = e.spec.shotEvery;
        s.enemyBullets.push({ x: e.x, y: e.y, vx: (ex / ed) * e.spec.bulletSpeed, vy: (ey / ed) * e.spec.bulletSpeed });
      }
    }
    if (ed < e.spec.radius + p.radius) hurtPlayer(s, audio);
  }

  // enemy bullets
  for (const b of s.enemyBullets) {
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (Math.hypot(b.x - p.x, b.y - p.y) < p.radius + 5) { b.dead = true; hurtPlayer(s, audio); }
  }
  s.enemyBullets = s.enemyBullets.filter((b) => !b.dead && Math.hypot(b.x - ARENA_CENTER.x, b.y - ARENA_CENTER.y) < ARENA_RADIUS + 40);

  // bullet hits
  for (const b of s.bullets) {
    for (const e of s.enemies) {
      if (e.bloom > 0 || b.hit.has(e)) continue;
      if (Math.hypot(b.x - e.x, b.y - e.y) < e.spec.radius + 4) {
        e.health -= PLAYER.bulletDamage;
        b.hit.add(e);
        audio.hit();
        addParticles(s, b.x, b.y, '#bff6ff', 4);
        if (e.health <= 0) {
          e.dead = true;
          s.stats.kills++;
          const gain = addScore(s, e.spec.score * SCORING.kill);
          floatText(s, e.x, e.y, `+${gain}`, '#ffd94a');
          addParticles(s, e.x, e.y, '#f4527f', 14);
          audio.kill();
        }
        if (b.hit.size > b.pierce) b.dead = true;
        break;
      }
    }
  }
  s.bullets = s.bullets.filter((b) => !b.dead);
  s.enemies = s.enemies.filter((e) => !e.dead);

  // particles and floaters
  for (const pt of s.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt; }
  s.particles = s.particles.filter((pt) => pt.life > 0);
  for (const f of s.floaters) { f.y -= 40 * dt; f.life -= dt; }
  s.floaters = s.floaters.filter((f) => f.life > 0);

  // wave cleared?
  if (s.state === STATE.PLAYING && s.planIndex >= s.plan.spawns.length && !s.enemies.length) {
    addScore(s, SCORING.waveClear);
    audio.waveUp();
    if (s.wave >= 10) { endRun(s, true); }
    else {
      s.state = STATE.UPGRADE;
      s.offers = rollOffers(s.taken, s.random);
    }
  }
}

// The player picked a boon on the upgrade screen.
export function chooseBoon(s, key, audio) {
  const boon = boonByKey(key);
  if (!boon || s.state !== STATE.UPGRADE) return;
  boon.apply(s);
  s.taken[key] = (s.taken[key] || 0) + 1;
  audio.pickBoon();
  s.message = boon.name;
  s.messageTimer = 1.5;
  nextWave(s);
}

// Deterministic helper for ?shot scenes: fast-forwards the sim without input.
export function simulateSeconds(s, seconds, audio, onBeat) {
  const dt = 1 / 60;
  const idle = { down: () => false, pressed: () => false, mouse: { x: ARENA_CENTER.x, y: ARENA_CENTER.y - 120, down: true, clicked: false } };
  for (let i = 0; i < seconds * 60; i++) step(s, dt, idle, audio, false);
}
