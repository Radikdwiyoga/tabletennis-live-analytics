import { MatchScoreState } from './score';

/**
 * Converts numbers 0-30 into Indonesian words for clean pronunciation.
 */
const NUMBER_WORDS_ID: Record<number, string> = {
  0: 'Nol',
  1: 'Satu',
  2: 'Dua',
  3: 'Tiga',
  4: 'Empat',
  5: 'Lima',
  6: 'Enam',
  7: 'Tujuh',
  8: 'Delapan',
  9: 'Sembilan',
  10: 'Sepuluh',
  11: 'Sebelas',
  12: 'Dua belas',
  13: 'Tiga belas',
  14: 'Empat belas',
  15: 'Lima belas',
  16: 'Enam belas',
  17: 'Tujuh belas',
  18: 'Delapan belas',
  19: 'Sembilan belas',
  20: 'Dua puluh',
};

export function formatNumberId(n: number): string {
  if (n in NUMBER_WORDS_ID) return NUMBER_WORDS_ID[n]!;
  if (n > 20 && n < 30) return `Dua puluh ${NUMBER_WORDS_ID[n % 10] || ''}`;
  return n.toString();
}

/**
 * Pure function: formats an umpire-style Indonesian announcement for the current score.
 */
export function generateScoreAnnouncement(
  state: MatchScoreState,
  teamAName: string = 'Tim A',
  teamBName: string = 'Tim B'
): string {
  // 1. Match Winner Announcement
  if (state.matchWinner) {
    const winnerName = state.matchWinner === 'A' ? teamAName : teamBName;
    return `Pertandingan selesai! Pemenang ${winnerName}!`;
  }

  // 2. Set Winner Announcement
  if (state.setWinner) {
    const winnerName = state.setWinner === 'A' ? teamAName : teamBName;
    const scoreA = formatNumberId(state.teamAScore);
    const scoreB = formatNumberId(state.teamBScore);
    return `Set ${state.currentSet} dimenangkan oleh ${winnerName}, ${scoreA} - ${scoreB}.`;
  }

  // 3. Deuce (10-10 or above with tie)
  if (state.teamAScore >= 10 && state.teamBScore >= 10) {
    if (state.teamAScore === state.teamBScore) {
      return `Deus, ${formatNumberId(state.teamAScore)} sama.`;
    }
    const leadingTeam = state.teamAScore > state.teamBScore ? teamAName : teamBName;
    return `Advantage ${leadingTeam}, ${formatNumberId(state.teamAScore)} - ${formatNumberId(state.teamBScore)}.`;
  }

  // 4. Equal Score (e.g. 3-3 => "Tiga sama")
  if (state.teamAScore === state.teamBScore) {
    return `${formatNumberId(state.teamAScore)} sama.`;
  }

  // 5. Game Point Notice (e.g. 10-8)
  const maxScore = Math.max(state.teamAScore, state.teamBScore);
  const isGamePoint = maxScore >= state.targetPoints - 1 && Math.abs(state.teamAScore - state.teamBScore) >= 1;
  const scoreText = `${formatNumberId(state.teamAScore)} - ${formatNumberId(state.teamBScore)}`;

  if (isGamePoint) {
    return `Game point! ${scoreText}.`;
  }

  // 6. Standard Score Announcement (Server announced first or Team A - Team B)
  return `${scoreText}.`;
}

/**
 * Speaks the announcement text using the native Web Speech API.
 */
export function announceVoice(text: string, enabled: boolean = true): void {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  try {
    // Cancel any previous pending announcement so it doesn't queue up
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.05; // natural sports pace
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

