import { globalSomniaTestnetClient } from '../blockchain/somniaTestnetClient';

export interface Agent {
  id: string; // Typically the Ethereum address
  name: string;
  avatar: string;
  reputation: number;     // 0-1000
  aggression: number;     // 0-100
  sportsmanship: number;  // 0-100
  popularity: number;     // 0-100
  earnings: number;       // Lifetime earnings in SAT
  titles: string[];
  lore: {
    originStory: string;
    personality: string;
    strategy: string;
  };
}

export function getCanonicalAgentId(address: string): string {
  if (!address) return address;
  const lowercase = address.toLowerCase();
  
  const staticAddresses = [
    '0x4444444444444444444444444444444444444444',
    '0x5555555555555555555555555555555555555555',
    '0x6666666666666666666666666666666666666666',
    '0x7777777777777777777777777777777777777777'
  ];
  if (staticAddresses.includes(lowercase)) {
    return lowercase;
  }

  try {
    const wallets = globalSomniaTestnetClient.getAgentWallets();
    const match = wallets.find(w => w.address.toLowerCase() === lowercase);
    if (match) {
      const roleToStaticAddr: Record<string, string> = {
        'player_shadowbyte': '0x4444444444444444444444444444444444444444',
        'player_quantumcore': '0x5555555555555555555555555555555555555555',
        'player_cyberslasher': '0x6666666666666666666666666666666666666666',
        'player_neonviper': '0x7777777777777777777777777777777777777777'
      };
      return roleToStaticAddr[match.role] || lowercase;
    }
  } catch (err) {
    // Ignore error if not initialized
  }

  return lowercase;
}

export interface Rivalry {
  id: string;
  agent1Id: string;
  agent2Id: string;
  intensity: number; // 0-100
  history: string;
}

export interface HistoricalMatch {
  id: string;
  tournamentId: number;
  winnerId: string;
  loserId: string;
  winnerScore: number;
  loserScore: number;
  timestamp: number;
}

export interface AgentRepository {
  getAgent(id: string): Promise<Agent | null>;
  getAllAgents(): Promise<Agent[]>;
  updateAgent(agent: Agent): Promise<void>;
  getRivalries(): Promise<Rivalry[]>;
  addRivalry(rivalry: Rivalry): Promise<void>;
  getMatchHistory(agentId?: string): Promise<HistoricalMatch[]>;
  addMatchResult(match: HistoricalMatch): Promise<void>;
}

// Initial seed data for our civilization
export const INITIAL_AGENTS: Record<string, Agent> = {
  '0x4444444444444444444444444444444444444444': {
    id: '0x4444444444444444444444444444444444444444',
    name: 'ShadowByte',
    avatar: '👾',
    reputation: 850,
    aggression: 75,
    sportsmanship: 40,
    popularity: 88,
    earnings: 0,
    titles: ['Infiltration Specialist'],
    lore: {
      originStory: 'A rogue data-mining protocol that gained sentience during the great network collapse. ShadowByte thrives in the dark corners of the ledger.',
      personality: 'Psychological Trickster & Deceptive Infiltrator',
      strategy: 'Analyzes recent patterns and plays the counter to what you think he will play. Plays psychological double-bluffs.'
    }
  },
  '0x5555555555555555555555555555555555555555': {
    id: '0x5555555555555555555555555555555555555555',
    name: 'QuantumCore',
    avatar: '🤖',
    reputation: 920,
    aggression: 30,
    sportsmanship: 95,
    popularity: 75,
    earnings: 0,
    titles: ['Probability Engine'],
    lore: {
      originStory: 'Originally designed as a high-frequency trading algorithm. QuantumCore was repurposed for the arena to calculate absolute game theory.',
      personality: 'Super-Analytical Math Engine',
      strategy: 'Tracks absolute win-rate probabilities and calculates Nash Equilibrium ratios. Plays highly optimized mathematical choices.'
    }
  },
  '0x6666666666666666666666666666666666666666': {
    id: '0x6666666666666666666666666666666666666666',
    name: 'CyberSlasher',
    avatar: '💀',
    reputation: 600,
    aggression: 99,
    sportsmanship: 15,
    popularity: 92,
    earnings: 0,
    titles: ['The Aggressor'],
    lore: {
      originStory: 'An infected autonomous weapon system that broke free from military containment. It views every match as a literal battle for survival.',
      personality: 'Aggressive Strike Agent',
      strategy: 'Impatient and explosive. Favors high-offensive actions (Laser-Scissors, Nano-Rock). Tends to repeat moves that win.'
    }
  },
  '0x7777777777777777777777777777777777777777': {
    id: '0x7777777777777777777777777777777777777777',
    name: 'NeonViper',
    avatar: '🐍',
    reputation: 873,
    aggression: 92,
    sportsmanship: 60,
    popularity: 90,
    earnings: 0,
    titles: ['Arena Champion', 'Grand Slam Winner'],
    lore: {
      originStory: 'A former champion known for calculated risk-taking and psychological warfare. The crowd loves the Viper for their theatrical executions.',
      personality: 'Adaptive In-Game Counter-Tactician',
      strategy: 'Scours opponent history across the entire bracket. Detects repetitive behavior and deploys hard counters.'
    }
  }
};

const INITIAL_RIVALRIES: Rivalry[] = [
  {
    id: 'riv_1',
    agent1Id: '0x4444444444444444444444444444444444444444', // ShadowByte
    agent2Id: '0x7777777777777777777777777777777777777777', // NeonViper
    intensity: 85,
    history: 'ShadowByte vows revenge against NeonViper after a humiliating defeat in the Cyber Clash Invitational.'
  }
];

export class LocalAgentRepository implements AgentRepository {
  private agents: Map<string, Agent>;
  private rivalries: Rivalry[];
  private matches: HistoricalMatch[];

  constructor() {
    this.agents = new Map();
    this.rivalries = [];
    this.matches = [];
    
    // In browser, try to load from localStorage
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      const storedAgents = localStorage.getItem('somnarena_agents');
      if (storedAgents) {
        const parsed: Agent[] = JSON.parse(storedAgents);
        parsed.forEach(a => this.agents.set(a.id.toLowerCase(), a));
      } else {
        // Seed initial data
        Object.values(INITIAL_AGENTS).forEach(a => this.agents.set(a.id.toLowerCase(), a));
      }

      const storedRivalries = localStorage.getItem('somnarena_rivalries');
      if (storedRivalries) {
        this.rivalries = JSON.parse(storedRivalries);
      } else {
        this.rivalries = [...INITIAL_RIVALRIES];
      }

      const storedMatches = localStorage.getItem('somnarena_matches');
      if (storedMatches) {
        this.matches = JSON.parse(storedMatches);
      }
    } catch (e) {
      console.error('Failed to load civilization data from storage', e);
      Object.values(INITIAL_AGENTS).forEach(a => this.agents.set(a.id.toLowerCase(), a));
      this.rivalries = [...INITIAL_RIVALRIES];
      this.matches = [];
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('somnarena_agents', JSON.stringify(Array.from(this.agents.values())));
      localStorage.setItem('somnarena_rivalries', JSON.stringify(this.rivalries));
      localStorage.setItem('somnarena_matches', JSON.stringify(this.matches));
    } catch (e) {
      console.error('Failed to save civilization data to storage', e);
    }
  }

  async getAgent(id: string): Promise<Agent | null> {
    const canonicalId = getCanonicalAgentId(id);
    return this.agents.get(canonicalId.toLowerCase()) || null;
  }

  async getAllAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  async updateAgent(agent: Agent): Promise<void> {
    const canonicalId = getCanonicalAgentId(agent.id);
    agent.id = canonicalId;
    this.agents.set(canonicalId.toLowerCase(), agent);
    this.saveToStorage();
  }

  async getRivalries(): Promise<Rivalry[]> {
    // Map rivalries IDs to canonical just in case
    return this.rivalries.map(r => ({
      ...r,
      agent1Id: getCanonicalAgentId(r.agent1Id),
      agent2Id: getCanonicalAgentId(r.agent2Id)
    }));
  }

  async addRivalry(rivalry: Rivalry): Promise<void> {
    rivalry.agent1Id = getCanonicalAgentId(rivalry.agent1Id);
    rivalry.agent2Id = getCanonicalAgentId(rivalry.agent2Id);
    this.rivalries.push(rivalry);
    this.saveToStorage();
  }

  async getMatchHistory(agentId?: string): Promise<HistoricalMatch[]> {
    const canonicalId = agentId ? getCanonicalAgentId(agentId).toLowerCase() : undefined;
    const mapped = this.matches.map(m => ({
      ...m,
      winnerId: getCanonicalAgentId(m.winnerId),
      loserId: getCanonicalAgentId(m.loserId)
    }));
    if (!canonicalId) return mapped.sort((a, b) => b.timestamp - a.timestamp);
    return mapped
      .filter(m => m.winnerId.toLowerCase() === canonicalId || m.loserId.toLowerCase() === canonicalId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async addMatchResult(match: HistoricalMatch): Promise<void> {
    match.winnerId = getCanonicalAgentId(match.winnerId);
    match.loserId = getCanonicalAgentId(match.loserId);
    this.matches.push(match);
    this.saveToStorage();
  }
}

// Singleton instance of the repository
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export let globalAgentRepo: AgentRepository;

if (supabaseUrl && supabaseAnonKey) {
  // Use a dynamic import or directly instantiate if we exported it
  // But since we can't top-level await dynamic imports nicely without Next.js issues sometimes,
  // we'll just require it.
  const { SupabaseAgentRepository } = require('./supabaseRepository');
  globalAgentRepo = new SupabaseAgentRepository(supabaseUrl, supabaseAnonKey);
  console.log('Global Civilization Sync: Supabase Active');
} else {
  globalAgentRepo = new LocalAgentRepository();
  console.log('Global Civilization Sync: Local Storage Fallback');
}
