import { Point2D, CalibrationResult, toTable, TABLE_WIDTH_CM, TABLE_HEIGHT_CM } from './homography';

export interface BouncePoint {
  id: string;
  tableX: number; // 0 to 274 cm
  tableY: number; // 0 to 152.5 cm
  imageX: number;
  imageY: number;
  t: number;
  hitter: 'P1' | 'P2';
}

export interface RallyStats {
  currentRallyShots: number;
  currentRallyDurationSec: number;
  longestRallyShots: number;
  totalShots: number;
  lastSpeedKmh: number | null;
  bounces: BouncePoint[];
  lastHitter: 'P1' | 'P2' | null;
}

export class RallyTracker {
  private currentShots: number = 0;
  private longestRally: number = 0;
  private totalShotsCount: number = 0;
  private rallyStartTime: number | null = null;
  private lastBallSeenTime: number = 0;
  private lastShotTime: number = 0;
  private lastBounceTime: number = 0;
  private prevVx: number = 0;
  private prevVy: number = 0;
  private prevTablePos: { pos: Point2D; t: number } | null = null;
  private lastSpeed: number | null = null;
  private bounces: BouncePoint[] = [];
  private lastHitter: 'P1' | 'P2' | null = null;

  private readonly minShotIntervalMs = 280; // minimum ms between shots to avoid double counting
  private readonly minBounceIntervalMs = 250;
  private readonly rallyTimeoutMs = 1500; // if ball lost for > 1.5s, rally resets

  public reset(): void {
    this.currentShots = 0;
    this.longestRally = 0;
    this.totalShotsCount = 0;
    this.rallyStartTime = null;
    this.lastBallSeenTime = 0;
    this.lastShotTime = 0;
    this.lastBounceTime = 0;
    this.prevVx = 0;
    this.prevVy = 0;
    this.prevTablePos = null;
    this.lastSpeed = null;
    this.bounces = [];
    this.lastHitter = null;
  }

  /**
   * Updates rally state with ball position and velocity from Kalman filter.
   */
  public update(
    ballImg: Point2D | null,
    vx: number,
    vy: number,
    timestampMs: number,
    calib: CalibrationResult | null = null
  ): RallyStats {
    if (ballImg) {
      if (this.rallyStartTime === null) {
        this.rallyStartTime = timestampMs;
      }
      this.lastBallSeenTime = timestampMs;

      let currentTablePos: Point2D | null = null;
      if (calib) {
        try {
          currentTablePos = toTable(calib.homography, ballImg);
        } catch {
          currentTablePos = null;
        }
      }

      // 1. Estimate Ball Speed in km/h from table coordinate movement
      if (currentTablePos && this.prevTablePos) {
        const dtSec = (timestampMs - this.prevTablePos.t) / 1000.0;
        if (dtSec > 0.02 && dtSec < 0.2) {
          const dxCm = currentTablePos.x - this.prevTablePos.pos.x;
          const dyCm = currentTablePos.y - this.prevTablePos.pos.y;
          const distCm = Math.hypot(dxCm, dyCm);
          // cm/s to km/h: (cm / s) * 0.036
          const speedKmh = (distCm / dtSec) * 0.036;
          // Reasonable clamp for table tennis speed: 10 to 120 km/h
          if (speedKmh >= 10 && speedKmh <= 120) {
            this.lastSpeed = Math.round(speedKmh);
          }
        }
      }
      if (currentTablePos) {
        this.prevTablePos = { pos: currentTablePos, t: timestampMs };
      }

      // 2. Shot Detection: horizontal reversal of vx
      // If vx reverses sign and velocity magnitude is sufficient
      if (
        this.prevVx !== 0 &&
        Math.sign(vx) !== Math.sign(this.prevVx) &&
        Math.abs(vx) > 30 &&
        timestampMs - this.lastShotTime > this.minShotIntervalMs
      ) {
        this.currentShots++;
        this.totalShotsCount++;
        this.lastShotTime = timestampMs;

        // Determine hitter based on which direction ball started traveling
        // If moving right (vx > 0), P1 hit it; if moving left (vx < 0), P2 hit it
        this.lastHitter = vx > 0 ? 'P1' : 'P2';

        if (this.currentShots > this.longestRally) {
          this.longestRally = this.currentShots;
        }
      }
      this.prevVx = vx;

      // 3. Bounce Detection: vy changes from positive (downward in image) to negative (upward)
      if (
        this.prevVy > 15 &&
        vy < -5 &&
        timestampMs - this.lastBounceTime > this.minBounceIntervalMs
      ) {
        this.lastBounceTime = timestampMs;

        if (currentTablePos) {
          // Verify bounce is within table boundaries [0, 274] x [0, 152.5]
          const isInsideTable =
            currentTablePos.x >= 0 &&
            currentTablePos.x <= TABLE_WIDTH_CM &&
            currentTablePos.y >= 0 &&
            currentTablePos.y <= TABLE_HEIGHT_CM;

          if (isInsideTable) {
            this.bounces.push({
              id: `bounce_${timestampMs}`,
              tableX: Math.round(currentTablePos.x),
              tableY: Math.round(currentTablePos.y),
              imageX: Math.round(ballImg.x),
              imageY: Math.round(ballImg.y),
              t: timestampMs,
              hitter: this.lastHitter || 'P1',
            });
            // Keep last 100 bounces to prevent memory growth
            if (this.bounces.length > 100) {
              this.bounces.shift();
            }
          }
        }
      }
      this.prevVy = vy;
    } else {
      // Ball not seen: check if rally should reset
      if (
        this.rallyStartTime !== null &&
        timestampMs - this.lastBallSeenTime > this.rallyTimeoutMs
      ) {
        this.currentShots = 0;
        this.rallyStartTime = null;
        this.prevVx = 0;
        this.prevVy = 0;
        this.prevTablePos = null;
      }
    }

    const durationSec =
      this.rallyStartTime !== null
        ? Math.max(0, Math.floor((timestampMs - this.rallyStartTime) / 1000))
        : 0;

    return {
      currentRallyShots: this.currentShots,
      currentRallyDurationSec: durationSec,
      longestRallyShots: this.longestRally,
      totalShots: this.totalShotsCount,
      lastSpeedKmh: this.lastSpeed,
      bounces: this.bounces,
      lastHitter: this.lastHitter,
    };
  }
}

