import { describe, it, expect } from 'vitest';
import { getCameraConstraints, formatCameraError, getTrackSettingsInfo } from './camera';

describe('camera pure utilities', () => {
  it('generates correct constraints with default environment mode', () => {
    const constraints = getCameraConstraints('environment');
    expect(constraints.audio).toBe(false);
    expect(constraints.video).toBeDefined();

    const video = constraints.video as MediaTrackConstraints;
    expect(video.width).toEqual({ ideal: 1280 });
    expect(video.height).toEqual({ ideal: 720 });
    expect(video.frameRate).toEqual({ ideal: 60 });
    expect(video.facingMode).toEqual({ ideal: 'environment' });
  });

  it('generates correct constraints when deviceId is specified', () => {
    const constraints = getCameraConstraints('user', 'custom-device-123');
    const video = constraints.video as MediaTrackConstraints;
    expect(video.deviceId).toEqual({ exact: 'custom-device-123' });
    expect(video.facingMode).toBeUndefined();
  });

  it('formats NotAllowedError with Indonesian guidance', () => {
    const err = new DOMException('Permission denied', 'NotAllowedError');
    const formatted = formatCameraError(err);
    expect(formatted.code).toBe('NotAllowedError');
    expect(formatted.title).toBe('Izin Kamera Ditolak');
    expect(formatted.isPermissionDenied).toBe(true);
  });

  it('formats NotFoundError correctly', () => {
    const err = new DOMException('Not found', 'NotFoundError');
    const formatted = formatCameraError(err);
    expect(formatted.code).toBe('NotFoundError');
    expect(formatted.title).toBe('Kamera Tidak Ditemukan');
  });

  it('formats NotReadableError correctly', () => {
    const err = new DOMException('Device in use', 'NotReadableError');
    const formatted = formatCameraError(err);
    expect(formatted.code).toBe('NotReadableError');
    expect(formatted.title).toBe('Kamera Sedang Digunakan');
  });

  it('formats SecurityError correctly', () => {
    const err = new DOMException('Insecure context', 'SecurityError');
    const formatted = formatCameraError(err);
    expect(formatted.code).toBe('SecurityError');
    expect(formatted.title).toContain('HTTPS');
  });

  it('extracts track settings correctly', () => {
    const mockTrack = {
      label: 'Back Camera HD',
      getSettings: () => ({
        width: 1280,
        height: 720,
        frameRate: 59.94,
        facingMode: 'environment',
      }),
    } as unknown as MediaStreamTrack;

    const info = getTrackSettingsInfo(mockTrack);
    expect(info.width).toBe(1280);
    expect(info.height).toBe(720);
    expect(info.frameRate).toBe(60);
    expect(info.label).toBe('Back Camera HD');
  });
});

