import type { EventBus } from '../core/EventBus';
import type { AppEvents, ChordSound, Degree } from '../core/types';
import { DEFAULT_KEY_INDEX, KEYS, degreeRoot } from '../music/MusicTheory';
import { chordDetail, romanNumeral } from '../ui/ChordPanel';
import { DEGREE_COLORS, DEGREE_GESTURES } from '../ui/GestureGuide';
import { handIcon } from '../ui/handIcon';
import { MODE_COLORS } from './ring';

// Mismos colores y medidas que la interfaz HTML (src/styles).
const C = {
  panel: 'rgba(20, 26, 36, 0.86)',
  border: '#2A3446',
  raised: '#1E2633',
  text: '#F2F7FF',
  muted: '#A9B4C6',
  brand1: '#3DE6DA',
  brand2: '#00C2B5',
  brand0: '#8CF5EE',
  brand4: '#0B3D3A',
};
const UI_FONT = 'Outfit, system-ui, sans-serif';
const DISPLAY_FONT = 'Orbitron, Outfit, sans-serif';
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Dibuja en el canvas el logo, el panel del acorde, los indicadores y la guía,
 * para que aparezcan en el video grabado: lo que se ve en pantalla es lo que se graba.
 */
export class Hud {
  private chord: ChordSound | null = null;
  private volume = 0;
  private brightness = 0;
  private octaveDown = false;
  private keyIndex = DEFAULT_KEY_INDEX;
  private guideVisible = false;
  private icons = new Map<string, HTMLImageElement>();

  constructor(bus: EventBus<AppEvents>) {
    bus.on('chordChanged', ({ chord }) => (this.chord = chord));
    bus.on('expressionChanged', ({ volume, brightness, octaveDown }) => {
      this.volume = volume;
      this.brightness = brightness;
      this.octaveDown = octaveDown;
    });
    bus.on('keyChanged', ({ keyIndex }) => (this.keyIndex = keyIndex));
    bus.on('guideVisibilityChanged', ({ visible }) => (this.guideVisible = visible));
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number): void {
    const s = (px: number) => px * dpr;
    const mobile = w / dpr <= 640;
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    this.drawLogo(ctx, s);
    if (this.guideVisible) this.drawGuide(ctx, w, s, mobile);
    this.drawChordPanel(ctx, w, h, s, mobile);
    ctx.restore();
  }

  private panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, s: (n: number) => number) {
    roundedRect(ctx, x, y, w, h, s(20));
    ctx.fillStyle = C.panel;
    ctx.fill();
    ctx.lineWidth = s(1);
    ctx.strokeStyle = C.border;
    ctx.stroke();
  }

  private text(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, color: string) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  private drawLogo(ctx: CanvasRenderingContext2D, s: (n: number) => number): void {
    ctx.font = `800 ${s(20)}px ${DISPLAY_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = C.text;
    ctx.fillText('Maki', s(16), s(42));
    ctx.fillStyle = C.brand1;
    ctx.fillText('Taki', s(16) + ctx.measureText('Maki').width, s(42));
  }

  private drawChordPanel(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    s: (n: number) => number,
    mobile: boolean,
  ): void {
    const chord = this.chord;
    const gap = s(mobile ? 8 : 12);
    const mainW = mobile ? w - s(32) : s(300);
    const mainH = s(mobile ? 72 : 82);
    const metersW = mobile ? mainW : s(200);
    const metersH = mobile ? s(44) : mainH;
    const bottom = h - s(16);
    const mainX = mobile ? s(16) : (w - (mainW + gap + metersW)) / 2;
    const mainY = mobile ? bottom - metersH - gap - mainH : bottom - mainH;
    const metersX = mobile ? mainX : mainX + mainW + gap;
    const metersY = mobile ? bottom - metersH : mainY;

    this.panel(ctx, mainX, mainY, mainW, mainH, s);
    if (chord) {
      // Borde izquierdo del color del grado, como en la interfaz.
      ctx.save();
      roundedRect(ctx, mainX, mainY, mainW, mainH, s(20));
      ctx.clip();
      ctx.fillStyle = DEGREE_COLORS[chord.gesture.degree - 1];
      ctx.fillRect(mainX, mainY, s(4), mainH);
      ctx.restore();
    }
    const romanSize = s(mobile ? 40 : 52);
    const romanCenter = mainX + s(18) + romanSize * 0.7;
    ctx.textAlign = 'center';
    this.text(
      ctx,
      chord ? romanNumeral(chord.gesture) : '—',
      romanCenter,
      mainY + mainH / 2 + romanSize * 0.36,
      `800 ${romanSize}px ${DISPLAY_FONT}`,
      chord ? MODE_COLORS[chord.gesture.mode] : C.muted,
    );
    ctx.textAlign = 'left';
    const textX = romanCenter + romanSize * 0.7 + s(16);
    this.text(ctx, chord ? chord.name : 'Silencio', textX, mainY + mainH / 2 - s(2), `700 ${s(mobile ? 19 : 22)}px ${UI_FONT}`, C.text);
    if (chord) this.text(ctx, chordDetail(chord), textX, mainY + mainH / 2 + s(20), `400 ${s(15)}px ${UI_FONT}`, C.muted);

    this.panel(ctx, metersX, metersY, metersW, metersH, s);
    this.drawMeters(ctx, metersX, metersY, metersW, metersH, s, mobile);
  }

  private drawMeters(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    s: (n: number) => number,
    mobile: boolean,
  ): void {
    const bar = (label: string, value: number, bx: number, by: number, bw: number) => {
      this.text(ctx, label, bx, by + s(4), `400 ${s(13)}px ${UI_FONT}`, C.muted);
      const trackX = bx + ctx.measureText(label).width + s(8);
      const trackW = bx + bw - trackX;
      roundedRect(ctx, trackX, by - s(4), trackW, s(8), s(4));
      ctx.fillStyle = C.raised;
      ctx.fill();
      if (value > 0.01) {
        roundedRect(ctx, trackX, by - s(4), Math.max(s(8), trackW * value), s(8), s(4));
        ctx.fillStyle = C.brand2;
        ctx.fill();
      }
    };
    ctx.textAlign = 'left';
    const brightness = (this.brightness + 1) / 2;
    const chipW = s(52);
    if (mobile) {
      const cy = y + h / 2;
      const each = (w - s(28) - chipW - s(24)) / 2;
      bar('Volumen', this.volume, x + s(14), cy, each);
      bar('Brillo', brightness, x + s(14) + each + s(12), cy, each);
      this.drawOctave(ctx, x + w - s(14) - chipW, cy, chipW, s);
    } else {
      bar('Volumen', this.volume, x + s(18), y + s(24), w - s(36));
      bar('Brillo', brightness, x + s(18), y + s(46), w - s(36));
      this.drawOctave(ctx, x + s(18), y + s(66), chipW, s);
    }
  }

  private drawOctave(ctx: CanvasRenderingContext2D, x: number, cy: number, w: number, s: (n: number) => number): void {
    roundedRect(ctx, x, cy - s(10), w, s(20), s(10));
    ctx.fillStyle = this.octaveDown ? C.brand4 : 'transparent';
    ctx.fill();
    ctx.lineWidth = s(1);
    ctx.strokeStyle = this.octaveDown ? C.brand2 : C.border;
    ctx.stroke();
    ctx.textAlign = 'center';
    this.text(ctx, this.octaveDown ? '8va −1' : '8va', x + w / 2, cy + s(4.5), `600 ${s(13)}px ${UI_FONT}`, this.octaveDown ? C.brand0 : C.muted);
    ctx.textAlign = 'left';
  }

  private drawGuide(ctx: CanvasRenderingContext2D, w: number, s: (n: number) => number, mobile: boolean): void {
    const width = s(mobile ? 180 : 200);
    const rowH = s(46);
    const x = w - s(16) - width;
    const y = s(76);
    const height = s(40) + rowH * 7 + s(12);
    this.panel(ctx, x, y, width, height, s);
    ctx.textAlign = 'left';
    this.text(ctx, 'MANO IZQUIERDA', x + s(12), y + s(26), `600 ${s(13)}px ${UI_FONT}`, C.muted);
    const key = KEYS[this.keyIndex];
    const active = this.chord?.gesture.degree ?? 0;
    for (let i = 0; i < 7; i++) {
      const rowY = y + s(36) + i * rowH;
      const color = DEGREE_COLORS[i];
      const isActive = active === i + 1;
      if (isActive) {
        roundedRect(ctx, x + s(6), rowY, width - s(12), rowH - s(4), s(12));
        ctx.fillStyle = `${color}24`;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = s(1);
        ctx.stroke();
      }
      const cy = rowY + (rowH - s(4)) / 2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + s(17), cy, s(5), 0, Math.PI * 2);
      ctx.fill();
      this.text(ctx, ROMAN[i], x + s(30), cy + s(5), `700 ${s(14)}px ${DISPLAY_FONT}`, C.text);
      this.text(ctx, degreeRoot(key, (i + 1) as Degree).es, x + s(70), cy + s(5), `600 ${s(16)}px ${UI_FONT}`, C.text);
      const icon = this.icon(DEGREE_GESTURES[i], isActive ? color : C.text);
      if (icon.complete) ctx.drawImage(icon, x + width - s(46), cy - s(20), s(34), s(40));
    }
  }

  /** Dibujo de la mano como imagen, guardado para no recrearlo en cada fotograma. */
  private icon(code: string, upColor: string): HTMLImageElement {
    const id = `${code}|${upColor}`;
    let img = this.icons.get(id);
    if (!img) {
      img = new Image();
      const svg = handIcon(code, 'left', { palm: C.raised, stroke: C.muted, up: upColor, down: C.muted });
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      this.icons.set(id, img);
    }
    return img;
  }
}
