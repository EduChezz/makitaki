import { describe, expect, it } from 'vitest';
import { EventBus } from '../core/EventBus';
import type { AppEvents, DetectedHand } from '../core/types';
import { DEFAULT_CALIBRATION } from './Calibration';
import { EXPRESSION, ExpressionReader, smoothToward, volumeFromHeight } from './ExpressionReader';
import { makeFrame, makeHand } from './testHands';

describe('volumeFromHeight', () => {
  it('arriba = 1, abajo = 0, a media altura suena suave', () => {
    expect(volumeFromHeight(0.1)).toBeCloseTo(1);
    expect(volumeFromHeight(0.9)).toBeCloseTo(0);
    expect(volumeFromHeight(0.5)).toBeCloseTo(0.25);
  });

  it('fuera del rango no se dispara', () => {
    expect(volumeFromHeight(0)).toBe(1);
    expect(volumeFromHeight(0.98)).toBe(0);
    expect(volumeFromHeight(1.5)).toBe(0);
  });
});

describe('smoothToward', () => {
  it('a 30 FPS equivale a 0,7 × anterior + 0,3 × nuevo', () => {
    expect(smoothToward(0, 1, 1000 / 30, EXPRESSION.smoothingMs)).toBeCloseTo(0.3, 2);
  });

  it('responde igual de rápido a 12 FPS que a 30 FPS', () => {
    let at30 = 0;
    let at12 = 0;
    for (let i = 0; i < 9; i++) at30 = smoothToward(at30, 1, 1000 / 30, EXPRESSION.smoothingMs);
    for (let i = 0; i < 4; i++) at12 = smoothToward(at12, 1, 300 / 4, EXPRESSION.smoothingMs);
    expect(at12).toBeCloseTo(at30, 2);
  });
});

describe('ExpressionReader', () => {
  function setup() {
    const bus = new EventBus<AppEvents>();
    new ExpressionReader(bus, DEFAULT_CALIBRATION);
    let last: AppEvents['expressionChanged'] | undefined;
    bus.on('expressionChanged', (e) => (last = e));
    let time = 0;
    const play = (hands: DetectedHand[], frames: number) => {
      for (let i = 0; i < frames; i++) bus.emit('handsDetected', makeFrame(hands, (time += 33)));
      return last!;
    };
    return { play };
  }

  it('mano derecha arriba sube el volumen y sin mano baja a 0', () => {
    const { play } = setup();
    // La muñeca a 0,3 de altura → volumen ((0,9 − 0,3) / 0,8)² ≈ 0,56.
    expect(play([makeHand('Right', '01000', { wrist: [0.3, 0.3] })], 30).volume).toBeCloseTo(0.5625, 2);
    expect(play([], 30).volume).toBeLessThan(0.01);
  });

  it('inclinar la derecha hacia la derecha da más brillo', () => {
    const { play } = setup();
    expect(play([makeHand('Right', '01000', { tilt: -35 })], 30).brightness).toBeGreaterThan(0.95);
    expect(play([makeHand('Right', '01000', { tilt: 35 })], 30).brightness).toBeLessThan(-0.95);
  });

  it('el pulgar baja la octava, pero un fotograma suelto no', () => {
    const { play } = setup();
    expect(play([makeHand('Right', '01000')], 10).octaveDown).toBe(false);
    play([makeHand('Right', '11000')], 1);
    expect(play([makeHand('Right', '01000')], 3).octaveDown).toBe(false);
    expect(play([makeHand('Right', '11000')], 10).octaveDown).toBe(true);
  });
});
