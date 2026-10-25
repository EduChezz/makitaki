/** Tiempos de los avisos de la sección 11.1. */
export const HINT_TIMES = {
  /** Sin una de las dos manos durante este tiempo: "Muestra las dos manos". */
  missingHandMs: 800,
  /** Sin ninguna mano durante este tiempo: probablemente falta luz. */
  lowLightMs: 3000,
};

export const HINT_TEXT = {
  lowLight: 'No veo tus manos. ¿Hay poca luz? Busca luz de frente.',
  missingHand: 'Muestra las dos manos',
};

/**
 * Qué aviso mostrar, o `null` para ninguno.
 * @param now momento actual (ms)
 * @param lastAnyHand última vez que se vio al menos una mano (`null` = nunca)
 * @param missingSince desde cuándo falta alguna de las dos manos (`null` = están las dos)
 * @param startedAt cuándo arrancó la cámara
 */
export function hintMessage(
  now: number,
  lastAnyHand: number | null,
  missingSince: number | null,
  startedAt: number,
): string | null {
  if (now - (lastAnyHand ?? startedAt) > HINT_TIMES.lowLightMs) return HINT_TEXT.lowLight;
  if (missingSince !== null && now - missingSince > HINT_TIMES.missingHandMs) return HINT_TEXT.missingHand;
  return null;
}
