# MakiTaki

Instrumento web de acordes por gestos para tocar y cantar (del kichwa: *maki* = mano, *taki* = canto).
La mano izquierda elige el acorde y la derecha controla volumen, variación, octava y tono.
Todo se procesa en el dispositivo: la imagen de la cámara nunca sale del navegador.

**Probar:** https://educhezz.github.io/makitaki/

Inspirado en Gesture Synth de Eric Wei. El código, los valores, los sonidos y el diseño son propios.

## Comandos

```bash
npm install        # instala dependencias
npm run dev        # copia el modelo de MediaPipe a public/ y abre el servidor
npm run dev:phone  # igual, con HTTPS para abrirlo desde el celular por Wi-Fi
npm test           # pruebas con Vitest
npm run build      # revisa tipos y compila en dist/
```

Para probar desde el celular hace falta HTTPS: `npm run dev:phone` crea un certificado propio (el navegador
pide aceptarlo una vez). Si existen `certs/cert.pem` y `certs/key.pem` (por ejemplo, de
[mkcert](https://github.com/FiloSottile/mkcert)), se usan esos.

## Publicación

Cada cambio en `main` se publica solo en GitHub Pages con [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

## Estado

- [x] Fase 1: cámara y manos (EventBus, CameraManager, HandTracker, dibujo de los 21 puntos)
- [x] Fase 2: gestos (HandGeometry, GesturePatterns, GestureVoter, ExpressionReader, Calibration) — falta ajustar valores "inicial" con la cámara
- [x] Fase 3: sonido (MusicTheory, SynthEngine con 4 voces, glide y 3 timbres)
- [x] Fase 4: interfaz (panel del acorde, guía, anillo con partículas, ayuda, licencias, diseño en celular)
- [x] Fase 5: errores (aviso de poca luz), pantalla siempre encendida, publicación — faltan pruebas en iPhone
- [x] Filtros de imagen (Neón, Verano, Natural, Blanco y negro) y grabación de video con instrumento y voz
- [ ] Ajustes finales con la cámara real

## Licencia

Todos los derechos reservados: ver [LICENSE](LICENSE). Incluye componentes de terceros con su propia licencia
(MediaPipe, Apache 2.0; fuentes Outfit y Orbitron, SIL OFL 1.1).
