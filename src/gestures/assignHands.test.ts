import { describe, expect, it } from 'vitest';
import { assignHands } from './assignHands';
import { makeHand } from './testHands';

describe('assignHands', () => {
  it('usa la etiqueta de MediaPipe', () => {
    const left = makeHand('Left', '11111');
    const right = makeHand('Right', '01000');
    expect(assignHands([right, left])).toEqual({ left, right });
    expect(assignHands([left])).toEqual({ left });
    expect(assignHands([])).toEqual({});
  });

  it('con dos etiquetas iguales decide por la posición', () => {
    const onImageRight = makeHand('Right', '11111', { wrist: [0.8, 0.6] });
    const onImageLeft = makeHand('Right', '01000', { wrist: [0.2, 0.6] });
    expect(assignHands([onImageLeft, onImageRight])).toEqual({ left: onImageRight, right: onImageLeft });
  });
});
