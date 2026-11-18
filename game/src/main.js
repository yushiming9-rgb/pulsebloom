// The page shell and game loop: boots the world, wires input and audio, runs the fixed-step
// simulation inside a requestAnimationFrame loop, and renders through render.js + screens.js.
// With ?shot=<scene> it instead stages that deterministic scene, renders it once and sets
// window.__shotReady for the screenshot harness.

import { FIELD, STEP } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { computeTransform, drawWorld } from './render.js';
import { drawScreen } from './screens.js';
import { SCREEN_OVER, SCREEN_PAUSE, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN, createWorld } from './world.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas, FIELD);
const audio = createAudio();
const world = createWorld(Number(new URLSearchParams(window.location.search).get('seed') ?? 1) || 1);
world.reset();
// A read-only hook for the automated play-test harness; the game never depends on it.
window.__pulsebloom = world;

function readBest() {
  try {
    return Number(localStorage.getItem('pulsebloom.best') ?? 0) || 0;
  } catch {
    return 0;
  }
}
function writeBest(score) {
  try {
    localStorage.setItem('pulsebloom.best', String(score));
  } catch { /* private mode: the best score just does not persist */ }
}
world.state.best = readBest();

function finishRun() {
  if (world.state.score > world.state.best) {
    world.state.best = world.state.score;
    writeBest(world.state.best);
  }
}

function buildCommand() {
  return {
    moveX: (input.holding('right') ? 1 : 0) - (input.holding('left') ? 1 : 0),
    moveY: (input.holding('down') ? 1 : 0) - (input.holding('up') ? 1 : 0),
    aimX: input.mouse.x,
    aimY: input.mouse.y,
    shoot: input.mouse.down || input.holding('k'),
    dash: input.tapped(' ') || input.tapped('Shift'),
  };
}

/** One screen-state's menu actions, checked each frame. */
function menuActions() {
  const s = world.state;
  const confirm = input.tapped('Enter') || input.mouse.clicked;
  if (s.screen === SCREEN_TITLE && confirm) {
    audio.resume();
    world.beginRun();
    audio.setBpm(s.bpm);
    audio.resetMusicClock();
    s.onWaveStart = () => audio.sfx.waveStart();
    s.onShoot = () => audio.sfx.shoot();
    s.onHit = () => audio.sfx.hit();
    s.onKill = () => audio.sfx.kill();
    s.onHurt = () => audio.sfx.hurt();
    s.onBpm = (bpm) => audio.setBpm(bpm);
  } else if (s.screen === SCREEN_UPGRADE) {
    if (input.tapped('1')) world.chooseUpgrade(0);
    else if (input.tapped('2')) world.chooseUpgrade(1);
    else if (input.tapped('3')) world.chooseUpgrade(2);
    if (s.screen !== SCREEN_UPGRADE) audio.sfx.upgrade();
  } else if ((s.screen === SCREEN_OVER || s.screen === SCREEN_WIN) && (confirm || input.tapped('r'))) {
    finishRun();
    world.reset();
    world.state.best = readBest();
    world.beginRun();
    audio.resetMusicClock();
    audio.setBpm(world.state.bpm);
  }
  if (input.tapped('m')) audio.toggleMute();
  if (s.screen === 'play' && input.tapped('p')) s.screen = SCREEN_PAUSE;
  else if (s.screen === SCREEN_PAUSE && input.tapped('p')) s.screen = 'play';
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const transform = computeTransform(canvas.width, canvas.height);
  input.setTransform(transform.scale, transform.offsetX, transform.offsetY);
}
window.addEventListener('resize', resize);
resize();

const shotName = new URLSearchParams(window.location.search).get('shot');
if (shotName) {
  // Deterministic screenshot scene: simulate, render exactly one frame, then signal.
  stageShot(shotName, world);
  const transform = computeTransform(canvas.width, canvas.height);
  ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.offsetX, transform.offsetY);
  drawWorld(ctx, world, { x: world.state.player.x + 200, y: world.state.player.y });
  drawScreen(ctx, world, false);
  window.__shotReady = true;
} else {
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let elapsed = (now - last) / 1000;
    last = now;
    if (elapsed > 0.25) elapsed = 0.25;
    menuActions();
    const s = world.state;
    if (s.screen === 'play' || s.screen === SCREEN_PAUSE || s.screen === SCREEN_UPGRADE || s.screen === SCREEN_OVER || s.screen === SCREEN_WIN) {
      if (s.screen === 'play') {
        accumulator += elapsed;
        while (accumulator >= STEP) {
          world.step(STEP, buildCommand(), false);
          accumulator -= STEP;
        }
        audio.scheduleMusic(s.lastBeat, s.secondsPerBeat);
      } else {
        // Frozen surfaces still animate (flashes, prompts) without simulating combat.
        s.time += elapsed;
        finishRun();
      }
    }
    const transform = computeTransform(canvas.width, canvas.height);
    ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.offsetX, transform.offsetY);
    ctx.clearRect(-transform.offsetX / transform.scale, -transform.offsetY / transform.scale, canvas.width / transform.scale, canvas.height / transform.scale);
    drawWorld(ctx, world, input.mouse);
    drawScreen(ctx, world, audio.muted);
    input.endFrame();
  }
  requestAnimationFrame(frame);
}
