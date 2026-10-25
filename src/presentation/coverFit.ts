export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Rectángulo donde dibujar el video para llenar la pantalla sin deformarlo (RF-01):
 * se escala hasta cubrir todo y lo que sobra queda fuera, centrado.
 */
export function coverFit(srcWidth: number, srcHeight: number, destWidth: number, destHeight: number): Rect {
  if (srcWidth <= 0 || srcHeight <= 0) return { x: 0, y: 0, width: destWidth, height: destHeight };
  const scale = Math.max(destWidth / srcWidth, destHeight / srcHeight);
  const width = srcWidth * scale;
  const height = srcHeight * scale;
  return { x: (destWidth - width) / 2, y: (destHeight - height) / 2, width, height };
}

/** Posición en pantalla de un punto normalizado del video, ya en espejo. */
export function toScreen(nx: number, ny: number, rect: Rect, destWidth: number): { x: number; y: number } {
  const x = rect.x + nx * rect.width;
  return { x: destWidth - x, y: rect.y + ny * rect.height };
}
