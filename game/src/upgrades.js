// The player's growth choices. Every wave cleared pauses the fight and offers three of these;
// each entry names itself for the dossier outline and applies its own effect to the state.

export const UPGRADES = [
  { id: 'sharp', name: 'Sharpened Rounds', detail: '+1 bullet damage', apply: (s) => { s.bulletDamage += 1; } },
  { id: 'rapid', name: 'Rapid Pulse', detail: 'Shoot 25% faster', apply: (s) => { s.fireInterval *= 0.75; } },
  { id: 'split', name: 'Twin Bloom', detail: '+1 bullet in a spread', apply: (s) => { s.spread += 1; } },
  { id: 'swift', name: 'Fleet Foot', detail: '+15% move speed', apply: (s) => { s.playerSpeed *= 1.15; } },
  { id: 'quickdash', name: 'Echo Step', detail: 'Dash cooldown -35%', apply: (s) => { s.dashCooldown *= 0.65; } },
  { id: 'pierce', name: 'Lance Light', detail: 'Bullets pierce one extra foe', apply: (s) => { s.pierce += 1; } },
  { id: 'heart', name: 'Second Wind', detail: '+1 heart, heal one', apply: (s) => { s.maxHp += 1; s.hp = Math.min(s.hp + 1, s.maxHp); } },
  { id: 'bounty', name: 'Bloom Bounty', detail: 'Enemies worth +50% score', apply: (s) => { s.scoreMult *= 1.5; } },
  { id: 'bigshot', name: 'Heavy Glow', detail: 'Bigger bullets, +knockback', apply: (s) => { s.bulletRadius += 2; s.knockback += 90; } },
];

/** Three distinct upgrades, seeded so a replay of the same seed meets the same offers. */
export function rollOffers(random, taken, count = 3) {
  const pool = UPGRADES.filter((u) => !taken.has(u.id) || u.id === 'heart' || u.id === 'bounty');
  const offers = [];
  const bag = pool.slice();
  while (offers.length < count && bag.length > 0) {
    const index = Math.floor(random() * bag.length);
    offers.push(bag[index]);
    bag.splice(index, 1);
  }
  return offers;
}
