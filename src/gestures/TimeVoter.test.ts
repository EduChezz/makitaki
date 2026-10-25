import { describe, expect, it } from 'vitest';
import { DEFAULT_VOTE, TimeVoter } from './TimeVoter';

const newVoter = () => new TimeVoter<string>(DEFAULT_VOTE, (v) => v);

/** Envía `value` a `fps` hasta que gane; devuelve cuántos ms tardó. */
function timeToWin(voter: TimeVoter<string>, value: string, fps: number, start: number): number {
  const step = 1000 / fps;
  for (let t = start; t < start + 2000; t += step) {
    if (voter.push(value, t) && voter.current === value) return t - start;
  }
  return Infinity;
}

function settle(voter: TimeVoter<string>, value: string, fps: number, until: number): void {
  for (let t = 0; t <= until; t += 1000 / fps) voter.push(value, t);
}

describe('TimeVoter', () => {
  it('un solo fotograma nunca decide', () => {
    const voter = newVoter();
    expect(voter.push('I', 0)).toBe(false);
    expect(voter.current).toBeUndefined();
    expect(voter.push('I', 33)).toBe(true);
    expect(voter.current).toBe('I');
  });

  it('un fotograma suelto equivocado no cambia el ganador', () => {
    const voter = newVoter();
    settle(voter, 'I', 30, 500);
    expect(voter.push('II', 533)).toBe(false);
    expect(voter.push('I', 566)).toBe(false);
    expect(voter.current).toBe('I');
  });

  it('a 30 FPS un cambio tarda como la votación "4 de 6" del SDD', () => {
    const voter = newVoter();
    settle(voter, 'I', 30, 500);
    const ms = timeToWin(voter, 'IV', 30, 533);
    expect(ms).toBeGreaterThanOrEqual(100);
    expect(ms).toBeLessThan(200);
  });

  it('a 12 FPS el cambio no tarda más que a 30 FPS', () => {
    const voter = newVoter();
    settle(voter, 'I', 12, 500);
    expect(timeToWin(voter, 'IV', 12, 583)).toBeLessThan(200);
  });

  it('si la ventana queda casi vacía tras una pausa, espera más fotogramas', () => {
    const voter = newVoter();
    settle(voter, 'I', 30, 500);
    expect(voter.push('V', 2000)).toBe(false);
    expect(voter.push('V', 2033)).toBe(true);
  });
});
