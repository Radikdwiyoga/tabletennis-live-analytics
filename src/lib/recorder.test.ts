import { describe, it, expect } from 'vitest';
import {
  getOptimalMimeType,
  formatDuration,
  formatBytes,
  generateSessionId,
} from './recorder';

describe('recorder pure utilities', () => {
  it('selects first supported mime type', () => {
    const mockSupported = (mime: string) => mime === 'video/webm;codecs=vp9';
    expect(getOptimalMimeType(mockSupported)).toBe('video/webm;codecs=vp9');
  });

  it('falls back to mp4 when webm is unsupported (Safari scenario)', () => {
    const mockSupported = (mime: string) => mime.startsWith('video/mp4');
    expect(getOptimalMimeType(mockSupported)).toBe('video/mp4;codecs=avc1');
  });

  it('falls back to empty string if no candidates supported', () => {
    const mockSupported = () => false;
    expect(getOptimalMimeType(mockSupported)).toBe('');
  });

  it('formats duration correctly', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(5000)).toBe('00:05');
    expect(formatDuration(65000)).toBe('01:05');
    expect(formatDuration(3665000)).toBe('01:01:05');
    expect(formatDuration(-10)).toBe('00:00');
  });

  it('formats byte size properly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024 * 5.5)).toBe('5.5 MB');
    expect(formatBytes(1024 * 1024 * 1024 * 1.2)).toBe('1.2 GB');
  });

  it('generates unique session IDs with session_ prefix', () => {
    const id1 = generateSessionId();
    const id2 = generateSessionId();
    expect(id1.startsWith('session_')).toBe(true);
    expect(id1).not.toBe(id2);
  });
});
