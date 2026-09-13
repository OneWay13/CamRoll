/**
 * Web Audio API synthesizer for authentic mechanical camera sounds
 * Generates tactile mechanical shutter snap, secondary curtain clack,
 * film advance gear motor whirr, and button clicks without external audio files.
 */

class CameraSoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Plays a physical mechanical camera shutter actuation:
   * 1. Primary shutter leaf release (sharp metallic snap)
   * 2. Rear curtain slam (low resonance clack)
   * 3. Motorized film advance whirr
   */
  public playShutterSound() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Initial mechanical leaf shutter click (white noise burst + bandpass filter)
      const bufferSize = ctx.sampleRate * 0.05;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.Q.setValueAtTime(3.0, now);

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(1.0, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.05);

      // 2. Secondary metallic spring snap / curtain drop at 0.06s
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(1200, now + 0.06);
      clickOsc.frequency.exponentialRampToValueAtTime(160, now + 0.12);

      clickGain.gain.setValueAtTime(0.7, now + 0.06);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(now + 0.06);
      clickOsc.stop(now + 0.15);

      // 3. 90s Motor drive film winder whirr at 0.16s
      const motorBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
      const motorData = motorBuffer.getChannelData(0);
      for (let i = 0; i < motorBuffer.length; i++) {
        motorData[i] = (Math.random() * 2 - 1) * 0.4;
      }
      const motorNoise = ctx.createBufferSource();
      motorNoise.buffer = motorBuffer;

      const motorFilter = ctx.createBiquadFilter();
      motorFilter.type = 'lowpass';
      motorFilter.frequency.setValueAtTime(800, now + 0.16);
      motorFilter.frequency.linearRampToValueAtTime(1200, now + 0.28);
      motorFilter.frequency.exponentialRampToValueAtTime(300, now + 0.48);

      const motorGain = ctx.createGain();
      motorGain.gain.setValueAtTime(0, now + 0.16);
      motorGain.gain.linearRampToValueAtTime(0.25, now + 0.22);
      motorGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      motorNoise.connect(motorFilter);
      motorFilter.connect(motorGain);
      motorGain.connect(ctx.destination);
      motorNoise.start(now + 0.16);
      motorNoise.stop(now + 0.52);

    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  }

  /**
   * Tactile button click sound for switches and dials
   */
  public playClickSound() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    } catch {
      // Audio context might be restricted
    }
  }

  /**
   * High-pitch capacitor recharge whine for camera flash
   */
  public playFlashChargeSound() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(4000, now);
      osc.frequency.exponentialRampToValueAtTime(14000, now + 0.7);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.76);
    } catch {
      // Ignore
    }
  }
}

export const soundEngine = new CameraSoundEngine();
