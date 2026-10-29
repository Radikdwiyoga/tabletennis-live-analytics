import { Point2D, CalibrationResult, toTable, TABLE_WIDTH_CM } from './homography';
import { PointOneEuroFilter } from './oneEuroFilter';

export type PlayerId = 'P1' | 'P2' | 'P3' | 'P4';
export type MatchMode = 'singles' | 'doubles';

export interface PlayerFrame {
  id: PlayerId;
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

interface PlayerSlot {
  id: PlayerId;
  hipFilter: PointOneEuroFilter;
  lWristFilter: PointOneEuroFilter;
  rWristFilter: PointOneEuroFilter;
  lastFrame: PlayerFrame | null;
  lostFrames: number;
}

export class PlayerTracker {
  private mode: MatchMode = 'singles';
  private slots: Record<PlayerId, PlayerSlot>;

  private readonly maxLostFrames = 15;
  private readonly hysteresisThresholdCm = 15.0; // cm dead-band around net (137cm)

  constructor(mode: MatchMode = 'singles') {
    this.mode = mode;
    this.slots = {
      P1: this.createSlot('P1'),
      P2: this.createSlot('P2'),
      P3: this.createSlot('P3'),
      P4: this.createSlot('P4'),
    };
  }

  private createSlot(id: PlayerId): PlayerSlot {
    return {
      id,
      hipFilter: new PointOneEuroFilter(1.2, 0.005),
      lWristFilter: new PointOneEuroFilter(1.5, 0.008),
      rWristFilter: new PointOneEuroFilter(1.5, 0.008),
      lastFrame: null,
      lostFrames: 0,
    };
  }

  public setMode(mode: MatchMode): void {
    if (this.mode !== mode) {
      this.mode = mode;
      this.reset();
    }
  }

  public getMode(): MatchMode {
    return this.mode;
  }

  public reset(): void {
    (['P1', 'P2', 'P3', 'P4'] as PlayerId[]).forEach((id) => {
      const slot = this.slots[id];
      slot.hipFilter.reset();
      slot.lWristFilter.reset();
      slot.rWristFilter.reset();
      slot.lastFrame = null;
      slot.lostFrames = 0;
    });
  }

  private isWithinCourtArea(
    hipImg: Point2D,
    calib: CalibrationResult | null,
    frameWidth: number,
    frameHeight: number
  ): boolean {
    if (calib) {
      try {
        const tablePos = toTable(calib.homography, hipImg);
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
   * Process raw detected poses and update player positions.
   */
  public update(
    rawPoses: RawPose[],
    timestampMs: number,
    frameWidth: number,
    frameHeight: number,
    calib: CalibrationResult | null = null
  ): Record<PlayerId, PlayerFrame | null> {
    interface Candidate {
      hip: Point2D;
      leftWrist: Point2D;
      rightWrist: Point2D;
      confidence: number;
      tablePos?: Point2D;
      centerX: number;
    }

    // 1. Extract valid candidates inside court area
    const candidates: Candidate[] = [];

    for (const pose of rawPoses) {
      const lm = pose.landmarks;
      if (!lm || lm.length < 25) continue;

      const lHip = lm[LANDMARK_LEFT_HIP]!;
      const rHip = lm[LANDMARK_RIGHT_HIP]!;
      const lWrist = lm[LANDMARK_LEFT_WRIST]!;
      const rWrist = lm[LANDMARK_RIGHT_WRIST]!;

      const hipImg: Point2D = {
        x: ((lHip.x + rHip.x) / 2) * frameWidth,
        y: ((lHip.y + rHip.y) / 2) * frameHeight,
      };

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

    const midline = calib ? TABLE_WIDTH_CM / 2 : frameWidth / 2;
    const assignments: Partial<Record<PlayerId, Candidate>> = {};

    if (this.mode === 'singles') {
      // Singles Mode: P1 on Side A (left), P2 on Side B (right)
      this.assignSingles(candidates, midline, frameWidth, calib, assignments);
    } else {
      // Doubles Mode: P1 & P3 on Side A (left), P2 & P4 on Side B (right)
      this.assignDoubles(candidates, midline, assignments);
    }

    // Update slots with filtering and persistence
    const result: Record<PlayerId, PlayerFrame | null> = {
      P1: this.updateSlot('P1', assignments.P1, timestampMs),
      P2: this.updateSlot('P2', assignments.P2, timestampMs),
      P3: this.mode === 'doubles' ? this.updateSlot('P3', assignments.P3, timestampMs) : null,
      P4: this.mode === 'doubles' ? this.updateSlot('P4', assignments.P4, timestampMs) : null,
    };

    return result;
  }

  private assignSingles(
    candidates: { hip: Point2D; leftWrist: Point2D; rightWrist: Point2D; confidence: number; tablePos?: Point2D; centerX: number }[],
    midline: number,
    frameWidth: number,
    calib: CalibrationResult | null,
    assignments: Partial<Record<PlayerId, any>>
  ): void {
    const hysteresis = calib ? this.hysteresisThresholdCm : frameWidth * 0.05;

    if (candidates.length === 1) {
      const c = candidates[0]!;
      const p1Prev = this.slots.P1.lastFrame;
      const p2Prev = this.slots.P2.lastFrame;

      if (p1Prev && !p2Prev) {
        assignments.P1 = c;
      } else if (p2Prev && !p1Prev) {
        assignments.P2 = c;
      } else {
        if (c.centerX < midline) assignments.P1 = c;
        else assignments.P2 = c;
      }
    } else if (candidates.length >= 2) {
      candidates.sort((a, b) => a.centerX - b.centerX);
      const leftCandidate = candidates[0]!;
      const rightCandidate = candidates[candidates.length - 1]!;

      const p1Prev = this.slots.P1.lastFrame;
      const p2Prev = this.slots.P2.lastFrame;

      if (p1Prev && p2Prev) {
        const d1toLeft = Math.hypot(p1Prev.hip.x - leftCandidate.hip.x, p1Prev.hip.y - leftCandidate.hip.y);
        const d2toRight = Math.hypot(p2Prev.hip.x - rightCandidate.hip.x, p2Prev.hip.y - rightCandidate.hip.y);
        const d1toRight = Math.hypot(p1Prev.hip.x - rightCandidate.hip.x, p1Prev.hip.y - rightCandidate.hip.y);
        const d2toLeft = Math.hypot(p2Prev.hip.x - leftCandidate.hip.x, p2Prev.hip.y - leftCandidate.hip.y);

        if (d1toLeft + d2toRight <= d1toRight + d2toLeft + hysteresis) {
          assignments.P1 = leftCandidate;
          assignments.P2 = rightCandidate;
        } else {
          assignments.P1 = rightCandidate;
          assignments.P2 = leftCandidate;
        }
      } else {
        assignments.P1 = leftCandidate;
        assignments.P2 = rightCandidate;
      }
    }
  }

  private assignDoubles(
    candidates: { hip: Point2D; leftWrist: Point2D; rightWrist: Point2D; confidence: number; tablePos?: Point2D; centerX: number }[],
    midline: number,
    assignments: Partial<Record<PlayerId, any>>
  ): void {
    // Separate candidates by side: Side A (< midline) and Side B (>= midline)
    const sideA = candidates.filter((c) => c.centerX < midline);
    const sideB = candidates.filter((c) => c.centerX >= midline);

    // Match Side A candidates to P1 and P3 using spatial tracking
    this.matchPairToSlots(sideA, 'P1', 'P3', assignments);

    // Match Side B candidates to P2 and P4 using spatial tracking
    this.matchPairToSlots(sideB, 'P2', 'P4', assignments);
  }

  private matchPairToSlots(
    sideCandidates: any[],
    slotAId: PlayerId,
    slotBId: PlayerId,
    assignments: Partial<Record<PlayerId, any>>
  ): void {
    if (sideCandidates.length === 0) return;

    const prevA = this.slots[slotAId].lastFrame;
    const prevB = this.slots[slotBId].lastFrame;

    if (sideCandidates.length === 1) {
      const c = sideCandidates[0]!;
      if (prevA && !prevB) {
        assignments[slotAId] = c;
      } else if (prevB && !prevA) {
        assignments[slotBId] = c;
      } else if (prevA && prevB) {
        const dA = Math.hypot(prevA.hip.x - c.hip.x, prevA.hip.y - c.hip.y);
        const dB = Math.hypot(prevB.hip.x - c.hip.x, prevB.hip.y - c.hip.y);
        if (dA <= dB) assignments[slotAId] = c;
        else assignments[slotBId] = c;
      } else {
        assignments[slotAId] = c;
      }
    } else {
      // 2 or more candidates on this side
      const c1 = sideCandidates[0]!;
      const c2 = sideCandidates[1]!;

      if (prevA && prevB) {
        const d1A = Math.hypot(prevA.hip.x - c1.hip.x, prevA.hip.y - c1.hip.y);
        const d2B = Math.hypot(prevB.hip.x - c2.hip.x, prevB.hip.y - c2.hip.y);
        const d1B = Math.hypot(prevB.hip.x - c1.hip.x, prevB.hip.y - c1.hip.y);
        const d2A = Math.hypot(prevA.hip.x - c2.hip.x, prevA.hip.y - c2.hip.y);

        if (d1A + d2B <= d1B + d2A) {
          assignments[slotAId] = c1;
          assignments[slotBId] = c2;
        } else {
          assignments[slotAId] = c2;
          assignments[slotBId] = c1;
        }
      } else {
        // Sort by y coordinate: closer player is slot A, further player is slot B
        if (c1.hip.y > c2.hip.y) {
          assignments[slotAId] = c1;
          assignments[slotBId] = c2;
        } else {
          assignments[slotAId] = c2;
          assignments[slotBId] = c1;
        }
      }
    }
  }

  private updateSlot(
    id: PlayerId,
    candidate: any | undefined,
    timestampMs: number
  ): PlayerFrame | null {
    const slot = this.slots[id];

    if (candidate) {
      const smoothedHip = slot.hipFilter.filter(candidate.hip, timestampMs);
      const smoothedLWrist = slot.lWristFilter.filter(candidate.leftWrist, timestampMs);
      const smoothedRWrist = slot.rWristFilter.filter(candidate.rightWrist, timestampMs);

      const frame: PlayerFrame = {
        id,
        hip: smoothedHip,
        wrists: [smoothedLWrist, smoothedRWrist],
        tablePos: candidate.tablePos,
        confidence: candidate.confidence,
        t: timestampMs,
      };

      slot.lastFrame = frame;
      slot.lostFrames = 0;
      return frame;
    } else if (slot.lastFrame && slot.lostFrames < this.maxLostFrames) {
      slot.lostFrames++;
      return {
        ...slot.lastFrame,
        confidence: slot.lastFrame.confidence * 0.9,
        t: timestampMs,
      };
    } else {
      slot.lastFrame = null;
      return null;
    }
  }
}
