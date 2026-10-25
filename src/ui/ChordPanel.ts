import type { EventBus } from '../core/EventBus';
import type { AppEvents, ChordGesture, ChordSound } from '../core/types';
import { DEGREE_COLORS } from './GestureGuide';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const VARIATION_NAMES = ['', 'Básico', 'Inversión', 'Séptima', 'Tensión'];

/** Número romano en mayúscula para mayor y en minúscula para menor (sección 7.2). */
export function romanNumeral(gesture: ChordGesture): string {
  const roman = ROMAN[gesture.degree - 1];
  return gesture.mode === 'major' ? roman : roman.toLowerCase();
}

/** Segunda línea del panel, p. ej. "Séptima · Gm7". */
export function chordDetail(chord: ChordSound): string {
  return `${VARIATION_NAMES[chord.gesture.variation]} · ${chord.symbol}`;
}

export interface ChordPanelElements {
  root: HTMLElement;
  roman: HTMLElement;
  name: HTMLElement;
  detail: HTMLElement;
  volume: HTMLElement;
  brightness: HTMLElement;
  octave: HTMLElement;
}

/** Panel del acorde (RF-12) e indicadores de expresión, centro inferior. */
export class ChordPanel {
  constructor(
    bus: EventBus<AppEvents>,
    private el: ChordPanelElements,
  ) {
    bus.on('cameraReady', () => (this.el.root.hidden = false));
    bus.on('chordChanged', ({ chord }) => this.showChord(chord));
    bus.on('expressionChanged', ({ volume, brightness, octaveDown }) => {
      this.el.volume.style.width = `${Math.round(volume * 100)}%`;
      this.el.brightness.style.width = `${Math.round(((brightness + 1) / 2) * 100)}%`;
      this.el.octave.classList.toggle('on', octaveDown);
      this.el.octave.textContent = octaveDown ? '8va −1' : '8va';
    });
  }

  private showChord(chord: ChordSound | null): void {
    const { roman, name, detail, root } = this.el;
    root.dataset.mode = chord?.gesture.mode ?? 'silence';
    roman.textContent = chord ? romanNumeral(chord.gesture) : '—';
    root.style.setProperty('--degree-color', chord ? DEGREE_COLORS[chord.gesture.degree - 1] : 'transparent');
    name.textContent = chord ? chord.name : 'Silencio';
    detail.textContent = chord ? chordDetail(chord) : 'Muestra las dos manos y levanta un dedo derecho';
  }
}
