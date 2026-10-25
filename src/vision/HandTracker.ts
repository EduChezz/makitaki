import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import type { EventBus } from '../core/EventBus';
import type { AppEvents, DetectedHand, HandLabel } from '../core/types';

// Modelo y WASM servidos desde el propio proyecto (RNF-09), no desde un CDN.
const BASE = import.meta.env.BASE_URL;
const WASM_PATH = `${BASE}mediapipe/wasm`;
const MODEL_PATH = `${BASE}mediapipe/hand_landmarker.task`;

/** Convierte el resultado de MediaPipe al formato propio de la app. */
export function toDetectedHands(result: HandLandmarkerResult): DetectedHand[] {
  return result.landmarks.map((points, i) => {
    const category = result.handedness[i]?.[0];
    return {
      landmarks: points.map(({ x, y, z }) => ({ x, y, z })),
      label: (category?.categoryName === 'Left' ? 'Left' : 'Right') as HandLabel,
      score: category?.score ?? 0,
    };
  });
}

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private lastVideoTime = -1;
  private running = false;

  constructor(private bus: EventBus<AppEvents>) {}

  /**
   * Carga el modelo; intenta con GPU y, si falla, con CPU.
   * Para comparar rendimiento se puede forzar la CPU con `?delegate=CPU` en la dirección.
   */
  async load(): Promise<void> {
    const forceCpu = new URLSearchParams(location.search).get('delegate')?.toUpperCase() === 'CPU';
    const delegates = forceCpu ? (['CPU'] as const) : (['GPU', 'CPU'] as const);
    try {
      const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
      for (const delegate of delegates) {
        try {
          this.landmarker = await HandLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_PATH, delegate },
            runningMode: 'VIDEO',
            numHands: 2,
          });
          this.bus.emit('trackerReady', { delegate });
          return;
        } catch (err) {
          if (delegate === 'CPU') throw err;
          console.warn('GPU no disponible, se usa CPU:', err);
        }
      }
    } catch (err) {
      this.bus.emit('trackerError', { message: (err as Error)?.message ?? String(err) });
    }
  }

  get ready(): boolean {
    return this.landmarker !== null;
  }

  start(video: HTMLVideoElement): void {
    this.video = video;
    if (this.running) return;
    this.running = true;
    this.scheduleNext();
  }

  stop(): void {
    this.running = false;
  }

  // Procesa solo fotogramas nuevos del video (riesgo de celulares lentos, sección 11.2).
  private scheduleNext(): void {
    if (!this.running || !this.video) return;
    if ('requestVideoFrameCallback' in this.video) {
      this.video.requestVideoFrameCallback(() => this.processFrame());
    } else {
      requestAnimationFrame(() => this.processFrame());
    }
  }

  private processFrame(): void {
    const video = this.video;
    if (this.landmarker && video && video.readyState >= 2 && video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = video.currentTime;
      const timestamp = performance.now();
      // Un fotograma que falla (p. ej. el celular reinicia la GPU) no debe detener el ciclo.
      try {
        const result = this.landmarker.detectForVideo(video, timestamp);
        this.bus.emit('trackerStats', { detectMs: performance.now() - timestamp });
        const aspect = video.videoHeight > 0 ? video.videoWidth / video.videoHeight : 4 / 3;
        this.bus.emit('handsDetected', { hands: toDetectedHands(result), timestamp, aspect });
      } catch (err) {
        console.error('Fallo al analizar un fotograma:', err);
      }
    }
    this.scheduleNext();
  }
}
