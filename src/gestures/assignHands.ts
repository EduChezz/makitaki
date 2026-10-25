import type { DetectedHand } from '../core/types';

export interface AssignedHands {
  left?: DetectedHand;
  right?: DetectedHand;
}

/**
 * Decide cuál es la mano izquierda y cuál la derecha del usuario.
 * Normalmente basta la etiqueta de MediaPipe; si las dos manos llegan con la
 * misma etiqueta (pasa a veces), decide la posición: en la imagen sin espejo la
 * mano izquierda del usuario queda más a la derecha (x mayor).
 */
export function assignHands(hands: DetectedHand[]): AssignedHands {
  if (hands.length === 0) return {};
  if (hands.length === 1) return hands[0].label === 'Left' ? { left: hands[0] } : { right: hands[0] };
  const [a, b] = hands;
  if (a.label !== b.label) return a.label === 'Left' ? { left: a, right: b } : { left: b, right: a };
  return a.landmarks[0].x > b.landmarks[0].x ? { left: a, right: b } : { left: b, right: a };
}
