import { describe, it, expect } from 'vitest';
import { generateScoreAnnouncement, formatNumberId } from './scoreVoice';
import { createInitialScore, addPoint } from './score';

describe('Score Voice Announcement Generator', () => {
  it('formats number words correctly', () => {
    expect(formatNumberId(0)).toBe('Nol');
    expect(formatNumberId(7)).toBe('Tujuh');
    expect(formatNumberId(10)).toBe('Sepuluh');
    expect(formatNumberId(11)).toBe('Sebelas');
    expect(formatNumberId(15)).toBe('Lima belas');
  });

  it('announces equal score as "X sama"', () => {
    let s = createInitialScore(11, 'A');
    s = addPoint(s, 'A');
    s = addPoint(s, 'B'); // 1-1
    const text = generateScoreAnnouncement(s, 'P1', 'P2');
    expect(text).toBe('Satu sama.');
  });

  it('announces standard score difference', () => {
    let s = createInitialScore(11, 'A');
    s = addPoint(s, 'A');
    s = addPoint(s, 'A');
    s = addPoint(s, 'B'); // 2-1
    const text = generateScoreAnnouncement(s, 'P1', 'P2');
    expect(text).toBe('Dua - Satu.');
  });

  it('announces game point when 10-8 or similar', () => {
    let s = createInitialScore(11, 'A');
    s.teamAScore = 10;
    s.teamBScore = 8;
    const text = generateScoreAnnouncement(s, 'P1', 'P2');
    expect(text).toContain('Game point');
    expect(text).toContain('Sepuluh - Delapan');
  });

  it('announces deuce properly when 10-10', () => {
    let s = createInitialScore(11, 'A');
    s.teamAScore = 10;
    s.teamBScore = 10;
    s.isDeuce = true;
    const text = generateScoreAnnouncement(s, 'P1', 'P2');
    expect(text).toContain('Deus');
    expect(text).toContain('Sepuluh sama');
  });

  it('announces set winner when set is won', () => {
    let s = createInitialScore(11, 'A');
    s.teamAScore = 10;
    s.teamBScore = 9;
    s = addPoint(s, 'A'); // 11-9 Set won
    const text = generateScoreAnnouncement(s, 'Tim A', 'Tim B');
    expect(text).toContain('dimenangkan oleh Tim A');
    expect(text).toContain('Sebelas - Sembilan');
  });
});
