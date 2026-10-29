export interface CameraSettingsInfo {
  width: number;
  height: number;
  frameRate: number;
  facingMode?: string;
  label?: string;
}

export type FacingMode = 'environment' | 'user';

export interface CameraErrorState {
  code: string;
  title: string;
  message: string;
  isPermissionDenied: boolean;
}

/**
 * Creates optimal getUserMedia constraints for table tennis tracking:
 * Ideal 720p (1280x720) to balance performance and quality, ideal 60fps for fast ball/paddle motion.
 */
export function getCameraConstraints(
  facingMode: FacingMode = 'environment',
  deviceId?: string
): MediaStreamConstraints {
  const videoConstraints: MediaTrackConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 60 },
  };

  if (deviceId) {
    videoConstraints.deviceId = { exact: deviceId };
  } else {
    videoConstraints.facingMode = { ideal: facingMode };
  }

  return {
    video: videoConstraints,
    audio: false,
  };
}

/**
 * Extracts actual camera settings from an active MediaStreamTrack.
 */
export function getTrackSettingsInfo(track: MediaStreamTrack): CameraSettingsInfo {
  const settings = track.getSettings();
  return {
    width: settings.width ?? 0,
    height: settings.height ?? 0,
    frameRate: settings.frameRate ? Math.round(settings.frameRate) : 0,
    facingMode: settings.facingMode,
    label: track.label || 'Kamera',
  };
}

/**
 * Maps standard DOMException / getUserMedia errors to friendly user-facing Indonesian messages.
 */
export function formatCameraError(error: unknown): CameraErrorState {
  if (error instanceof DOMException || (error && typeof error === 'object' && 'name' in error)) {
    const errName = (error as { name?: string }).name ?? 'UnknownError';
    
    switch (errName) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return {
          code: 'NotAllowedError',
          title: 'Izin Kamera Ditolak',
          message: 'Aplikasi membutuhkan akses kamera untuk mendeteksi meja dan pemain. Silakan izinkan akses kamera di pengaturan browser Anda.',
          isPermissionDenied: true,
        };
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return {
          code: 'NotFoundError',
          title: 'Kamera Tidak Ditemukan',
          message: 'Perangkat kamera tidak terdeteksi pada sistem Anda. Pastikan webcam atau kamera HP terhubung.',
          isPermissionDenied: false,
        };
      case 'NotReadableError':
      case 'TrackStartError':
        return {
          code: 'NotReadableError',
          title: 'Kamera Sedang Digunakan',
          message: 'Kamera tidak dapat diakses karena mungkin sedang digunakan oleh aplikasi lain (seperti Zoom, Google Meet, dll). Tutup aplikasi tersebut dan coba lagi.',
          isPermissionDenied: false,
        };
      case 'OverconstrainedError':
        return {
          code: 'OverconstrainedError',
          title: 'Kamera Tidak Mendukung Konfigurasi',
          message: 'Resolusi atau pengaturan yang diminta tidak didukung oleh perangkat kamera Anda.',
          isPermissionDenied: false,
        };
      case 'SecurityError':
        return {
          code: 'SecurityError',
          title: 'Akses Dibatasi (Wajib HTTPS)',
          message: 'Akses kamera di browser memerlukan koneksi aman (HTTPS) atau localhost. Pastikan Anda membuka web lewat HTTPS saat di HP.',
          isPermissionDenied: false,
        };
      default:
        return {
          code: errName,
          title: 'Gagal Membuka Kamera',
          message: `Terjadi kendala saat mengakses kamera: ${(error as Error).message || errName}`,
          isPermissionDenied: false,
        };
    }
  }

  return {
    code: 'UnknownError',
    title: 'Kendala Kamera',
    message: 'Terjadi kesalahan yang tidak terduga saat mencoba mengakses kamera.',
    isPermissionDenied: false,
  };
}

