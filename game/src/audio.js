// All sound is generated with the Web Audio API — no audio files. The music is a small
// sequencer locked to the world's beat clock: kick, hats, bass and an arp in A minor that
// brightens as waves climb. Every action has its own blip. The engine is created lazily on
// the player's first gesture (browsers block audio before one); screenshot scenes run muted.

const SCALE = [220.0, 246.9, 261.6, 293.7, 329.6, 392.0, 440.0, 523.3]; // A minor pentatonic-ish ladder
const ARP_PATTERN = [0, 2, 4, 6, 4, 2, 5, 3];

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let nextBeat = 0;
  let bpm = 112;
  let lastScheduledBeat = -1;

  function ensure() {
    if (ctx || muted === null) return ctx;
    try {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.55;
      musicGain.connect(master);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function resume() {
    ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function setMuted(value) {
    muted = value;
    if (master) master.gain.value = value ? 0 : 0.9;
  }

  function toggleMute() {
    setMuted(!muted);
    return muted;
  }

  function beatSeconds() {
    return 60 / bpm;
  }

  function setBpm(value) {
    bpm = value;
  }

  function blip(time, freq, duration, type, gainValue, destination) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(gainValue, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(destination ?? master);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  function kick(time) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  function hat(time, strong) {
    const length = 0.03;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = strong ? 0.35 : 0.18;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);
    source.start(time);
  }

  function scheduleMusic(beatIndex, secondsPerBeat) {
    if (!ctx || ctx.state !== 'running') return;
    if (beatIndex <= lastScheduledBeat) return;
    lastScheduledBeat = beatIndex;
    const time = ctx.currentTime + 0.06;
    kick(time);
    hat(time, true);
    hat(time + secondsPerBeat / 2, false);
    const bass = SCALE[0] / 2;
    blip(time, bass, secondsPerBeat * 0.9, 'square', 0.12, musicGain);
    if (beatIndex % 4 === 2) blip(time + secondsPerBeat / 2, bass * 1.5, secondsPerBeat * 0.4, 'square', 0.1, musicGain);
    const note = SCALE[ARP_PATTERN[beatIndex % ARP_PATTERN.length]];
    blip(time, note * 2, 0.16, 'triangle', 0.14, musicGain);
    blip(time + secondsPerBeat / 2, note * 3, 0.12, 'triangle', 0.08, musicGain);
  }

  function resetMusicClock() {
    lastScheduledBeat = -1;
  }

  const sfx = {
    shoot() {
      if (!ctx || ctx.state !== 'running') return;
      blip(ctx.currentTime, 880, 0.07, 'square', 0.06);
    },
    hit() {
      if (!ctx || ctx.state !== 'running') return;
      blip(ctx.currentTime, 320, 0.06, 'sawtooth', 0.08);
    },
    kill() {
      if (!ctx || ctx.state !== 'running') return;
      blip(ctx.currentTime, 520, 0.16, 'triangle', 0.16);
      blip(ctx.currentTime + 0.03, 260, 0.18, 'sawtooth', 0.1);
    },
    dash() {
      if (!ctx || ctx.state !== 'running') return;
      blip(ctx.currentTime, 180, 0.12, 'sine', 0.14);
      blip(ctx.currentTime + 0.02, 90, 0.16, 'sine', 0.1);
    },
    hurt() {
      if (!ctx || ctx.state !== 'running') return;
      blip(ctx.currentTime, 140, 0.3, 'sawtooth', 0.28);
    },
    upgrade() {
      if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime;
      [440, 554, 659, 880].forEach((freq, i) => blip(t + i * 0.08, freq, 0.14, 'triangle', 0.14));
    },
    waveStart() {
      if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime;
      [330, 392, 494].forEach((freq, i) => blip(t + i * 0.06, freq, 0.12, 'square', 0.1));
    },
    win() {
      if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime;
      [440, 494, 554, 659, 880].forEach((freq, i) => blip(t + i * 0.12, freq, 0.3, 'triangle', 0.16));
    },
  };

  return { resume, setMuted, toggleMute, scheduleMusic, resetMusicClock, setBpm, sfx, get muted() { return muted; } };
}
