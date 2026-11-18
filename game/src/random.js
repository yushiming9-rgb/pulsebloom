// A small seeded random number generator (mulberry32): the same seed gives the same game,
// which is what makes the screenshot scenes repeatable.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform float in [low, high). */
export function rangeBetween(random, low, high) {
  return low + (high - low) * random();
}

/** A whole number in [low, high] inclusive. */
export function intBetween(random, low, high) {
  return low + Math.floor((high + 1 - low) * random());
}

/** A fair pick from a list. */
export function pickOne(random, list) {
  return list[Math.floor(random() * list.length)];
}
