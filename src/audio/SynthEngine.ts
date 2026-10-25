import type { EventBus } from '../core/EventBus';
import type { AppEvents, ChordSound, Timbre } from '../core/types';
import { midiToHz } from '../music/MusicTheory';

/** Valores "inicial" del motor de sonido (sección 8.5). */
export const SYNTH = {
  glideMs: 60,
  attackMs: 40,
  releaseMs: 250,
  detuneCents: 6,
  /** Ganancia de cada voz: 4 voces juntas no deben saturar. */
  voiceGain: 0.22,
  /** Tiempo de respuesta del volumen y el filtro, para que no haya clics. */
  smoothingS: 0.03,
  /** Volumen de la voz en la grabación respecto al instrumento. */
  voiceRecordGain: 1.2,
};

interface TimbreSpec {
  label: string;
  types: [OscillatorType, OscillatorType];
  /** Frecuencia del segundo oscilador respecto al primero. */
  ratio: number;
  /** Volumen del segundo oscilador. */
  mix: number;
  /** Desafinar los dos osciladores entre sí (±detuneCents). */
  detune: boolean;
}

export const TIMBRES: Record<Timbre, TimbreSpec> = {
  pad: { label: 'Pad', types: ['sawtooth', 'sawtooth'], ratio: 1, mix: 1, detune: true },
  organ: { label: 'Órgano', types: ['sine', 'sine'], ratio: 2, mix: 0.5, detune: false },
  crystal: { label: 'Cristal', types: ['triangle', 'sine'], ratio: 1.5, mix: 0.4, detune: false },
};

/** Brillo −1 a 1 → corte del filtro entre 300 y 6000 Hz en escala exponencial. */
export function cutoffFromBrightness(t: number): number {
  const clamped = Math.min(1, Math.max(-1, t));
  return 300 * 20 ** ((clamped + 1) / 2);
}

/** Congela un parámetro en su valor actual para empezar una rampa nueva sin saltos. */
function holdAt(param: AudioParam, time: number): void {
  if (typeof param.cancelAndHoldAtTime === 'function') {
    param.cancelAndHoldAtTime(time);
  } else {
    const value = param.value;
    param.cancelScheduledValues(time);
    param.setValueAtTime(value, time);
  }
}

class Voice {
  readonly a: OscillatorNode;
  readonly b: OscillatorNode;
  private bGain: GainNode;

  constructor(ctx: AudioContext, output: AudioNode) {
    const voiceGain = new GainNode(ctx, { gain: SYNTH.voiceGain });
    this.a = new OscillatorNode(ctx, { frequency: 220 });
    this.b = new OscillatorNode(ctx, { frequency: 220 });
    this.bGain = new GainNode(ctx);
    this.a.connect(voiceGain);
    this.b.connect(this.bGain).connect(voiceGain);
    voiceGain.connect(output);
    this.a.start();
    this.b.start();
  }

  setTimbre(spec: TimbreSpec): void {
    this.a.type = spec.types[0];
    this.b.type = spec.types[1];
    this.bGain.gain.value = spec.mix;
    this.a.detune.value = spec.detune ? SYNTH.detuneCents : 0;
    this.b.detune.value = spec.detune ? -SYNTH.detuneCents : 0;
    this.b.frequency.value = this.a.frequency.value * spec.ratio;
  }

  setNote(hz: number, ratio: number, time: number, glide: boolean): void {
    for (const [param, target] of [
      [this.a.frequency, hz],
      [this.b.frequency, hz * ratio],
    ] as const) {
      holdAt(param, time);
      if (glide) param.exponentialRampToValueAtTime(target, time + SYNTH.glideMs / 1000);
      else param.setValueAtTime(target, time);
    }
  }
}

/**
 * 4 voces permanentes (bajo + 3) que nunca se destruyen: al cambiar de acorde
 * solo se deslizan. Cadena: voces → filtro → compuerta (envolvente) →
 * compresor → volumen → salida.
 */
export class SynthEngine {
  private ctx: AudioContext | null = null;
  private voices: Voice[] = [];
  private filter!: BiquadFilterNode;
  private gate!: GainNode;
  private master!: GainNode;
  private analyser!: AnalyserNode;
  private levelBuffer = new Float32Array(256);
  private timbre: Timbre = 'pad';
  private sounding = false;
  private silentSince = -Infinity;
  private recordDest: MediaStreamAudioDestinationNode | null = null;
  private voice: { source: MediaStreamAudioSourceNode; gain: GainNode } | null = null;

  constructor(private bus: EventBus<AppEvents>) {
    bus.on('chordChanged', ({ chord }) => this.onChord(chord));
    bus.on('expressionChanged', ({ volume, brightness }) => this.onExpression(volume, brightness));
    bus.on('timbreChanged', ({ timbre }) => this.setTimbre(timbre));
    // iPhone suspende el audio al cambiar de app o recibir una llamada.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.ctx?.resume();
    });
  }

  /** Debe llamarse dentro del toque del usuario (RF-02): los navegadores lo exigen. */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    this.ctx = ctx;
    this.filter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: cutoffFromBrightness(0), Q: 0.7 });
    this.gate = new GainNode(ctx, { gain: 0 });
    const compressor = new DynamicsCompressorNode(ctx, { threshold: -12, knee: 12, ratio: 6 });
    this.master = new GainNode(ctx, { gain: 0 });
    this.analyser = new AnalyserNode(ctx, { fftSize: this.levelBuffer.length });
    this.filter.connect(this.gate).connect(compressor).connect(this.master);
    this.master.connect(this.analyser);
    this.master.connect(ctx.destination);
    this.voices = Array.from({ length: 4 }, () => new Voice(ctx, this.filter));
    this.setTimbre(this.timbre);
    void ctx.resume();
  }

  /** Audio para grabar: el instrumento (después del volumen) más la voz, si se agrega. */
  recordingStream(): MediaStream {
    if (!this.ctx) throw new Error('El audio todavía no está activo');
    if (!this.recordDest) {
      this.recordDest = new MediaStreamAudioDestinationNode(this.ctx);
      this.master.connect(this.recordDest);
    }
    return this.recordDest.stream;
  }

  /**
   * Mezcla el micrófono en la grabación. No va a los parlantes: escucharse con
   * retraso mientras se canta confunde y además provocaría acople.
   */
  attachVoice(mic: MediaStream): void {
    if (!this.ctx || !this.recordDest) return;
    this.detachVoice();
    const source = new MediaStreamAudioSourceNode(this.ctx, { mediaStream: mic });
    const gain = new GainNode(this.ctx, { gain: SYNTH.voiceRecordGain });
    source.connect(gain).connect(this.recordDest);
    this.voice = { source, gain };
  }

  detachVoice(): void {
    this.voice?.source.disconnect();
    this.voice?.gain.disconnect();
    this.voice = null;
  }

  private setTimbre(timbre: Timbre): void {
    this.timbre = timbre;
    for (const voice of this.voices) voice.setTimbre(TIMBRES[timbre]);
  }

  private onChord(chord: ChordSound | null): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    if (!chord) {
      if (this.sounding) {
        holdAt(this.gate.gain, now);
        this.gate.gain.linearRampToValueAtTime(0, now + SYNTH.releaseMs / 1000);
        this.sounding = false;
        this.silentSince = now;
      }
      return;
    }
    // Tras un silencio completo no tiene sentido deslizarse desde el acorde viejo.
    const glide = this.sounding || now - this.silentSince < SYNTH.releaseMs / 1000;
    const { ratio } = TIMBRES[this.timbre];
    chord.notes.forEach((note, i) => this.voices[i]?.setNote(midiToHz(note), ratio, now, glide));
    if (!this.sounding) {
      holdAt(this.gate.gain, now);
      this.gate.gain.linearRampToValueAtTime(1, now + SYNTH.attackMs / 1000);
      this.sounding = true;
    }
  }

  private onExpression(volume: number, brightness: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const [param, target] of [
      [this.master.gain, volume],
      [this.filter.frequency, cutoffFromBrightness(brightness)],
    ] as const) {
      param.cancelScheduledValues(now);
      param.setTargetAtTime(target, now, SYNTH.smoothingS);
    }
    this.bus.emit('audioLevel', { level: this.measureLevel() });
  }

  /** Nivel RMS de la salida, 0 a 1. */
  private measureLevel(): number {
    this.analyser.getFloatTimeDomainData(this.levelBuffer);
    let sum = 0;
    for (const sample of this.levelBuffer) sum += sample * sample;
    return Math.min(1, Math.sqrt(sum / this.levelBuffer.length) * 3);
  }
}
