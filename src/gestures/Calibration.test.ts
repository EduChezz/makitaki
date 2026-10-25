import { describe, expect, it } from 'vitest';
import { EventBus } from '../core/EventBus';
import type { AppEvents, CalibrationData } from '../core/types';
import { Calibration, type KeyValueStorage, isValidHand, loadCalibration } from './Calibration';
import { makeFrame, makeHand } from './testHands';

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

function setup(storage = memoryStorage()) {
  const bus = new EventBus<AppEvents>();
  const calibration = new Calibration(bus, storage);
  const saved: CalibrationData[] = [];
  const failed: string[] = [];
  bus.on('calibrationSaved', (d) => saved.push(d));
  bus.on('calibrationFailed', ({ message }) => failed.push(message));
  let time = 0;
  /** Mantiene las dos manos con esa inclinación durante `ms`. */
  const hold = (leftTilt: number, rightTilt: number, ms: number) => {
    for (let t = 0; t < ms; t += 33) {
      const hands = [makeHand('Left', '11111', { tilt: leftTilt }), makeHand('Right', '11111', { tilt: rightTilt })];
      bus.emit('handsDetected', makeFrame(hands, (time += 33)));
    }
  };
  return { calibration, storage, saved, failed, hold };
}

describe('Calibration', () => {
  it('mide recta, izquierda y derecha y lo guarda', () => {
    const { calibration, storage, saved, hold } = setup();
    expect(calibration.hasSaved).toBe(false);
    calibration.start();
    hold(2, -3, 1600);
    hold(2, -3, 1000); // sigue recta: el paso "izquierda" no la cuenta
    hold(30, 25, 1600);
    hold(-28, -33, 1600);

    expect(saved).toHaveLength(1);
    expect(saved[0].left.straight).toBeCloseTo(2);
    expect(saved[0].left.left).toBeCloseTo(30);
    expect(saved[0].right.right).toBeCloseTo(-33);
    expect(calibration.active).toBe(false);
    expect(loadCalibration(storage)).toEqual(saved[0]);
  });

  it('si las inclinaciones van al mismo lado, avisa y vuelve a empezar', () => {
    const { calibration, saved, failed, hold } = setup();
    calibration.start();
    hold(0, 0, 1600);
    hold(30, 30, 1600);
    hold(25, 25, 1600);
    expect(saved).toHaveLength(0);
    expect(failed).toHaveLength(1);
    expect(calibration.active).toBe(true);
  });

  it('no lee datos dañados del almacenamiento', () => {
    const storage = memoryStorage();
    storage.setItem('makitaki.calibration.v1', '{roto');
    expect(loadCalibration(storage)).toBeNull();
    expect(setup(storage).calibration.hasSaved).toBe(false);
  });
});

describe('isValidHand', () => {
  it('pide inclinaciones claras y hacia lados opuestos', () => {
    expect(isValidHand({ straight: 0, left: 30, right: -30 })).toBe(true);
    expect(isValidHand({ straight: 0, left: 5, right: -30 })).toBe(false);
    expect(isValidHand({ straight: 0, left: 30, right: 20 })).toBe(false);
  });
});
