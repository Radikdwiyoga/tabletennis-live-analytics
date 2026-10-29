export interface BallColorProfile {
  type: 'orange' | 'white';
}

let prevFrameData: Uint8ClampedArray | null = null;
let width = 320;
let height = 180;

function isBallColor(r: number, g: number, b: number, profile: BallColorProfile): boolean {
  if (profile.type === 'orange') {
    // Orange ping-pong ball: High Red, Moderate Green, Low Blue
    return r > 150 && g > 75 && b < 100 && r - b > 55 && r > g;
  } else {
    // White ping-pong ball: High brightness across all channels
    return r > 190 && g > 190 && b > 190 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25;
  }
}

self.onmessage = (e: MessageEvent) => {
  const { frameData, frameWidth, frameHeight, colorProfile, timestampMs } = e.data;

  if (!frameData) return;
  width = frameWidth;
  height = frameHeight;

  const currentData = new Uint8ClampedArray(frameData);
  const totalPixels = width * height;

  let sumX = 0;
  let sumY = 0;
  let matchCount = 0;

  if (prevFrameData && prevFrameData.length === currentData.length) {
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = currentData[idx]!;
      const g = currentData[idx + 1]!;
      const b = currentData[idx + 2]!;

      // Frame difference (motion check)
      const prevR = prevFrameData[idx]!;
      const prevG = prevFrameData[idx + 1]!;
      const prevB = prevFrameData[idx + 2]!;
      const diff = Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);

      // Must have motion (diff > 25) AND match ball color profile
      if (diff > 25 && isBallColor(r, g, b, colorProfile)) {
        const x = i % width;
        const y = Math.floor(i / width);
        sumX += x;
        sumY += y;
        matchCount++;
      }
    }
  }

  prevFrameData = currentData;

  // Ball blob size heuristic: between 3 and 180 pixels in 320x180 resolution
  let detectedBall: { xNorm: number; yNorm: number } | null = null;
  if (matchCount >= 3 && matchCount <= 180) {
    detectedBall = {
      xNorm: sumX / matchCount / width,
      yNorm: sumY / matchCount / height,
    };
  }

  self.postMessage({
    type: 'BALL_DETECTED',
    ball: detectedBall,
    timestampMs,
  });
};

