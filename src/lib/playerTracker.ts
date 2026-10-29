import { Point2D, CalibrationResult, toTable, TABLE_WIDTH_CM } from './homography';
import { PointOneEuroFilter } from './oneEuroFilter';

export interface PlayerFrame {
  id: 'P1' | 'P2';
  hip: Point2D;
  wrists: [Point2D, Point2D];
  tablePos?: Point2D;
  confidence: number;
  t: number;
}

export interface RawPoseLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface RawPose {
  landmarks: RawPoseLandmark[];
}

// MediaPipe 33 pose landmark indices
export const LANDMARK_LEFT_WRIST = 15;
export const LANDMARK_RIGHT_WRIST = 16;
export const LANDMARK_LEFT_HIP = 23;
export const LANDMARK_RIGHT_HIP = 24;

export class PlayerTracker {
  private p1HipFilter = new PointOneEuroFilter(1.2, 0.005);
  private p1LeftWristFilter = new PointOneEuroFilter(1.5, 0.008);
  private p1RightWristFilter = new PointOneEuroFilter(1.5, 0.008);

  private p2HipFilter = new PointOneEuroFilter(1.2, 0.005);
  private p2LeftWristFilter = new PointOneEuroFilter(1.5, 0.008);
  private p2RightWristFilter = new PointOneEuroFilter(1.5, 0.008);

  private p1LastFrame: PlayerFrame | null = null;
  private p1LostFrames: number = 0;

  private p2LastFrame: PlayerFrame | null = null;
  private p2LostFrames: number = 0;

  private readonly maxLostFrames = 15;
  private readonly hysteresisThresholdCm = 15.0; // cm dead-band around net (137cm)

  public reset(): void {
    this.p1HipFilter.reset();
    this.p1LeftWristFilter.reset();
    this.p1RightWristFilter.reset();
    this.p2HipFilter.reset();
    this.p2LeftWristFilter.reset();
    this.p2RightWristFilter.reset();
    this.p1LastFrame = null;
    this.p1LostFrames = 0;
    this.p2LastFrame = null;
    this.p2LostFrames = 0;
  }

  /**
   * Checks whether a hip point falls within the extended table court area
   * (table bounds + 150cm buffer), filtering out spectators in the background.
   */
  private isWithinCourtArea(
    hipImg: Point2D,
    calib: CalibrationResult | null,
    frameWidth: number,
    frameHeight: number
  ): boolean {
    if (calib) {
      try {
        const tablePos = toTable(calib.homography, hipImg);
        // Table bounds are [0, 274] x [0, 152.5]. Extended by 150cm on all sides:
        return (
          tablePos.x >= -150 &&
          tablePos.x <= TABLE_WIDTH_CM + 150 &&
          tablePos.y >= -150 &&
          tablePos.y <= 310
        );
      } catch {
        // Fallback to image boundaries if homography projection fails
      }
    }

    return (
      hipImg.x >= 0 &&
      hipImg.x <= frameWidth &&
      hipImg.y >= 0 &&
      hipImg.y <= frameHeight
    );
  }

  /**
   * Process raw detected poses from PoseLandmarker and return tracked P1 and P2 frames.
   */
  public update(
    rawPoses: RawPose[],
    timestampMs: number,
    frameWidth: number,
    frameHeight: number,
    calib: CalibrationResult | null = null
  ): { p1: PlayerFrame | null; p2: PlayerFrame | null } {
    // 1. Extract valid candidates
    interface Candidate {
      hip: Point2D;
      leftWrist: Point2D;
      rightWrist: Point2D;
      confidence: number;
      tablePos?: Point2D;
      centerX: number; // for side assignment
    }

    const candidates: Candidate[] = [];

    for (const pose of rawPoses) {
      const lm = pose.landmarks;
      if (!lm || lm.length < 25) continue;

      const lHip = lm[LANDMARK_LEFT_HIP]!;
      const rHip = lm[LANDMARK_RIGHT_HIP]!;
      const lWrist = lm[LANDMARK_LEFT_WRIST]!;
      const rWrist = lm[LANDMARK_RIGHT_WRIST]!;

      // MediaPipe landmarks are normalized [0, 1]. Convert to image pixel space:
      const hipImg: Point2D = {
        x: ((lHip.x + rHip.x) / 2) * frameWidth,
        y: ((lHip.y + rHip.y) / 2) * frameHeight,
      };

      // Filter out candidates outside court boundaries (audience)
      if (!this.isWithinCourtArea(hipImg, calib, frameWidth, frameHeight)) {
        continue;
      }

      const leftWristImg: Point2D = {
        x: lWrist.x * frameWidth,
        y: lWrist.y * frameHeight,
      };
      const rightWristImg: Point2D = {
        x: rWrist.x * frameWidth,
        y: rWrist.y * frameHeight,
      };

      const hipConf = ((lHip.visibility ?? 0.8) + (rHip.visibility ?? 0.8)) / 2;

      let tablePos: Point2D | undefined;
      let centerX = hipImg.x;

      if (calib) {
        try {
          tablePos = toTable(calib.homography, hipImg);
          centerX = tablePos.x;
        } catch {
          // ignore
        }
      }

      candidates.push({
        hip: hipImg,
        leftWrist: leftWristImg,
        rightWrist: rightWristImg,
        confidence: hipConf,
        tablePos,
        centerX,
      });
    }

    // 2. Assign P1 and P2 based on table midline (137cm or frameWidth/2) with hysteresis
    const midline = calib ? TABLE_WIDTH_CM / 2 : frameWidth / 2;
    const hysteresis = calib ? this.hysteresisThresholdCm : frameWidth * 0.05;

    let matchedP1: Candidate | null = null;
    let matchedP2: Candidate | null = null;

    if (candidates.length === 1) {
      const c = candidates[0]!;
      // Use spatial distance to previous if known
      if (this.p1LastFrame && !this.p2LastFrame) {
        matchedP1 = c;
      } else if (this.p2LastFrame && !this.p1LastFrame) {
        matchedP2 = c;
      } else {
        // Fall back to side
        if (c.centerX < midline) {
          matchedP1 = c;
        } else {
          matchedP2 = c;
        }
      }
    } else if (candidates.length >= 2) {
      // Sort candidates from left to right along x-axis
      candidates.sort((a, b) => a.centerX - b.centerX);
      const leftCandidate = candidates[0]!;
      const rightCandidate = candidates[candidates.length - 1]!;

      // Compare with previous frames for hysteresis
      const p1Prev = this.p1LastFrame;
      const p2Prev = this.p2LastFrame;

      if (p1Prev && p2Prev) {
        const d1toLeft = Math.hypot(p1Prev.hip.x - leftCandidate.hip.x, p1Prev.hip.y - leftCandidate.hip.y);
        const d2toRight = Math.hypot(p2Prev.hip.x - rightCandidate.hip.x, p2Prev.hip.y - rightCandidate.hip.y);
        const d1toRight = Math.hypot(p1Prev.hip.x - rightCandidate.hip.x, p1Prev.hip.y - rightCandidate.hip.y);
        const d2toLeft = Math.hypot(p2Prev.hip.x - leftCandidate.hip.x, p2Prev.hip.y - leftCandidate.hip.y);

        if (d1toLeft + d2toRight <= d1toRight + d2toLeft + hysteresis) {
          matchedP1 = leftCandidate;
          matchedP2 = rightCandidate;
        } else {
          matchedP1 = rightCandidate;
          matchedP2 = leftCandidate;
        }
      } else {
        matchedP1 = leftCandidate;
        matchedP2 = rightCandidate;
      }
    }

    // 3. Update P1 with smoothing & persistence
    let p1Result: PlayerFrame | null = null;
    if (matchedP1) {
      const smoothedHip = this.p1HipFilter.filter(matchedP1.hip, timestampMs);
      const smoothedLWrist = this.p1LeftWristFilter.filter(matchedP1.leftWrist, timestampMs);
      const smoothedRWrist = this.p1RightWristFilter.filter(matchedP1.rightWrist, timestampMs);

      p1Result = {
        id: 'P1',
        hip: smoothedHip,
        wrists: [smoothedLWrist, smoothedRWrist],
        tablePos: matchedP1.tablePos,
        confidence: matchedP1.confidence,
        t: timestampMs,
      };
      this.p1LastFrame = p1Result;
      this.p1LostFrames = 0;
    } else if (this.p1LastFrame && this.p1LostFrames < this.maxLostFrames) {
      this.p1LostFrames++;
      // Decay confidence
      p1Result = {
        ...this.p1LastFrame,
        confidence: this.p1LastFrame.confidence * 0.9,
        t: timestampMs,
      };
    } else {
      this.p1LastFrame = null;
    }

    // 4. Update P2 with smoothing & persistence
    let p2Result: PlayerFrame | null = null;
    if (matchedP2) {
      const smoothedHip = this.p2HipFilter.filter(matchedP2.hip, timestampMs);
      const smoothedLWrist = this.p2LeftWristFilter.filter(matchedP2.leftWrist, timestampMs);
      const smoothedRWrist = this.p2RightWristFilter.filter(matchedP2.rightWrist, timestampMs);

      p2Result = {
        id: 'P2',
        hip: smoothedHip,
        wrists: [smoothedLWrist, smoothedRWrist],
        tablePos: matchedP2.tablePos,
        confidence: matchedP2.confidence,
        t: timestampMs,
      };
      this.p2LastFrame = p2Result;
      this.p2LostFrames = 0;
    } else if (this.p2LastFrame && this.p2LostFrames < this.maxLostFrames) {
      this.p2LostFrames++;
      p2Result = {
        ...this.p2LastFrame,
        confidence: this.p2LastFrame.confidence * 0.9,
        t: timestampMs,
      };
    } else {
      this.p2LastFrame = null;
    }

    return { p1: p1Result, p2: p2Result };
  }
}

