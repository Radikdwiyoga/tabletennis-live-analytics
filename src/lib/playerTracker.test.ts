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

  it('assigns left pose to P1 and right pose to P2 in singles mode', () => {
    const poseLeft = createMockPose(0.2, 0.5); // x = 256px
    const poseRight = createMockPose(0.8, 0.5); // x = 1024px

    const players = tracker.update([poseRight, poseLeft], 1000, 1280, 720);

    expect(players.P1).not.toBeNull();
    expect(players.P2).not.toBeNull();
    expect(players.P3).toBeNull();
    expect(players.P4).toBeNull();
    expect(players.P1!.id).toBe('P1');
    expect(players.P2!.id).toBe('P2');
    expect(players.P1!.hip.x).toBeLessThan(players.P2!.hip.x);
  });

  it('tracks 4 players (P1, P3, P2, P4) in doubles mode', () => {
    tracker.setMode('doubles');

    // 2 players on Team A (left side x = 0.2 and 0.35)
    const p1Pose = createMockPose(0.2, 0.6);
    const p3Pose = createMockPose(0.35, 0.4);

    // 2 players on Team B (right side x = 0.7 and 0.85)
    const p2Pose = createMockPose(0.7, 0.6);
    const p4Pose = createMockPose(0.85, 0.4);

    const players = tracker.update([p1Pose, p3Pose, p2Pose, p4Pose], 1000, 1280, 720);

    expect(players.P1).not.toBeNull();
    expect(players.P3).not.toBeNull();
    expect(players.P2).not.toBeNull();
    expect(players.P4).not.toBeNull();

    expect(players.P1!.id).toBe('P1');
    expect(players.P3!.id).toBe('P3');
    expect(players.P2!.id).toBe('P2');
    expect(players.P4!.id).toBe('P4');
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
      expect(res.P1).not.toBeNull();
      expect(res.P2).not.toBeNull(); // Still retained
      lastP2 = res.P2;
    }

    expect(lastP2).not.toBeNull();
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

    expect(finalRes!.P1).not.toBeNull();
    expect(finalRes!.P2).toBeNull(); // Dropped
  });

  it('filters out spectators far beyond image bounds', () => {
    const spectatorFarAway = createMockPose(2.5, 0.5); // x way outside
    const playerValid = createMockPose(0.3, 0.5);

    const players = tracker.update([spectatorFarAway, playerValid], 1000, 1280, 720);

    expect(players.P1).not.toBeNull();
    expect(players.P2).toBeNull(); // Spectator ignored
  });
});
