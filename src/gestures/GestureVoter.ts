import type { EventBus } from '../core/EventBus';
import type { AppEvents, CalibrationData, ChordGesture, HandsFrame, Mode, Variation } from '../core/types';
import { assignHands } from './assignHands';
import { fingerCode, leftDegree, rightVariation } from './GesturePatterns';
import { fingerStates, tiltAngle, toMetric } from './HandGeometry';
import { DEFAULT_VOTE, TimeVoter } from './TimeVoter';
import { nextMode, tiltToT } from './tilt';

export function gestureKey(gesture: ChordGesture | null): string {
  return gesture ? `${gesture.degree}-${gesture.mode}-${gesture.variation}` : 'silencio';
}

/**
 * Lee grado, modo y variación en cada fotograma y publica `chordGestureChanged`
 * solo cuando un gesto gana la votación (sección 8.3). Ganar con "silencio" es
 * la única regla que apaga el sonido, así que perder una mano un instante no corta.
 */
export class GestureVoter {
  private voter = new TimeVoter<ChordGesture | null>(DEFAULT_VOTE, gestureKey);
  private mode: Mode = 'major';

  constructor(
    private bus: EventBus<AppEvents>,
    private calibration: CalibrationData,
  ) {
    bus.on('calibrationSaved', (data) => (this.calibration = data));
    bus.on('handsDetected', (frame) => this.onFrame(frame));
  }

  private onFrame(frame: HandsFrame): void {
    const { left, right } = assignHands(frame.hands);
    let leftCode: string | null = null;
    let rightCode: string | null = null;
    let leftTilt: number | null = null;
    let rightTilt: number | null = null;

    if (left) {
      const points = toMetric(left.landmarks, frame.aspect);
      leftCode = fingerCode(fingerStates(points));
      leftTilt = tiltToT(tiltAngle(points), this.calibration.left);
      this.mode = nextMode(this.mode, leftTilt);
    }
    if (right) {
      const points = toMetric(right.landmarks, frame.aspect);
      rightCode = fingerCode(fingerStates(points));
      rightTilt = tiltToT(tiltAngle(points), this.calibration.right);
    }

    const degree = leftCode ? leftDegree(leftCode) : null;
    const variation = rightCode ? rightVariation(rightCode) : 0;
    const gesture: ChordGesture | null =
      degree && variation > 0 ? { degree, mode: this.mode, variation: variation as Variation } : null;

    this.bus.emit('rawGesture', { leftCode, rightCode, leftTilt, rightTilt, gesture });
    if (this.voter.push(gesture, frame.timestamp)) {
      this.bus.emit('chordGestureChanged', { gesture: this.voter.current ?? null });
    }
  }
}
