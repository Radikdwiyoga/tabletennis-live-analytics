import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CameraSettingsInfo,
  FacingMode,
  CameraErrorState,
  getCameraConstraints,
  getTrackSettingsInfo,
  formatCameraError,
} from '@/lib/camera';

export interface UseCameraResult {
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  settings: CameraSettingsInfo | null;
  isLoading: boolean;
  error: CameraErrorState | null;
  facingMode: FacingMode;
  availableDevices: MediaDeviceInfo[];
  selectedDeviceId?: string;
  switchFacingMode: () => void;
  selectDevice: (deviceId: string) => void;
  retry: () => void;
  stopCamera: () => void;
}

export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [settings, setSettings] = useState<CameraSettingsInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<CameraErrorState | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const activeStreamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setSettings(null);
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoInputs);
    } catch (e) {
      console.warn('Could not enumerate devices:', e);
    }
  }, []);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError({
        code: 'UnsupportedBrowser',
        title: 'Browser Tidak Mendukung',
        message: 'Browser Anda tidak mendukung API MediaDevices/getUserMedia. Gunakan Chrome atau Safari versi terbaru.',
        isPermissionDenied: false,
      });
      setIsLoading(false);
      return;
    }

    try {
      const constraints = getCameraConstraints(facingMode, selectedDeviceId);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      activeStreamRef.current = mediaStream;
      setStream(mediaStream);

      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        setSettings(getTrackSettingsInfo(videoTrack));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // In case play() is rejected because of browser autoplay policy
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Autoplay prevented or interrupted:', playErr);
        }
      }

      // Populate camera list once permission is granted
      await refreshDevices();
    } catch (err) {
      setError(formatCameraError(err));
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, selectedDeviceId, stopCamera, refreshDevices]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const switchFacingMode = useCallback(() => {
    setSelectedDeviceId(undefined);
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, []);

  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
  }, []);

  const retry = useCallback(() => {
    startCamera();
  }, [startCamera]);

  return {
    stream,
    videoRef,
    settings,
    isLoading,
    error,
    facingMode,
    availableDevices,
    selectedDeviceId,
    switchFacingMode,
    selectDevice,
    retry,
    stopCamera,
  };
}

