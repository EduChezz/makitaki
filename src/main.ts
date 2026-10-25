import './style.css';
import { SynthEngine } from './audio/SynthEngine';
import { EventBus } from './core/EventBus';
import type { AppEvents } from './core/types';
import { Calibration, browserStorage } from './gestures/Calibration';
import { ExpressionReader } from './gestures/ExpressionReader';
import { GestureVoter } from './gestures/GestureVoter';
import { CameraManager } from './input/CameraManager';
import { MusicTheory } from './music/MusicTheory';
import { Visualizer } from './presentation/Visualizer';
import { CalibrationScreen } from './ui/CalibrationScreen';
import { ChordPanel } from './ui/ChordPanel';
import { byId } from './ui/dom';
import { GestureGuide } from './ui/GestureGuide';
import { ScreenAwake } from './ui/screenAwake';
import { StartScreen } from './ui/StartScreen';
import { UI } from './ui/UI';
import { HandTracker } from './vision/HandTracker';

// main.ts solo crea los módulos y los conecta al bus.
const bus = new EventBus<AppEvents>();
const storage = browserStorage();
const camera = new CameraManager(bus, byId<HTMLVideoElement>('video'));
const tracker = new HandTracker(bus);
const calibration = new Calibration(bus, storage);
new GestureVoter(bus, calibration.current);
new ExpressionReader(bus, calibration.current);
new MusicTheory(bus);
const synth = new SynthEngine(bus);
const visualizer = new Visualizer(bus, byId<HTMLCanvasElement>('stage'));
const startScreen = new StartScreen(bus, byId('start'), byId<HTMLButtonElement>('start-button'), byId('start-status'));
const calibrationScreen = new CalibrationScreen(bus, calibration, {
  root: byId('calibration'),
  stepCount: byId('cal-step-count'),
  title: byId('cal-title'),
  hint: byId('cal-hint'),
  progress: byId('cal-progress'),
  error: byId('cal-error'),
  cancel: byId<HTMLButtonElement>('cal-cancel'),
});
new ChordPanel(bus, {
  root: byId('chord-panel'),
  roman: byId('chord-roman'),
  name: byId('chord-name'),
  detail: byId('chord-detail'),
  volume: byId('meter-volume'),
  brightness: byId('meter-brightness'),
  octave: byId('meter-octave'),
});
new GestureGuide(bus, byId<HTMLOListElement>('guide-list'));
// Se crea al final: al arrancar publica la tonalidad y el timbre guardados.
new UI(bus, calibrationScreen, storage);
const screenAwake = new ScreenAwake();

bus.on('cameraReady', ({ video }) => {
  tracker.start(video);
  screenAwake.enable();
  // La primera vez se calibra antes de tocar (sección 9).
  if (!calibration.hasSaved) calibrationScreen.open();
});
// Solo en desarrollo: permite simular eventos desde la consola para probar la interfaz sin manos.
if (import.meta.env.DEV) Object.assign(window, { makitakiBus: bus });

bus.on('trackerReady', ({ delegate }) => console.info(`Modelo de manos listo (${delegate})`));
bus.on('trackerError', ({ message }) => console.error('Error del modelo:', message));

startScreen.setStatus('Cargando modelo…');
const modelLoading = tracker.load();

startScreen.onStart(async () => {
  // El audio se activa antes de cualquier espera: el navegador solo lo permite dentro del toque.
  synth.unlock();
  await modelLoading;
  // Si el modelo no cargó, el botón funciona como "Reintentar".
  if (!tracker.ready) {
    location.reload();
    return;
  }
  await camera.start();
});

visualizer.start();
