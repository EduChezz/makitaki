import { describe, expect, it } from 'vitest';
import { EventBus } from '../core/EventBus';
import type { AppEvents, DetectedHand } from '../core/types';
import { DEFAULT_CALIBRATION } from './Calibration';
import { EXPRESSION, ExpressionReader, VOLUME_CURVE, smoothToward, volumeFromHeight } from './ExpressionReader';
import { makeFrame, makeHand } from './testHands';

describe('volumeFromHeight', () => {
  it('con la mano abajo ya se oye y arriba llega al máximo', () => {
    expect(volumeFromHeight(0.85)).toBeCloseTo(VOLUME_CURVE.min);
    expect(volumeFromHeight(0.25)).toBeCloseTo(1);
  });

  it('a media altura suena claro, no apenas un 25 %', () => {
    expect(volumeFromHeight(0.5)).toBeGreaterThan(0.6);
    expect(volumeFromHeight(0.5)).toBeLessThan(0.7);
  });

  it('siempre sube al levantar la mano', () => {
    for (let y = 0.9; y > 0.2; y -= 0.05) {
      expect(volumeFromHeight(y - 0.05)).toBeGreaterThanOrEqual(volumeFromHeight(y));
    }
  });

  it('fuera del rango no se dispara', () => {
    expect(volumeFromHeight(0)).toBe(1);
    expect(volumeFromHeight(0.98)).toBeCloseTo(VOLUME_CURVE.min);
    expect(volumeFromHeight(1.5)).toBeCloseTo(VOLUME_CURVE.min);
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
    const wristY = 0.3;
    expect(play([makeHand('Right', '01000', { wrist: [0.3, wristY] })], 30).volume).toBeCloseTo(
      volumeFromHeight(wristY),
      2,
    );
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
