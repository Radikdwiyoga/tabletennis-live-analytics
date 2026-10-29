export interface ScoreHistoryEntry {
  teamAScore: number;
  teamBScore: number;
  teamASets: number;
  teamBSets: number;
  server: 'A' | 'B';
}

export interface MatchScoreState {
  teamAScore: number;
  teamBScore: number;
  teamASets: number;
  teamBSets: number;
  currentSet: number;
  startingServer: 'A' | 'B';
  currentServer: 'A' | 'B';
  targetPoints: number; // standard 11 points
  isDeuce: boolean;
  setWinner: 'A' | 'B' | null;
  matchWinner: 'A' | 'B' | null;
  history: ScoreHistoryEntry[];
}

/**
 * Calculates current server based on official ITTF rules:
 * - Changes every 2 points scored.
 * - At deuce (>= 10-10), changes every single point.
 */
export function calculateServer(
  scoreA: number,
  scoreB: number,
  startingServer: 'A' | 'B'
): 'A' | 'B' {
  const total = scoreA + scoreB;
  const otherServer = startingServer === 'A' ? 'B' : 'A';

  // Deuce condition: both players at 10 or more points
  if (scoreA >= 10 && scoreB >= 10) {
    const deucePoints = total - 20;
    return deucePoints % 2 === 0 ? startingServer : otherServer;
  }

  // Normal play: changes every 2 points
  const cycle = Math.floor(total / 2);
  return cycle % 2 === 0 ? startingServer : otherServer;
}

export function createInitialScore(
  targetPoints: number = 11,
  startingServer: 'A' | 'B' = 'A'
): MatchScoreState {
  return {
    teamAScore: 0,
    teamBScore: 0,
    teamASets: 0,
    teamBSets: 0,
    currentSet: 1,
    startingServer,
    currentServer: startingServer,
    targetPoints,
    isDeuce: false,
    setWinner: null,
    matchWinner: null,
    history: [],
  };
}

/**
 * Adds a point to Team A or Team B, checking ITTF win conditions.
 */
export function addPoint(
  state: MatchScoreState,
  team: 'A' | 'B',
  bestOfSets: number = 3
): MatchScoreState {
  // If match already won, do not add points until reset
  if (state.matchWinner) return state;

  const currentHistory: ScoreHistoryEntry = {
    teamAScore: state.teamAScore,
    teamBScore: state.teamBScore,
    teamASets: state.teamASets,
    teamBSets: state.teamBSets,
    server: state.currentServer,
  };

  let newScoreA = state.teamAScore + (team === 'A' ? 1 : 0);
  let newScoreB = state.teamBScore + (team === 'B' ? 1 : 0);
  let newSetsA = state.teamASets;
  let newSetsB = state.teamBSets;
  let setWinner: 'A' | 'B' | null = null;
  let matchWinner: 'A' | 'B' | null = null;
  let currentSet = state.currentSet;

  const isDeuce = newScoreA >= state.targetPoints - 1 && newScoreB >= state.targetPoints - 1;

  // Check set win condition: at least targetPoints and ahead by >= 2
  const maxScore = Math.max(newScoreA, newScoreB);
  const diff = Math.abs(newScoreA - newScoreB);

  if (maxScore >= state.targetPoints && diff >= 2) {
    setWinner = newScoreA > newScoreB ? 'A' : 'B';
    if (setWinner === 'A') newSetsA++;
    else newSetsB++;

    // Check match win condition (e.g. first to 2 sets in best of 3)
    const setsToWin = Math.ceil(bestOfSets / 2);
    if (newSetsA >= setsToWin) {
      matchWinner = 'A';
    } else if (newSetsB >= setsToWin) {
      matchWinner = 'B';
    }
  }

  const server = calculateServer(newScoreA, newScoreB, state.startingServer);

  return {
    ...state,
    teamAScore: newScoreA,
    teamBScore: newScoreB,
    teamASets: newSetsA,
    teamBSets: newSetsB,
    currentSet,
    currentServer: server,
    isDeuce,
    setWinner,
    matchWinner,
    history: [...state.history, currentHistory],
  };
}

/**
 * Starts the next set after a set has been won.
 */
export function startNextSet(state: MatchScoreState): MatchScoreState {
  if (!state.setWinner || state.matchWinner) return state;

  // Switch starting server for the next set
  const nextStartingServer = state.startingServer === 'A' ? 'B' : 'A';

  return {
    ...state,
    teamAScore: 0,
    teamBScore: 0,
    currentSet: state.currentSet + 1,
    startingServer: nextStartingServer,
    currentServer: nextStartingServer,
    isDeuce: false,
    setWinner: null,
  };
}

/**
 * Reverts the last point (Undo).
 */
export function undoPoint(state: MatchScoreState): MatchScoreState {
  if (state.history.length === 0) return state;

  const lastEntry = state.history[state.history.length - 1]!;
  const newHistory = state.history.slice(0, -1);

  const isDeuce =
    lastEntry.teamAScore >= state.targetPoints - 1 &&
    lastEntry.teamBScore >= state.targetPoints - 1;

  return {
    ...state,
    teamAScore: lastEntry.teamAScore,
    teamBScore: lastEntry.teamBScore,
    teamASets: lastEntry.teamASets,
    teamBSets: lastEntry.teamBSets,
    currentServer: lastEntry.server,
    isDeuce,
    setWinner: null,
    matchWinner: null,
    history: newHistory,
  };
}

/**
 * Resets the entire match to 0-0.
 */
export function resetMatch(state: MatchScoreState): MatchScoreState {
  return createInitialScore(state.targetPoints, state.startingServer);
}

