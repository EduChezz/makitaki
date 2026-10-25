import type { HandCalibration, Mode } from '../core/types';

/** Histéresis del modo (sección 8.4). Valores "inicial". */
export const MODE_THRESHOLDS = { toMinor: -0.3, toMajor: -0.1 };

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Convierte un ángulo de inclinación en t entre −1 (inclinada a la izquierda del
 * usuario) y 1 (a la derecha), usando sus propios ángulos de calibración.
 */
export function tiltToT(angle: number, cal: HandCalibration): number {
  const delta = angle - cal.straight;
  const towardRight = cal.right - cal.straight;
  const towardLeft = cal.left - cal.straight;
  if (delta === 0) return 0;
  if (Math.sign(delta) === Math.sign(towardRight)) return clamp(delta / towardRight, 0, 1);
  return -clamp(delta / towardLeft, 0, 1);
}

/** Modo mayor o menor con histéresis, para que no parpadee cerca del límite. */
export function nextMode(previous: Mode, t: number): Mode {
  if (previous === 'major' && t < MODE_THRESHOLDS.toMinor) return 'minor';
  if (previous === 'minor' && t > MODE_THRESHOLDS.toMajor) return 'major';
  return previous;
}
