import type { Degree } from '../core/types';

/** Código de 5 caracteres pulgar · índice · medio · anular · meñique (1 = levantado). */
export function fingerCode(states: boolean[]): string {
  return states.map((up) => (up ? '1' : '0')).join('');
}

/**
 * Tabla de patrones de la mano izquierda (sección 8.2). Cambiar o agregar un
 * gesto es editar esta tabla, no el código.
 */
export const LEFT_PATTERNS: Readonly<Record<string, Degree>> = {
  '01001': 6, // índice + meñique
  '11001': 7, // índice + meñique + pulgar
};

const countUp = (code: string) => [...code].filter((c) => c === '1').length;

/** Grado del acorde según la mano izquierda; `null` = mano cerrada (sin acorde). */
export function leftDegree(code: string): Degree | null {
  const special = LEFT_PATTERNS[code];
  if (special) return special;
  const count = countUp(code);
  return count === 0 ? null : (count as Degree);
}

/** Variación según la mano derecha: dedos levantados de índice a meñique (0 = puño). */
export function rightVariation(code: string): number {
  return countUp(code.slice(1));
}

/** El pulgar derecho levantado baja el acorde una octava. */
export function rightOctaveDown(code: string): boolean {
  return code[0] === '1';
}
