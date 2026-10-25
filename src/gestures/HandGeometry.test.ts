import { describe, expect, it } from 'vitest';
import { fingerCode } from './GesturePatterns';
import { fingerStates, jointAngle, tiltAngle, toMetric } from './HandGeometry';
import { makeLandmarks } from './testHands';

const code = (c: string, tilt = 0) => fingerCode(fingerStates(makeLandmarks(c, { tilt })));

describe('jointAngle', () => {
  it('180° en línea recta y 90° en ángulo recto', () => {
    const o = { x: 0, y: 0, z: 0 };
    expect(jointAngle({ x: -1, y: 0, z: 0 }, o, { x: 1, y: 0, z: 0 })).toBeCloseTo(180);
    expect(jointAngle({ x: 1, y: 0, z: 0 }, o, { x: 0, y: 1, z: 0 })).toBeCloseTo(90);
  });

  it('no falla con puntos repetidos', () => {
    const o = { x: 0, y: 0, z: 0 };
    expect(jointAngle(o, o, o)).toBe(0);
  });
});

describe('fingerStates', () => {
  it('reconoce mano abierta, puño y patrones mixtos', () => {
    expect(code('11111')).toBe('11111');
    expect(code('00000')).toBe('00000');
    expect(code('01001')).toBe('01001');
    expect(code('11001')).toBe('11001');
    expect(code('01100')).toBe('01100');
  });

  it('inclinar la mano no cambia los dedos detectados', () => {
    for (const tilt of [-40, -20, 20, 40]) {
      expect(code('01001', tilt)).toBe('01001');
      expect(code('10110', tilt)).toBe('10110');
    }
  });
});

describe('tiltAngle', () => {
  it('0° con la mano vertical y sigue la inclinación', () => {
    expect(tiltAngle(makeLandmarks('11111'))).toBeCloseTo(0);
    expect(tiltAngle(makeLandmarks('11111', { tilt: 25 }))).toBeCloseTo(25);
    expect(tiltAngle(makeLandmarks('11111', { tilt: -30 }))).toBeCloseTo(-30);
  });
});

describe('toMetric', () => {
  it('lleva x y z a la escala de y', () => {
    expect(toMetric([{ x: 0.5, y: 0.5, z: 0.1 }], 16 / 9)[0]).toEqual({ x: 0.5 * (16 / 9), y: 0.5, z: 0.1 * (16 / 9) });
  });
});
