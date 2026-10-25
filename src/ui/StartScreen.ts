import type { EventBus } from '../core/EventBus';
import type { AppEvents } from '../core/types';

/**
 * Pantalla de inicio (RF-02). Tocarla es obligatorio en los navegadores para
 * abrir la cámara y, desde la fase 3, activar el audio.
 */
export class StartScreen {
  constructor(
    bus: EventBus<AppEvents>,
    private root: HTMLElement,
    private button: HTMLButtonElement,
    private status: HTMLElement,
  ) {
    bus.on('trackerReady', () => this.setStatus(''));
    bus.on('trackerError', () => {
      this.setStatus('No se pudo cargar el modelo de manos.', true);
      this.button.disabled = false;
      this.button.textContent = 'Reintentar';
    });
    bus.on('cameraError', ({ message }) => {
      this.show();
      this.setStatus(message, true);
      this.button.disabled = false;
      this.button.textContent = 'Reintentar';
    });
    bus.on('cameraReady', () => this.hide());
  }

  /** Llama a `onStart` cuando el usuario toca el botón. */
  onStart(onStart: () => void): void {
    this.button.addEventListener('click', () => {
      this.button.disabled = true;
      this.setStatus('Abriendo la cámara…');
      onStart();
    });
  }

  setStatus(text: string, isError = false): void {
    this.status.textContent = text;
    this.status.classList.toggle('error', isError);
  }

  private show(): void {
    this.root.hidden = false;
  }

  private hide(): void {
    this.root.hidden = true;
  }
}
