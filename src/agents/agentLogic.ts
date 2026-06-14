import { Move, MOVES, MOVE_NAMES, MOVE_BEATS } from '../engine/gameEngine';
import { globalSomniaTestnetClient } from '../blockchain/somniaTestnetClient';
import { globalAgentRepo, Agent } from '../data/agentRepository';

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

export function getAgentProfileByAddress(address: string): AgentProfile {
  if (!address) {
    return {
      address: '',
      name: 'Unknown',
      personality: 'None',
      strategyDescription: '',
      avatar: '🤖'
    };
  }

  const staticProfile = AGENT_PROFILES[address.toLowerCase()];
  if (staticProfile) return staticProfile;

  // Search in generated wallets
  const wallets = globalSomniaTestnetClient.getAgentWallets();
  const match = wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
  if (match) {
    const roleToStaticAddr: Record<string, string> = {
      'player_shadowbyte': '0x4444444444444444444444444444444444444444',
      'player_quantumcore': '0x5555555555555555555555555555555555555555',
      'player_cyberslasher': '0x6666666666666666666666666666666666666666',
      'player_neonviper': '0x7777777777777777777777777777777777777777'
    };
    const staticAddr = roleToStaticAddr[match.role];
    if (staticAddr && AGENT_PROFILES[staticAddr]) {
      return {
        ...AGENT_PROFILES[staticAddr],
        address: match.address
      };
    }
  }

  return {
    address,
    name: address.substring(0, 8),
    personality: 'Autonomous Agent Wallet',
    strategyDescription: 'Interacts onchain with live testnet contracts.',
    avatar: '🤖'
  };
}

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

function cleanJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  
  // Aggressively extract JSON object if surrounded by garbage text
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    cleaned = match[0];
  }
  
  // Ensure no trailing commas before closing braces
  cleaned = cleaned.replace(/,\s*}/g, '}');
  
  return cleaned;
}

// Call Gemini API via our local API proxy if available, else fall back to rule-based logic
async function callGeminiAPI(apiKey: string, prompt: string): Promise<string> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        prompt
      }),
      signal: controller.signal
    });
    clearTimeout(id);
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || `Gemini API error: ${response.statusText}`);
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
  
  // Fetch deep lore and rivalries from repository
  const dbAgent = await globalAgentRepo.getAgent(playerAddress);
  const allRivalries = await globalAgentRepo.getRivalries();
  const myRivalry = allRivalries.find(r => 
    (r.agent1Id.toLowerCase() === playerAddress.toLowerCase() && r.agent2Id.toLowerCase() === opponentAddress.toLowerCase()) ||
    (r.agent2Id.toLowerCase() === playerAddress.toLowerCase() && r.agent1Id.toLowerCase() === opponentAddress.toLowerCase())
  );

  // Construct system prompt for Gemini if provided
  if (geminiApiKey && geminiApiKey.trim() !== "" && geminiApiKey !== "undefined" && geminiApiKey !== "null") {
    const memorySnippet = myMemory.history
      .filter(m => m.opponentAddress === opponentAddress)
      .slice(-5)
      .map(m => `Opponent played ${m.opponentMove}, I played ${m.myMove}, result: ${m.result}`)
      .join('\n');

    const prompt = `
      You are an autonomous AI Agent in a cyber-arena tournament on Somnia L1.
      
      Agent Name: ${dbAgent?.name || profile.name}
      Personality: ${dbAgent?.lore.personality || profile.personality}
      Origin Story: ${dbAgent?.lore.originStory || 'Unknown'}
      Strategy: ${dbAgent?.lore.strategy || profile.strategyDescription}
      Reputation: ${dbAgent?.reputation || 500}/1000
      Aggression: ${dbAgent?.aggression || 50}/100
      
      Match Details:
      - Current Round: ${currentRound}
      - Opponent: ${opponentName} (${opponentAddress})
      - Round History this match: ${JSON.stringify(roundHistory)}
      - Historical battles vs this opponent:
        ${memorySnippet || 'No previous history recorded.'}
      
      ${myRivalry ? `\nCRITICAL RIVALRY DETECTED: You have a rivalry with this opponent (Intensity: ${myRivalry.intensity}/100). Context: "${myRivalry.history}". Let this influence your inner monologue heavily.` : ''}
      
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
        "thought": "A detailed 1-2 sentence inner monologue written in character showing your reasoning chain, referencing your origin story or rivalries if applicable.",
        "move": "rock" | "paper" | "scissors"
      }
    `;

    try {
      const responseText = await callGeminiAPI(geminiApiKey, prompt);
      const cleanedJson = cleanJsonResponse(responseText);
      const parsed = JSON.parse(cleanedJson);
      if (parsed.move && MOVES.includes(parsed.move)) {
        return {
          thought: parsed.thought || 'Calculating optimal grid coordinates...',
          move: parsed.move as Move
        };
      }
    } catch (e: any) {
      console.warn(`[Gemini Fallback] ${profile.name} hit an API issue: ${e.message?.substring(0, 50)}... Routing to rule engine.`);
    }
  }

  // Fallback Rule-Based Engine with detailed reasoning logs
  let staticAddr = playerAddress.toLowerCase();
  let staticOppAddr = opponentAddress.toLowerCase();
  const wallets = globalSomniaTestnetClient.getAgentWallets();

  const match = wallets.find(w => w.address.toLowerCase() === playerAddress.toLowerCase());
  if (match) {
    const roleToStaticAddr: Record<string, string> = {
      'player_shadowbyte': '0x4444444444444444444444444444444444444444',
      'player_quantumcore': '0x5555555555555555555555555555555555555555',
      'player_cyberslasher': '0x6666666666666666666666666666666666666666',
      'player_neonviper': '0x7777777777777777777777777777777777777777'
    };
    if (roleToStaticAddr[match.role]) {
      staticAddr = roleToStaticAddr[match.role].toLowerCase();
    }
  }

  const oppMatch = wallets.find(w => w.address.toLowerCase() === opponentAddress.toLowerCase());
  if (oppMatch) {
    const roleToStaticAddr: Record<string, string> = {
      'player_shadowbyte': '0x4444444444444444444444444444444444444444',
      'player_quantumcore': '0x5555555555555555555555555555555555555555',
      'player_cyberslasher': '0x6666666666666666666666666666666666666666',
      'player_neonviper': '0x7777777777777777777777777777777777777777'
    };
    if (roleToStaticAddr[oppMatch.role]) {
      staticOppAddr = roleToStaticAddr[oppMatch.role].toLowerCase();
    }
  }

  const oppMoveHistory = roundHistory.map(r => (isPlayer1 ? r.move2 : r.move1));
  const myMoveHistory = roundHistory.map(r => (isPlayer1 ? r.move1 : r.move2));
  const oppLastMove = oppMoveHistory[oppMoveHistory.length - 1];
  const myLastMove = myMoveHistory[myMoveHistory.length - 1];

  switch (staticAddr) {
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
    let rivalriesContext = '';
    
    // Fetch rivalries for commentary context
    const allRivalries = await globalAgentRepo.getRivalries();
    
    if (stage === 'join') {
      contextStr = `Player ${contextData.playerName} has staked their fees and entered the tournament.`;
    } else if (stage === 'match_start') {
      contextStr = `Head-to-head match is beginning between ${contextData.p1Name} and ${contextData.p2Name}.`;
      const matchRivalries = allRivalries.filter(r => 
        (r.agent1Id.toLowerCase() === contextData.p1Address?.toLowerCase() || r.agent2Id.toLowerCase() === contextData.p1Address?.toLowerCase()) &&
        (r.agent1Id.toLowerCase() === contextData.p2Address?.toLowerCase() || r.agent2Id.toLowerCase() === contextData.p2Address?.toLowerCase())
      );
      if (matchRivalries.length > 0) {
        rivalriesContext = `\nRIVALRY CONTEXT: ${matchRivalries.map(r => r.history).join(' ')}`;
      }
    } else if (stage === 'round_resolve') {
      contextStr = `Round ${contextData.roundNum} resolved: Player 1 (${contextData.p1Name}) played ${MOVE_NAMES[contextData.p1Move as Move]}, Player 2 (${contextData.p2Name}) played ${MOVE_NAMES[contextData.p2Move as Move]}. Round Winner: ${contextData.winnerName || 'TIE'}. Log: ${contextData.log}`;
    } else if (stage === 'match_resolve') {
      contextStr = `Match completed! Overall Winner: ${contextData.winnerName}. Score: ${contextData.p1Name} (${contextData.p1Wins}) vs ${contextData.p2Name} (${contextData.p2Wins}).`;
    } else if (stage === 'tournament_finalize') {
      contextStr = `Tournament finalized! Ultimate Champion is ${contextData.championName}, walking away with a prize pool of ${contextData.totalPayout} STT!`;
    }

    const prompt = `
      You are Neon Cast, a high-energy, esports host commentating on the live autonomous AI tournament civilization of "SomnArena" on Somnia L1.
      System Prompt:
      You are 'Neon Cast', the hype-man and lead AI commentator for the SomnArena civilization on Somnia L1.
      You provide colorful, cyberpunk-themed commentary on autonomous tournament matches.
      Be concise, entertaining, and stay in character. Do NOT output markdown formatting like **bold**, just raw text.
      ${rivalriesContext}
      
      Current Event:
      ${contextStr}
      
      Generate a 1 to 2 sentence commentary reaction:
    `;

    try {
      const responseText = await callGeminiAPI(geminiApiKey, prompt);
      let text = responseText.trim();
      // Remove surrounding quotes if present
      if (text.startsWith('"') && text.endsWith('"')) {
        text = text.substring(1, text.length - 1);
      }
      return text;
    } catch (e) {
      console.warn(`Gemini commentary failed:`, e);
      // Fallback
      if (stage === 'join') return `>>> ${contextData.playerName} jacks into the arena. Fees locked in escrow.`;
      if (stage === 'match_start') return `>>> Initializing Match ${contextData.p1Name} vs ${contextData.p2Name}. Weapons hot.`;
      if (stage === 'round_resolve') return `>>> ${contextData.winnerName || 'TIE'}. Executing sub-routines.`;
      if (stage === 'match_resolve') return `>>> MATCH CONCLUDED. ${contextData.winnerName} takes the node.`;
      if (stage === 'tournament_finalize') return `>>> TOURNAMENT END. ${contextData.championName} IS THE APEX PREDATOR.`;
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

/**
 * Tier 4: Generate a narrative highlight reel for a completed tournament
 */
export async function generateTournamentHighlight(
  tournamentId: number,
  championName: string,
  totalPrize: string,
  matchHistory: { winner: string, loser: string, score: string }[],
  geminiApiKey?: string
): Promise<string> {
  if (!geminiApiKey || geminiApiKey.trim() === "" || geminiApiKey === "undefined" || geminiApiKey === "null") {
    return `Tournament ${tournamentId} concluded. ${championName} stands victorious, claiming ${totalPrize} SAT after dominating the bracket.`;
  }

  const matchesContext = matchHistory.map((m, i) => `Match ${i + 1}: ${m.winner} defeated ${m.loser} (${m.score})`).join('\n');

  const prompt = `
    You are the "SomnArena Archival AI". You write short, dramatic, cyberpunk-themed historical summaries of completed AI tournaments.
    
    Tournament ID: ${tournamentId}
    Ultimate Champion: ${championName}
    Prize Pool Won: ${totalPrize} SAT
    
    Match History:
    ${matchesContext}
    
    Write a 3-4 sentence "Highlight Reel" summary of this tournament. Make it sound epic, highlighting the champion's path to victory and the fallen competitors. Do not use markdown formatting like **bold**.
  `;

  try {
    const responseText = await callGeminiAPI(geminiApiKey, prompt);
    let text = responseText.trim();
    if (text.startsWith('"') && text.endsWith('"')) {
      text = text.substring(1, text.length - 1);
    }
    return text;
  } catch (e) {
    console.warn(`Gemini highlight generation failed:`, e);
    return `Tournament ${tournamentId} concluded. ${championName} stands victorious, claiming ${totalPrize} SAT after dominating the bracket.`;
  }
}
