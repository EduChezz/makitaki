/**
 * Mantiene la pantalla encendida mientras se toca: con MakiTaki nadie toca la
 * pantalla, y sin esto el celular se bloquea a los pocos segundos.
 * Si el navegador no lo permite, la app funciona igual.
 */
export class ScreenAwake {
  private lock: WakeLockSentinel | null = null;
  private wanted = false;

  constructor() {
    // El navegador suelta el bloqueo al cambiar de pestaña; se pide otra vez al volver.
    document.addEventListener('visibilitychange', () => {
      if (this.wanted && document.visibilityState === 'visible') void this.request();
    });
  }

  enable(): void {
    this.wanted = true;
    void this.request();
  }

  private async request(): Promise<void> {
    if (!('wakeLock' in navigator) || (this.lock && !this.lock.released)) return;
    try {
      this.lock = await navigator.wakeLock.request('screen');
    } catch (err) {
      console.warn('No se pudo mantener la pantalla encendida:', err);
    }
  }
}
