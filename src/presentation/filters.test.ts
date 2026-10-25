import { describe, expect, it } from 'vitest';
import { FILTERS, FILTER_IDS } from './filters';

/** Canvas falso que anota qué se dibuja. */
function fakeContext() {
  const calls: string[] = [];
  const ctx = {
    calls,
    globalCompositeOperation: 'source-over',
    fillStyle: '' as unknown,
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    fillRect: () => calls.push(`fillRect:${ctx.globalCompositeOperation}`),
    createRadialGradient: () => ({ addColorStop: () => {} }),
  };
  return ctx;
}

describe('FILTERS', () => {
  it('los 4 filtros elegidos', () => {
    expect(FILTER_IDS.map((id) => FILTERS[id].label)).toEqual(['Neón', 'Verano', 'Natural', 'Blanco y negro']);
  });

  it('Natural no toca la imagen', () => {
    const ctx = fakeContext();
    FILTERS.natural.apply(ctx as unknown as CanvasRenderingContext2D, 100, 100);
    expect(ctx.calls).toEqual([]);
  });

  it('Verano da calidez con mezcla suave', () => {
    const ctx = fakeContext();
    FILTERS.summer.apply(ctx as unknown as CanvasRenderingContext2D, 100, 100);
    expect(ctx.calls).toContain('fillRect:soft-light');
  });

  it('Blanco y negro quita la saturación', () => {
    const ctx = fakeContext();
    FILTERS.bw.apply(ctx as unknown as CanvasRenderingContext2D, 100, 100);
    expect(ctx.calls).toContain('fillRect:saturation');
  });

  it('los filtros con modos de mezcla dejan el canvas como estaba', () => {
    for (const id of ['summer', 'bw'] as const) {
      const ctx = fakeContext();
      FILTERS[id].apply(ctx as unknown as CanvasRenderingContext2D, 100, 100);
      expect(ctx.calls[0]).toBe('save');
      expect(ctx.calls.at(-1)).toBe('restore');
    }
  });
});
