// All sound is generated here with WebAudio: a simple beat sequencer drives the music,
// and short synthesized blips answer every player action. No audio files, no network.
export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bpm = 112;
    this.beatCount = 0;
    this.nextBeatAt = 0;
    this.muted = false;
  }
  ensure() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }
  startMusic(bpm) {
    this.ensure(); this.resume();
    this.bpm = bpm;
    this.nextBeatAt = this.ctx.currentTime + 0.05;
    this.beatCount = 0;
  }
  setBpm(bpm) { this.bpm = bpm; }
  // Called every frame: schedules one bar step per beat while play continues.
  tickMusic(state) {
    if (!this.ctx || this.muted) return;
    const secondsPerBeat = 60 / this.bpm;
    while (this.nextBeatAt < this.ctx.currentTime + 0.12) {
      const t = this.nextBeatAt;
      const step = this.beatCount % 4;
      this.tone(55, t, 0.16, 'sine', 0.5);                       // kick on every beat
      if (step === 0 || step === 2) this.tone(220 * (state.wave % 4 + 1), t, 0.1, 'triangle', 0.14);
      if (step === 3) this.tone(440, t, 0.08, 'square', 0.06);   // off-beat sparkle
      if (state.beatFlash > 0.5) this.tone(880, t, 0.05, 'sine', 0.05);
      this.beatCount++;
      this.nextBeatAt += secondsPerBeat;
    }
  }
  stopMusic() { this.nextBeatAt = Infinity; }
  tone(freq, at, seconds, type, gain) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    o.connect(g); g.connect(this.master);
    o.start(at); o.stop(at + seconds + 0.02);
  }
  blip(freq, seconds = 0.08, type = 'square', gain = 0.16, slide = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + seconds);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + seconds + 0.02);
  }
  shoot()   { this.blip(760, 0.05, 'square', 0.07, -320); }
  hit()     { this.blip(300, 0.06, 'sawtooth', 0.09, -120); }
  kill()    { this.blip(180, 0.18, 'sawtooth', 0.14, -110); }
  dash()    { this.blip(520, 0.12, 'sine', 0.12, 340); }
  hurt()    { this.blip(140, 0.25, 'sawtooth', 0.2, -70); }
  pickBoon(){ this.blip(660, 0.14, 'triangle', 0.15, 220); }
  waveUp()  { this.blip(440, 0.2, 'triangle', 0.16, 440); }
}
