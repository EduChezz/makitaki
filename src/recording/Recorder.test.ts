import { describe, expect, it } from 'vitest';
import { fileExtension, formatDuration, pickMimeType, recordingFileName } from './Recorder';

describe('pickMimeType', () => {
  it('prefiere MP4 cuando el navegador lo graba (iPhone, Chrome reciente)', () => {
    expect(pickMimeType(() => true)).toBe('video/mp4;codecs=avc1,mp4a.40.2');
  });

  it('si solo hay WebM, usa WebM', () => {
    expect(pickMimeType((t) => t.startsWith('video/webm'))).toBe('video/webm;codecs=vp9,opus');
    expect(pickMimeType((t) => t === 'video/webm')).toBe('video/webm');
  });

  it('sin formatos conocidos deja decidir al navegador', () => {
    expect(pickMimeType(() => false)).toBeNull();
  });
});

describe('fileExtension', () => {
  it('mp4 o webm según el formato', () => {
    expect(fileExtension('video/mp4;codecs=avc1')).toBe('mp4');
    expect(fileExtension('video/webm;codecs=vp8,opus')).toBe('webm');
  });
});

describe('recordingFileName', () => {
  it('lleva fecha y hora', () => {
    expect(recordingFileName(new Date(2026, 9, 5, 7, 3), 'mp4')).toBe('makitaki-2026-10-05-0703.mp4');
  });
});

describe('formatDuration', () => {
  it('minutos y segundos', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(9_999)).toBe('0:09');
    expect(formatDuration(75_000)).toBe('1:15');
  });
});
