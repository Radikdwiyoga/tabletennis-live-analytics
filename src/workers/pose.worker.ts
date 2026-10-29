import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

let landmarker: PoseLandmarker | null = null;
let isInitializing = false;

async function initLandmarker(): Promise<void> {
  if (landmarker || isInitializing) return;
  isInitializing = true;

  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
    );

    const modelAssetPath =
      'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

    try {
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 2,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      self.postMessage({ type: 'READY', delegate: 'GPU' });
    } catch (gpuErr) {
      console.warn('Worker: GPU delegate failed, falling back to CPU:', gpuErr);
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numPoses: 2,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      self.postMessage({ type: 'READY', delegate: 'CPU' });
    }
  } catch (err) {
    console.error('Worker: Failed to initialize PoseLandmarker:', err);
    self.postMessage({ type: 'ERROR', error: (err as Error).message });
  } finally {
    isInitializing = false;
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { type, bitmap, timestampMs } = e.data;

  if (type === 'INIT') {
    await initLandmarker();
    return;
  }

  if (type === 'SET_NUM_POSES') {
    const count = e.data.numPoses || 2;
    if (landmarker) {
      try {
        await landmarker.setOptions({ numPoses: count });
      } catch (err) {
        console.warn('Worker: could not set numPoses:', err);
      }
    }
    return;
  }

  if (type === 'PROCESS_FRAME') {
    if (!landmarker) {
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
      self.postMessage({ type: 'RESULT', poses: [], timestampMs });
      return;
    }

    try {
      const startTime = performance.now();
      const detection = landmarker.detectForVideo(bitmap, timestampMs);
      const inferenceTimeMs = performance.now() - startTime;

      if (bitmap && typeof bitmap.close === 'function') {
        bitmap.close();
      }

      const rawPoses = detection.landmarks.map((landmarks) => ({
        landmarks: landmarks.map((l) => ({
          x: l.x,
          y: l.y,
          z: l.z,
          visibility: l.visibility,
        })),
      }));

      self.postMessage({
        type: 'RESULT',
        poses: rawPoses,
        timestampMs,
        inferenceTimeMs,
      });
    } catch (err) {
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
      self.postMessage({
        type: 'RESULT',
        poses: [],
        timestampMs,
        inferenceTimeMs: 0,
        error: (err as Error).message,
      });
    }
  }
};

