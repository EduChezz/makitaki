import { describe, expect, it } from 'vitest';
import { EventBus } from '../core/EventBus';
import type { AppEvents, ChordGesture, DetectedHand } from '../core/types';
import { DEFAULT_CALIBRATION } from './Calibration';
import { GestureVoter } from './GestureVoter';
import { makeFrame, makeHand } from './testHands';

function setup() {
  const bus = new EventBus<AppEvents>();
  new GestureVoter(bus, DEFAULT_CALIBRATION);
  const changes: (ChordGesture | null)[] = [];
  bus.on('chordGestureChanged', ({ gesture }) => changes.push(gesture));
  let time = 0;
  const play = (hands: DetectedHand[], frames: number) => {
    for (let i = 0; i < frames; i++) bus.emit('handsDetected', makeFrame(hands, (time += 33)));
  };
  return { changes, play };
}

describe('GestureVoter', () => {
  it('3 dedos izquierda + 1 derecha = grado III mayor básico', () => {
    const { changes, play } = setup();
    play([makeHand('Left', '01110'), makeHand('Right', '01000')], 10);
    expect(changes.at(-1)).toEqual({ degree: 3, mode: 'major', variation: 1 });
  });

  it('inclinar la izquierda hacia afuera cambia a menor', () => {
    const { changes, play } = setup();
    play([makeHand('Left', '01000', { tilt: 30 }), makeHand('Right', '01110')], 10);
    expect(changes.at(-1)).toEqual({ degree: 1, mode: 'minor', variation: 3 });
  });

  it('puño derecho o falta de una mano = silencio', () => {
    const { changes, play } = setup();
    play([makeHand('Left', '01000'), makeHand('Right', '01000')], 10);
    play([makeHand('Left', '01000'), makeHand('Right', '00000')], 10);
    expect(changes.at(-1)).toBeNull();
    play([makeHand('Left', '01000'), makeHand('Right', '01000')], 10);
    play([makeHand('Left', '01000')], 10);
    expect(changes.at(-1)).toBeNull();
  });

  it('perder una mano un solo fotograma no corta el sonido', () => {
    const { changes, play } = setup();
    const both = [makeHand('Left', '01100'), makeHand('Right', '01000')];
    play(both, 10);
    const before = changes.length;
    play([makeHand('Left', '01100')], 1);
    play(both, 5);
    expect(changes.length).toBe(before);
  });
});
