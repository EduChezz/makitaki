import type { EventBus } from '../core/EventBus';
import type { AppEvents, CameraErrorReason } from '../core/types';

export function isMobileDevice(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
}

/** Resolución pedida a la cámara: 1280×720 en computadora, 640×480 en celular. */
export function preferredResolution(mobile: boolean): { width: number; height: number } {
  return mobile ? { width: 640, height: 480 } : { width: 1280, height: 720 };
}

/** Traduce el error del navegador a un motivo que la interfaz sabe explicar. */
export function cameraErrorReason(errorName: string | undefined, secureContext: boolean): CameraErrorReason {
  if (!secureContext) return 'insecure';
  switch (errorName) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'notFound';
    default:
      return 'unknown';
  }
}

const ERROR_MESSAGES: Record<CameraErrorReason, string> = {
  denied:
    'MakiTaki necesita la cámara. Actívala desde el ícono de cámara o candado junto a la dirección y recarga la página.',
  notFound: 'No se encontró una cámara.',
  insecure: 'La cámara solo funciona en páginas seguras (https://).',
  unknown: 'No se pudo abrir la cámara.',
};

export class CameraManager {
  private stream: MediaStream | null = null;

  constructor(
    private bus: EventBus<AppEvents>,
    private video: HTMLVideoElement,
  ) {
    // Necesarios en iPhone para reproducir el video dentro de la página.
    video.setAttribute('playsinline', '');
    video.muted = true;
  }

  async start(): Promise<void> {
    const secure = window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;
    if (!secure) {
      this.fail(cameraErrorReason(undefined, false));
      return;
    }
    const { width, height } = preferredResolution(isMobileDevice(navigator.userAgent));
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: width }, height: { ideal: height } },
      });
      this.video.srcObject = this.stream;
      await this.video.play();
      this.bus.emit('cameraReady', {
        video: this.video,
        width: this.video.videoWidth,
        height: this.video.videoHeight,
      });
    } catch (err) {
      this.fail(cameraErrorReason((err as DOMException)?.name, true));
    }
  }

  stop(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }

  private fail(reason: CameraErrorReason): void {
    this.bus.emit('cameraError', { reason, message: ERROR_MESSAGES[reason] });
  }
}
