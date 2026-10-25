// Manos sintéticas para las pruebas: permiten probar los gestos sin cámara.
import type { DetectedHand, HandLabel, HandsFrame, Landmark } from '../core/types';

type P = [number, number, number];

// Bases (MCP) de índice, medio, anular y meñique, relativas a la muñeca (mano vertical).
const MCPS: P[] = [
  [-0.05, -0.2, 0],
  [0, -0.22, 0],
  [0.05, -0.2, 0],
  [0.1, -0.17, 0],
];

const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

function finger(mcp: P, up: boolean): P[] {
  const pip = add(mcp, [0, -0.05, 0]);
  if (up) return [mcp, pip, add(mcp, [0, -0.09, 0]), add(mcp, [0, -0.12, 0])];
  // Doblado: la última parte se va hacia la palma (90° en la articulación media).
  const dip = add(pip, [0, 0, -0.04]);
  return [mcp, pip, dip, add(dip, [0, 0.02, -0.01])];
}

function thumb(up: boolean): P[] {
  const tip: P = up ? [-0.2, -0.2, 0] : [-0.06, -0.14, 0];
  return [[-0.08, -0.05, 0], [-0.12, -0.1, 0], [-0.16, -0.15, 0], tip];
}

export interface HandOptions {
  /** Inclinación en grados; positivo = hacia la izquierda del usuario. */
  tilt?: number;
  wrist?: [number, number];
}

/** 21 puntos normalizados para el código de dedos dado, p. ej. "01001". */
export function makeLandmarks(code: string, { tilt = 0, wrist = [0.5, 0.7] }: HandOptions = {}): Landmark[] {
  const up = [...code].map((c) => c === '1');
  const local: P[] = [[0, 0, 0], ...thumb(up[0]), ...MCPS.flatMap((mcp, i) => finger(mcp, up[i + 1]))];
  const rad = (tilt * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return local.map(([x, y, z]) => ({
    x: wrist[0] + x * cos - y * sin,
    y: wrist[1] + x * sin + y * cos,
    z,
  }));
}

export function makeHand(label: HandLabel, code: string, options: HandOptions = {}): DetectedHand {
  // En la imagen sin espejo la mano izquierda del usuario queda a la derecha.
  const wrist = options.wrist ?? (label === 'Left' ? [0.7, 0.7] : [0.3, 0.7]);
  return { label, score: 0.95, landmarks: makeLandmarks(code, { ...options, wrist }) };
}

export function makeFrame(hands: DetectedHand[], timestamp: number): HandsFrame {
  return { hands, timestamp, aspect: 1 };
}
