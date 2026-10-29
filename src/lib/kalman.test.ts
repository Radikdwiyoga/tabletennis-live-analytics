import { describe, it, expect, beforeEach } from 'vitest';
import { KalmanFilter2D } from './kalman';

describe('KalmanFilter2D', () => {
  let kf: KalmanFilter2D;

  beforeEach(() => {
    kf = new KalmanFilter2D();
  });

  it('initializes with measurement', () => {
    kf.init(100, 200, 1000);
    const state = kf.getState();
    expect(state.x).toBe(100);
    expect(state.y).toBe(200);
    expect(state.vx).toBe(0);
  });

  it('predicts trajectory over time based on velocity', () => {
    kf.init(100, 100, 1000);
    // Update with moving measurements
    kf.update(110, 105);
    const pred = kf.predict(1100); // 100ms later
    expect(pred.x).toBeGreaterThan(100);
  });

  it('rejects outliers using gating radius', () => {
    kf.init(200, 200, 1000);
    // Sudden impossible outlier 500px away
    const res = kf.update(700, 700, 100);
    expect(res.accepted).toBe(false);
  });
});
