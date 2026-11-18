// The wave director: what each wave contains, which beat spawns what, and the boss rule.
// Waves 5 and 10 crown a boss; the last wave's defeat wins the run.

import { ENEMIES, WAVES } from './config.js';
import { intBetween, rangeBetween } from './random.js';

/** Enemy speed and health grow gently with the wave index (1-based). */
function scaleFor(wave) {
  return 1 + (wave - 1) * 0.12;
}

/** A spawn point inside the visible arena, kept clear of the centre where the player starts. */
function spawnPoint(random) {
  for (let tries = 0; tries < 20; tries += 1) {
    const x = rangeBetween(random, 80, 1200);
    const y = rangeBetween(random, 80, 640);
    if (Math.hypot(x - 640, y - 360) > 280) return { x, y };
  }
  return { x: 100, y: 100 };
}

/** The spawn plan for a wave: an ordered list of { type, beat, x, y, scale }. */
export function planWave(wave, random) {
  const plan = [];
  let beat = 4;
  const isBoss = wave % 5 === 0;
  if (isBoss) {
    plan.push({ type: 'boss', beat, x: 640, y: -80, scale: scaleFor(wave) });
    for (let i = 0; i < 3 + wave; i += 1) {
      const at = spawnPoint(random);
      plan.push({ type: 'drifter', beat: beat + 4 + i * 2, x: at.x, y: at.y, scale: scaleFor(wave) });
    }
    return plan;
  }
  const drifters = 2 + Math.floor(wave * 1.4);
  const darts = wave >= 2 ? 1 + Math.floor(wave * 0.7) : 0;
  const blooms = wave >= 3 ? Math.floor(wave / 3) : 0;
  for (let i = 0; i < drifters; i += 1) {
    const at = spawnPoint(random);
    plan.push({ type: 'drifter', beat, x: at.x, y: at.y, scale: scaleFor(wave) });
    beat += WAVES.spawnBeats;
  }
  for (let i = 0; i < darts; i += 1) {
    const at = spawnPoint(random);
    plan.push({ type: 'dart', beat, x: at.x, y: at.y, scale: scaleFor(wave) });
    beat += Math.max(1, WAVES.spawnBeats - 1);
  }
  for (let i = 0; i < blooms; i += 1) {
    const at = spawnPoint(random);
    plan.push({ type: 'bloom', beat, x: at.x, y: at.y, scale: scaleFor(wave) });
    beat += WAVES.spawnBeats;
  }
  // Shuffle the non-boss queue a little so the rhythm of arrivals varies.
  for (let i = plan.length - 1; i > 1; i -= 1) {
    const j = intBetween(random, 1, i);
    [plan[i], plan[j]] = [plan[j], plan[i]];
  }
  return plan;
}

export function statsFor(type, scale) {
  const base = ENEMIES[type];
  return {
    ...base,
    hp: Math.ceil(base.hp * scale),
    speed: base.speed !== undefined ? base.speed * scale : undefined,
    speedPerWave: undefined,
  };
}
