import { describe, it, expect, beforeEach } from 'vitest';
import { RallyTracker } from './rally';
import { CalibrationResult, computeHomography, invertHomography, TABLE_CORNERS_CM } from './homography';

describe('RallyTracker', () => {
  let tracker: RallyTracker;
  let mockCalib: CalibrationResult;

  beforeEach(() => {
    tracker = new RallyTracker();

    // Standard 1280x720 sample image corners
    const imageCorners = [
      { x: 100, y: 600 },
      { x: 1180, y: 600 },
      { x: 900, y: 200 },
      { x: 380, y: 200 },
    ];
    const H = computeHomography(imageCorners, TABLE_CORNERS_CM);
    mockCalib = {
      imageCorners,
      tableCorners: TABLE_CORNERS_CM,
      homography: H,
      invHomography: invertHomography(H),
    };
  });

  it('increments shot count when horizontal velocity vx reverses direction', () => {
    // Ball moving right (P1 hit)
    tracker.update({ x: 400, y: 400 }, 60, 10, 1000, mockCalib);
    tracker.update({ x: 500, y: 400 }, 60, 10, 1100, mockCalib);

    // Ball reverses to left (P2 hit)
    const stats = tracker.update({ x: 600, y: 400 }, -70, 5, 1400, mockCalib);

    expect(stats.currentRallyShots).toBe(1);
    expect(stats.totalShots).toBe(1);
    expect(stats.lastHitter).toBe('P2');
  });

  it('detects table bounce when vy flips from positive to negative on table', () => {
    // Ball descending (vy > 0)
    tracker.update({ x: 640, y: 420 }, 50, 40, 1000, mockCalib);

    // Ball bounces upward (vy < 0)
    const stats = tracker.update({ x: 670, y: 430 }, 50, -30, 1300, mockCalib);

    expect(stats.bounces.length).toBe(1);
    const bounce = stats.bounces[0]!;
    expect(bounce.tableX).toBeGreaterThanOrEqual(0);
    expect(bounce.tableX).toBeLessThanOrEqual(274);
  });

  it('resets current rally when ball is lost for more than timeout threshold', () => {
    // Start a rally
    tracker.update({ x: 400, y: 400 }, 60, 10, 1000, mockCalib);
    tracker.update({ x: 500, y: 400 }, -70, 10, 1400, mockCalib);

    // Ball disappears for 2 seconds
    const stats = tracker.update(null, 0, 0, 3500, mockCalib);

    expect(stats.currentRallyShots).toBe(0);
    expect(stats.totalShots).toBe(1); // Lifetime total shots preserved
  });
});

