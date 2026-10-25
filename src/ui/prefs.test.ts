import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, loadPrefs, savePrefs } from './prefs';

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe('prefs', () => {
  it('sin nada guardado usa los valores por defecto', () => {
    expect(loadPrefs(memoryStorage())).toEqual(DEFAULT_PREFS);
    expect(loadPrefs(null)).toEqual(DEFAULT_PREFS);
  });

  it('guarda y recupera', () => {
    const storage = memoryStorage();
    const prefs = {
      keyIndex: 2,
      timbre: 'organ' as const,
      filter: 'summer' as const,
      guideVisible: false,
      diagnostics: true,
    };
    savePrefs(storage, prefs);
    expect(loadPrefs(storage)).toEqual(prefs);
  });

  it('descarta valores dañados', () => {
    const storage = memoryStorage();
    storage.setItem('makitaki.prefs.v1', JSON.stringify({ keyIndex: 40, timbre: 'banjo', filter: 'sepia', guideVisible: 'si' }));
    expect(loadPrefs(storage)).toEqual(DEFAULT_PREFS);
    storage.setItem('makitaki.prefs.v1', '{roto');
    expect(loadPrefs(storage)).toEqual(DEFAULT_PREFS);
  });
});
