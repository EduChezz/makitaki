import { describe, expect, it } from 'vitest';
import { nextMode, tiltToT } from './tilt';

const cal = { straight: 0, left: 35, right: -35 };

describe('tiltToT', () => {
  it('recta = 0, izquierda = −1, derecha = 1', () => {
    expect(tiltToT(0, cal)).toBe(0);
    expect(tiltToT(35, cal)).toBe(-1);
    expect(tiltToT(-35, cal)).toBe(1);
    expect(tiltToT(17.5, cal)).toBeCloseTo(-0.5);
  });

  it('no pasa de −1 ni de 1', () => {
    expect(tiltToT(80, cal)).toBe(-1);
    expect(tiltToT(-80, cal)).toBe(1);
  });

  it('respeta a quien inclina poco hacia un lado o tiene la mano recta ladeada', () => {
    const user = { straight: 10, left: 25, right: -30 };
    expect(tiltToT(10, user)).toBe(0);
    expect(tiltToT(25, user)).toBe(-1);
    expect(tiltToT(-10, user)).toBeCloseTo(0.5);
  });
});

describe('nextMode', () => {
  it('pasa a menor por debajo de −0,3 y vuelve a mayor por encima de −0,1', () => {
    expect(nextMode('major', -0.2)).toBe('major');
    expect(nextMode('major', -0.35)).toBe('minor');
    expect(nextMode('minor', -0.2)).toBe('minor');
    expect(nextMode('minor', 0)).toBe('major');
  });
});
