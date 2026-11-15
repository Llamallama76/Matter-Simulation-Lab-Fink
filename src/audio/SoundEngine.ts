/**
 * Procedural Web Audio API Sound Synthesizer for MATTERVERSE: THE FRACTURED LABORATORY.
 * Zero external audio files (.mp3/.wav). Synthesizes realistic lab acoustics,
 * magnetic hums, sieve clatter, water pouring, boiling bubbles, and ATOM-5 chimes.
 */

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private muteListeners = new Set<(muted: boolean) => void>();

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(nextMuted: boolean): void {
    this.muted = nextMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(nextMuted ? 0 : 0.72, this.ctx.currentTime, 0.02);
    }
    for (const cb of this.muteListeners) {
      cb(this.muted);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public onMuteChange(listener: (muted: boolean) => void): () => void {
    this.muteListeners.add(listener);
    return () => {
      this.muteListeners.delete(listener);
    };
  }

  /** Must be called on user gesture (pointerdown / keydown) to unlock browser AudioContext */
  public unlock(): void {
    this.ensureContext();
  }

  public playUiClick(): void {
    const ready = this.ensureContext();
    if (!ready || this.muted) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(760, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.045);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  /** Modal high-Q borosilicate glass clink */
  public playGlassClink(): void {
    const ready = this.ensureContext();
    if (!ready || this.muted) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    const partials = [
      { freq: 1840, amp: 0.12, decay: 0.24 },
      { freq: 2790, amp: 0.075, decay: 0.18 },
      { freq: 4210, amp: 0.04, decay: 0.12 },
    ];

    for (const p of partials) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(p.amp, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + p.decay + 0.02);
    }
  }

  /** Electromagnet hum + rapid metallic zip-clicks as iron filings leap to pole */
  public playMagnetHum(): void {
    const ready = this.ensureContext();
    if (!ready || this.muted) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    const humGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, now);
    filter.frequency.linearRampToValueAtTime(620, now + 0.35);
    filter.frequency.linearRampToValueAtTime(280, now + 1.15);

    humGain.gain.setValueAtTime(0.0001, now);
    humGain.gain.linearRampToValueAtTime(0.16, now + 0.12);
    humGain.gain.setValueAtTime(0.14, now + 0.85);
    humGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);

    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(110, now);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(165, now);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(humGain);
    humGain.connect(out);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.3);
    osc2.stop(now + 1.3);

    // Metallic filing snap clicks
    for (let i = 0; i < 9; i++) {
      const t = now + 0.18 + i * 0.085 + (i % 2) * 0.015;
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(1350 + i * 140, t);
      clickOsc.frequency.exponentialRampToValueAtTime(420, t + 0.028);

      clickGain.gain.setValueAtTime(0.001, t);
      clickGain.gain.linearRampToValueAtTime(0.045, t + 0.003);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.032);

      clickOsc.connect(clickGain);
      clickGain.connect(out);
      clickOsc.start(t);
      clickOsc.stop(t + 0.036);
    }
  }

  /** Motorized vibrating sieve mechanical rattle + crystalline shard clatter */
  public playSieveRattle(): void {
    const ready = this.ensureContext();
    if (!ready || this.muted) return;
    const { ctx, out, noise } = ready;
    const now = ctx.currentTime;

    for (let i = 0; i < 12; i++) {
      const t = now + i * 0.085;
      const src = ctx.createBufferSource();
      src.buffer = noise;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(950 + (i % 3) * 320, t);
      bp.Q.setValueAtTime(3.2, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.14, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);

      src.connect(bp);
      bp.connect(gain);
      gain.connect(out);
      src.start(t);
      src.stop(t + 0.08);
    }
  }

  /** Smooth water pouring stream + gentle splash bubbles */
  public playWaterPour(): void {
    const ready = this.ensureContext();
    if (!ready || this.muted) return;
    const { ctx, out, noise } = ready;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(650, now);
    bp.frequency.linearRampToValueAtTime(1250, now + 0.65);
    bp.frequency.linearRampToValueAtTime(820, now + 1.35);
    bp.Q.setValueAtTime(1.4, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.18);
    gain.gain.setValueAtTime(0.16, now + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);

    src.connect(bp);
    bp.connect(gain);
    gain.connect(out);
    src.start(now);
    src.stop(now + 1.48);

    // Bubble blips
    for (let i = 0; i < 6; i++) {
      this.triggerBubblePop(now + 0.25 + i * 0.17, 320 + i * 45);
    }
  }

  /** Filter funnel liquid drip sequence */
  public playFilterDrip(): void {
    const ready = this.ensureContext();
    if (!ready || this.muted) return;
    const { ctx } = ready;
    const now = ctx.currentTime;

    for (let i = 0; i < 7; i++) {
      this.triggerBubblePop(now + 0.12 + i * 0.19, 540 + (i % 3) * 110);
    }
  }

  /** Hot plate thermal hum + boiling bubbles + vapor sizzle */
  public playBoilingAndSizzle(): void {
    const ready = this.ensureContext();
    if (!ready || this.muted) return;
    const { ctx, out, noise } = ready;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(2200, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.3);
    gain.gain.setValueAtTime(0.1, now + 1.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.85);

    src.connect(hp);
    hp.connect(gain);
    gain.connect(out);
    src.start(now);
    src.stop(now + 1.9);

    for (let i = 0; i < 11; i++) {
      this.triggerBubblePop(now + 0.15 + i * 0.14, 290 + (i % 4) * 95);
    }
  }

  /** Friendly robotic chirp for ATOM-5 dialogue and misconception checks */
  public playAtom5Chime(): void {
    const ready = this.ensureContext();
    if (!ready || this.muted) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    const notes = [587.33, 739.99, 880.0]; // D5 - F#5 - A5
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.065;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  /** Warm major-9th celebration arpeggio on pure solid recovery / mission complete */
  public playSuccessFanfare(): void {
    const ready = this.ensureContext();
    if (!ready || this.muted) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    const chord = [523.25, 659.25, 783.99, 987.77, 1174.66]; // C5 E5 G5 B5 D6
    chord.forEach((freq, idx) => {
      const t = now + idx * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.11, t + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  /** Mineral scratch test SFX: gritty groove scrape when scratched vs. smooth metallic glide */
  public playScratchSound(didScratch: boolean): void {
    const ready = this.ensureContext();
    if (!ready || this.muted) return;
    const { ctx, out, noise } = ready;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = noise;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(didScratch ? 2450 : 1200, now);
    bp.frequency.linearRampToValueAtTime(didScratch ? 3400 : 950, now + 0.22);
    bp.Q.setValueAtTime(didScratch ? 4.5 : 1.8, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(didScratch ? 0.14 : 0.06, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    src.connect(bp);
    bp.connect(gain);
    gain.connect(out);
    src.start(now);
    src.stop(now + 0.26);
  }

  /** Crisp stainless-steel tweezers pick & bead dish tap */
  public playTweezersClick(): void {
    const ready = this.ensureContext();
    if (!ready || this.muted) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1650, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.055);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  /** Soft hand-wafting airflow whoosh over sealed scent jars */
  public playWaftBreeze(): void {
    const ready = this.ensureContext();
    if (!ready || this.muted) return;
    const { ctx, out, noise } = ready;
    const now = ctx.currentTime;

    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.26;
      const src = ctx.createBufferSource();
      src.buffer = noise;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(420, t);
      bp.frequency.linearRampToValueAtTime(860, t + 0.16);
      bp.Q.setValueAtTime(1.1, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.09, t + 0.07);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);

      src.connect(bp);
      bp.connect(gain);
      gain.connect(out);
      src.start(t);
      src.stop(t + 0.25);
    }
  }

  /** Graduated cylinder water displacement plop + gentle bubble */
  public playWaterPlop(): void {
    const ready = this.ensureContext();
    if (!ready || this.muted) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(590, now + 0.11);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.15);
    this.triggerBubblePop(now + 0.11, 440);
  }

  /** Digital stopwatch finish chime for Station 10B dissolving race */
  public playStopwatchChime(): void {
    const ready = this.ensureContext();
    if (!ready || this.muted) return;
    const { ctx, out } = ready;
    const now = ctx.currentTime;

    [880, 1174.66].forEach((freq, idx) => {
      const t = now + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.11, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  public dispose(): void {
    this.muteListeners.clear();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.masterGain = null;
    this.noiseBuffer = null;
  }

  private triggerBubblePop(startTime: number, baseFreq: number): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.95, startTime + 0.055);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.065, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.065);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + 0.07);
  }

  private ensureContext(): {
    ctx: AudioContext;
    out: GainNode;
    noise: AudioBuffer;
  } | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return null;

      this.ctx = new AudioCtor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.72;
      this.masterGain.connect(this.ctx.destination);

      // 2-second procedural white noise buffer shared across pours & sizzles
      const sampleRate = this.ctx.sampleRate;
      const length = sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, length, sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        channel[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    if (!this.masterGain || !this.noiseBuffer) return null;
    return {
      ctx: this.ctx,
      out: this.masterGain,
      noise: this.noiseBuffer,
    };
  }
}
