import { describe, expect, it } from 'vitest';
import { MAX_PARTICLES, Particles } from './particles';
import { approach, ringRadius, voiceAngle } from './ring';

describe('voiceAngle', () => {
  it('Do arriba y cada semitono avanza 30°', () => {
    expect(voiceAngle(60)).toBeCloseTo(-Math.PI / 2 + 10 * Math.PI);
    expect(voiceAngle(61) - voiceAngle(60)).toBeCloseTo(Math.PI / 6);
  });

  it('un glide de una octava da una vuelta completa', () => {
    expect(voiceAngle(72) - voiceAngle(60)).toBeCloseTo(2 * Math.PI);
  });
});

describe('approach', () => {
  it('se acerca al objetivo sin pasarse', () => {
    const v = approach(0, 10, 25, 25);
    expect(v).toBeGreaterThan(5);
    expect(v).toBeLessThan(10);
    expect(approach(0, 10, 1000, 25)).toBeCloseTo(10);
    expect(approach(3, 10, 0, 25)).toBe(3);
  });
});

describe('ringRadius', () => {
  it('crece con el volumen y con el nivel del audio', () => {
    expect(ringRadius(100, 0, 0)).toBeCloseTo(70);
    expect(ringRadius(100, 1, 0)).toBeCloseTo(130);
    expect(ringRadius(100, 1, 1)).toBeCloseTo(145);
  });
});

describe('Particles', () => {
  it('nunca pasa del límite', () => {
    const particles = new Particles();
    const tips = Array.from({ length: 10 }, (_, i) => ({ x: i, y: 0 }));
    for (let i = 0; i < 100; i++) particles.emit(tips, 1000, 33, 1);
    expect(particles.count).toBe(MAX_PARTICLES);
  });
});
