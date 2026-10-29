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
  targetPoints: 11 | 21; // 11 points (modern) or 21 points (classic)
  isDeuce: boolean;
  setWinner: 'A' | 'B' | null;
  matchWinner: 'A' | 'B' | null;
  history: ScoreHistoryEntry[];
}

/**
 * Calculates current server based on table tennis rules:
 * - 11-point system: changes every 2 points (deuce at 10-10: every 1 point).
 * - 21-point system (classic): changes every 5 points (deuce at 20-20: every 1 point).
 */
export function calculateServer(
  scoreA: number,
  scoreB: number,
  startingServer: 'A' | 'B',
  targetPoints: 11 | 21 = 11
): 'A' | 'B' {
  const total = scoreA + scoreB;
  const otherServer = startingServer === 'A' ? 'B' : 'A';
  const deuceThreshold = targetPoints - 1; // 10 for 11-point, 20 for 21-point

  // Deuce condition: both players at or above threshold
  if (scoreA >= deuceThreshold && scoreB >= deuceThreshold) {
    const deucePoints = total - deuceThreshold * 2;
    return deucePoints % 2 === 0 ? startingServer : otherServer;
  }

  // Normal play: changes every 2 points (11-pt) or every 5 points (21-pt)
  const interval = targetPoints === 21 ? 5 : 2;
  const cycle = Math.floor(total / interval);
  return cycle % 2 === 0 ? startingServer : otherServer;
}

export function createInitialScore(
  targetPoints: 11 | 21 = 11,
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
 * Switches target points mode (11 vs 21 points) and updates server calculation.
 */
export function setTargetPoints(
  state: MatchScoreState,
  newTarget: 11 | 21
): MatchScoreState {
  const isDeuce =
    state.teamAScore >= newTarget - 1 && state.teamBScore >= newTarget - 1;
  const server = calculateServer(
    state.teamAScore,
    state.teamBScore,
    state.startingServer,
    newTarget
  );

  return {
    ...state,
    targetPoints: newTarget,
    currentServer: server,
    isDeuce,
  };
}

/**
 * Adds a point to Team A or Team B, checking win conditions.
 */
export function addPoint(
  state: MatchScoreState,
  team: 'A' | 'B',
  bestOfSets: number = 3
): MatchScoreState {
  if (state.matchWinner) return state;

  const currentHistory: ScoreHistoryEntry = {
    teamAScore: state.teamAScore,
    teamBScore: state.teamBScore,
    teamASets: state.teamASets,
    teamBSets: state.teamBSets,
    server: state.currentServer,
  };

  const newScoreA = state.teamAScore + (team === 'A' ? 1 : 0);
  const newScoreB = state.teamBScore + (team === 'B' ? 1 : 0);
  let newSetsA = state.teamASets;
  let newSetsB = state.teamBSets;
  let setWinner: 'A' | 'B' | null = null;
  let matchWinner: 'A' | 'B' | null = null;

  const deuceThreshold = state.targetPoints - 1;
  const isDeuce = newScoreA >= deuceThreshold && newScoreB >= deuceThreshold;

  // Check set win condition: at least targetPoints and ahead by >= 2
  const maxScore = Math.max(newScoreA, newScoreB);
  const diff = Math.abs(newScoreA - newScoreB);

  if (maxScore >= state.targetPoints && diff >= 2) {
    setWinner = newScoreA > newScoreB ? 'A' : 'B';
    if (setWinner === 'A') newSetsA++;
    else newSetsB++;

    const setsToWin = Math.ceil(bestOfSets / 2);
    if (newSetsA >= setsToWin) {
      matchWinner = 'A';
    } else if (newSetsB >= setsToWin) {
      matchWinner = 'B';
    }
  }

  const server = calculateServer(
    newScoreA,
    newScoreB,
    state.startingServer,
    state.targetPoints
  );

  return {
    ...state,
    teamAScore: newScoreA,
    teamBScore: newScoreB,
    teamASets: newSetsA,
    teamBSets: newSetsB,
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

  const deuceThreshold = state.targetPoints - 1;
  const isDeuce =
    lastEntry.teamAScore >= deuceThreshold &&
    lastEntry.teamBScore >= deuceThreshold;

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
