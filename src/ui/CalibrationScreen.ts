import type { EventBus } from '../core/EventBus';
import type { AppEvents, CalibrationStep } from '../core/types';
import { CALIBRATION_STEPS, type Calibration } from '../gestures/Calibration';

const STEP_TEXT: Record<CalibrationStep, { title: string; hint: string }> = {
  straight: {
    title: 'Manos rectas',
    hint: 'Levanta las dos manos con los dedos hacia arriba y quédate quieto.',
  },
  left: {
    title: 'Inclina hacia la izquierda',
    hint: 'Inclina las dos manos hacia tu izquierda, como un limpiaparabrisas, y mantén.',
  },
  right: {
    title: 'Inclina hacia la derecha',
    hint: 'Ahora inclina las dos manos hacia tu derecha y mantén.',
  },
};

export interface CalibrationElements {
  root: HTMLElement;
  stepCount: HTMLElement;
  title: HTMLElement;
  hint: HTMLElement;
  progress: HTMLElement;
  error: HTMLElement;
  cancel: HTMLButtonElement;
}

/** Muestra los 3 pasos de la calibración encima del video (RF-15). */
export class CalibrationScreen {
  constructor(
    bus: EventBus<AppEvents>,
    private calibration: Calibration,
    private el: CalibrationElements,
  ) {
    bus.on('calibrationProgress', ({ step, stepIndex, progress, handsVisible }) => {
      this.el.root.hidden = false;
      this.el.stepCount.textContent = `Paso ${stepIndex + 1} de ${CALIBRATION_STEPS.length}`;
      this.el.title.textContent = STEP_TEXT[step].title;
      this.el.hint.textContent = handsVisible ? STEP_TEXT[step].hint : 'Muestra las dos manos a la cámara.';
      this.el.progress.style.width = `${Math.round(progress * 100)}%`;
    });
    bus.on('calibrationFailed', ({ message }) => (this.el.error.textContent = message));
    bus.on('calibrationSaved', () => this.close());
    el.cancel.addEventListener('click', () => {
      this.calibration.cancel();
      this.close();
    });
  }

  open(): void {
    this.el.error.textContent = '';
    this.calibration.start();
  }

  private close(): void {
    this.el.root.hidden = true;
    this.el.error.textContent = '';
  }
}
