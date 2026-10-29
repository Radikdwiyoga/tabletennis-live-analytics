import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerTracker, RawPose } from './playerTracker';

function createMockPose(xNorm: number, yNorm: number): RawPose {
  const landmarks = new Array(33).fill(null).map(() => ({
    x: xNorm,
    y: yNorm,
    visibility: 0.9,
  }));
  return { landmarks };
}

describe('PlayerTracker', () => {
  let tracker: PlayerTracker;

  beforeEach(() => {
    tracker = new PlayerTracker();
  });

  it('assigns left pose to P1 and right pose to P2', () => {
    const poseLeft = createMockPose(0.2, 0.5); // x = 256px
    const poseRight = createMockPose(0.8, 0.5); // x = 1024px

    const { p1, p2 } = tracker.update([poseRight, poseLeft], 1000, 1280, 720);

    expect(p1).not.toBeNull();
    expect(p2).not.toBeNull();
    expect(p1!.id).toBe('P1');
    expect(p2!.id).toBe('P2');
    expect(p1!.hip.x).toBeLessThan(p2!.hip.x);
  });

  it('retains last known position up to 15 frames if a player is temporarily lost', () => {
    const poseP1 = createMockPose(0.25, 0.5);
    const poseP2 = createMockPose(0.75, 0.5);

    // Initial detection
    tracker.update([poseP1, poseP2], 1000, 1280, 720);

    // P2 momentarily disappears (occlusion or fast move)
    let lastP2 = null;
    for (let frame = 1; frame <= 10; frame++) {
      const res = tracker.update([poseP1], 1000 + frame * 33, 1280, 720);
      expect(res.p1).not.toBeNull();
      expect(res.p2).not.toBeNull(); // Still retained
      lastP2 = res.p2;
    }

    expect(lastP2).not.toBeNull();
    // Confidence decayed
    expect(lastP2!.confidence).toBeLessThan(0.9);
  });

  it('drops player after 15 lost frames', () => {
    const poseP1 = createMockPose(0.25, 0.5);
    const poseP2 = createMockPose(0.75, 0.5);

    tracker.update([poseP1, poseP2], 1000, 1280, 720);

    // P2 lost for 16 frames
    let finalRes = null;
    for (let frame = 1; frame <= 16; frame++) {
      finalRes = tracker.update([poseP1], 1000 + frame * 33, 1280, 720);
    }

    expect(finalRes!.p1).not.toBeNull();
    expect(finalRes!.p2).toBeNull(); // Dropped
  });

  it('filters out spectators far beyond image bounds', () => {
    const spectatorFarAway = createMockPose(2.5, 0.5); // x way outside
    const playerValid = createMockPose(0.3, 0.5);

    const { p1, p2 } = tracker.update([spectatorFarAway, playerValid], 1000, 1280, 720);

    expect(p1).not.toBeNull();
    expect(p2).toBeNull(); // Spectator ignored
  });
});

