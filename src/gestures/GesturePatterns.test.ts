import { describe, expect, it } from 'vitest';
import { fingerCode, leftDegree, rightOctaveDown, rightVariation } from './GesturePatterns';

describe('fingerCode', () => {
  it('convierte los dedos en un código de 5 caracteres', () => {
    expect(fingerCode([false, true, false, false, true])).toBe('01001');
  });
});

describe('leftDegree', () => {
  it('1 a 5 dedos son los grados I a V, sin importar cuáles', () => {
    expect(leftDegree('01000')).toBe(1);
    expect(leftDegree('10000')).toBe(1);
    expect(leftDegree('01100')).toBe(2);
    expect(leftDegree('01110')).toBe(3);
    expect(leftDegree('01111')).toBe(4);
    expect(leftDegree('11111')).toBe(5);
  });

  it('índice + meñique es VI y con pulgar es VII', () => {
    expect(leftDegree('01001')).toBe(6);
    expect(leftDegree('11001')).toBe(7);
  });

  it('mano cerrada no da acorde', () => {
    expect(leftDegree('00000')).toBeNull();
  });
});

describe('mano derecha', () => {
  it('la variación cuenta de índice a meñique, sin el pulgar', () => {
    expect(rightVariation('00000')).toBe(0);
    expect(rightVariation('10000')).toBe(0);
    expect(rightVariation('01000')).toBe(1);
    expect(rightVariation('01100')).toBe(2);
    expect(rightVariation('11110')).toBe(3);
    expect(rightVariation('01111')).toBe(4);
  });

  it('el pulgar levantado baja una octava', () => {
    expect(rightOctaveDown('11000')).toBe(true);
    expect(rightOctaveDown('01000')).toBe(false);
  });
});
