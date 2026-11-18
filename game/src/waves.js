// The wave director: builds each wave's spawn plan from the wave number.
// Waves 5 and 10 are boss waves; every wave blooms in on the music's beat.
import { ENEMY_KINDS } from './config.js';

export function wavePlan(wave) {
  const isBoss = wave === 5 || wave === 10;
  const plan = [];
  if (isBoss) {
    plan.push({ kind: 'bloomed', at: 0, boss: true });
    if (wave === 10) plan.push({ kind: 'spitter', at: 4 }, { kind: 'spitter', at: 8 });
  } else {
    const budget = 3 + wave * 2;
    const kinds = ['drifter'];
    if (wave >= 2) kinds.push('spitter');
    if (wave >= 3) kinds.push('darter');
    if (wave >= 4) kinds.push('brute');
    for (let i = 0; i < budget; i++) {
      plan.push({ kind: kinds[i % kinds.length], at: i * 1.6, boss: false });
    }
  }
  return { wave, isBoss, spawns: plan };
}

export function bpmForWave(wave) { return 112 + (wave - 1) * 3; }
export function enemySpec(kind) { return ENEMY_KINDS[kind]; }
