/**
 * 1€ Filter (One Euro Filter)
 * An adaptive low-pass filter with low lag for real-time human pose landmarks.
 * Reference: Casiez et al., CHI 2012.
 */
export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev: number | null = null;
  private dxPrev: number = 0;
  private tPrev: number | null = null;

  constructor(minCutoff: number = 1.0, beta: number = 0.007, dCutoff: number = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  public filter(x: number, timestampMs: number): number {
    if (this.tPrev === null || this.xPrev === null) {
      this.tPrev = timestampMs;
      this.xPrev = x;
      this.dxPrev = 0;
      return x;
    }

    const dt = Math.max((timestampMs - this.tPrev) / 1000.0, 1e-4);
    this.tPrev = timestampMs;

    // Estimate derivative
    const dx = (x - this.xPrev) / dt;
    const aD = this.alpha(this.dCutoff, dt);
    const dxHat = aD * dx + (1.0 - aD) * this.dxPrev;
    this.dxPrev = dxHat;

    // Compute dynamic cutoff frequency
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = this.alpha(cutoff, dt);
    const xHat = a * x + (1.0 - a) * this.xPrev;
    this.xPrev = xHat;

    return xHat;
  }

  public reset(): void {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }
}

export class PointOneEuroFilter {
  private filterX: OneEuroFilter;
  private filterY: OneEuroFilter;

  constructor(minCutoff: number = 1.0, beta: number = 0.007) {
    this.filterX = new OneEuroFilter(minCutoff, beta);
    this.filterY = new OneEuroFilter(minCutoff, beta);
  }

  public filter(p: { x: number; y: number }, timestampMs: number): { x: number; y: number } {
    return {
      x: this.filterX.filter(p.x, timestampMs),
      y: this.filterY.filter(p.y, timestampMs),
    };
  }

  public reset(): void {
    this.filterX.reset();
    this.filterY.reset();
  }
}

