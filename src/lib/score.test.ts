import { describe, it, expect } from 'vitest';
import {
  createInitialScore,
  addPoint,
  undoPoint,
  startNextSet,
  resetMatch,
  calculateServer,
} from './score';

describe('Table Tennis ITTF Scoring Logic', () => {
  it('initializes with 0-0 score and Server A', () => {
    const score = createInitialScore(11, 'A');
    expect(score.teamAScore).toBe(0);
    expect(score.teamBScore).toBe(0);
    expect(score.currentServer).toBe('A');
    expect(score.isDeuce).toBe(false);
  });

  it('rotates server every 2 points during normal play', () => {
    expect(calculateServer(0, 0, 'A')).toBe('A');
    expect(calculateServer(1, 0, 'A')).toBe('A');
    expect(calculateServer(1, 1, 'A')).toBe('B');
    expect(calculateServer(2, 1, 'A')).toBe('B');
    expect(calculateServer(2, 2, 'A')).toBe('A');
    expect(calculateServer(3, 2, 'A')).toBe('A');
    expect(calculateServer(3, 3, 'A')).toBe('B');
  });

  it('rotates server every 1 point during deuce (>= 10-10)', () => {
    expect(calculateServer(10, 10, 'A')).toBe('A');
    expect(calculateServer(11, 10, 'A')).toBe('B');
    expect(calculateServer(11, 11, 'A')).toBe('A');
    expect(calculateServer(12, 11, 'A')).toBe('B');
  });

  it('declares set winner when reaching 11 points with >= 2 points lead', () => {
    let s = createInitialScore(11, 'A');
    // Team A scores 11 points straight
    for (let i = 0; i < 11; i++) {
      s = addPoint(s, 'A');
    }
    expect(s.teamAScore).toBe(11);
    expect(s.teamBScore).toBe(0);
    expect(s.setWinner).toBe('A');
    expect(s.teamASets).toBe(1);
  });

  it('handles deuce and requires 2-point difference to win', () => {
    let s = createInitialScore(11, 'A');
    // Reach 10-10
    s.teamAScore = 10;
    s.teamBScore = 10;

    // Team A reaches 11-10 (not won yet)
    s = addPoint(s, 'A');
    expect(s.isDeuce).toBe(true);
    expect(s.setWinner).toBeNull();

    // Team A reaches 12-10 (won!)
    s = addPoint(s, 'A');
    expect(s.setWinner).toBe('A');
    expect(s.teamASets).toBe(1);
  });

  it('transitions to next set properly and alternates starting server', () => {
    let s = createInitialScore(11, 'A');
    s.teamAScore = 10;
    s.teamBScore = 9;
    s = addPoint(s, 'A'); // 11-9 (Set 1 won by A)

    expect(s.setWinner).toBe('A');

    // Start set 2
    s = startNextSet(s);
    expect(s.currentSet).toBe(2);
    expect(s.teamAScore).toBe(0);
    expect(s.teamBScore).toBe(0);
    expect(s.currentServer).toBe('B'); // Server B starts set 2
    expect(s.setWinner).toBeNull();
  });

  it('allows undoing points accurately', () => {
    let s = createInitialScore(11, 'A');
    s = addPoint(s, 'A'); // 1-0
    s = addPoint(s, 'B'); // 1-1

    expect(s.teamAScore).toBe(1);
    expect(s.teamBScore).toBe(1);

    s = undoPoint(s); // back to 1-0
    expect(s.teamAScore).toBe(1);
    expect(s.teamBScore).toBe(0);
    expect(s.currentServer).toBe('A');

    s = undoPoint(s); // back to 0-0
    expect(s.teamAScore).toBe(0);
    expect(s.teamBScore).toBe(0);
  });

  it('resets entire match to initial state', () => {
    let s = createInitialScore(11, 'A');
    s = addPoint(s, 'A');
    s = addPoint(s, 'A');
    s = resetMatch(s);

    expect(s.teamAScore).toBe(0);
    expect(s.teamBScore).toBe(0);
    expect(s.teamASets).toBe(0);
  });
});

