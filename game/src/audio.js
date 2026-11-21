// Quiet Hands — every sound is synthesized with WebAudio; no audio files.
// One clear job: turn game events into short, quiet, positional-ish blips.
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.ambientStarted = false;
  }

  // Browsers only allow audio after a user gesture; call from any key/click.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.startAmbient();
  }

  startAmbient() {
    if (!this.ctx || this.ambientStarted) return;
    this.ambientStarted = true;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.035;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    lfo.start();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // A short burst of filtered noise: footsteps, pebble landings, cloth.
  noiseBurst({ duration = 0.06, freq = 800, gain = 0.12, type = 'lowpass' } = {}) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  // A short oscillator note with a quick decay; stacked notes make chimes.
  tone({ freq = 440, duration = 0.12, gain = 0.14, type = 'sine', when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  // Footsteps: the player's own are soft, a guard's are a low thud whose
  // volume follows distance, so you can hear a patrol coming.
  step(running, distance = 0) {
    const vol = distance <= 0 ? (running ? 0.1 : 0.05) : Math.max(0, 0.16 - distance / 1400);
    if (vol <= 0.005) return;
    this.noiseBurst({ duration: 0.05, freq: running ? 1400 : 700, gain: vol });
  }

  guardStep(distance) {
    this.noiseBurst({ duration: 0.07, freq: 320, gain: Math.max(0, 0.2 - distance / 1200) });
  }

  pebbleThrow() {
    this.noiseBurst({ duration: 0.18, freq: 2400, gain: 0.1, type: 'bandpass' });
  }

  pebbleLand() {
    this.noiseBurst({ duration: 0.09, freq: 1800, gain: 0.22, type: 'bandpass' });
    this.tone({ freq: 1180, duration: 0.05, gain: 0.08, type: 'triangle' });
  }

  pickup() {
    this.tone({ freq: 880, duration: 0.1, gain: 0.14, type: 'triangle' });
    this.tone({ freq: 1318, duration: 0.16, gain: 0.14, type: 'triangle', when: 0.07 });
  }

  alert() {
    this.tone({ freq: 220, duration: 0.22, gain: 0.2, type: 'sawtooth' });
    this.tone({ freq: 311, duration: 0.3, gain: 0.2, type: 'sawtooth', when: 0.14 });
  }

  caught() {
    this.tone({ freq: 330, duration: 0.25, gain: 0.2, type: 'sawtooth' });
    this.tone({ freq: 165, duration: 0.5, gain: 0.2, type: 'sawtooth', when: 0.18 });
  }

  levelClear() {
    [523, 659, 784, 1046].forEach((f, i) =>
      this.tone({ freq: f, duration: 0.18, gain: 0.13, type: 'triangle', when: i * 0.09 }),
    );
  }

  gameWin() {
    [523, 659, 784, 1046, 1318].forEach((f, i) =>
      this.tone({ freq: f, duration: 0.25, gain: 0.13, type: 'triangle', when: i * 0.11 }),
    );
  }
}
