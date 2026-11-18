// Entry point: fixed-step game loop, screen transitions, the ?shot protocol.
import { Input } from './input.js';
import { Audio } from './audio.js';
import { draw } from './render.js';
import { newRun, startRun, step, STATE, chooseBoon } from './world.js';
import { prepareShot } from './shots.js';
import { bpmForWave } from './waves.js';
import { makeRandom } from './random.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const STEP = 1 / 60;
const MAX_FRAME = 0.1;

const params = new URLSearchParams(location.search);
const shotScene = params.get('shot');

const audio = new Audio();
let s = newRun(Number(params.get('seed') || Date.now()));
s.random = makeRandom(s.seed);
const input = new Input(canvas);
let beatWindowTimer = 0; // true within the beat's grace window

// on-beat check: the beat clock the music keeps
function onBeatNow() {
  const secondsPerBeat = 60 / bpmForWave(s.wave);
  const since = audio.ctx ? (audio.ctx.currentTime - (audio.nextBeatAt - secondsPerBeat)) : 0;
  return Math.abs(since) < 0.14 || Math.abs(since - secondsPerBeat) < 0.14;
}

function enterKey() {
  if (s.state === STATE.TITLE || s.state === STATE.GAME_OVER || s.state === STATE.VICTORY) {
    s = newRun(Date.now());
    s.random = makeRandom(s.seed);
    window.__live = s; // keep the debug hook on the live run
    startRun(s);
    audio.startMusic(bpmForWave(s.wave));
  }
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter') enterKey();
  if (e.code === 'KeyR' && (s.state === STATE.GAME_OVER || s.state === STATE.VICTORY)) enterKey();
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (s.state === STATE.PLAYING) s.state = STATE.PAUSED;
    else if (s.state === STATE.PAUSED) s.state = STATE.PLAYING;
  }
  if (e.code === 'KeyM') audio.toggleMute();
  if (['Digit1', 'Digit2', 'Digit3'].includes(e.code) && s.state === STATE.UPGRADE) {
    chooseBoon(s, s.offers[Number(e.code.slice(-1)) - 1].key, audio);
    audio.startMusic(bpmForWave(s.wave));
  }
});

let accumulator = 0;
let last = performance.now();

function frame(now) {
  const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
  last = now;
  accumulator += elapsed;
  while (accumulator >= STEP) {
    if (s.state === STATE.PLAYING) {
      step(s, STEP, input, audio, onBeatNow());
      audio.setBpm(bpmForWave(s.wave));
      audio.tickMusic(s);
      beatWindowTimer = 0;
    } else if (s.state === STATE.UPGRADE) {
      audio.stopMusic();
    }
    input.endFrame();
    accumulator -= STEP;
  }
  draw(ctx, s, canvas);
  requestAnimationFrame(frame);
}

if (shotScene) {
  s = prepareShot({ canvasRef: canvas, audioRef: audio }, shotScene, Number(params.get('seed') || 1) || 1);
  s.shotScene = shotScene;
  requestAnimationFrame(function shotFrame() { draw(ctx, s, canvas); requestAnimationFrame(shotFrame); });
} else {
  window.__live = s; // read-only debug hook used by the play-test script
  requestAnimationFrame(frame);
}
