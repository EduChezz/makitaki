import { describe, expect, it } from 'vitest';
import { coverFit, toScreen } from './coverFit';

describe('coverFit', () => {
  it('video 16:9 en pantalla vertical: llena el alto y recorta los lados', () => {
    const rect = coverFit(1280, 720, 400, 800);
    expect(rect.height).toBe(800);
    expect(rect.width).toBeCloseTo(1422.22, 1);
    expect(rect.x).toBeCloseTo(-511.11, 1);
    expect(rect.y).toBe(0);
  });

  it('video 4:3 en pantalla ancha: llena el ancho y recorta arriba y abajo', () => {
    const rect = coverFit(640, 480, 1600, 900);
    expect(rect.width).toBe(1600);
    expect(rect.height).toBe(1200);
    expect(rect.y).toBe(-150);
  });

  it('mantiene la proporción del video', () => {
    const rect = coverFit(1280, 720, 1000, 1000);
    expect(rect.width / rect.height).toBeCloseTo(1280 / 720);
  });

  it('sin tamaño de video ocupa toda la pantalla', () => {
    expect(coverFit(0, 0, 300, 200)).toEqual({ x: 0, y: 0, width: 300, height: 200 });
  });
});

describe('toScreen', () => {
  it('refleja en espejo: la izquierda del video queda a la derecha de la pantalla', () => {
    const rect = { x: 0, y: 0, width: 1000, height: 500 };
    expect(toScreen(0, 0, rect, 1000)).toEqual({ x: 1000, y: 0 });
    expect(toScreen(1, 1, rect, 1000)).toEqual({ x: 0, y: 500 });
    expect(toScreen(0.25, 0.5, rect, 1000)).toEqual({ x: 750, y: 250 });
  });
});
