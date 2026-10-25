export interface VoteOptions {
  /** Solo cuentan los fotogramas de este último tramo de tiempo. */
  windowMs: number;
  /** Parte mínima de los fotogramas de la ventana que debe tener el ganador. */
  minShare: number;
  /** Fotogramas mínimos del ganador, para que un solo fotograma nunca decida. */
  minFrames: number;
}

/**
 * Votación de la sección 8.3, contada por tiempo en lugar de por fotogramas:
 * con 200 ms y 2/3 equivale a "4 de 6" a 30 FPS, pero el retraso no crece
 * cuando el celular va más lento.
 */
export const DEFAULT_VOTE: VoteOptions = { windowMs: 200, minShare: 2 / 3, minFrames: 2 }; // inicial

interface Sample<T> {
  time: number;
  key: string;
  value: T;
}

export class TimeVoter<T> {
  private samples: Sample<T>[] = [];
  private currentKey: string | undefined;
  private currentValue: T | undefined;

  constructor(
    private options: VoteOptions,
    private keyOf: (value: T) => string,
  ) {}

  /** Ganador actual, o `undefined` si todavía no hubo ninguno. */
  get current(): T | undefined {
    return this.currentValue;
  }

  /** Agrega la lectura de un fotograma; devuelve `true` si cambió el ganador. */
  push(value: T, time: number): boolean {
    this.samples.push({ time, key: this.keyOf(value), value });
    const oldest = time - this.options.windowMs;
    while (this.samples.length > 0 && this.samples[0].time < oldest) this.samples.shift();

    const counts = new Map<string, { count: number; value: T }>();
    for (const s of this.samples) {
      const entry = counts.get(s.key);
      if (entry) entry.count++;
      else counts.set(s.key, { count: 1, value: s.value });
    }
    let bestKey: string | undefined;
    let best = { count: 0, value };
    for (const [key, entry] of counts) {
      if (entry.count > best.count) {
        bestKey = key;
        best = entry;
      }
    }

    if (bestKey === undefined || bestKey === this.currentKey) return false;
    if (best.count < this.options.minFrames) return false;
    if (best.count / this.samples.length < this.options.minShare) return false;
    this.currentKey = bestKey;
    this.currentValue = best.value;
    return true;
  }
}
