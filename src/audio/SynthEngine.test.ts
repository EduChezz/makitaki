import { describe, expect, it } from 'vitest';
import { TIMBRES, cutoffFromBrightness } from './SynthEngine';

// El audio real necesita un navegador; aquí se prueban las reglas que lo controlan.
describe('cutoffFromBrightness', () => {
  it('va de 300 Hz (oscuro) a 6000 Hz (brillante)', () => {
    expect(cutoffFromBrightness(-1)).toBeCloseTo(300);
    expect(cutoffFromBrightness(1)).toBeCloseTo(6000);
  });

  it('en el centro está a la mitad en escala exponencial', () => {
    expect(cutoffFromBrightness(0)).toBeCloseTo(300 * Math.sqrt(20));
  });

  it('no se sale del rango', () => {
    expect(cutoffFromBrightness(-3)).toBeCloseTo(300);
    expect(cutoffFromBrightness(3)).toBeCloseTo(6000);
  });
});

describe('TIMBRES', () => {
  it('los 3 timbres propios del SDD', () => {
    expect(Object.values(TIMBRES).map((t) => t.label)).toEqual(['Pad', 'Órgano', 'Cristal']);
    expect(TIMBRES.organ.ratio).toBe(2); // una octava arriba
    expect(TIMBRES.crystal.ratio).toBe(1.5); // una quinta arriba
  });
});
