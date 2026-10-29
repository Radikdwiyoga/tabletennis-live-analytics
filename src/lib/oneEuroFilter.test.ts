import { describe, it, expect } from 'vitest';
import { OneEuroFilter, PointOneEuroFilter } from './oneEuroFilter';

describe('OneEuroFilter', () => {
  it('initializes with the first value', () => {
    const filter = new OneEuroFilter();
    const val = filter.filter(100, 1000);
    expect(val).toBe(100);
  });

  it('smooths high-frequency noise for static positions', () => {
    const filter = new OneEuroFilter(1.0, 0.0);
    let t = 1000;
    filter.filter(100, t);

    // Simulate noisy stationary signal
    const noisyVals = [102, 98, 103, 97, 101, 99];
    let smoothed = 100;
    for (const n of noisyVals) {
      t += 33; // ~30fps
      smoothed = filter.filter(n, t);
    }

    // Should remain very close to 100
    expect(Math.abs(smoothed - 100)).toBeLessThan(1.5);
  });

  it('adapts quickly to rapid changes (low lag)', () => {
    const filter = new OneEuroFilter(1.0, 0.01);
    let t = 1000;
    filter.filter(0, t);

    // Sudden jump
    t += 33;
    const val1 = filter.filter(50, t);
    t += 33;
    const val2 = filter.filter(100, t);

    expect(val1).toBeGreaterThan(15);
    expect(val2).toBeGreaterThan(60);
  });

  it('smooths 2D points properly', () => {
    const pointFilter = new PointOneEuroFilter();
    const p1 = pointFilter.filter({ x: 10, y: 20 }, 1000);
    expect(p1).toEqual({ x: 10, y: 20 });

    const p2 = pointFilter.filter({ x: 12, y: 19 }, 1033);
    expect(p2.x).toBeGreaterThan(10);
    expect(p2.x).toBeLessThan(12);
  });
});

