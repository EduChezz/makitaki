import type { EventBus } from '../core/EventBus';
import type { AppEvents, Degree } from '../core/types';
import { DEFAULT_KEY_INDEX, KEYS, degreeRoot } from '../music/MusicTheory';
import { handIcon } from './handIcon';

/** Color de cada grado I a VII (sección 10.1). */
export const DEGREE_COLORS = ['#FF5C8A', '#FF8A3D', '#FFD23F', '#3DE68A', '#00C2B5', '#3D9BFF', '#9B6CFF'];

/** Gesto de la mano izquierda que se dibuja para cada grado (sección 8.2). */
export const DEGREE_GESTURES = ['01000', '01100', '01110', '01111', '11111', '01001', '11001'];

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** Guía de gestos (RF-13): los 7 grados con su nota en la tonalidad elegida y su gesto. */
export class GestureGuide {
  private rows: HTMLLIElement[] = [];

  constructor(
    bus: EventBus<AppEvents>,
    private list: HTMLOListElement,
  ) {
    this.render(DEFAULT_KEY_INDEX);
    bus.on('keyChanged', ({ keyIndex }) => this.render(keyIndex));
    bus.on('chordChanged', ({ chord }) => this.highlight(chord?.gesture.degree ?? null));
  }

  private render(keyIndex: number): void {
    const key = KEYS[keyIndex];
    this.rows = ROMAN.map((roman, i) => {
      const row = document.createElement('li');
      row.className = 'guide-row';
      row.style.setProperty('--degree-color', DEGREE_COLORS[i]);
      row.innerHTML =
        `<span class="degree-dot" aria-hidden="true"></span>` +
        `<span class="guide-roman">${roman}</span>` +
        `<span class="guide-note">${degreeRoot(key, (i + 1) as Degree).es}</span>` +
        handIcon(DEGREE_GESTURES[i], 'left');
      return row;
    });
    this.list.replaceChildren(...this.rows);
  }

  private highlight(degree: number | null): void {
    this.rows.forEach((row, i) => row.classList.toggle('active', degree === i + 1));
  }
}
