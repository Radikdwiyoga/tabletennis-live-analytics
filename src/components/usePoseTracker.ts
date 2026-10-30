import { useState, useEffect, useRef, useCallback } from 'react';
import { PlayerTracker, PlayerFrame, RawPose, MatchMode, PlayerId } from '@/lib/playerTracker';
import { CalibrationResult } from '@/lib/homography';

export interface PoseTrackerMetrics {
  inferenceFps: number;
  inferenceTimeMs: number;
  delegate: string;
  isReady: boolean;
}

export interface UsePoseTrackerResult {
  p1: PlayerFrame | null;
  p2: PlayerFrame | null;
  p3: PlayerFrame | null;
  p4: PlayerFrame | null;
  players: Record<PlayerId, PlayerFrame | null>;
  metrics: PoseTrackerMetrics;
  isPoseEnabled: boolean;
  matchMode: MatchMode;
  setMatchMode: (mode: MatchMode) => void;
  setIsPoseEnabled: (enabled: boolean) => void;
}

export function usePoseTracker(
  videoRef: React.RefObject<HTMLVideoElement>,
  calibration: CalibrationResult | null = null,
  initialMode: MatchMode = 'singles'
): UsePoseTrackerResult {
  const [matchMode, setMatchModeState] = useState<MatchMode>(initialMode);
  const [players, setPlayers] = useState<Record<PlayerId, PlayerFrame | null>>({
    P1: null,
    P2: null,
    P3: null,
    P4: null,
  });
  const [isPoseEnabled, setIsPoseEnabled] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<PoseTrackerMetrics>({
    inferenceFps: 0,
    inferenceTimeMs: 0,
    delegate: 'Memuat...',
    isReady: false,
  });

  const workerRef = useRef<Worker | null>(null);
  const trackerRef = useRef<PlayerTracker>(new PlayerTracker(initialMode));
  const isProcessingRef = useRef<boolean>(false);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(performance.now());
  const animFrameIdRef = useRef<number | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const calibrationRef = useRef<CalibrationResult | null>(calibration);

  useEffect(() => {
    calibrationRef.current = calibration;
  }, [calibration]);

  const setMatchMode = useCallback((newMode: MatchMode) => {
    setMatchModeState(newMode);
    trackerRef.current.setMode(newMode);
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'SET_NUM_POSES',
        numPoses: newMode === 'doubles' ? 4 : 2,
      });
    }
  }, []);

  // Initialize Worker
  useEffect(() => {
    if (!isPoseEnabled) return;

    try {
      const worker = new Worker(new URL('../workers/pose.worker.ts', import.meta.url), {
        type: 'module',
      });
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent) => {
        const { type, poses, timestampMs, inferenceTimeMs, delegate, error } = e.data;

        if (type === 'READY') {
          setMetrics((prev) => ({
            ...prev,
            isReady: true,
            delegate: delegate || 'GPU',
          }));
          // Synchronize numPoses
          worker.postMessage({
            type: 'SET_NUM_POSES',
            numPoses: matchMode === 'doubles' ? 4 : 2,
          });
        } else if (type === 'ERROR') {
          console.warn('Pose worker reported error:', error);
          setMetrics((prev) => ({
            ...prev,
            delegate: 'Error/CPU Fallback',
          }));
        } else if (type === 'RESULT') {
          isProcessingRef.current = false;

          const video = videoRef.current;
          const vWidth = video?.videoWidth || 1280;
          const vHeight = video?.videoHeight || 720;

          // Update tracker
          const tracked = trackerRef.current.update(
            poses as RawPose[],
            timestampMs,
            vWidth,
            vHeight,
            calibrationRef.current
          );

          setPlayers(tracked);

          // Update metrics
          frameCountRef.current++;
          const now = performance.now();
          if (now - lastFpsTimeRef.current >= 1000) {
            const elapsedSec = (now - lastFpsTimeRef.current) / 1000;
            const currentFps = Math.round(frameCountRef.current / elapsedSec);
            frameCountRef.current = 0;
            lastFpsTimeRef.current = now;

            setMetrics((prev) => ({
              ...prev,
              inferenceFps: currentFps,
              inferenceTimeMs: Math.round(inferenceTimeMs || 0),
            }));
          }
        }
      };

      worker.postMessage({ type: 'INIT' });
    } catch (workerInitErr) {
      console.warn('Failed to start pose worker:', workerInitErr);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      trackerRef.current.reset();
    };
  }, [isPoseEnabled, videoRef]);

  // Frame pump loop
  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    const worker = workerRef.current;

    if (
      !video ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.paused ||
      video.ended ||
      !worker ||
      isProcessingRef.current
    ) {
      return;
    }

    const targetWidth = 640;
    const scale = targetWidth / Math.max(video.videoWidth, 1);
    const targetHeight = Math.round(video.videoHeight * scale);

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const canvas = offscreenCanvasRef.current;
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    try {
      isProcessingRef.current = true;
      const bitmap = await createImageBitmap(canvas);
      const timestampMs = performance.now();

      worker.postMessage(
        {
          type: 'PROCESS_FRAME',
          bitmap,
          timestampMs,
        },
        [bitmap]
      );
    } catch (e) {
      isProcessingRef.current = false;
      console.warn('Frame bitmap creation error:', e);
    }
  }, [videoRef]);

  // Continuously request frames when video is playing
  useEffect(() => {
    if (!isPoseEnabled) return;

    let isRunning = true;

    const frameLoop = () => {
      if (!isRunning) return;
      processFrame();

      const video = videoRef.current;
      if (video && 'requestVideoFrameCallback' in video) {
        video.requestVideoFrameCallback(() => {
          frameLoop();
        });
      } else {
        animFrameIdRef.current = requestAnimationFrame(frameLoop);
      }
    };

    frameLoop();

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isPoseEnabled, processFrame, videoRef]);

  return {
    p1: players.P1,
    p2: players.P2,
    p3: players.P3,
    p4: players.P4,
    players,
    metrics,
    isPoseEnabled,
    matchMode,
    setMatchMode,
    setIsPoseEnabled,
  };
}
