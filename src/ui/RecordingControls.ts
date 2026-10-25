import type { EventBus } from '../core/EventBus';
import type { AppEvents, RecordingResult } from '../core/types';
import { Recorder, formatDuration } from '../recording/Recorder';
import { byId } from './dom';

/**
 * Botón de grabar con contador y la pantalla final para ver, guardar o
 * compartir el video. Mientras se graba, los paneles HTML se ocultan porque el
 * canvas los dibuja (así salen en el video y en pantalla se ven igual).
 */
export class RecordingControls {
  private button = byId<HTMLButtonElement>('record-button');
  private label = byId('record-label');
  private tick: number | undefined;
  private result: RecordingResult | null = null;
  private url: string | null = null;

  constructor(
    bus: EventBus<AppEvents>,
    private recorder: Recorder,
  ) {
    if (!Recorder.supported) {
      this.button.hidden = true;
      return;
    }
    this.button.addEventListener('click', () => void this.toggle());
    bus.on('recordingChanged', ({ recording }) => this.showRecording(recording));
    bus.on('recordingReady', (result) => this.showResult(result));
    this.setupResultDialog();
  }

  private async toggle(): Promise<void> {
    if (this.recorder.recording) {
      this.recorder.stop();
      return;
    }
    this.button.disabled = true;
    this.label.textContent = 'Preparando…';
    try {
      await this.recorder.start();
    } catch (err) {
      console.error('No se pudo grabar:', err);
      this.label.textContent = 'Grabar';
    } finally {
      this.button.disabled = false;
    }
  }

  private showRecording(recording: boolean): void {
    document.body.classList.toggle('recording', recording);
    this.button.classList.toggle('active', recording);
    this.button.setAttribute('aria-label', recording ? 'Detener grabación' : 'Grabar');
    window.clearInterval(this.tick);
    if (recording) {
      const update = () => (this.label.textContent = formatDuration(this.recorder.elapsedMs));
      update();
      this.tick = window.setInterval(update, 250);
    } else {
      this.label.textContent = 'Grabar';
    }
  }

  private showResult(result: RecordingResult): void {
    this.result = result;
    this.url = URL.createObjectURL(result.blob);
    const preview = byId<HTMLVideoElement>('rec-preview');
    preview.src = this.url;
    const download = byId<HTMLAnchorElement>('rec-download');
    download.href = this.url;
    download.download = result.fileName;
    const voice = result.withVoice ? 'con tu voz' : 'sin voz (no hubo permiso de micrófono)';
    byId('rec-info').textContent = `${formatDuration(result.durationMs)} · ${voice}`;
    byId('rec-share').hidden = !this.canShare(result);
    byId('recording-result').hidden = false;
  }

  private canShare(result: RecordingResult): boolean {
    const file = new File([result.blob], result.fileName, { type: result.mimeType });
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  }

  private setupResultDialog(): void {
    const dialog = byId('recording-result');
    const close = () => {
      dialog.hidden = true;
      byId<HTMLVideoElement>('rec-preview').removeAttribute('src');
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = null;
      this.result = null;
    };
    byId('rec-discard').addEventListener('click', close);
    // En iPhone, Compartir es la forma de guardarlo en Fotos o mandarlo por WhatsApp.
    byId('rec-share').addEventListener('click', async () => {
      if (!this.result) return;
      const { blob, fileName, mimeType } = this.result;
      try {
        await navigator.share({ files: [new File([blob], fileName, { type: mimeType })], title: 'MakiTaki' });
      } catch (err) {
        if ((err as DOMException).name !== 'AbortError') console.error('No se pudo compartir:', err);
      }
    });
  }
}
