import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { describe, expect, it, vi } from 'vitest';

// El paquete real carga WASM; para estas pruebas basta con su forma.
vi.mock('@mediapipe/tasks-vision', () => ({ FilesetResolver: {}, HandLandmarker: {} }));

const { toDetectedHands } = await import('./HandTracker');

const point = (n: number) => ({ x: n, y: n, z: 0, visibility: 0 });
const category = (categoryName: string, score: number) => ({
  categoryName,
  score,
  index: 0,
  displayName: categoryName,
});

describe('toDetectedHands', () => {
  it('une los puntos de cada mano con su etiqueta', () => {
    const result = {
      landmarks: [Array.from({ length: 21 }, (_, i) => point(i / 20)), [point(0.5)]],
      worldLandmarks: [],
      handedness: [[category('Left', 0.9)], [category('Right', 0.8)]],
      handednesses: [],
    } as HandLandmarkerResult;

    const hands = toDetectedHands(result);
    expect(hands).toHaveLength(2);
    expect(hands[0].label).toBe('Left');
    expect(hands[0].score).toBe(0.9);
    expect(hands[0].landmarks).toHaveLength(21);
    expect(hands[0].landmarks[20]).toEqual({ x: 1, y: 1, z: 0 });
    expect(hands[1].label).toBe('Right');
  });

  it('sin manos devuelve una lista vacía', () => {
    const empty = { landmarks: [], worldLandmarks: [], handedness: [], handednesses: [] };
    expect(toDetectedHands(empty as HandLandmarkerResult)).toEqual([]);
  });
});
