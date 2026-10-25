import type { EventBus } from '../core/EventBus';
import type { AppEvents, Timbre } from '../core/types';
import { TIMBRES } from '../audio/SynthEngine';
import type { KeyValueStorage } from '../gestures/Calibration';
import { KEYS } from '../music/MusicTheory';
import type { CalibrationScreen } from './CalibrationScreen';
import { byId } from './dom';
import { hintMessage } from './hint';
import { type Prefs, loadPrefs, savePrefs } from './prefs';

const MOBILE = '(max-width: 640px)';

/**
 * Interfaz (fase 4): barra superior con selectores y menú, guía que se puede
 * ocultar, pantallas de ayuda y licencias, aviso de manos y modo diagnóstico.
 * En celular los selectores pasan al menú y la guía empieza oculta.
 */
export class UI {
  private prefs: Prefs;
  private missingSince: number | null = null;
  private lastAnyHand: number | null = null;
  private startedAt = 0;
  private mobile = window.matchMedia(MOBILE);

  constructor(
    private bus: EventBus<AppEvents>,
    private calibrationScreen: CalibrationScreen,
    private storage: KeyValueStorage | null,
  ) {
    this.prefs = loadPrefs(storage);
    this.setupSelectors();
    this.setupMenu();
    this.setupGuide();
    this.setupDialogs();
    this.setupDiagnostics();
    this.setupHint();
    bus.on('cameraReady', () => {
      this.startedAt = performance.now();
      byId('topbar').hidden = false;
      this.applyGuide();
    });
  }

  private save(change: Partial<Prefs>): void {
    this.prefs = { ...this.prefs, ...change };
    savePrefs(this.storage, this.prefs);
  }

  private setupSelectors(): void {
    const key = byId<HTMLSelectElement>('key-select');
    const timbre = byId<HTMLSelectElement>('timbre-select');
    key.replaceChildren(...KEYS.map((k, i) => new Option(k.name, String(i), false, i === this.prefs.keyIndex)));
    timbre.replaceChildren(
      ...Object.entries(TIMBRES).map(([id, spec]) => new Option(spec.label, id, false, id === this.prefs.timbre)),
    );
    key.addEventListener('change', () => {
      this.save({ keyIndex: Number(key.value) });
      this.bus.emit('keyChanged', { keyIndex: this.prefs.keyIndex });
    });
    timbre.addEventListener('change', () => {
      this.save({ timbre: timbre.value as Timbre });
      this.bus.emit('timbreChanged', { timbre: this.prefs.timbre });
    });
    // Los demás módulos arrancan con los valores guardados.
    this.bus.emit('keyChanged', { keyIndex: this.prefs.keyIndex });
    this.bus.emit('timbreChanged', { timbre: this.prefs.timbre });

    // En celular los selectores viven dentro del menú (sección 10.1).
    const selectors = byId('selectors');
    const place = () => (this.mobile.matches ? byId('menu-selectors') : byId('topbar-selectors')).append(selectors);
    place();
    this.mobile.addEventListener('change', place);
  }

  private setupMenu(): void {
    const button = byId<HTMLButtonElement>('menu-button');
    const menu = byId('menu');
    const setOpen = (open: boolean) => {
      menu.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
    };
    button.addEventListener('click', () => setOpen(Boolean(menu.hidden)));
    document.addEventListener('click', (e) => {
      if (!menu.hidden && !menu.contains(e.target as Node) && e.target !== button) setOpen(false);
    });
    menu.addEventListener('click', (e) => {
      const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
      if (!action) return;
      setOpen(false);
      if (action === 'help') this.openDialog('help');
      if (action === 'licenses') this.openDialog('licenses');
      if (action === 'calibrate') this.calibrationScreen.open();
      if (action === 'diagnostics') this.setDiagnostics(!this.prefs.diagnostics);
    });
  }

  private setupGuide(): void {
    byId('guide-toggle').addEventListener('click', () => {
      this.save({ guideVisible: !this.isGuideVisible() });
      this.applyGuide();
    });
  }

  private isGuideVisible(): boolean {
    return this.prefs.guideVisible ?? !this.mobile.matches;
  }

  private applyGuide(): void {
    const visible = this.isGuideVisible();
    byId('guide').hidden = !visible;
    byId('guide-toggle').setAttribute('aria-pressed', String(visible));
  }

  private setupDialogs(): void {
    for (const id of ['help', 'licenses']) {
      const dialog = byId(id);
      dialog.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target === dialog || target.closest('[data-close]')) dialog.hidden = true;
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') for (const id of ['help', 'licenses']) byId(id).hidden = true;
    });
    byId('licenses-list').addEventListener('click', (e) => {
      const file = (e.target as HTMLElement).closest<HTMLElement>('[data-license]')?.dataset.license;
      if (file) void this.showLicense(file);
    });
  }

  private openDialog(id: string): void {
    const dialog = byId(id);
    dialog.hidden = false;
    dialog.querySelector<HTMLElement>('[data-close]')?.focus();
  }

  private async showLicense(file: string): Promise<void> {
    const text = byId('license-text');
    text.hidden = false;
    text.textContent = 'Cargando…';
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}licenses/${file}`);
      text.textContent = res.ok ? await res.text() : 'No se pudo cargar la licencia.';
    } catch {
      text.textContent = 'No se pudo cargar la licencia.';
    }
  }

  private setupDiagnostics(): void {
    const line = byId('diagnostics');
    this.bus.on('rawGesture', ({ leftCode, rightCode, leftTilt, rightTilt }) => {
      if (!this.prefs.diagnostics) return;
      const tilt = (t: number | null) => (t === null ? '—' : `${t >= 0 ? '+' : ''}${t.toFixed(2)}`);
      line.textContent = `Izq ${leftCode ?? '—'} (${tilt(leftTilt)}) · Der ${rightCode ?? '—'} (${tilt(rightTilt)})`;
    });
    this.setDiagnostics(this.prefs.diagnostics);
  }

  private setDiagnostics(enabled: boolean): void {
    this.save({ diagnostics: enabled });
    byId('diagnostics').hidden = !enabled;
    byId('diagnostics-toggle').textContent = `Diagnóstico: ${enabled ? 'encendido' : 'apagado'}`;
    this.bus.emit('diagnosticsChanged', { enabled });
  }

  private setupHint(): void {
    const hint = byId('hint');
    // Mientras haya algo abierto encima, el aviso estorba.
    const covers = ['calibration', 'menu', 'help', 'licenses'].map((id) => byId(id));
    this.bus.on('rawGesture', ({ leftCode, rightCode }) => {
      const now = performance.now();
      if (leftCode || rightCode) this.lastAnyHand = now;
      if (leftCode && rightCode) this.missingSince = null;
      else this.missingSince ??= now;
      const message = hintMessage(now, this.lastAnyHand, this.missingSince, this.startedAt);
      const covered = covers.some((el) => !el.hidden);
      hint.hidden = covered || message === null;
      if (message && hint.textContent !== message) hint.textContent = message;
    });
  }
}
