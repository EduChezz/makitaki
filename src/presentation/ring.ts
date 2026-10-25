import type { Mode } from '../core/types';

/** Colores de modo (sección 10.1). */
export const MODE_COLORS: Record<Mode, string> = { major: '#FFB84D', minor: '#7C6CFF' };
const TRACK_COLOR = '#2A3446';

/** Posición de una nota en el anillo: cada octava da una vuelta, Do arriba. */
export function voiceAngle(midi: number): number {
  return (midi / 12) * Math.PI * 2 - Math.PI / 2;
}

/** Acerca `current` a `target` según el tiempo transcurrido (independiente de los FPS). */
export function approach(current: number, target: number, dtMs: number, tauMs: number): number {
  return current + (target - current) * (1 - Math.exp(-Math.max(0, dtMs) / tauMs));
}

/** Radio del anillo: crece con el volumen y late con el nivel del audio. */
export function ringRadius(base: number, volume: number, level: number): number {
  return base * (0.7 + 0.6 * volume) + base * 0.15 * level;
}

/**
 * Visualizador propio (sección 10): un anillo de 4 segmentos, uno por voz, que
 * se mueven con el glide. El borde es más nítido cuanto más brillo.
 */
export class Ring {
  private shown: number[] | null = null;
  private target: number[] | null = null;
  private sounding = false;
  private presence = 0;
  private mode: Mode = 'major';
  private volume = 0;
  private brightness = 0;
  private level = 0;

  setChord(notes: number[] | null, mode: Mode | null): void {
    this.sounding = notes !== null;
    if (!notes || !mode) return;
    this.target = notes;
    this.shown ??= [...notes];
    this.mode = mode;
  }

  setExpression(volume: number, brightness: number): void {
    this.volume = volume;
    this.brightness = brightness;
  }

  setLevel(level: number): void {
    this.level = level;
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number, dtMs: number): void {
    this.presence = approach(this.presence, this.sounding ? 1 : 0, dtMs, this.sounding ? 40 : 120);
    if (this.shown && this.target) {
      this.shown = this.shown.map((note, i) => approach(note, this.target![i], dtMs, 25));
    }

    const cx = w / 2;
    const cy = h * 0.45;
    const radius = ringRadius(Math.min(w, h) * 0.13, this.volume, this.level);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = TRACK_COLOR;
    ctx.lineWidth = 2 * dpr;
    ctx.globalAlpha = 0.3 + 0.3 * this.presence;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    if (this.shown && this.presence > 0.01) {
      const sharp = (this.brightness + 1) / 2;
      ctx.strokeStyle = MODE_COLORS[this.mode];
      this.shown.forEach((note, i) => {
        const bass = i === 0;
        const angle = voiceAngle(note);
        const half = ((bass ? 26 : 18) * Math.PI) / 180;
        const width = (bass ? 11 : 7) * dpr;
        // Halo ancho y tenue: más difuso cuanto más oscuro el sonido.
        ctx.globalAlpha = this.presence * (0.12 + 0.2 * (1 - sharp));
        ctx.lineWidth = width * (1.6 + 3 * (1 - sharp));
        ctx.beginPath();
        ctx.arc(cx, cy, radius, angle - half, angle + half);
        ctx.stroke();
        ctx.globalAlpha = this.presence * (0.65 + 0.35 * sharp);
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, angle - half, angle + half);
        ctx.stroke();
      });
    }
    ctx.restore();
  }
}
