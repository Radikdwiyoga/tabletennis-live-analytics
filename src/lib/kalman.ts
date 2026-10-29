export interface KalmanState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * 2D Constant-Velocity Kalman Filter for ball tracking.
 * State: [x, y, vx, vy]
 */
export class KalmanFilter2D {
  private x: number = 0;
  private y: number = 0;
  private vx: number = 0;
  private vy: number = 0;

  // Covariances
  private p00: number = 100;
  private p11: number = 100;
  private p22: number = 400;
  private p33: number = 400;

  // Process noise
  private qPos: number = 10;
  private qVel: number = 30;

  // Measurement noise
  private rPos: number = 8;

  private isInitialized: boolean = false;
  private lastTimeMs: number = 0;

  constructor(qPos: number = 10, qVel: number = 30, rPos: number = 8) {
    this.qPos = qPos;
    this.qVel = qVel;
    this.rPos = rPos;
  }

  public init(x: number, y: number, timestampMs: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.p00 = 10;
    this.p11 = 10;
    this.p22 = 100;
    this.p33 = 100;
    this.lastTimeMs = timestampMs;
    this.isInitialized = true;
  }

  public predict(timestampMs: number): KalmanState {
    if (!this.isInitialized) {
      return { x: 0, y: 0, vx: 0, vy: 0 };
    }

    const dt = Math.max(0.001, (timestampMs - this.lastTimeMs) / 1000.0);
    this.lastTimeMs = timestampMs;

    // State extrapolation
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Covariance extrapolation
    this.p00 += dt * (2 * this.p00 + dt * this.p22) + this.qPos * dt;
    this.p11 += dt * (2 * this.p11 + dt * this.p33) + this.qPos * dt;
    this.p22 += this.qVel * dt;
    this.p33 += this.qVel * dt;

    return { x: this.x, y: this.y, vx: this.vx, vy: this.vy };
  }

  /**
   * Updates state with measurement (x, y) if within gating threshold.
   */
  public update(
    measX: number,
    measY: number,
    gatingRadius: number = 120
  ): { accepted: boolean; state: KalmanState } {
    if (!this.isInitialized) {
      this.init(measX, measY, performance.now());
      return { accepted: true, state: { x: this.x, y: this.y, vx: this.vx, vy: this.vy } };
    }

    const dist = Math.hypot(measX - this.x, measY - this.y);
    if (dist > gatingRadius) {
      // Gating rejected: measurement is too far from trajectory prediction
      return { accepted: false, state: { x: this.x, y: this.y, vx: this.vx, vy: this.vy } };
    }

    // Kalman gains
    const kx = this.p00 / (this.p00 + this.rPos);
    const ky = this.p11 / (this.p11 + this.rPos);

    // State correction
    const residualX = measX - this.x;
    const residualY = measY - this.y;

    this.x += kx * residualX;
    this.y += ky * residualY;
    this.vx += (kx / 0.1) * residualX * 0.2;
    this.vy += (ky / 0.1) * residualY * 0.2;

    // Covariance correction
    this.p00 *= 1.0 - kx;
    this.p11 *= 1.0 - ky;

    return { accepted: true, state: { x: this.x, y: this.y, vx: this.vx, vy: this.vy } };
  }

  public getState(): KalmanState {
    return { x: this.x, y: this.y, vx: this.vx, vy: this.vy };
  }

  public reset(): void {
    this.isInitialized = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
  }
}

