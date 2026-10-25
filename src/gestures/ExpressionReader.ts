import type { EventBus } from '../core/EventBus';
import type { AppEvents, CalibrationData, HandsFrame } from '../core/types';
import { assignHands } from './assignHands';
import { fingerCode, rightOctaveDown } from './GesturePatterns';
import { fingerStates, tiltAngle, toMetric } from './HandGeometry';
import { DEFAULT_VOTE, TimeVoter } from './TimeVoter';
import { clamp, tiltToT } from './tilt';

/**
 * Suavizado por tiempo: 93 ms equivale al "0,7 × anterior + 0,3 × nuevo" del SDD
 * a 30 FPS, pero responde igual de rápido aunque el celular vaya a 12 FPS.
 */
export const EXPRESSION = { smoothingMs: 93 }; // inicial

/**
 * Curva de volumen de la mano derecha. Cambia la del SDD (sección 8.4), que con
 * la mano a media altura daba solo 25 %: al poner las manos ya se oye bien y
 * desde ahí sube al levantar la mano. Valores "inicial".
 */
export const VOLUME_CURVE = {
  /** Volumen con la mano derecha visible pero abajo. */
  min: 0.35,
  /** Altura de la muñeca (0 arriba, 1 abajo) donde empieza a subir y donde llega al máximo. */
  bottom: 0.85,
  top: 0.25,
  /** Mayor que 1 = sube más suave al principio, más natural al oído. */
  exponent: 1.5,
};

/** Altura de la muñeca (0 arriba, 1 abajo) → volumen entre `min` y 1. */
export function volumeFromHeight(y: number): number {
  const { min, bottom, top, exponent } = VOLUME_CURVE;
  // Se limita antes de la curva: fuera del rango no se dispara.
  const level = clamp((bottom - y) / (bottom - top), 0, 1);
  return min + (1 - min) * level ** exponent;
}

/** Acerca `previous` a `target` según el tiempo transcurrido. */
export function smoothToward(previous: number, target: number, dtMs: number, tauMs: number): number {
  if (dtMs <= 0) return previous;
  return previous + (target - previous) * (1 - Math.exp(-dtMs / tauMs));
}

/**
 * Volumen y brillo se actualizan en cada fotograma, sin votación. La octava sí
 * pasa por la votación: el pulgar es el dedo que peor se detecta y un fotograma
 * suelto haría saltar el acorde una octava.
 */
export class ExpressionReader {
  private volume = 0;
  private brightness = 0;
  private lastTime: number | null = null;
  private octave = new TimeVoter<boolean>(DEFAULT_VOTE, (down) => (down ? 'abajo' : 'normal'));

  constructor(
    private bus: EventBus<AppEvents>,
    private calibration: CalibrationData,
  ) {
    bus.on('calibrationSaved', (data) => (this.calibration = data));
    bus.on('handsDetected', (frame) => this.onFrame(frame));
  }

  private onFrame(frame: HandsFrame): void {
    const { right } = assignHands(frame.hands);
    // Tras una pausa larga no se salta de golpe más de lo que permitiría 1/4 s.
    const dt = this.lastTime === null ? 0 : Math.min(frame.timestamp - this.lastTime, 250);
    this.lastTime = frame.timestamp;

    let targetVolume = 0;
    let targetBrightness = this.brightness;
    if (right) {
      const points = toMetric(right.landmarks, frame.aspect);
      targetVolume = volumeFromHeight(right.landmarks[0].y);
      targetBrightness = tiltToT(tiltAngle(points), this.calibration.right);
      this.octave.push(rightOctaveDown(fingerCode(fingerStates(points))), frame.timestamp);
    }

    this.volume = smoothToward(this.volume, targetVolume, dt, EXPRESSION.smoothingMs);
    this.brightness = smoothToward(this.brightness, targetBrightness, dt, EXPRESSION.smoothingMs);
    this.bus.emit('expressionChanged', {
      volume: this.volume,
      brightness: this.brightness,
      octaveDown: this.octave.current ?? false,
    });
  }
}
