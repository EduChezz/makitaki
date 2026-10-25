import { describe, expect, it } from 'vitest';
import { handIcon } from './handIcon';

const count = (svg: string, cls: string) => (svg.match(new RegExp(`class="${cls}"`, 'g')) ?? []).length;

describe('handIcon', () => {
  it('dibuja los 5 dedos: levantados y doblados según el código', () => {
    const svg = handIcon('01001', 'left');
    expect(count(svg, 'up')).toBe(2);
    expect(count(svg, 'down')).toBe(3);
    expect(svg).toContain('2 dedos levantados');
  });

  it('la mano izquierda se dibuja reflejada', () => {
    expect(handIcon('11111', 'left')).toContain('scale(-1 1)');
    expect(handIcon('11111', 'right')).not.toContain('scale(-1 1)');
  });
});
