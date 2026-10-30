import { useState, useEffect, useRef, useCallback } from 'react';
import { KalmanFilter2D } from '@/lib/kalman';
import { RallyTracker, RallyStats } from '@/lib/rally';
import { CalibrationResult, Point2D } from '@/lib/homography';
import { BallColorProfile } from '@/workers/ball.worker';

export interface TrajectoryPoint {
  x: number;
  y: number;
  t: number;
}

export interface UseBallTrackerResult {
  currentBall: Point2D | null;
  trajectory: TrajectoryPoint[];
  rallyStats: RallyStats;
  colorProfile: BallColorProfile;
  setColorProfile: (profile: BallColorProfile) => void;
  isBallTrackingEnabled: boolean;
  setIsBallTrackingEnabled: (enabled: boolean) => void;
  resetRallyStats: () => void;
}

export function useBallTracker(
  videoRef: React.RefObject<HTMLVideoElement>,
  calibration: CalibrationResult | null = null
): UseBallTrackerResult {
  const [currentBall, setCurrentBall] = useState<Point2D | null>(null);
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([]);
  const [colorProfile, setColorProfile] = useState<BallColorProfile>({ type: 'orange' });
  const [isBallTrackingEnabled, setIsBallTrackingEnabled] = useState<boolean>(true);
  const [rallyStats, setRallyStats] = useState<RallyStats>({
    currentRallyShots: 0,
    currentRallyDurationSec: 0,
    longestRallyShots: 0,
    totalShots: 0,
    lastSpeedKmh: null,
    bounces: [],
    lastHitter: null,
  });

  const workerRef = useRef<Worker | null>(null);
  const kalmanRef = useRef<KalmanFilter2D>(new KalmanFilter2D());
  const rallyRef = useRef<RallyTracker>(new RallyTracker());
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isWorkerBusyRef = useRef<boolean>(false);
  const lastWorkerSendTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);
  const missedFramesRef = useRef<number>(0);
  const calibrationRef = useRef<CalibrationResult | null>(calibration);

  useEffect(() => {
    calibrationRef.current = calibration;
  }, [calibration]);

  // Initialize Ball Worker
  useEffect(() => {
    if (!isBallTrackingEnabled) return;

    const worker = new Worker(new URL('../workers/ball.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      isWorkerBusyRef.current = false;
      const { type, ball, timestampMs } = e.data;

      if (type === 'BALL_DETECTED') {
        const video = videoRef.current;
        const vWidth = video?.videoWidth || 1280;
        const vHeight = video?.videoHeight || 720;

        let smoothedBall: Point2D | null = null;
        let vx = 0;
        let vy = 0;

        if (ball) {
          missedFramesRef.current = 0;
          const measX = ball.xNorm * vWidth;
          const measY = ball.yNorm * vHeight;

          // Kalman filter: predict then update
          kalmanRef.current.predict(timestampMs);
          const { accepted, state } = kalmanRef.current.update(measX, measY, 140);

          if (accepted) {
            smoothedBall = { x: state.x, y: state.y };
            vx = state.vx;
            vy = state.vy;

            // Add to 1-second trajectory trail
            setTrajectory((prev) => {
              const cutoffTime = timestampMs - 1000;
              const filtered = prev.filter((p) => p.t >= cutoffTime);
              return [...filtered, { x: smoothedBall!.x, y: smoothedBall!.y, t: timestampMs }];
            });
          }
        } else {
          // Missed detection: extrapolate for at most 3 frames with velocity damping
          if (missedFramesRef.current < 3) {
            missedFramesRef.current++;
            const pred = kalmanRef.current.predict(timestampMs);
            if (Math.abs(pred.vx) > 15 || Math.abs(pred.vy) > 15) {
              smoothedBall = { x: pred.x, y: pred.y };
              vx = pred.vx;
              vy = pred.vy;
            }
          } else {
            // Ball lost
            smoothedBall = null;
          }
        }

        setCurrentBall(smoothedBall);

        // Update Rally, Shot, Bounce & Speed tracker
        const updatedStats = rallyRef.current.update(
          smoothedBall,
          vx,
          vy,
          timestampMs,
          calibrationRef.current
        );
        setRallyStats(updatedStats);
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      kalmanRef.current.reset();
      rallyRef.current.reset();
    };
  }, [isBallTrackingEnabled, videoRef]);

  // Frame sampling loop for ball tracking (320x180)
  const processBallFrame = useCallback(() => {
    const video = videoRef.current;
    const worker = workerRef.current;

    if (
      !video ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.paused ||
      video.ended ||
      video.videoWidth === 0 ||
      video.videoHeight === 0 ||
      !worker
    ) {
      return;
    }

    const now = performance.now();

    // Watchdog: auto-release busy lock if worker is stuck > 300ms
    if (isWorkerBusyRef.current) {
      if (now - lastWorkerSendTimeRef.current > 300) {
        isWorkerBusyRef.current = false;
      } else {
        return;
      }
    }

    const targetWidth = 320;
    const targetHeight = 180;

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
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);

    try {
      isWorkerBusyRef.current = true;
      lastWorkerSendTimeRef.current = now;

      // Transfer pixel buffer to worker without cloning
      worker.postMessage(
        {
          frameData: imgData.data.buffer,
          frameWidth: targetWidth,
          frameHeight: targetHeight,
          colorProfile,
          timestampMs: now,
        },
        [imgData.data.buffer]
      );
    } catch {
      isWorkerBusyRef.current = false;
    }
  }, [colorProfile, videoRef]);

  // Continuous frame loop with rock-solid RAF
  useEffect(() => {
    if (!isBallTrackingEnabled) return;

    let isRunning = true;

    const loop = () => {
      if (!isRunning) return;
      processBallFrame();
      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isBallTrackingEnabled, processBallFrame]);

  const resetRallyStats = useCallback(() => {
    rallyRef.current.reset();
    setRallyStats({
      currentRallyShots: 0,
      currentRallyDurationSec: 0,
      longestRallyShots: 0,
      totalShots: 0,
      lastSpeedKmh: null,
      bounces: [],
      lastHitter: null,
    });
    setTrajectory([]);
    setCurrentBall(null);
  }, []);

  return {
    currentBall,
    trajectory,
    rallyStats,
    colorProfile,
    setColorProfile,
    isBallTrackingEnabled,
    setIsBallTrackingEnabled,
    resetRallyStats,
  };
}
