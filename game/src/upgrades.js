// Boons: after every cleared wave the player picks one of three offered upgrades.
// Each boon is a name, a one-line description the HUD shows, and an apply() that edits the run.
const BOONS = [
  { key: 'swift',  name: 'Swift Ring',   desc: 'Move 12% faster',            apply: (s) => { s.player.speed *= 1.12; } },
  { key: 'rapid',  name: 'Rapid Bloom',  desc: 'Fire 15% faster',            apply: (s) => { s.player.fireInterval *= 0.85; } },
  { key: 'pierce', name: 'Pierce Petal', desc: 'Bullets pierce one enemy',   apply: (s) => { s.player.pierce += 1; } },
  { key: 'wide',   name: 'Twin Stamen',  desc: '+1 bullet per shot',         apply: (s) => { s.player.spread += 1; } },
  { key: 'heart',  name: 'Deep Root',    desc: '+1 max health, heal 1',      apply: (s) => { s.player.maxHealth += 1; s.player.health = Math.min(s.player.maxHealth, s.player.health + 1); } },
  { key: 'pulse',  name: 'Pulse Heart',  desc: 'On-beat dash bonus +15',     apply: (s) => { s.beatDashBonus += 15; } },
  { key: 'calm',   name: 'Still Water',  desc: 'Dash cooldown 25% shorter',  apply: (s) => { s.player.dashCooldown *= 0.75; } },
  { key: 'storm',  name: 'Storm Dust',   desc: 'Bullets 20% faster',         apply: (s) => { s.player.bulletSpeed *= 1.2; } },
  { key: 'gilded', name: 'Gilded Core',  desc: 'Every kill +25% score',      apply: (s) => { s.scoreMul += 0.25; } },
];

// Roll three distinct boons, weighted away from ones the run already took twice.
export function rollOffers(taken, random) {
  const pool = BOONS.filter((b) => (taken[b.key] || 0) < 2);
  const offers = [];
  while (offers.length < 3 && pool.length) {
    const i = random.int(0, pool.length - 1);
    offers.push(pool.splice(i, 1)[0]);
  }
  return offers;
}

export function boonByKey(key) { return BOONS.find((b) => b.key === key); }
