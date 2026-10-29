import { describe, it, expect } from 'vitest';
import {
  createInitialScore,
  addPoint,
  undoPoint,
  startNextSet,
  resetMatch,
  calculateServer,
  setTargetPoints,
} from './score';

describe('Table Tennis ITTF Scoring Logic (11 & 21 Points)', () => {
  it('initializes with 0-0 score and Server A', () => {
    const score = createInitialScore(11, 'A');
    expect(score.teamAScore).toBe(0);
    expect(score.teamBScore).toBe(0);
    expect(score.targetPoints).toBe(11);
    expect(score.currentServer).toBe('A');
    expect(score.isDeuce).toBe(false);
  });

  describe('11-point system', () => {
    it('rotates server every 2 points during normal play', () => {
      expect(calculateServer(0, 0, 'A', 11)).toBe('A');
      expect(calculateServer(1, 0, 'A', 11)).toBe('A');
      expect(calculateServer(1, 1, 'A', 11)).toBe('B');
      expect(calculateServer(2, 1, 'A', 11)).toBe('B');
      expect(calculateServer(2, 2, 'A', 11)).toBe('A');
      expect(calculateServer(3, 2, 'A', 11)).toBe('A');
      expect(calculateServer(3, 3, 'A', 11)).toBe('B');
    });

    it('rotates server every 1 point during deuce (>= 10-10)', () => {
      expect(calculateServer(10, 10, 'A', 11)).toBe('A');
      expect(calculateServer(11, 10, 'A', 11)).toBe('B');
      expect(calculateServer(11, 11, 'A', 11)).toBe('A');
      expect(calculateServer(12, 11, 'A', 11)).toBe('B');
    });

    it('declares set winner at 11 points with >= 2 points lead and moves to next set', () => {
      let s = createInitialScore(11, 'A');
      for (let i = 0; i < 11; i++) {
        s = addPoint(s, 'A');
      }
      expect(s.teamAScore).toBe(11);
      expect(s.teamBScore).toBe(0);
      expect(s.setWinner).toBe('A');
      expect(s.teamASets).toBe(1);

      s = startNextSet(s);
      expect(s.currentSet).toBe(2);
      expect(s.teamAScore).toBe(0);
      expect(s.setWinner).toBeNull();
    });
  });

  describe('21-point system (classic)', () => {
    it('rotates server every 5 points during normal play', () => {
      // 0 to 4 total points -> Server A
      expect(calculateServer(0, 0, 'A', 21)).toBe('A');
      expect(calculateServer(2, 2, 'A', 21)).toBe('A');
      expect(calculateServer(3, 1, 'A', 21)).toBe('A');

      // 5 to 9 total points -> Server B
      expect(calculateServer(3, 2, 'A', 21)).toBe('B');
      expect(calculateServer(5, 0, 'A', 21)).toBe('B');
      expect(calculateServer(5, 4, 'A', 21)).toBe('B');

      // 10 to 14 total points -> Server A
      expect(calculateServer(5, 5, 'A', 21)).toBe('A');
      expect(calculateServer(7, 3, 'A', 21)).toBe('A');
    });

    it('rotates server every 1 point during deuce (>= 20-20)', () => {
      expect(calculateServer(20, 20, 'A', 21)).toBe('A');
      expect(calculateServer(21, 20, 'A', 21)).toBe('B');
      expect(calculateServer(21, 21, 'A', 21)).toBe('A');
      expect(calculateServer(22, 21, 'A', 21)).toBe('B');
    });

    it('requires 21 points to win with >= 2 points difference', () => {
      let s = createInitialScore(21, 'A');
      s.teamAScore = 20;
      s.teamBScore = 19;

      // 21-19 is a win
      s = addPoint(s, 'A');
      expect(s.teamAScore).toBe(21);
      expect(s.setWinner).toBe('A');
      expect(s.teamASets).toBe(1);
    });

    it('handles deuce at 20-20 and requires 22-20 for victory', () => {
      let s = createInitialScore(21, 'A');
      s.teamAScore = 20;
      s.teamBScore = 20;

      // 21-20 (not won yet)
      s = addPoint(s, 'A');
      expect(s.isDeuce).toBe(true);
      expect(s.setWinner).toBeNull();

      // 22-20 (won!)
      s = addPoint(s, 'A');
      expect(s.setWinner).toBe('A');
    });
  });

  it('switches target points dynamically via setTargetPoints', () => {
    let s = createInitialScore(11, 'A');
    s = setTargetPoints(s, 21);
    expect(s.targetPoints).toBe(21);
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

    s = undoPoint(s); // back to 0-0
    expect(s.teamAScore).toBe(0);
    expect(s.teamBScore).toBe(0);
  });

  it('resets entire match to initial state', () => {
    let s = createInitialScore(21, 'A');
    s = addPoint(s, 'A');
    s = resetMatch(s);

    expect(s.teamAScore).toBe(0);
    expect(s.teamBScore).toBe(0);
    expect(s.targetPoints).toBe(21);
  });
});
