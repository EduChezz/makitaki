import { describe, expect, it } from 'vitest';
import { cameraErrorReason, isMobileDevice, preferredResolution } from './CameraManager';

describe('cameraErrorReason', () => {
  it('sin HTTPS siempre es "insecure"', () => {
    expect(cameraErrorReason('NotAllowedError', false)).toBe('insecure');
  });

  it('traduce los errores del navegador', () => {
    expect(cameraErrorReason('NotAllowedError', true)).toBe('denied');
    expect(cameraErrorReason('NotFoundError', true)).toBe('notFound');
    expect(cameraErrorReason('OverconstrainedError', true)).toBe('notFound');
    expect(cameraErrorReason('AbortError', true)).toBe('unknown');
    expect(cameraErrorReason(undefined, true)).toBe('unknown');
  });
});

describe('preferredResolution', () => {
  it('usa 640×480 en celular y 1280×720 en computadora', () => {
    expect(preferredResolution(true)).toEqual({ width: 640, height: 480 });
    expect(preferredResolution(false)).toEqual({ width: 1280, height: 720 });
  });
});

describe('isMobileDevice', () => {
  it('reconoce Android y iPhone', () => {
    expect(isMobileDevice('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe(true);
    expect(isMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe(true);
  });

  it('no confunde una computadora con un celular', () => {
    expect(isMobileDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0')).toBe(false);
  });
});
