/**
 * Dibujo propio de una mano vista como el usuario la ve en la pantalla espejo.
 * Los dedos levantados son largos y claros; los doblados, cortos y tenues.
 */

// Índice a meñique: posición x y punta de cada dedo levantado (dibujo de la mano derecha).
const FINGERS = [
  { x: 14, top: 8 },
  { x: 21, top: 4 },
  { x: 28, top: 6 },
  { x: 35, top: 11 },
];
const WIDTH = 6;
const PALM_TOP = 26;

function bar(x: number, y: number, w: number, h: number, up: boolean, extra = ''): string {
  return `<rect class="${up ? 'up' : 'down'}" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"${extra}/>`;
}

/**
 * SVG de la mano para un código pulgar · índice · medio · anular · meñique.
 * `side` indica qué mano: la izquierda se dibuja reflejada (pulgar a la derecha).
 */
export function handIcon(code: string, side: 'left' | 'right'): string {
  const up = [...code].map((c) => c === '1');
  // Pulgar levantado: sale en diagonal desde la palma. Doblado: cruza la palma.
  const thumb = up[0]
    ? bar(10, 28, WIDTH, 17, true, ' transform="rotate(-38 13 45)"')
    : bar(15, 37, 14, WIDTH, false);
  const fingers = FINGERS.map((f, i) =>
    up[i + 1] ? bar(f.x, f.top, WIDTH, PALM_TOP + 6 - f.top, true) : bar(f.x, PALM_TOP - 7, WIDTH, 11, false),
  ).join('');
  const flip = side === 'left' ? ' transform="translate(48 0) scale(-1 1)"' : '';
  const raised = up.filter(Boolean).length;
  return (
    `<svg class="hand-icon" viewBox="0 0 48 56" role="img" ` +
    `aria-label="Mano ${side === 'left' ? 'izquierda' : 'derecha'}, ${raised} dedos levantados">` +
    `<g${flip}><rect class="palm" x="12" y="${PALM_TOP}" width="30" height="26" rx="10"/>${thumb}${fingers}</g></svg>`
  );
}
