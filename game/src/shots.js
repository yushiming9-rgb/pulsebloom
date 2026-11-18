// The screenshot scenes behind ?shot=start|play|upgrade|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a small autopilot, so
// the frame is what real play looks like and the same seed always gives the same frame.

import { STEP } from './config.js';

const START_SECONDS = 3;
const LIMIT_SECONDS = 900;

function nearestEnemy(s) {
  let best = null;
  let bestDist = Infinity;
  for (const enemy of s.enemies) {
    const d = Math.hypot(enemy.x - s.player.x, enemy.y - s.player.y);
    if (d < bestDist) {
      bestDist = d;
      best = enemy;
    }
  }
  return best;
}

/** Dodge toward the safest side, aim at the closest foe, fire, and dash out of tight spots. */
function autopilot(world, cowardly) {
  const s = world.state;
  const p = s.player;
  const enemy = nearestEnemy(s);
  let moveX = 0;
  let moveY = 0;
  if (enemy) {
    const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
    const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
    const wanted = cowardly ? 320 : 200;
    const drive = dist < wanted ? 1 : dist > wanted + 120 ? -1 : 0;
    moveX = Math.cos(angle) * drive;
    moveY = Math.sin(angle) * drive;
  } else {
    moveX = (640 - p.x) / 400;
    moveY = (360 - p.y) / 400;
  }
  moveX += ((640 - p.x) / 640) * 0.5;
  moveY += ((360 - p.y) / 360) * 0.5;
  const dash = enemy !== null && Math.hypot(enemy.x - p.x, enemy.y - p.y) < 110 && p.dashCooldownTimer <= 0;
  if (!cowardly) return { moveX: 0, moveY: 0, aimX: enemy ? enemy.x : p.x + 100, aimY: enemy ? enemy.y : p.y, shoot: true, dash: false };
  return { moveX, moveY, aimX: enemy ? enemy.x : p.x + 200, aimY: enemy ? enemy.y : p.y, shoot: enemy !== null, dash };
}

/** Auto-pick a boon so the pilot keeps climbing the waves. */
function autoPick(world) {
  world.chooseUpgrade(Math.floor(world.random() * world.state.offers.length));
}

/**
 * Set `world` to the named scene (start, play, upgrade or end; anything else is start) and
 * return the screen it staged.
 */
export function stageShot(name, world) {
  world.reset();
  world.state.shotMode = true;
  if (name === 'start') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, { moveX: 0, moveY: 0, aimX: 900, aimY: 300, shoot: false, dash: false }, true);
    return world.state.screen;
  }
  // play: fight forward and stop on a rich mid-wave frame; upgrade: stop on the choice;
  // end: a passive pilot that lets the swarm win, then the results screen settles.
  const wantMidWave = name === 'play';
  for (let i = 0; i < LIMIT_SECONDS / STEP; i += 1) {
    if (world.state.screen === 'title') world.beginRun();
    if (world.state.screen === 'upgrade') {
      if (name === 'upgrade') break;
      autoPick(world);
    }
    const event = world.step(STEP, autopilot(world, name !== 'end'), true);
    if (event & 1) break;
    if (wantMidWave && world.state.wave >= 3 && world.state.enemies.length >= 6 && i > 18 / STEP) break;
    if (world.state.time > 60 && !wantMidWave && name === 'play') break;
  }
  if (name === 'end') {
    for (let i = 0; i < 1.5 / STEP; i += 1) world.step(STEP, { moveX: 0, moveY: 0, aimX: 0, aimY: 0, shoot: false, dash: false }, true);
  }
  return world.state.screen;
}
