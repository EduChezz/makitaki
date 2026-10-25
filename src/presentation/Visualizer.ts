import type { EventBus } from '../core/EventBus';
import type { AppEvents, DetectedHand } from '../core/types';
import { fingerStates, toMetric } from '../gestures/HandGeometry';
import { coverFit, toScreen } from './coverFit';
import { Particles } from './particles';
import { Ring } from './ring';

// Uniones entre los 21 puntos: palma y cada dedo desde la muñeca.
const CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

// Colores "Neón nocturno" (sección 10.1).
const COLORS = {
  scrim: 'rgba(11, 14, 20, 0.35)',
  line: '#00C2B5',
  point: '#8CF5EE',
  text: '#F2F7FF',
  textShadow: '#0B0E14',
};

const FINGER_TIPS = [4, 8, 12, 16, 20];

// Pantallas de celular tienen densidad 2,5–3; dibujar a esa resolución cuesta
// mucho y no se nota en un video de 640×480.
const MAX_PIXEL_RATIO = 1.5;

interface TrackedHand {
  hand: DetectedHand;
  /** Puntas de los dedos levantados (índices de puntos). */
  raisedTips: number[];
}

/** Dibuja el video en espejo, las manos, el anillo y las partículas. */
export class Visualizer {
  private ctx: CanvasRenderingContext2D;
  private video: HTMLVideoElement | null = null;
  private hands: TrackedHand[] = [];
  private ring = new Ring();
  private particles = new Particles();
  private level = 0;
  private frameTimes: number[] = [];
  private dpr = 1;
  private delegate = '';
  private detectMs = 0;
  private diagnostics = false;
  private lastDraw = 0;

  constructor(
    bus: EventBus<AppEvents>,
    private canvas: HTMLCanvasElement,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D no disponible');
    this.ctx = ctx;
    bus.on('cameraReady', ({ video }) => (this.video = video));
    bus.on('trackerReady', ({ delegate }) => (this.delegate = delegate));
    // Promedio móvil para que el número no salte en cada fotograma.
    bus.on('trackerStats', ({ detectMs }) => (this.detectMs = this.detectMs * 0.9 + detectMs * 0.1));
    bus.on('diagnosticsChanged', ({ enabled }) => (this.diagnostics = enabled));
    bus.on('chordChanged', ({ chord }) => this.ring.setChord(chord?.notes ?? null, chord?.gesture.mode ?? null));
    bus.on('expressionChanged', ({ volume, brightness }) => this.ring.setExpression(volume, brightness));
    bus.on('audioLevel', ({ level }) => {
      this.level = level;
      this.ring.setLevel(level);
    });
    bus.on('handsDetected', ({ hands, timestamp, aspect }) => {
      this.hands = hands.map((hand) => {
        const up = fingerStates(toMetric(hand.landmarks, aspect));
        return { hand, raisedTips: FINGER_TIPS.filter((_, i) => up[i]) };
      });
      this.frameTimes.push(timestamp);
      if (this.frameTimes.length > 30) this.frameTimes.shift();
    });
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  start(): void {
    const loop = (now: number) => {
      const dt = this.lastDraw ? Math.min(now - this.lastDraw, 100) : 16;
      this.lastDraw = now;
      this.draw(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /** Fotogramas analizados por segundo (promedio de los últimos 30). */
  get trackingFps(): number {
    const t = this.frameTimes;
    if (t.length < 2) return 0;
    return ((t.length - 1) * 1000) / (t[t.length - 1] - t[0]);
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    this.canvas.width = Math.round(window.innerWidth * this.dpr);
    this.canvas.height = Math.round(window.innerHeight * this.dpr);
  }

  private draw(dtMs: number): void {
    const { ctx, canvas, video, dpr } = this;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!video || video.readyState < 2) return;

    const rect = coverFit(video.videoWidth, video.videoHeight, w, h);
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
    // Oscurece un poco el video para que resalten el anillo y las manos.
    ctx.fillStyle = COLORS.scrim;
    ctx.fillRect(0, 0, w, h);

    this.ring.draw(ctx, w, h, dpr, dtMs);
    const tips: { x: number; y: number }[] = [];
    for (const tracked of this.hands) {
      const pts = tracked.hand.landmarks.map((p) => toScreen(p.x, p.y, rect, w));
      this.drawHand(tracked, pts);
      for (const i of tracked.raisedTips) tips.push(pts[i]);
    }
    this.particles.emit(tips, 4 + 26 * this.level, dtMs, dpr);
    this.particles.draw(ctx, dtMs);
    if (this.diagnostics) this.drawDiagnostics();
  }

  private drawHand({ hand }: TrackedHand, pts: { x: number; y: number }[]): void {
    const { ctx, dpr } = this;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 2 * dpr;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const [a, b] of CONNECTIONS) {
      ctx.moveTo(pts[a].x, pts[a].y);
      ctx.lineTo(pts[b].x, pts[b].y);
    }
    ctx.stroke();
    ctx.fillStyle = COLORS.point;
    for (const p of pts) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (this.diagnostics) {
      const label = `${hand.label} ${(hand.score * 100).toFixed(0)}%`;
      this.drawText(label, pts[0].x, pts[0].y + 28 * dpr, 'center');
    }
  }

  private drawDiagnostics(): void {
    const fps = this.trackingFps;
    if (fps <= 0) return;
    const stats = `${fps.toFixed(0)} FPS · ${this.delegate} · ${this.detectMs.toFixed(0)} ms`;
    this.drawText(stats, 16 * this.dpr, 96 * this.dpr, 'left');
  }

  private drawText(text: string, x: number, y: number, align: CanvasTextAlign): void {
    const { ctx, dpr } = this;
    ctx.font = `600 ${14 * dpr}px Outfit, system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.lineWidth = 4 * dpr;
    ctx.strokeStyle = COLORS.textShadow;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = COLORS.text;
    ctx.fillText(text, x, y);
  }
}
