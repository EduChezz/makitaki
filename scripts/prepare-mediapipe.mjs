// Copia los archivos WASM de MediaPipe y descarga el modelo a public/mediapipe/
// para que la app no dependa de un CDN (RNF-09). Si ya existen, no hace nada.
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const wasmSrc = 'node_modules/@mediapipe/tasks-vision/wasm';
const wasmDest = 'public/mediapipe/wasm';
const modelDest = 'public/mediapipe/hand_landmarker.task';

mkdirSync(wasmDest, { recursive: true });
for (const file of readdirSync(wasmSrc)) {
  const dest = join(wasmDest, file);
  if (!existsSync(dest)) {
    copyFileSync(join(wasmSrc, file), dest);
    console.log(`WASM copiado: ${file}`);
  }
}

if (!existsSync(modelDest)) {
  console.log('Descargando modelo hand_landmarker.task...');
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`No se pudo descargar el modelo: HTTP ${res.status}`);
  writeFileSync(modelDest, Buffer.from(await res.arrayBuffer()));
  console.log('Modelo guardado en', modelDest);
}
