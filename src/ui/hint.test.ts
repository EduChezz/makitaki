import { describe, expect, it } from 'vitest';
import { HINT_TEXT, hintMessage } from './hint';

describe('hintMessage', () => {
  it('con las dos manos no hay aviso', () => {
    expect(hintMessage(10_000, 9_990, null, 0)).toBeNull();
  });

  it('si falta una mano un instante, todavía no avisa', () => {
    expect(hintMessage(10_000, 9_990, 9_500, 0)).toBeNull();
  });

  it('si falta una mano más de 0,8 s, pide las dos manos', () => {
    expect(hintMessage(10_000, 9_990, 9_000, 0)).toBe(HINT_TEXT.missingHand);
  });

  it('sin ninguna mano durante 3 s, avisa de poca luz', () => {
    expect(hintMessage(10_000, 6_500, 6_500, 0)).toBe(HINT_TEXT.lowLight);
  });

  it('al empezar sin manos cuenta desde que abrió la cámara', () => {
    expect(hintMessage(2_000, null, 0, 0)).toBe(HINT_TEXT.missingHand);
    expect(hintMessage(3_500, null, 0, 0)).toBe(HINT_TEXT.lowLight);
  });
});
