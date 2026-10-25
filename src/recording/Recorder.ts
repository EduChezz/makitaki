import type { SynthEngine } from '../audio/SynthEngine';
import type { EventBus } from '../core/EventBus';
import type { AppEvents, RecordingResult } from '../core/types';

/** Valores "inicial" de la grabación. */
export const RECORDING = {
  fps: 30,
  videoBitsPerSecond: 2_500_000,
  audioBitsPerSecond: 128_000,
  /** Límite para no llenar la memoria del celular. */
  maxMs: 3 * 60_000,
};

/**
 * Formatos en orden de preferencia. MP4 primero: se abre en iPhone, en WhatsApp
 * y en casi cualquier galería; WebM (lo único que graban algunos Android) queda de respaldo.
 */
export const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

export function pickMimeType(isSupported: (type: string) => boolean): string | null {
  return MIME_CANDIDATES.find((type) => isSupported(type)) ?? null;
}

export function fileExtension(mimeType: string): 'mp4' | 'webm' {
  return mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Nombre del archivo, p. ej. "makitaki-2026-10-25-1730.mp4". */
export function recordingFileName(date: Date, extension: string): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `makitaki-${day}-${pad(date.getHours())}${pad(date.getMinutes())}.${extension}`;
}

/** Duración para el contador, p. ej. 75 000 ms → "1:15". */
export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
}

/**
 * Graba lo que se ve en el canvas, el instrumento y la voz. Todo ocurre en el
 * dispositivo: el video solo se guarda o se comparte si el usuario lo decide.
 */
export class Recorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private mic: MediaStream | null = null;
  private video: MediaStream | null = null;
  private startedAt = 0;
  private withVoice = false;
  private limitTimer: number | undefined;

  constructor(
    private bus: EventBus<AppEvents>,
    private canvas: HTMLCanvasElement,
    private synth: SynthEngine,
  ) {
    // Si la app pasa a segundo plano, el navegador deja de dibujar: se cierra el video.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.stop();
    });
  }

  static get supported(): boolean {
    return typeof MediaRecorder !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype;
  }

  get recording(): boolean {
    return this.recorder !== null;
  }

  get elapsedMs(): number {
    return this.recording ? performance.now() - this.startedAt : 0;
  }

  async start(): Promise<void> {
    if (this.recording) return;
    // La voz se pide primero; si se niega, se graba igual solo con el instrumento.
    try {
      this.mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    } catch (err) {
      console.warn('Se grabará sin voz:', err);
      this.mic = null;
    }
    const audio = this.synth.recordingStream();
    if (this.mic) this.synth.attachVoice(this.mic);
    this.withVoice = this.mic !== null;

    this.video = this.canvas.captureStream(RECORDING.fps);
    const stream = new MediaStream([...this.video.getVideoTracks(), ...audio.getAudioTracks()]);
    const mimeType = pickMimeType((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: RECORDING.videoBitsPerSecond,
      audioBitsPerSecond: RECORDING.audioBitsPerSecond,
    });
    this.chunks = [];
    recorder.addEventListener('dataavailable', (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    });
    recorder.addEventListener('stop', () => this.finish(recorder.mimeType || mimeType || 'video/webm'));
    this.recorder = recorder;
    this.startedAt = performance.now();
    recorder.start(1000);
    this.limitTimer = window.setTimeout(() => this.stop(), RECORDING.maxMs);
    this.bus.emit('recordingChanged', { recording: true, withVoice: this.withVoice });
  }

  stop(): void {
    if (this.recorder?.state === 'recording') this.recorder.stop();
  }

  private finish(mimeType: string): void {
    const durationMs = performance.now() - this.startedAt;
    window.clearTimeout(this.limitTimer);
    this.synth.detachVoice();
    // Suelta el micrófono para que el teléfono deje de mostrar que está en uso.
    this.mic?.getTracks().forEach((t) => t.stop());
    this.video?.getTracks().forEach((t) => t.stop());
    this.mic = null;
    this.video = null;
    this.recorder = null;
    this.bus.emit('recordingChanged', { recording: false, withVoice: this.withVoice });

    const blob = new Blob(this.chunks, { type: mimeType });
    this.chunks = [];
    if (blob.size === 0) return;
    const result: RecordingResult = {
      blob,
      mimeType,
      fileName: recordingFileName(new Date(), fileExtension(mimeType)),
      durationMs,
      withVoice: this.withVoice,
    };
    this.bus.emit('recordingReady', result);
  }
}
