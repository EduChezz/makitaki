import { describe, expect, it } from 'vitest';
import type { ChordSound } from '../core/types';
import { chordDetail, romanNumeral } from './ChordPanel';

describe('romanNumeral', () => {
  it('mayúscula en mayor y minúscula en menor', () => {
    expect(romanNumeral({ degree: 4, mode: 'major', variation: 1 })).toBe('IV');
    expect(romanNumeral({ degree: 4, mode: 'minor', variation: 1 })).toBe('iv');
    expect(romanNumeral({ degree: 7, mode: 'minor', variation: 1 })).toBe('vii');
  });
});

describe('chordDetail', () => {
  it('variación y cifrado', () => {
    const chord: ChordSound = {
      gesture: { degree: 1, mode: 'minor', variation: 3 },
      notes: [43, 55, 58, 62],
      name: 'Sol menor',
      symbol: 'Gm7',
    };
    expect(chordDetail(chord)).toBe('Séptima · Gm7');
  });
});
