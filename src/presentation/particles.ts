interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
}

/** Límite de partículas vivas, para no cargar los celulares de gama media. */
export const MAX_PARTICLES = 90;
const LIFE_MS = 700;

/** Partículas blancas que salen de las puntas de los dedos levantados (sección 10). */
export class Particles {
  private items: Particle[] = [];

  /** Lanza partículas desde cada punto; `ratePerSec` es por punto. */
  emit(points: { x: number; y: number }[], ratePerSec: number, dtMs: number, dpr: number): void {
    const chance = (ratePerSec * dtMs) / 1000;
    for (const p of points) {
      if (this.items.length >= MAX_PARTICLES || Math.random() > chance) continue;
      this.items.push({
        x: p.x,
        y: p.y,
        vx: (Math.random() - 0.5) * 40 * dpr,
        vy: -(30 + Math.random() * 50) * dpr,
        age: 0,
        life: LIFE_MS * (0.6 + Math.random() * 0.4),
        size: (1.2 + Math.random() * 1.6) * dpr,
      });
    }
  }

  get count(): number {
    return this.items.length;
  }

  draw(ctx: CanvasRenderingContext2D, dtMs: number): void {
    const dt = dtMs / 1000;
    this.items = this.items.filter((p) => (p.age += dtMs) < p.life);
    ctx.save();
    ctx.fillStyle = '#F2F7FF';
    for (const p of this.items) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = 1 - p.age / p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
