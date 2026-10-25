import type { FilterId } from '../core/types';

interface FilterSpec {
  label: string;
  /** Se dibuja encima del video y debajo del anillo y las manos. */
  apply(ctx: CanvasRenderingContext2D, w: number, h: number): void;
}

/**
 * Filtros de imagen. Se hacen con capas de color y modos de mezcla del canvas,
 * que funcionan en todos los navegadores (incluido Safari de iPhone) y cuestan
 * una sola capa por fotograma, igual que el oscurecido de antes.
 */
export const FILTERS: Record<FilterId, FilterSpec> = {
  neon: {
    label: 'Neón',
    apply(ctx, w, h) {
      ctx.fillStyle = 'rgba(11, 14, 20, 0.35)';
      ctx.fillRect(0, 0, w, h);
    },
  },
  summer: {
    label: 'Verano',
    apply(ctx, w, h) {
      ctx.save();
      // Tono cálido y luminoso.
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(255, 150, 60, 0.55)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255, 210, 140, 0.12)';
      ctx.fillRect(0, 0, w, h);
      // Bordes un poco más oscuros y dorados, como una foto de tarde.
      ctx.globalCompositeOperation = 'source-over';
      const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      vignette.addColorStop(0, 'rgba(70, 25, 0, 0)');
      vignette.addColorStop(1, 'rgba(70, 25, 0, 0.35)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    },
  },
  natural: {
    label: 'Natural',
    apply() {},
  },
  bw: {
    label: 'Blanco y negro',
    apply(ctx, w, h) {
      ctx.save();
      // Un gris encima con mezcla "saturation" quita el color y deja la luz.
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(11, 14, 20, 0.2)';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    },
  },
};

export const FILTER_IDS = Object.keys(FILTERS) as FilterId[];
