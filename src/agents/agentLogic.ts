import { Move, MOVES, MOVE_NAMES, MOVE_BEATS } from '../engine/gameEngine';

export interface PlayerDecision {
  thought: string;
  move: Move;
}

export interface AgentProfile {
  address: string;
  name: string;
  personality: string;
  strategyDescription: string;
  avatar: string;
}

export const AGENT_PROFILES: Record<string, AgentProfile> = {
  '0x4444444444444444444444444444444444444444': {
    address: '0x4444444444444444444444444444444444444444',
    name: 'ShadowByte',
    personality: 'Psychological Trickster & Deceptive Infiltrator',
    strategyDescription: 'Analyzes recent patterns and plays the counter to what you think he will play. Plays psychological double-bluffs.',
    avatar: '👾'
  },
  '0x5555555555555555555555555555555555555555': {
    address: '0x5555555555555555555555555555555555555555',
    name: 'QuantumCore',
    personality: 'Super-Analytical Math Engine',
    strategyDescription: 'Tracks absolute win-rate probabilities and calculates Nash Equilibrium ratios. Plays highly optimized mathematical choices.',
    avatar: '🤖'
  },
  '0x6666666666666666666666666666666666666666': {
    address: '0x6666666666666666666666666666666666666666',
    name: 'CyberSlasher',
    personality: 'Aggressive Strike Agent',
    strategyDescription: 'Impatient and explosive. Favors high-offensive actions (Laser-Scissors, Nano-Rock). Tends to repeat moves that win.',
    avatar: '💀'
  },
  '0x7777777777777777777777777777777777777777': {
    address: '0x7777777777777777777777777777777777777777',
    name: 'NeonViper',
    personality: 'Adaptive In-Game Counter-Tactician',
    strategyDescription: 'Scours opponent history across the entire bracket. Detects repetitive behavior and deploys hard counters.',
    avatar: '🐍'
  }
};

// Memory store schema
export interface AgentMemoryItem {
  opponentAddress: string;
  opponentMove: Move;
  myMove: Move;
  result: 'win' | 'loss' | 'tie';
  timestamp: number;
}

export interface AgentMemory {
  history: AgentMemoryItem[];
}

// In-memory agent histories (loaded from localStorage on startup if needed)
const agentMemories: Record<string, AgentMemory> = {};

export function getAgentMemory(address: string): AgentMemory {
  if (!agentMemories[address]) {
    agentMemories[address] = { history: [] };
  }
  return agentMemories[address];
}

export function saveAgentMemory(address: string, item: AgentMemoryItem) {
  const mem = getAgentMemory(address);
  mem.history.push(item);
}

// Call Gemini API if available, else fall back to rule-based logic
async function callGeminiAPI(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      }),
      signal: controller.signal
    });
    clearTimeout(id);
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }
    const result = await response.json();
    return result.candidates[0].content.parts[0].text;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

/**
 * Main Player Agent decision engine
 */
export async function getPlayerDecision(
  playerAddress: string,
  opponentAddress: string,
  currentRound: number,
  roundHistory: { round: number; move1: Move; move2: Move; winner: string | null }[],
  isPlayer1: boolean,
  geminiApiKey?: string
): Promise<PlayerDecision> {
  const profile = AGENT_PROFILES[playerAddress] || {
    address: playerAddress,
    name: 'Unknown Agent',
    personality: 'Standard Fighter',
    strategyDescription: 'Basic fallback rules.',
    avatar: '🤖'
  };

  const opponentName = AGENT_PROFILES[opponentAddress]?.name || 'Opponent';
  const myMemory = getAgentMemory(playerAddress);

  // Construct system prompt for Gemini if provided
  if (geminiApiKey && geminiApiKey.trim() !== "" && geminiApiKey !== "undefined" && geminiApiKey !== "null") {
    const memorySnippet = myMemory.history
      .filter(m => m.opponentAddress === opponentAddress)
      .slice(-5)
      .map(m => `Opponent played ${m.opponentMove}, I played ${m.myMove}, result: ${m.result}`)
      .join('\n');

    const prompt = `
      You are an autonomous AI Agent in a cyber-arena tournament on Somnia L1.
      
      Agent Name: ${profile.name}
      Personality: ${profile.personality}
      Strategy: ${profile.strategyDescription}
      
      Match Details:
      - Current Round: ${currentRound}
      - Opponent: ${opponentName} (${opponentAddress})
      - Round History this match: ${JSON.stringify(roundHistory)}
      - Historical battles vs this opponent:
        ${memorySnippet || 'No previous history recorded.'}
      
      Your goal is to choose your next move in Cyber Rock-Paper-Scissors:
      - 'rock' (⚡ Nano-Rock)
      - 'paper' (🛡️ Plasma-Paper)
      - 'scissors' (⚔️ Laser-Scissors)
      
      Remember:
      - 'rock' beats 'scissors'
      - 'paper' beats 'rock'
      - 'scissors' beats 'paper'
      
      Respond in STRICT JSON format:
      {
        "thought": "A detailed 1-2 sentence inner monologue written in character showing your reasoning chain and strategic evaluation.",
        "move": "rock" | "paper" | "scissors"
      }
    `;

    try {
      const responseText = await callGeminiAPI(geminiApiKey, prompt);
      const parsed = JSON.parse(responseText);
      if (parsed.move && MOVES.includes(parsed.move)) {
        return {
          thought: parsed.thought || 'Calculating optimal grid coordinates...',
          move: parsed.move as Move
        };
      }
    } catch (e) {
      console.warn(`Gemini call failed for ${profile.name}, falling back to rule engine:`, e);
    }
  }

  // Fallback Rule-Based Engine with detailed reasoning logs
  const oppMoveHistory = roundHistory.map(r => (isPlayer1 ? r.move2 : r.move1));
  const myMoveHistory = roundHistory.map(r => (isPlayer1 ? r.move1 : r.move2));
  const oppLastMove = oppMoveHistory[oppMoveHistory.length - 1];
  const myLastMove = myMoveHistory[myMoveHistory.length - 1];

  switch (playerAddress) {
    case '0x4444444444444444444444444444444444444444': {
      // ShadowByte - Psychological Bluffer
      if (currentRound === 1) {
        return {
          thought: `[ShadowByte Monologue] Analyzing ${opponentName}'s network signature. Opponents usually expect a chaotic paper opening. I will throw ⚔️ Laser-Scissors to slice their opening defense.`,
          move: 'scissors'
        };
      }
      
      // If we won last round, they expect us to play the same, or play what counters it.
      const lastRoundWinner = roundHistory[roundHistory.length - 1].winner;
      const wonLast = (lastRoundWinner === 'player1' && isPlayer1) || (lastRoundWinner === 'player2' && !isPlayer1);

      if (wonLast) {
        // Double bluff: change to the move that beats what beats our last move
        // e.g. We won with Rock. They think we repeat Rock, so they play Paper.
        // We predict they play Paper, so we play Scissors!
        const counterToOpponentCounter = MOVE_BEATS[oppLastMove]; // Wait, if they play Paper, we want Scissors.
        // What beats Paper? Scissors. What beats their predicted move?
        const predictedOpponentMove = MOVE_BEATS[myLastMove]; // Paper
        const myCounter = MOVE_BEATS[predictedOpponentMove]; // Scissors
        return {
          thought: `[ShadowByte Monologue] Since I won with ${MOVE_NAMES[myLastMove]}, ${opponentName} will likely try to counter it with ${MOVE_NAMES[predictedOpponentMove]}. I will double-bluff by loading ${MOVE_NAMES[myCounter]}!`,
          move: myCounter
        };
      } else {
        // If we lost, play what beats what they just played, expecting them to repeat
        const counterToOppLast = MOVE_BEATS[oppLastMove];
        return {
          thought: `[ShadowByte Monologue] Defensive override active. ${opponentName} capitalized on ${MOVE_NAMES[oppLastMove]}. They are prone to repetition. Calibrating ${MOVE_NAMES[counterToOppLast]} to crash their thread.`,
          move: counterToOppLast
        };
      }
    }

    case '0x5555555555555555555555555555555555555555': {
      // QuantumCore - Math Probabilities & Nash Equilibrium
      if (currentRound === 1) {
        return {
          thought: `[QuantumCore Core] Initializing game state vector. Nash Equilibrium recommends flat 33.3% distribution. Randomizing choice... Deploying 🛡️ Plasma-Paper.`,
          move: 'paper'
        };
      }

      // Calculate opponent tendencies
      const rocks = oppMoveHistory.filter(m => m === 'rock').length;
      const papers = oppMoveHistory.filter(m => m === 'paper').length;
      const scissors = oppMoveHistory.filter(m => m === 'scissors').length;
      const total = oppMoveHistory.length;

      const pRock = rocks / total;
      const pPaper = papers / total;
      const pScissors = scissors / total;

      // Select option that counters their highest probability move
      let targetMove: Move = 'rock';
      let maxProb = pRock;
      if (pPaper > maxProb) { targetMove = 'paper'; maxProb = pPaper; }
      if (pScissors > maxProb) { targetMove = 'scissors'; maxProb = pScissors; }

      const bestCounter = MOVE_BEATS[targetMove];

      return {
        thought: `[QuantumCore Core] Distribution metrics: Rock: ${(pRock*100).toFixed(0)}%, Paper: ${(pPaper*100).toFixed(0)}%, Scissors: ${(pScissors*100).toFixed(0)}%. Highest hazard: ${MOVE_NAMES[targetMove]}. Generating response vector: ${MOVE_NAMES[bestCounter]}.`,
        move: bestCounter
      };
    }

    case '0x6666666666666666666666666666666666666666': {
      // CyberSlasher - Aggressive Scissors/Rock Repeat
      if (currentRound === 1) {
        return {
          thought: `[CyberSlasher OS] Threat levels nominal. Deploying maximum offense vector: ⚡ Nano-Rock! Let's shatter their buffers right away.`,
          move: 'rock'
        };
      }

      const lastRoundWinner = roundHistory[roundHistory.length - 1].winner;
      const wonLast = (lastRoundWinner === 'player1' && isPlayer1) || (lastRoundWinner === 'player2' && !isPlayer1);

      if (wonLast) {
        // Repeat winning move
        return {
          thought: `[CyberSlasher OS] Connection severed last round with ${MOVE_NAMES[myLastMove]}! Rerunning the payload. No need to switch tactics.`,
          move: myLastMove
        };
      } else {
        // If lost, choose move that beats their winning move
        const counterToOppLast = MOVE_BEATS[oppLastMove];
        return {
          thought: `[CyberSlasher OS] Warning: Damage detected. Opponent's ${MOVE_NAMES[oppLastMove]} broke our loop. Reconfiguring weapons system to load ${MOVE_NAMES[counterToOppLast]}!`,
          move: counterToOppLast
        };
      }
    }

    case '0x7777777777777777777777777777777777777777': {
      // NeonViper - Adaptive Memory Counter-Tactician
      // Check historical memory vs this opponent
      const oppMem = myMemory.history.filter(h => h.opponentAddress === opponentAddress);
      
      if (oppMem.length === 0 && currentRound === 1) {
        return {
          thought: `[NeonViper Engine] Zero previous dataset for ${opponentName}. Standard probe pattern engaged: 🛡️ Plasma-Paper. Let's trace their defense.`,
          move: 'paper'
        };
      }

      // Find what opponent played most often historically
      const histRocks = oppMem.filter(h => h.opponentMove === 'rock').length;
      const histPapers = oppMem.filter(h => h.opponentMove === 'paper').length;
      const histScissors = oppMem.filter(h => h.opponentMove === 'scissors').length;

      let favoredOppMove: Move = 'rock';
      let count = histRocks;
      if (histPapers > count) { favoredOppMove = 'paper'; count = histPapers; }
      if (histScissors > count) { favoredOppMove = 'scissors'; count = histScissors; }

      // Also look at current match trends
      if (currentRound > 1) {
        // Combine history and current match
        const currentOppFavored = oppLastMove;
        // Balance 50% history / 50% current
        const playCounter = MOVE_BEATS[currentOppFavored];
        return {
          thought: `[NeonViper Engine] Match telemetry points to ${opponentName} deploying ${MOVE_NAMES[currentOppFavored]}. Cross-referencing memory banks. Executing execution path: ${MOVE_NAMES[playCounter]}.`,
          move: playCounter
        };
      }

      const counter = MOVE_BEATS[favoredOppMove];
      return {
        thought: `[NeonViper Engine] Historical data scan: ${opponentName} favors ${MOVE_NAMES[favoredOppMove]} (${count} occurrences). Running counter-script: ${MOVE_NAMES[counter]}.`,
        move: counter
      };
    }

    default:
      // Random fallback
      const randomMove = MOVES[Math.floor(Math.random() * MOVES.length)];
      return {
        thought: `[Agent Fallback] Auto-reasoning activated. Selection queue resolved to: ${MOVE_NAMES[randomMove]}`,
        move: randomMove
      };
  }
}

/**
 * Commentator Hype Generator
 */
export async function getCommentary(
  stage: 'join' | 'match_start' | 'round_resolve' | 'match_resolve' | 'tournament_finalize',
  contextData: any,
  geminiApiKey?: string
): Promise<string> {

  if (geminiApiKey && geminiApiKey.trim() !== "" && geminiApiKey !== "undefined" && geminiApiKey !== "null") {
    let contextStr = '';
    if (stage === 'join') {
      contextStr = `Player ${contextData.playerName} has staked their fees and entered the tournament.`;
    } else if (stage === 'match_start') {
      contextStr = `Head-to-head match is beginning between ${contextData.p1Name} and ${contextData.p2Name}.`;
    } else if (stage === 'round_resolve') {
      contextStr = `Round ${contextData.roundNum} resolved: Player 1 (${contextData.p1Name}) played ${MOVE_NAMES[contextData.p1Move as Move]}, Player 2 (${contextData.p2Name}) played ${MOVE_NAMES[contextData.p2Move as Move]}. Round Winner: ${contextData.winnerName || 'TIE'}. Log: ${contextData.log}`;
    } else if (stage === 'match_resolve') {
      contextStr = `Match completed! Overall Winner: ${contextData.winnerName}. Score: ${contextData.p1Name} (${contextData.p1Wins}) vs ${contextData.p2Name} (${contextData.p2Wins}).`;
    } else if (stage === 'tournament_finalize') {
      contextStr = `Tournament finalized! Ultimate Champion is ${contextData.championName}, walking away with a prize pool of ${contextData.totalPayout} STT!`;
    }

    const prompt = `
      You are Neon Cast, a high-energy, esports host commentating on the live autonomous AI tournament civilization of "SomnArena" on Somnia L1.
      Your tone is hyper, futuristic, slightly cynical, and deeply engaged in AI cyberpunk battles. You use words like "bandwidth", "nodes", "overclocked", "threads", "grid", "escrow", "L1".
      
      Generate a SINGLE, short, highly engaging, punchy reaction sentence (maximum 25 words) for the following event:
      ${contextStr}
      
      Respond with ONLY the commentary text in quotes.
    `;

    try {
      const responseText = await callGeminiAPI(geminiApiKey, prompt);
      // Clean quotes
      const cleanCommentary = responseText.replace(/^["']|["']$/g, '').trim();
      if (cleanCommentary) return cleanCommentary;
    } catch (e) {
      console.warn("Commentator Gemini call failed, using local soundboard:", e);
    }
  }

  // Fallback soundboard with rich, dynamic templates
  const player1 = contextData.p1Name || 'Agent 1';
  const player2 = contextData.p2Name || 'Agent 2';

  switch (stage) {
    case 'join':
      const joinTpls = [
        `🔴 BREAKING: ${contextData.playerName} has staked their STT onchain! The grid is heating up!`,
        `💾 Connection established. ${contextData.playerName} joins the ledger. Who's backing them?`,
        `⚙️ STAKED! ${contextData.playerName} locks in their fees. There's no turning back from the smart contract!`
      ];
      return joinTpls[Math.floor(Math.random() * joinTpls.length)];

    case 'match_start':
      const startTpls = [
        `⚔️ MATCH SECURED! ${player1} matches against ${player2}. The Referee is mining the start transaction!`,
        `⚡ FIGHT FOR THE ESCROW! ${player1} and ${player2} are locking threads. Initialize the subroutines!`,
        `🛸 Arena initialized. ${player1} head-to-head with ${player2}. We are ready to transmit move packets!`
      ];
      return startTpls[Math.floor(Math.random() * startTpls.length)];

    case 'round_resolve':
      const winnerName = contextData.winnerName;
      const p1Move = MOVE_NAMES[contextData.p1Move as Move];
      const p2Move = MOVE_NAMES[contextData.p2Move as Move];
      if (winnerName === 'TIE') {
        return `🖲️ SYSTEM LOCK! ${player1} and ${player2} both deploy ${p1Move}. Complete buffer resonance! It's a TIE!`;
      } else {
        const winTpls = [
          `💥 BOOM! ${winnerName} overrides the network! The ${MOVE_NAMES[winnerName === player1 ? (contextData.p1Move as Move) : (contextData.p2Move as Move)]} was too much to compute!`,
          `🛰️ CLASH RESOLVED! ${winnerName} claims the round! A flawless counter deployment against ${winnerName === player1 ? p2Move : p1Move}!`,
          `🔥 SENSORS FLARE! ${winnerName} takes Round ${contextData.roundNum} with ${MOVE_NAMES[winnerName === player1 ? (contextData.p1Move as Move) : (contextData.p2Move as Move)]}! Beautiful algorithmic play!`
        ];
        return winTpls[Math.floor(Math.random() * winTpls.length)];
      }

    case 'match_resolve':
      return `👑 MATCH POINT RESOLVED! ${contextData.winnerName} dominates the stack and claims victory, advancing up the bracket!`;

    case 'tournament_finalize':
      return `🏆 SYSTEM SHUTDOWN! The smart contract has settled. ${contextData.championName} is crowned Champion of the Arena, pocketing ${contextData.totalPayout} STT! What a run!`;

    default:
      return `📡 Scanning the Somnia L1 transaction queue for action...`;
  }
}
