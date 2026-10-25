import { describe, expect, it } from 'vitest';
import { EventBus } from '../core/EventBus';
import type { AppEvents, ChordGesture, ChordSound } from '../core/types';
import { KEYS, MusicTheory, REGISTER, chordName, chordNotes, midiToHz, spell, voiceLead } from './MusicTheory';

const G = KEYS[7];
const C = KEYS[0];
const F = KEYS[5];
const g = (degree: number, mode: 'major' | 'minor', variation: number) =>
  ({ degree, mode, variation }) as ChordGesture;

describe('KEYS', () => {
  it('12 tonalidades con nombres en español', () => {
    expect(KEYS.map((k) => k.name)).toEqual([
      'Do', 'Re♭', 'Re', 'Mi♭', 'Mi', 'Fa', 'Fa♯', 'Sol', 'La♭', 'La', 'Si♭', 'Si',
    ]);
  });
});

describe('chordNotes', () => {
  it('ejemplo del SDD: Sol, i menor básico = G2 G3 Bb3 D4', () => {
    expect(chordNotes(G, g(1, 'minor', 1), false)).toEqual([43, 55, 58, 62]);
  });

  it('el V con séptima es dominante (D7) y el I es maj7', () => {
    expect(chordNotes(G, g(5, 'major', 3), false)).toEqual([50, 66, 69, 72]); // D F# A C
    expect(chordNotes(G, g(1, 'major', 3), false)).toEqual([43, 59, 62, 66]); // G B D F#
  });

  it('la inversión pone la tercera en el bajo', () => {
    const [bass] = chordNotes(C, g(1, 'major', 2), false);
    expect(bass % 12).toBe(4); // Mi
  });

  it('nunca sale del registro y el bajo siempre es la nota más grave', () => {
    for (const key of KEYS) {
      for (let degree = 1; degree <= 7; degree++) {
        for (const mode of ['major', 'minor'] as const) {
          for (let variation = 1; variation <= 4; variation++) {
            const notes = chordNotes(key, g(degree, mode, variation), false);
            expect(Math.min(...notes)).toBeGreaterThanOrEqual(REGISTER.low);
            expect(Math.max(...notes)).toBeLessThanOrEqual(REGISTER.high);
            expect(notes[0]).toBe(Math.min(...notes));
          }
        }
      }
    }
  });

  it('octava abajo baja todo el acorde 12 semitonos', () => {
    const normal = chordNotes(C, g(1, 'major', 1), false);
    expect(chordNotes(C, g(1, 'major', 1), true)).toEqual(normal.map((n) => n - 12));
  });
});

describe('voiceLead', () => {
  it('cada voz va a la nota nueva más cercana, eligiendo la octava', () => {
    // De G-B-D (55 59 62) a C-E-G: el Sol se queda, Si → Do, Re → Mi (3 semitonos en total).
    expect(voiceLead([55, 59, 62], [60, 64, 67], 49, 76)).toEqual([55, 60, 64]);
  });

  it('no baja de `min` ni sube de `max`', () => {
    const led = voiceLead([41, 43, 46], [60, 64, 67], 49, 76);
    expect(Math.min(...led)).toBeGreaterThanOrEqual(49);
    expect(Math.max(...led)).toBeLessThanOrEqual(76);
  });

  it('el primer acorde se toca tal cual', () => {
    expect(voiceLead(null, [60, 64, 67], 49, 76)).toEqual([60, 64, 67]);
  });
});

describe('nombres', () => {
  it('escribe las notas según la tonalidad', () => {
    expect(spell(6, 10)).toEqual({ es: 'Si♭', en: 'Bb' });
    expect(chordName(F, g(4, 'major', 1))).toEqual({ name: 'Si♭ mayor', symbol: 'Bb' });
    expect(chordName(G, g(7, 'major', 1)).name).toBe('Fa♯ mayor');
  });

  it('cifrado de cada variación', () => {
    expect(chordName(G, g(1, 'minor', 1)).symbol).toBe('Gm');
    expect(chordName(G, g(1, 'minor', 2)).symbol).toBe('Gm/Bb');
    expect(chordName(G, g(5, 'major', 3)).symbol).toBe('D7');
    expect(chordName(G, g(4, 'major', 3)).symbol).toBe('Cmaj7');
    expect(chordName(G, g(5, 'major', 4)).symbol).toBe('D7sus4');
    expect(chordName(G, g(7, 'minor', 4)).symbol).toBe('F#m7b5');
  });
});

describe('midiToHz', () => {
  it('A4 = 440 Hz y una octava duplica', () => {
    expect(midiToHz(69)).toBe(440);
    expect(midiToHz(81)).toBeCloseTo(880);
  });
});

describe('MusicTheory', () => {
  function setup() {
    const bus = new EventBus<AppEvents>();
    new MusicTheory(bus);
    const chords: (ChordSound | null)[] = [];
    bus.on('chordChanged', ({ chord }) => chords.push(chord));
    return { bus, chords };
  }

  it('publica las notas del gesto ganador', () => {
    const { bus, chords } = setup();
    bus.emit('chordGestureChanged', { gesture: g(1, 'minor', 1) });
    expect(chords.at(-1)).toMatchObject({ notes: [43, 55, 58, 62], name: 'Sol menor', symbol: 'Gm' });
    bus.emit('chordGestureChanged', { gesture: null });
    expect(chords.at(-1)).toBeNull();
  });

  it('tras muchos cambios las voces siguen en el registro, encima del bajo y con sus notas', () => {
    const { bus, chords } = setup();
    let seed = 1;
    const random = (n: number) => (seed = (seed * 16807) % 2147483647) % n;
    for (let i = 0; i < 300; i++) {
      const gesture = g(1 + random(7), random(2) ? 'major' : 'minor', 1 + random(4));
      const octaveDown = random(4) === 0;
      bus.emit('expressionChanged', { volume: 1, brightness: 0, octaveDown });
      bus.emit('chordGestureChanged', { gesture });
      const [bass, ...upper] = chords.at(-1)!.notes;
      const expected = chordNotes(KEYS[7], gesture, octaveDown).slice(1).map((n) => n % 12).sort();
      expect(upper.map((n) => n % 12).sort()).toEqual(expected);
      expect(Math.min(...upper)).toBeGreaterThan(bass);
      expect(Math.max(...upper)).toBeLessThanOrEqual(REGISTER.high - (octaveDown ? 12 : 0));
    }
  });

  it('vuelve a publicar al cambiar la octava o la tonalidad', () => {
    const { bus, chords } = setup();
    bus.emit('chordGestureChanged', { gesture: g(1, 'major', 1) });
    bus.emit('expressionChanged', { volume: 1, brightness: 0, octaveDown: true });
    expect(chords.at(-1)?.notes[0]).toBe(31);
    bus.emit('expressionChanged', { volume: 0.5, brightness: 0, octaveDown: true });
    expect(chords).toHaveLength(2);
    bus.emit('keyChanged', { keyIndex: 0 });
    expect(chords.at(-1)?.name).toBe('Do mayor');
  });
});
