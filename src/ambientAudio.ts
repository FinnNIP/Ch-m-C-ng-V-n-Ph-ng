// Procedural Web Audio Ambient Soundscape Generator
// 100% Client-side synthetic audio - 0 bytes downloaded, ultra-lightweight, zero network usage

export type AmbientTrackId = 'cosmic_drone' | 'aurora_dream' | 'celestial_zen' | 'space_stream';

export interface AmbientTrackInfo {
  id: AmbientTrackId;
  name: string;
  description: string;
  icon: string;
}

export const AMBIENT_TRACKS: AmbientTrackInfo[] = [
  {
    id: 'cosmic_drone',
    name: 'Vũ Trụ Huyền Ảo',
    description: 'Âm hưởng không gian sâu thẳm với hòa âm tần số êm dịu',
    icon: '🌌',
  },
  {
    id: 'aurora_dream',
    name: 'Cực Quang Aurora',
    description: 'Giai điệu lơ lửng, thư thái như dải cực quang phát sáng',
    icon: '✨',
  },
  {
    id: 'celestial_zen',
    name: 'Ngân Hà Tĩnh Lặng',
    description: 'Hòa âm thiền định nhẹ nhàng cho sự tập trung tối đa',
    icon: '🪐',
  },
  {
    id: 'space_stream',
    name: 'Dòng Chảy Tinh Vân',
    description: 'Tiếng thở vũ trụ êm ái tương tự tiếng mưa ấm ru ngủ',
    icon: '🌊',
  },
];

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isRunning: boolean = false;
  private currentTrack: AmbientTrackId = 'cosmic_drone';
  private volume: number = 0.3;
  private activeNodes: { stop?: () => void; disconnect: () => void }[] = [];
  private intervals: number[] = [];
  private listeners: Set<(state: { isPlaying: boolean; track: AmbientTrackId; volume: number }) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const savedVol = localStorage.getItem('ambient_audio_volume');
      if (savedVol !== null) {
        const v = parseFloat(savedVol);
        if (!isNaN(v) && v >= 0 && v <= 1) this.volume = v;
      }
      const savedTrack = localStorage.getItem('ambient_audio_track') as AmbientTrackId;
      if (savedTrack && AMBIENT_TRACKS.some((t) => t.id === savedTrack)) {
        this.currentTrack = savedTrack;
      }
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public subscribe(cb: (state: { isPlaying: boolean; track: AmbientTrackId; volume: number }) => void) {
    this.listeners.add(cb);
    cb(this.getState());
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    const st = this.getState();
    this.listeners.forEach((cb) => cb(st));
  }

  public getState() {
    return {
      isPlaying: this.isRunning,
      track: this.currentTrack,
      volume: this.volume,
    };
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ambient_audio_volume', String(this.volume));
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
    this.notify();
  }

  public setTrack(track: AmbientTrackId) {
    if (this.currentTrack === track) return;
    this.currentTrack = track;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ambient_audio_track', track);
    }
    if (this.isRunning) {
      this.stopNodes();
      this.startTrack(this.currentTrack);
    }
    this.notify();
  }

  public toggle(): boolean {
    if (this.isRunning) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public start() {
    const ctx = this.initContext();
    if (!ctx) return;

    if (this.isRunning) return;
    this.isRunning = true;

    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.connect(ctx.destination);
    }

    // Smooth fade in
    this.masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.masterGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, this.volume), ctx.currentTime + 1.2);

    this.startTrack(this.currentTrack);
    this.notify();
  }

  public stop() {
    if (!this.isRunning) return;
    const ctx = this.ctx;
    if (ctx && this.masterGain) {
      // Fade out smoothly
      const now = ctx.currentTime;
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      setTimeout(() => {
        this.stopNodes();
        this.isRunning = false;
        this.notify();
      }, 850);
    } else {
      this.stopNodes();
      this.isRunning = false;
      this.notify();
    }
  }

  private stopNodes() {
    this.intervals.forEach((id) => clearInterval(id));
    this.intervals = [];

    this.activeNodes.forEach((node) => {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch {}
    });
    this.activeNodes = [];
  }

  // Synthesis engines for each track type
  private startTrack(track: AmbientTrackId) {
    const ctx = this.ctx;
    if (!ctx || !this.masterGain) return;

    switch (track) {
      case 'cosmic_drone':
        this.createCosmicDrone(ctx, this.masterGain);
        break;
      case 'aurora_dream':
        this.createAuroraDream(ctx, this.masterGain);
        break;
      case 'celestial_zen':
        this.createCelestialZen(ctx, this.masterGain);
        break;
      case 'space_stream':
        this.createSpaceStream(ctx, this.masterGain);
        break;
    }
  }

  // 1. Cosmic Drone: Warm multi-octave harmonic pad with slow resonant filter breathing
  private createCosmicDrone(ctx: AudioContext, destination: AudioNode) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, ctx.currentTime);
    filter.Q.setValueAtTime(2.5, ctx.currentTime);
    filter.connect(destination);
    this.activeNodes.push(filter);

    // Filter LFO breathing
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.08, ctx.currentTime); // ~12s cycle
    lfoGain.gain.setValueAtTime(140, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.activeNodes.push(lfo, lfoGain);

    // Fundamental and 5th/octave harmonics (A1: 55Hz, E2: 82.4Hz, A2: 110Hz, C#3: 138.6Hz)
    const baseFreqs = [55, 82.41, 110, 164.81, 220];
    baseFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Subtle detune for lush thickness
      const detuneAmount = (idx - 2) * 4;
      osc.detune.setValueAtTime(detuneAmount, ctx.currentTime);

      const level = 0.22 / (idx + 1);
      oscGain.gain.setValueAtTime(level, ctx.currentTime);

      osc.connect(oscGain);
      oscGain.connect(filter);
      osc.start();
      this.activeNodes.push(osc, oscGain);
    });
  }

  // 2. Aurora Dream: Ethereal floating chords with subtle shimmer
  private createAuroraDream(ctx: AudioContext, destination: AudioNode) {
    const chordGain = ctx.createGain();
    chordGain.gain.setValueAtTime(0.3, ctx.currentTime);
    chordGain.connect(destination);
    this.activeNodes.push(chordGain);

    // Pentatonic scale frequencies for gentle shifting harmony
    const notes = [130.81, 164.81, 196.0, 246.94, 293.66, 329.63, 392.0];
    const activeOscs: { osc: OscillatorNode; gain: GainNode }[] = [];

    // Create 4 drifting voices
    [0, 2, 4, 6].forEach((noteIdx, voiceIdx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const biquad = ctx.createBiquadFilter();

      biquad.type = 'lowpass';
      biquad.frequency.setValueAtTime(450, ctx.currentTime);

      osc.type = voiceIdx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(notes[noteIdx], ctx.currentTime);

      // Slow amplitude modulation for each voice
      gain.gain.setValueAtTime(0.12, ctx.currentTime);

      osc.connect(biquad);
      biquad.connect(gain);
      gain.connect(chordGain);
      osc.start();

      activeOscs.push({ osc, gain });
      this.activeNodes.push(osc, gain, biquad);
    });

    // Slowly morph voice notes every 6 seconds for dynamic relaxing space melody
    const interval = window.setInterval(() => {
      if (!this.isRunning || !this.ctx) return;
      const targetVoice = activeOscs[Math.floor(Math.random() * activeOscs.length)];
      const targetNote = notes[Math.floor(Math.random() * notes.length)];
      if (targetVoice && this.ctx) {
        targetVoice.osc.frequency.setTargetAtTime(targetNote, this.ctx.currentTime, 3.5);
      }
    }, 5500);
    this.intervals.push(interval);
  }

  // 3. Celestial Zen: Deep warm singing bowl resonance & sparkling starlight chimes
  private createCelestialZen(ctx: AudioContext, destination: AudioNode) {
    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0.32, ctx.currentTime);
    mainGain.connect(destination);
    this.activeNodes.push(mainGain);

    // Warm grounded tone (432Hz universal healing frequency base)
    const rootFreq = 108; // Sub-octave of 432Hz
    [1, 1.5, 2, 2.66, 3].forEach((ratio, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(rootFreq * ratio, ctx.currentTime);

      // Subtle vibrato
      const vib = ctx.createOscillator();
      const vibGain = ctx.createGain();
      vib.frequency.setValueAtTime(0.15 + idx * 0.05, ctx.currentTime);
      vibGain.gain.setValueAtTime(1.2, ctx.currentTime);
      vib.connect(vibGain);
      vibGain.connect(osc.frequency);
      vib.start();

      gain.gain.setValueAtTime(0.18 / (idx + 1), ctx.currentTime);
      osc.connect(gain);
      gain.connect(mainGain);
      osc.start();
      this.activeNodes.push(osc, gain, vib, vibGain);
    });

    // Occasional gentle high chime (starlight shimmer) every 4-8 seconds
    const chimeNotes = [864, 972, 1080, 1296, 1458];
    const chimeInterval = window.setInterval(() => {
      if (!this.isRunning || !this.ctx) return;
      const chimeFreq = chimeNotes[Math.floor(Math.random() * chimeNotes.length)];
      const chimeOsc = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(chimeFreq, this.ctx.currentTime);

      const now = this.ctx.currentTime;
      chimeGain.gain.setValueAtTime(0.0001, now);
      chimeGain.gain.exponentialRampToValueAtTime(0.035, now + 0.1);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(mainGain);
      chimeOsc.start(now);
      chimeOsc.stop(now + 3.6);
    }, 5000);
    this.intervals.push(chimeInterval);
  }

  // 4. Space Stream: Soothing filtered pink noise simulating a calm cosmic nebula breeze
  private createSpaceStream(ctx: AudioContext, destination: AudioNode) {
    // Generate 4 seconds of smooth pink noise buffer
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
      b6 = white * 0.115926;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Dual lowpass/bandpass filtering to mimic cosmic flow / gentle rain
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, ctx.currentTime);
    filter.Q.setValueAtTime(1.2, ctx.currentTime);

    // Subtle LFO wave on the filter frequency
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.06, ctx.currentTime);
    lfoGain.gain.setValueAtTime(180, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    // Warm sub tone underneath
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(65.4, ctx.currentTime); // C2
    subGain.gain.setValueAtTime(0.08, ctx.currentTime);
    subOsc.connect(subGain);
    subGain.connect(destination);
    subOsc.start();

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28, ctx.currentTime);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(destination);
    noise.start();

    this.activeNodes.push(noise, filter, lfo, lfoGain, noiseGain, subOsc, subGain);
  }
}

// Global Singleton Instance
export const ambientAudio = new AmbientAudioEngine();
