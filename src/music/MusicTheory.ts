import type { EventBus } from '../core/EventBus';
import type { AppEvents, ChordGesture, ChordSound, Degree, Mode, Variation } from '../core/types';

// Nombres de las 7 letras, en español y en cifrado americano, con su semitono natural.
const LETTERS_ES = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
const LETTERS_EN = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];

export interface Key {
  letter: number;
  pc: number;
  name: string;
}

function makeKey(letter: number, accidental: number): Key {
  const pc = (NATURAL_PC[letter] + accidental + 12) % 12;
  return { letter, pc, name: spell(letter, pc).es };
}

/** Las 12 tonalidades, con la escritura más común (Si♭ y no La♯). */
export const KEYS: readonly Key[] = [
  makeKey(0, 0), makeKey(1, -1), makeKey(1, 0), makeKey(2, -1), makeKey(2, 0), makeKey(3, 0),
  makeKey(3, 1), makeKey(4, 0), makeKey(5, -1), makeKey(5, 0), makeKey(6, -1), makeKey(6, 0),
];
/** Sol, la tonalidad de los ejemplos del SDD. */
export const DEFAULT_KEY_INDEX = 7;

/** Semitonos de cada grado desde la tónica (escala mayor, sección 7.1). */
export const DEGREE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

/** Ninguna nota sale de este rango (E2 a E5); con "octava abajo" baja 12. */
export const REGISTER = { low: 40, high: 76 };

/**
 * Semitonos desde la raíz en orden bajo · voz 1 · voz 2 · voz 3 (sección 7.3).
 * La séptima mayor depende del grado: ver `voicing`.
 */
const VOICINGS: Record<Mode, Record<Variation, number[]>> = {
  major: { 1: [-12, 0, 4, 7], 2: [-8, 7, 12, 16], 3: [-12, 4, 7, 11], 4: [-12, 5, 7, 10] },
  minor: { 1: [-12, 0, 3, 7], 2: [-9, 7, 12, 15], 3: [-12, 3, 7, 10], 4: [-12, 3, 6, 10] },
};

/** Solo I y IV llevan séptima mayor (maj7); los demás grados, séptima dominante (V7, II7…). */
const MAJ7_DEGREES: ReadonlySet<Degree> = new Set([1, 4]);

export function voicing(gesture: ChordGesture): number[] {
  const offsets = VOICINGS[gesture.mode][gesture.variation];
  if (gesture.mode === 'major' && gesture.variation === 3 && !MAJ7_DEGREES.has(gesture.degree)) {
    return [-12, 4, 7, 10];
  }
  return offsets;
}

/**
 * Notas MIDI del acorde [bajo, voz 1, voz 2, voz 3]. Si algo sale del registro
 * se mueve el acorde entero una octava (no nota por nota), así el bajo sigue
 * siendo la nota más grave. La octava abajo se aplica al final.
 */
export function chordNotes(key: Key, gesture: ChordGesture, octaveDown: boolean): number[] {
  const tonic = 48 + key.pc;
  const root = tonic + DEGREE_SEMITONES[gesture.degree - 1];
  let notes = voicing(gesture).map((offset) => root + offset);
  while (Math.max(...notes) > REGISTER.high) notes = notes.map((n) => n - 12);
  while (Math.min(...notes) < REGISTER.low) notes = notes.map((n) => n + 12);
  return octaveDown ? notes.map((n) => n - 12) : notes;
}

const PERMUTATIONS = [
  [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0],
];

/** La octava de `note` más cercana a `target` sin salir de [min, max]. */
function nearestOctave(note: number, target: number, min: number, max: number): number {
  let best = note;
  for (let n = note - 36; n <= note + 36; n += 12) {
    if (n >= min && n <= max && Math.abs(n - target) < Math.abs(best - target)) best = n;
  }
  return best;
}

/**
 * Conducción de voces (sección 7.4): reparte las 3 notas superiores nuevas entre
 * las voces y elige la octava de cada una para que el movimiento total sea el
 * menor posible. Solo permutar no basta: en una línea, el orden de grave a agudo
 * siempre empata con cualquier otro; lo que acorta el glide es la octava.
 * Las voces quedan entre `min` y `max` (encima del bajo y dentro del registro).
 */
export function voiceLead(previous: number[] | null, next: number[], min: number, max: number): number[] {
  if (!previous) return [...next];
  let best = next;
  let bestCost = Infinity;
  for (const perm of PERMUTATIONS) {
    const candidate = perm.map((i, voice) => nearestOctave(next[i], previous[voice], min, max));
    const cost = candidate.reduce((sum, note, voice) => sum + Math.abs(note - previous[voice]), 0);
    if (cost < bestCost) {
      bestCost = cost;
      best = candidate;
    }
  }
  return best;
}

export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Nombre de una nota según su letra, p. ej. letra Si + semitono 10 = "Si♭" / "Bb". */
export function spell(letter: number, pc: number): { es: string; en: string } {
  let accidental = (pc - NATURAL_PC[letter] + 12) % 12;
  if (accidental > 6) accidental -= 12;
  const sign = accidental > 0 ? '♯' : '♭';
  const ascii = accidental > 0 ? '#' : 'b';
  const n = Math.abs(accidental);
  return { es: LETTERS_ES[letter] + sign.repeat(n), en: LETTERS_EN[letter] + ascii.repeat(n) };
}

/** Raíz de un grado en la tonalidad, p. ej. grado IV en Fa = Si♭. */
export function degreeRoot(key: Key, degree: Degree): { letter: number; pc: number; es: string; en: string } {
  const letter = (key.letter + degree - 1) % 7;
  const pc = (key.pc + DEGREE_SEMITONES[degree - 1]) % 12;
  return { letter, pc, ...spell(letter, pc) };
}

/** Nombre en español y cifrado americano del acorde. */
export function chordName(key: Key, gesture: ChordGesture): { name: string; symbol: string } {
  const root = degreeRoot(key, gesture.degree);
  const { letter, pc } = root;
  const minor = gesture.mode === 'minor';
  const third = spell((letter + 2) % 7, (pc + (minor ? 3 : 4)) % 12).en;
  const sevenths = voicing(gesture)[3] === 11 ? 'maj7' : '7';
  const suffix = minor
    ? ['m', `m/${third}`, 'm7', 'm7b5'][gesture.variation - 1]
    : ['', `/${third}`, sevenths, '7sus4'][gesture.variation - 1];
  return { name: `${root.es} ${minor ? 'menor' : 'mayor'}`, symbol: root.en + suffix };
}

/**
 * Convierte el gesto ganador en las notas del acorde y publica `chordChanged`.
 * Escucha la octava aquí porque cambia las notas, no solo el sonido.
 */
export class MusicTheory {
  private gesture: ChordGesture | null = null;
  private octaveDown = false;
  private upper: number[] | null = null;

  constructor(
    private bus: EventBus<AppEvents>,
    private keyIndex = DEFAULT_KEY_INDEX,
  ) {
    bus.on('chordGestureChanged', ({ gesture }) => {
      this.gesture = gesture;
      this.publish();
    });
    bus.on('expressionChanged', ({ octaveDown }) => {
      if (octaveDown === this.octaveDown) return;
      this.octaveDown = octaveDown;
      if (this.gesture) this.publish();
    });
    bus.on('keyChanged', ({ keyIndex }) => {
      this.keyIndex = keyIndex;
      if (this.gesture) this.publish();
    });
  }

  private publish(): void {
    if (!this.gesture) {
      // Se guardan las voces para que el próximo acorde se deslice desde ellas.
      this.bus.emit('chordChanged', { chord: null });
      return;
    }
    const key = KEYS[this.keyIndex];
    const [bass, ...upper] = chordNotes(key, this.gesture, this.octaveDown);
    const high = REGISTER.high - (this.octaveDown ? 12 : 0);
    this.upper = voiceLead(this.upper, upper, bass + 1, high);
    const chord: ChordSound = { gesture: this.gesture, notes: [bass, ...this.upper], ...chordName(key, this.gesture) };
    this.bus.emit('chordChanged', { chord });
  }
}
