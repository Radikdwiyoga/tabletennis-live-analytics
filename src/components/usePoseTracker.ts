import { useState, useEffect, useRef, useCallback } from 'react';
import { PlayerTracker, PlayerFrame, RawPose, MatchMode, PlayerId } from '@/lib/playerTracker';
import { CalibrationResult } from '@/lib/homography';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

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
  const mainLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const isFallbackActiveRef = useRef<boolean>(false);
  const trackerRef = useRef<PlayerTracker>(new PlayerTracker(initialMode));
  const isProcessingRef = useRef<boolean>(false);
  const lastProcessTimeRef = useRef<number>(0);
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
    if (mainLandmarkerRef.current) {
      try {
        mainLandmarkerRef.current.setOptions({ numPoses: newMode === 'doubles' ? 4 : 2 });
      } catch {
        // ignore
      }
    }
  }, []);

  const initMainThreadFallback = useCallback(async () => {
    if (mainLandmarkerRef.current || isFallbackActiveRef.current) return;
    isFallbackActiveRef.current = true;
    try {
      setMetrics((prev) => ({ ...prev, delegate: 'CPU/GPU (Main)' }));
      const origin = window.location.origin;
      let vision;
      try {
        vision = await FilesetResolver.forVisionTasks(`${origin}/mediapipe/wasm`);
      } catch {
        vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm'
        );
      }

      const modelAssetPath = `${origin}/mediapipe/models/pose_landmarker_lite.task`;
      try {
        mainLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: matchMode === 'doubles' ? 4 : 2,
          minPoseDetectionConfidence: 0.35,
          minPosePresenceConfidence: 0.35,
          minTrackingConfidence: 0.35,
        });
        setMetrics((prev) => ({ ...prev, isReady: true, delegate: 'GPU (Main)' }));
      } catch {
        mainLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath, delegate: 'CPU' },
          runningMode: 'VIDEO',
          numPoses: matchMode === 'doubles' ? 4 : 2,
          minPoseDetectionConfidence: 0.35,
          minPosePresenceConfidence: 0.35,
          minTrackingConfidence: 0.35,
        });
        setMetrics((prev) => ({ ...prev, isReady: true, delegate: 'CPU (Main)' }));
      }
    } catch (err) {
      console.warn('Main thread pose fallback failed:', err);
    }
  }, [matchMode]);

  // Initialize Worker with timeout fallback
  useEffect(() => {
    if (!isPoseEnabled) return;

    let workerReady = false;

    try {
      const worker = new Worker(new URL('../workers/pose.worker.ts', import.meta.url), {
        type: 'module',
      });
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent) => {
        const { type, poses, timestampMs, inferenceTimeMs, delegate, error } = e.data;

        if (type === 'READY') {
          workerReady = true;
          setMetrics((prev) => ({
            ...prev,
            isReady: true,
            delegate: delegate || 'GPU (Worker)',
          }));
          worker.postMessage({
            type: 'SET_NUM_POSES',
            numPoses: matchMode === 'doubles' ? 4 : 2,
          });
        } else if (type === 'ERROR') {
          console.warn('Pose worker error, triggering main fallback:', error);
          initMainThreadFallback();
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

      // Watchdog: If worker not ready in 3.5s, fallback to main thread
      const timer = setTimeout(() => {
        if (!workerReady) {
          console.info('Pose worker timeout, activating main thread fallback');
          initMainThreadFallback();
        }
      }, 3500);

      return () => {
        clearTimeout(timer);
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
        if (mainLandmarkerRef.current) {
          mainLandmarkerRef.current.close();
          mainLandmarkerRef.current = null;
        }
        trackerRef.current.reset();
      };
    } catch (workerInitErr) {
      console.warn('Failed to start worker, using main thread:', workerInitErr);
      initMainThreadFallback();
    }
  }, [isPoseEnabled, videoRef, initMainThreadFallback, matchMode]);

  // Frame pump loop
  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    if (
      !video ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.paused ||
      video.ended ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return;
    }

    const now = performance.now();

    // Watchdog: auto-release stuck processing flag after 400ms
    if (isProcessingRef.current) {
      if (now - lastProcessTimeRef.current > 400) {
        isProcessingRef.current = false;
      } else {
        return;
      }
    }

    // Main thread execution fallback
    if (mainLandmarkerRef.current) {
      isProcessingRef.current = true;
      lastProcessTimeRef.current = now;
      try {
        const startTime = performance.now();
        const detection = mainLandmarkerRef.current.detectForVideo(video, now);
        const inferenceTimeMs = performance.now() - startTime;

        const rawPoses = detection.landmarks.map((landmarks) => ({
          landmarks: landmarks.map((l) => ({
            x: l.x,
            y: l.y,
            z: l.z,
            visibility: l.visibility,
          })),
        }));

        const tracked = trackerRef.current.update(
          rawPoses as RawPose[],
          now,
          video.videoWidth,
          video.videoHeight,
          calibrationRef.current
        );
        setPlayers(tracked);

        frameCountRef.current++;
        if (now - lastFpsTimeRef.current >= 1000) {
          const elapsedSec = (now - lastFpsTimeRef.current) / 1000;
          setMetrics((prev) => ({
            ...prev,
            inferenceFps: Math.round(frameCountRef.current / elapsedSec),
            inferenceTimeMs: Math.round(inferenceTimeMs),
          }));
          frameCountRef.current = 0;
          lastFpsTimeRef.current = now;
        }
      } catch (err) {
        console.warn('Main thread pose inference error:', err);
      } finally {
        isProcessingRef.current = false;
      }
      return;
    }

    // Worker execution
    const worker = workerRef.current;
    if (!worker) return;

    const targetWidth = 640;
    const scale = targetWidth / Math.max(video.videoWidth, 1);
    const targetHeight = Math.max(1, Math.round(video.videoHeight * scale));

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
      lastProcessTimeRef.current = now;
      const bitmap = await createImageBitmap(canvas);

      worker.postMessage(
        {
          type: 'PROCESS_FRAME',
          bitmap,
          timestampMs: now,
        },
        [bitmap]
      );
    } catch {
      isProcessingRef.current = false;
    }
  }, [videoRef]);

  // Continuously request frames with rock-solid RAF loop
  useEffect(() => {
    if (!isPoseEnabled) return;

    let isRunning = true;

    const frameLoop = () => {
      if (!isRunning) return;
      processFrame();
      animFrameIdRef.current = requestAnimationFrame(frameLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(frameLoop);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isPoseEnabled, processFrame]);

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
