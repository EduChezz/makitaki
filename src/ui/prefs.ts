import type { Timbre } from '../core/types';
import type { KeyValueStorage } from '../gestures/Calibration';

/** Preferencias de cada persona, guardadas solo en su navegador. */
export interface Prefs {
  keyIndex: number;
  timbre: Timbre;
  /** `null` = todavía no eligió: se decide según el tamaño de pantalla. */
  guideVisible: boolean | null;
  diagnostics: boolean;
}

const STORAGE_KEY = 'makitaki.prefs.v1';
const TIMBRES: readonly Timbre[] = ['pad', 'organ', 'crystal'];

export const DEFAULT_PREFS: Prefs = { keyIndex: 7, timbre: 'pad', guideVisible: null, diagnostics: false };

/** Lee las preferencias y descarta cualquier valor dañado. */
export function loadPrefs(storage: KeyValueStorage | null): Prefs {
  try {
    const raw = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '{}') as Partial<Prefs>;
    return {
      keyIndex:
        Number.isInteger(raw.keyIndex) && raw.keyIndex! >= 0 && raw.keyIndex! < 12
          ? raw.keyIndex!
          : DEFAULT_PREFS.keyIndex,
      timbre: TIMBRES.includes(raw.timbre as Timbre) ? (raw.timbre as Timbre) : DEFAULT_PREFS.timbre,
      guideVisible: typeof raw.guideVisible === 'boolean' ? raw.guideVisible : null,
      diagnostics: raw.diagnostics === true,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(storage: KeyValueStorage | null, prefs: Prefs): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Sin almacenamiento las preferencias duran hasta cerrar la página.
  }
}
