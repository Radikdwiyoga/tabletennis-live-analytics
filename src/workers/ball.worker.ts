export interface BallColorProfile {
  type: 'orange' | 'white';
}

let prevFrameData: Uint8ClampedArray | null = null;
let width = 320;
let height = 180;

function isBallPixel(r: number, g: number, b: number, diff: number, profile: BallColorProfile): boolean {
  // Allow modest motion (diff >= 14) so ball during serve/toss is also detected
  if (diff < 14) return false;

  if (profile.type === 'orange') {
    // Orange ping-pong ball: Warm hue (orange/amber/yellow-orange), high R, low B
    if (r < 115 || g < 45 || b > 135 || r <= g || r - b < 28) return false;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    if (delta < 15) return false;
    const h = ((g - b) / delta) * 60;
    return h >= 5 && h <= 62 && delta / max >= 0.25;
  } else {
    // White ping-pong ball: High brightness across all channels, low saturation
    if (r < 160 || g < 160 || b < 160) return false;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max - min < 45;
  }
}

interface CellData {
  count: number;
  sumX: number;
  sumY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

self.onmessage = (e: MessageEvent) => {
  const { frameData, frameWidth, frameHeight, colorProfile, timestampMs } = e.data;

  if (!frameData) return;
  width = frameWidth;
  height = frameHeight;

  const currentData = new Uint8ClampedArray(frameData);
  const totalPixels = width * height;

  const CELL_SIZE = 16;
  const cols = Math.ceil(width / CELL_SIZE);
  const rows = Math.ceil(height / CELL_SIZE);
  const numCells = cols * rows;

  const cells: CellData[] = new Array(numCells);
  for (let c = 0; c < numCells; c++) {
    cells[c] = { count: 0, sumX: 0, sumY: 0, minX: 999, maxX: -1, minY: 999, maxY: -1 };
  }

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

      if (isBallPixel(r, g, b, diff, colorProfile)) {
        const x = i % width;
        const y = Math.floor(i / width);
        const col = Math.floor(x / CELL_SIZE);
        const row = Math.floor(y / CELL_SIZE);
        const cell = cells[row * cols + col]!;

        cell.count++;
        cell.sumX += x;
        cell.sumY += y;
        if (x < cell.minX) cell.minX = x;
        if (x > cell.maxX) cell.maxX = x;
        if (y < cell.minY) cell.minY = y;
        if (y > cell.maxY) cell.maxY = y;
      }
    }
  }

  prevFrameData = currentData;

  // Find candidate clusters of ping-pong ball size (compact, 3-50 pixels)
  interface CandidateCluster {
    x: number;
    y: number;
    count: number;
    bboxW: number;
    bboxH: number;
    score: number;
  }

  const candidates: CandidateCluster[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cells[r * cols + c]!;
      if (cell.count < 3 || cell.count > 60) continue;

      let mergedCount = cell.count;
      let mergedSumX = cell.sumX;
      let mergedSumY = cell.sumY;
      let minX = cell.minX;
      let maxX = cell.maxX;
      let minY = cell.minY;
      let maxY = cell.maxY;

      // Merge with right neighbor if adjacent
      if (c + 1 < cols) {
        const rightCell = cells[r * cols + (c + 1)]!;
        if (rightCell.count > 0 && rightCell.count < 30) {
          mergedCount += rightCell.count;
          mergedSumX += rightCell.sumX;
          mergedSumY += rightCell.sumY;
          minX = Math.min(minX, rightCell.minX);
          maxX = Math.max(maxX, rightCell.maxX);
          minY = Math.min(minY, rightCell.minY);
          maxY = Math.max(maxY, rightCell.maxY);
        }
      }

      // Merge with bottom neighbor if adjacent
      if (r + 1 < rows) {
        const bottomCell = cells[(r + 1) * cols + c]!;
        if (bottomCell.count > 0 && bottomCell.count < 30) {
          mergedCount += bottomCell.count;
          mergedSumX += bottomCell.sumX;
          mergedSumY += bottomCell.sumY;
          minX = Math.min(minX, bottomCell.minX);
          maxX = Math.max(maxX, bottomCell.maxX);
          minY = Math.min(minY, bottomCell.minY);
          maxY = Math.max(maxY, bottomCell.maxY);
        }
      }

      const bboxW = maxX - minX + 1;
      const bboxH = maxY - minY + 1;

      // Ping-pong ball compactness filter: bounded box width and height <= 22px
      if (mergedCount >= 3 && mergedCount <= 70 && bboxW <= 22 && bboxH <= 22) {
        const aspect = bboxW / Math.max(bboxH, 1);
        if (aspect >= 0.4 && aspect <= 2.5) {
          const score = Math.abs(aspect - 1.0) * 10 + Math.abs(mergedCount - 16);
          candidates.push({
            x: mergedSumX / mergedCount,
            y: mergedSumY / mergedCount,
            count: mergedCount,
            bboxW,
            bboxH,
            score,
          });
        }
      }
    }
  }

  let detectedBall: { xNorm: number; yNorm: number } | null = null;
  if (candidates.length > 0) {
    // Pick candidate with best circular compactness score
    candidates.sort((a, b) => a.score - b.score);
    const best = candidates[0]!;
    detectedBall = {
      xNorm: best.x / width,
      yNorm: best.y / height,
    };
  }

  self.postMessage({
    type: 'BALL_DETECTED',
    ball: detectedBall,
    timestampMs,
  });
};

