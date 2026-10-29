/**
 * Candidates for MediaRecorder mimeType in order of preference.
 * VP9 offers better compression; MP4 is preferred on Safari iOS.
 */
export const MIME_TYPE_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4;codecs=avc1',
  'video/mp4',
] as const;

/**
 * Pure function to determine the best supported MediaRecorder mimeType.
 */
export function getOptimalMimeType(
  isTypeSupported: (mimeType: string) => boolean = (mime) => {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
      return MediaRecorder.isTypeSupported(mime);
    }
    return false;
  }
): string {
  for (const candidate of MIME_TYPE_CANDIDATES) {
    if (isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return ''; // Browser default
}

/**
 * Formats duration in milliseconds into MM:SS or HH:MM:SS format.
 */
export function formatDuration(durationMs: number): string {
  if (durationMs < 0 || isNaN(durationMs)) return '00:00';

  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formats byte count into human readable format (KB, MB, GB).
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Generates a clean session identifier with timestamp.
 */
export function generateSessionId(): string {
  const now = new Date();
  const dateStr = now
    .toISOString()
    .replace('T', '_')
    .replace(/[-:]/g, '')
    .slice(0, 15);
  const rand = Math.random().toString(36).substring(2, 6);
  return `session_${dateStr}_${rand}`;
}

