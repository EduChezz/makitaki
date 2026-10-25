import type { EventBus } from '../core/EventBus';
import type { AppEvents, CalibrationData, CalibrationStep, HandCalibration, HandsFrame } from '../core/types';
import { assignHands } from './assignHands';
import { tiltAngle, toMetric } from './HandGeometry';

export const CALIBRATION_STEPS: readonly CalibrationStep[] = ['straight', 'left', 'right'];

/** Valores "inicial" de la calibración. */
export const CALIBRATION = {
  /** Tiempo que hay que mantener la posición quieta. */
  holdMs: 1500,
  /** Variación máxima del ángulo mientras se mantiene la posición. */
  stableRangeDeg: 12,
  /** Inclinación mínima respecto a la mano recta para que cuente. */
  minSpanDeg: 10,
};

/**
 * Se usa mientras el usuario no se calibra. En la imagen sin espejo, inclinar
 * hacia la izquierda del usuario da ángulos positivos.
 */
export const DEFAULT_CALIBRATION: CalibrationData = {
  left: { straight: 0, left: 35, right: -35 },
  right: { straight: 0, left: 35, right: -35 },
};

const STORAGE_KEY = 'makitaki.calibration.v1';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** localStorage puede no existir o lanzar error (modo privado, permisos). */
export function browserStorage(): KeyValueStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Las dos inclinaciones deben ser claras y hacia lados opuestos. */
export function isValidHand(cal: HandCalibration): boolean {
  const toLeft = cal.left - cal.straight;
  const toRight = cal.right - cal.straight;
  return (
    Math.abs(toLeft) >= CALIBRATION.minSpanDeg &&
    Math.abs(toRight) >= CALIBRATION.minSpanDeg &&
    Math.sign(toLeft) !== Math.sign(toRight)
  );
}

function isHandCalibration(value: unknown): value is HandCalibration {
  const v = value as HandCalibration;
  return !!v && [v.straight, v.left, v.right].every((n) => typeof n === 'number' && Number.isFinite(n));
}

export function loadCalibration(storage: KeyValueStorage): CalibrationData | null {
  try {
    const data = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null') as CalibrationData | null;
    if (!data || !isHandCalibration(data.left) || !isHandCalibration(data.right)) return null;
    return isValidHand(data.left) && isValidHand(data.right) ? data : null;
  } catch {
    return null;
  }
}

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
const range = (values: number[]) => Math.max(...values) - Math.min(...values);

interface StepSamples {
  start: number;
  left: number[];
  right: number[];
}

/**
 * Pantalla de calibración (RF-15): mide los ángulos de inclinación de cada mano
 * en 3 pasos (recta, a la izquierda, a la derecha) y los guarda en localStorage.
 */
export class Calibration {
  private data: CalibrationData;
  private saved: boolean;
  private stepIndex = -1;
  private samples: StepSamples | null = null;
  private results: Partial<Record<CalibrationStep, { left: number; right: number }>> = {};

  constructor(
    private bus: EventBus<AppEvents>,
    private storage: KeyValueStorage | null,
  ) {
    const loaded = storage ? loadCalibration(storage) : null;
    this.data = loaded ?? DEFAULT_CALIBRATION;
    this.saved = loaded !== null;
    bus.on('handsDetected', (frame) => this.onFrame(frame));
  }

  get current(): CalibrationData {
    return this.data;
  }

  get hasSaved(): boolean {
    return this.saved;
  }

  get active(): boolean {
    return this.stepIndex >= 0;
  }

  start(): void {
    this.stepIndex = 0;
    this.samples = null;
    this.results = {};
    this.emitProgress(0, false);
  }

  cancel(): void {
    this.stepIndex = -1;
    this.samples = null;
  }

  private onFrame(frame: HandsFrame): void {
    if (!this.active) return;
    const { left, right } = assignHands(frame.hands);
    if (!left || !right) {
      this.samples = null;
      this.emitProgress(0, false);
      return;
    }
    const leftAngle = tiltAngle(toMetric(left.landmarks, frame.aspect));
    const rightAngle = tiltAngle(toMetric(right.landmarks, frame.aspect));

    // En los pasos de inclinación, la mano recta todavía no cuenta.
    const straight = this.results.straight;
    const tilted =
      !straight ||
      (Math.abs(leftAngle - straight.left) >= CALIBRATION.minSpanDeg &&
        Math.abs(rightAngle - straight.right) >= CALIBRATION.minSpanDeg);
    if (this.stepIndex > 0 && !tilted) {
      this.samples = null;
      this.emitProgress(0, true);
      return;
    }

    const s = this.samples;
    const stable =
      s !== null &&
      range([...s.left, leftAngle]) <= CALIBRATION.stableRangeDeg &&
      range([...s.right, rightAngle]) <= CALIBRATION.stableRangeDeg;
    if (!stable) this.samples = { start: frame.timestamp, left: [], right: [] };
    this.samples!.left.push(leftAngle);
    this.samples!.right.push(rightAngle);

    const progress = Math.min((frame.timestamp - this.samples!.start) / CALIBRATION.holdMs, 1);
    this.emitProgress(progress, true);
    if (progress >= 1) this.finishStep();
  }

  private finishStep(): void {
    const step = CALIBRATION_STEPS[this.stepIndex];
    this.results[step] = { left: mean(this.samples!.left), right: mean(this.samples!.right) };
    this.samples = null;
    this.stepIndex++;
    if (this.stepIndex < CALIBRATION_STEPS.length) {
      this.emitProgress(0, true);
      return;
    }

    this.stepIndex = -1;
    const r = this.results as Record<CalibrationStep, { left: number; right: number }>;
    const data: CalibrationData = {
      left: { straight: r.straight.left, left: r.left.left, right: r.right.left },
      right: { straight: r.straight.right, left: r.left.right, right: r.right.right },
    };
    if (!isValidHand(data.left) || !isValidHand(data.right)) {
      this.bus.emit('calibrationFailed', {
        message: 'Las inclinaciones fueron muy pequeñas o hacia el mismo lado. Probemos otra vez.',
      });
      this.start();
      return;
    }

    this.data = data;
    this.saved = true;
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Sin almacenamiento la calibración sirve igual hasta cerrar la página.
    }
    this.bus.emit('calibrationSaved', data);
  }

  private emitProgress(progress: number, handsVisible: boolean): void {
    if (!this.active) return;
    this.bus.emit('calibrationProgress', {
      step: CALIBRATION_STEPS[this.stepIndex],
      stepIndex: this.stepIndex,
      progress,
      handsVisible,
    });
  }
}
