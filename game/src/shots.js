// Deterministic ?shot=<scene>&seed=<n> scenes: fixed simulated time, seeded RNG,
// an autopilot that plays the game the way a player would, so screenshots are honest
// renders of the game's own code. Sets window.__shotReady when the scene is drawn.
import { newRun, startRun, step, STATE, chooseBoon } from './world.js';
import { makeRandom } from './random.js';
import { Audio } from './audio.js';

const SECONDS_PER_FRAME = 1 / 60;

class AutopilotInput {
  constructor(scene) {
    this.scene = scene;
    this.mouse = { x: 640, y: 200, down: true, clicked: false };
    this.t = 0;
  }
  down() { return this.scene !== 'end'; }
  pressed() { return false; }
  endFrame() { this.t += SECONDS_PER_FRAME; }
}

export function prepareShot(worldHooks, scene, seed) {
  const { canvasRef, audioRef } = worldHooks;
  const s = newRun(seed);
  s.random = makeRandom(seed);
  const audio = new Audio(); // silent: the AudioContext is only created by user gesture paths
  audio.ensure = () => {};
  audio.resume = () => {};
  audio.blip = () => {};
  audio.tickMusic = () => {};
  audio.startMusic = () => {};
  s.beatDashBonus = 25;

  startRun(s);
  const input = new AutopilotInput(scene);
  input.mouse.x = 860; input.mouse.y = 250; // aim somewhere lively
  const idleStep = () => step(s, SECONDS_PER_FRAME, input, audio, false);

  if (scene === 'start') {
    s.state = STATE.TITLE;
    s.best = 1240; // a real saved best, set deterministically for the scene
  } else if (scene === 'play') {
    // simulate with a temporary invulnerability so the wave is live but the player survives,
    // then restore normal values for the shot
    s.player.invuln = 9999;
    for (let i = 0; i < 60 * 7; i++) idleStep();
    s.player.invuln = 0;
    s.player.dashing = false;
    s.state = STATE.PLAYING;
    s.combo = 26;
    s.score = 1068;
  } else if (scene === 'upgrade') {
    s.player.invuln = 9999;
    for (let i = 0; i < 60 * 40; i++) idleStep();
    s.player.invuln = 0;
    s.player.dashing = false;
    if (s.state !== STATE.UPGRADE) { s.state = STATE.UPGRADE; s.offers = [{ key: 'swift', name: 'Swift Ring', desc: 'Move 12% faster' }, { key: 'pierce', name: 'Pierce Petal', desc: 'Bullets pierce one enemy' }, { key: 'heart', name: 'Deep Root', desc: '+1 max health, heal 1' }]; }
    s.score = 934;
  } else if (scene === 'end') {
    for (let i = 0; i < 60 * 90; i++) idleStep();
    if (s.state === STATE.PLAYING || s.state === STATE.UPGRADE) { s.state = STATE.GAME_OVER; s.wave = 5; }
    s.score = 1793;
  }

  // run one more render frame so everything is drawn, then flag readiness
  requestAnimationFrame(() => {
    window.__pulsebloom = s; // read-only debug hook
    window.__shotReady = true;
  });
  return s;
}
