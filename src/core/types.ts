/** Punto de la mano en coordenadas normalizadas (0 a 1) del video sin espejo. */
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

/** Etiqueta tal como la entrega MediaPipe; en las pruebas reales coincide con la mano del usuario. */
export type HandLabel = 'Left' | 'Right';

export interface DetectedHand {
  /** 21 puntos: 0 = muñeca; pulgar 1–4; índice 5–8; medio 9–12; anular 13–16; meñique 17–20. */
  landmarks: Landmark[];
  label: HandLabel;
  score: number;
}

export interface HandsFrame {
  hands: DetectedHand[];
  /** Momento del fotograma en milisegundos (performance.now). */
  timestamp: number;
  /** Ancho ÷ alto del video: hace falta para medir ángulos sin deformación. */
  aspect: number;
}

export type CameraErrorReason = 'denied' | 'notFound' | 'insecure' | 'unknown';

export type Mode = 'major' | 'minor';
export type Degree = 1 | 2 | 3 | 4 | 5 | 6 | 7;
/** 1 = básico, 2 = inversión, 3 = séptima, 4 = tensión (sección 7.3). */
export type Variation = 1 | 2 | 3 | 4;

export interface ChordGesture {
  degree: Degree;
  mode: Mode;
  variation: Variation;
}

/** Lectura de un solo fotograma, antes de la votación; sirve para ajustar los valores "inicial". */
export interface RawGesture {
  leftCode: string | null;
  rightCode: string | null;
  leftTilt: number | null;
  rightTilt: number | null;
  gesture: ChordGesture | null;
}

/** Ángulos de inclinación (grados) medidos en la calibración para una mano. */
export interface HandCalibration {
  straight: number;
  /** Inclinada hacia la izquierda del usuario. */
  left: number;
  /** Inclinada hacia la derecha del usuario. */
  right: number;
}

export interface CalibrationData {
  left: HandCalibration;
  right: HandCalibration;
}

export type CalibrationStep = 'straight' | 'left' | 'right';

export type Timbre = 'pad' | 'organ' | 'crystal';

export interface ChordSound {
  gesture: ChordGesture;
  /** Números MIDI en orden bajo · voz 1 · voz 2 · voz 3 (cada voz sigue su nota anterior). */
  notes: number[];
  /** Nombre en español, p. ej. "Sol menor". */
  name: string;
  /** Cifrado americano, p. ej. "Gm7". */
  symbol: string;
}

/** Todos los eventos del bus y sus datos. */
export interface AppEvents {
  cameraReady: { video: HTMLVideoElement; width: number; height: number };
  cameraError: { reason: CameraErrorReason; message: string };
  trackerReady: { delegate: 'GPU' | 'CPU' };
  trackerError: { message: string };
  handsDetected: HandsFrame;
  /** Tiempo que tardó MediaPipe en el último fotograma, para medir rendimiento. */
  trackerStats: { detectMs: number };
  rawGesture: RawGesture;
  /** `null` = silencio: falta una mano, la izquierda está cerrada o la derecha en puño. */
  chordGestureChanged: { gesture: ChordGesture | null };
  /** volume 0 a 1; brightness −1 (oscuro) a 1 (brillante). */
  expressionChanged: { volume: number; brightness: number; octaveDown: boolean };
  calibrationProgress: { step: CalibrationStep; stepIndex: number; progress: number; handsVisible: boolean };
  calibrationSaved: CalibrationData;
  calibrationFailed: { message: string };
  /** `chord: null` = silencio. */
  chordChanged: { chord: ChordSound | null };
  /** Nivel de salida del audio, 0 a 1, para el visualizador. */
  audioLevel: { level: number };
  /** Índice en la lista KEYS de MusicTheory. */
  keyChanged: { keyIndex: number };
  timbreChanged: { timbre: Timbre };
  /** Muestra FPS y códigos de dedos para ajustar los valores "inicial". */
  diagnosticsChanged: { enabled: boolean };
}
