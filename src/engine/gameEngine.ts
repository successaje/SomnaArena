export type Move = 'rock' | 'paper' | 'scissors';

export interface RoundResult {
  round: number;
  move1: Move;
  move2: Move;
  winner: 'player1' | 'player2' | 'tie';
  log: string;
}

export interface MatchState {
  matchId: number;
  tournamentId: number;
  player1: string; // address
  player2: string; // address
  rounds: RoundResult[];
  player1Wins: number;
  player2Wins: number;
  status: 'pending' | 'active' | 'resolved';
  winner: string | null; // address of the winner
}

export const MOVES: Move[] = ['rock', 'paper', 'scissors'];

export const MOVE_NAMES: Record<Move, string> = {
  rock: '⚡ Nano-Rock',
  paper: '🛡️ Plasma-Paper',
  scissors: '⚔️ Laser-Scissors'
};

export const MOVE_BEATS: Record<Move, Move> = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper'
};

/**
 * Resolve a single round of RPS.
 * Returns the winner ('player1', 'player2', or 'tie') and a log message.
 */
export function resolveRound(round: number, move1: Move, move2: Move, p1Name: string, p2Name: string): RoundResult {
  const m1Full = MOVE_NAMES[move1];
  const m2Full = MOVE_NAMES[move2];

  if (move1 === move2) {
    return {
      round,
      move1,
      move2,
      winner: 'tie',
      log: `Round ${round}: Both players deploy ${m1Full}. It's an energy grid lock (TIE)!`
    };
  }

  if (MOVE_BEATS[move1] === move2) {
    return {
      round,
      move1,
      move2,
      winner: 'player1',
      log: `Round ${round}: ${p1Name}'s ${m1Full} overcharges and breaks ${p2Name}'s ${m2Full}! Winner: ${p1Name}`
    };
  } else {
    return {
      round,
      move1,
      move2,
      winner: 'player2',
      log: `Round ${round}: ${p2Name}'s ${m2Full} bypasses and neutralizes ${p1Name}'s ${m1Full}! Winner: ${p2Name}`
    };
  }
}

/**
 * Check if the match is resolved (e.g. someone got 2 wins).
 * Returns updated match state.
 */
export function updateMatchState(match: MatchState, roundRes: RoundResult, p1Name: string, p2Name: string): MatchState {
  const updatedRounds = [...match.rounds, roundRes];
  let p1Wins = match.player1Wins;
  let p2Wins = match.player2Wins;

  if (roundRes.winner === 'player1') p1Wins++;
  if (roundRes.winner === 'player2') p2Wins++;

  let status: MatchState['status'] = 'active';
  let winner: string | null = null;

  // Best of 3: first to 2 wins (or if we hit max 5 rounds to break ties, but first to 2 is standard)
  if (p1Wins >= 2) {
    status = 'resolved';
    winner = match.player1;
  } else if (p2Wins >= 2) {
    status = 'resolved';
    winner = match.player2;
  } else if (updatedRounds.length >= 5) {
    // Tiebreaker fallback if there are many ties
    if (p1Wins > p2Wins) {
      status = 'resolved';
      winner = match.player1;
    } else if (p2Wins > p1Wins) {
      status = 'resolved';
      winner = match.player2;
    } else {
      // Sudden death: whoever wins the next round wins, but for safety, resolve to player1 or player 2
      status = 'resolved';
      winner = p1Wins >= p2Wins ? match.player1 : match.player2;
    }
  }

  return {
    ...match,
    rounds: updatedRounds,
    player1Wins: p1Wins,
    player2Wins: p2Wins,
    status,
    winner
  };
}
