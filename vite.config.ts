import { existsSync, readFileSync } from 'node:fs';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vitest/config';

// HTTPS local (RNF-08), necesario para abrir la cámara desde el celular por Wi-Fi:
// - Si existen certs/cert.pem y certs/key.pem (mkcert), se usan esos.
// - Si no, `npm run dev:phone` crea un certificado propio; el navegador muestra
//   un aviso de seguridad que hay que aceptar una vez.
const certPath = 'certs/cert.pem';
const keyPath = 'certs/key.pem';
const mkcert =
  existsSync(certPath) && existsSync(keyPath)
    ? { cert: readFileSync(certPath), key: readFileSync(keyPath) }
    : undefined;

export default defineConfig(({ mode }) => ({
  // Rutas relativas para que funcione en GitHub Pages dentro de una subcarpeta.
  base: './',
  plugins: mode === 'phone' && !mkcert ? [basicSsl()] : [],
  server: { host: true, https: mkcert },
  preview: { host: true, https: mkcert },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
}));
