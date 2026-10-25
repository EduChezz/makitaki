import type { Landmark } from '../core/types';

/** Umbrales para decidir si un dedo está levantado (sección 8.1). Valores "inicial". */
export const GEOMETRY = {
  /** Ángulo mínimo en la articulación media para contar un dedo como levantado. */
  fingerStraightDeg: 160,
  /** Ángulo mínimo en la articulación 3 del pulgar. */
  thumbStraightDeg: 150,
  /** Distancia mínima punta del pulgar ↔ base del índice, en tamaños de palma. */
  thumbReach: 0.5,
};

// Base (MCP), articulación media (PIP) y articulación final (DIP) de índice a meñique.
const FINGER_JOINTS: ReadonlyArray<readonly [number, number, number]> = [
  [5, 6, 7],
  [9, 10, 11],
  [13, 14, 15],
  [17, 18, 19],
];

/**
 * MediaPipe normaliza x por el ancho e y por el alto del video; para medir ángulos
 * reales hay que llevar todo a la misma escala (z usa la escala de x).
 */
export function toMetric(points: Landmark[], aspect: number): Landmark[] {
  return points.map(({ x, y, z }) => ({ x: x * aspect, y, z: z * aspect }));
}

export function distance(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Ángulo en grados en el punto `b`, formado por `a` y `c`. */
export function jointAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const u = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const v = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const lengths = Math.hypot(u.x, u.y, u.z) * Math.hypot(v.x, v.y, v.z);
  if (lengths === 0) return 0;
  const cos = (u.x * v.x + u.y * v.y + u.z * v.z) / lengths;
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

/** Tamaño de la palma: muñeca → base del dedo medio. */
export function palmSize(points: Landmark[]): number {
  return distance(points[0], points[9]);
}

/** Dedos levantados en orden pulgar · índice · medio · anular · meñique. */
export function fingerStates(points: Landmark[]): boolean[] {
  const thumbStraight = jointAngle(points[2], points[3], points[4]) > GEOMETRY.thumbStraightDeg;
  const thumbAway = distance(points[4], points[5]) > GEOMETRY.thumbReach * palmSize(points);
  const fingers = FINGER_JOINTS.map(
    ([mcp, pip, dip]) => jointAngle(points[mcp], points[pip], points[dip]) > GEOMETRY.fingerStraightDeg,
  );
  return [thumbStraight && thumbAway, ...fingers];
}

/**
 * Inclinación de la mano en grados (sección 8.4): 0° = vertical.
 * Usa el vector muñeca → base del dedo medio.
 */
export function tiltAngle(points: Landmark[]): number {
  const wx = points[9].x - points[0].x;
  const wy = points[9].y - points[0].y;
  return (Math.atan2(wx, -wy) * 180) / Math.PI;
}
