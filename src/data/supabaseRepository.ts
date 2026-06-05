import { createClient } from '@supabase/supabase-js';
import { Agent, AgentRepository, HistoricalMatch, Rivalry } from './agentRepository';
// Use dynamic require to avoid circular dependencies if any, or just import
import { INITIAL_AGENTS } from './agentRepository';

export class SupabaseAgentRepository implements AgentRepository {
  private supabase;
  private hasSeeded = false;

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  private mapAgentFromDB(row: any): Agent {
    return {
      id: row.id,
      name: row.name,
      avatar: row.avatar,
      reputation: row.reputation,
      aggression: row.aggression,
      sportsmanship: row.sportsmanship,
      popularity: row.popularity,
      earnings: row.earnings,
      titles: row.titles || [],
      lore: {
        originStory: row.origin_story,
        personality: row.personality,
        strategy: row.strategy
      }
    };
  }

  private mapAgentToDB(agent: Agent): any {
    return {
      id: agent.id,
      name: agent.name,
      avatar: agent.avatar,
      reputation: agent.reputation,
      aggression: agent.aggression,
      sportsmanship: agent.sportsmanship,
      popularity: agent.popularity,
      earnings: agent.earnings,
      titles: agent.titles,
      origin_story: agent.lore.originStory,
      personality: agent.lore.personality,
      strategy: agent.lore.strategy
    };
  }

  private async seedDatabaseIfEmpty() {
    if (this.hasSeeded) return;
    this.hasSeeded = true;
    console.log('Seeding Supabase with initial agents...');
    for (const key of Object.keys(INITIAL_AGENTS)) {
      await this.updateAgent(INITIAL_AGENTS[key]);
    }
  }

  async getAgent(id: string): Promise<Agent | null> {
    const { data, error } = await this.supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.warn('Supabase getAgent failed:', error.message);
      return null;
    }

    if (!data) {
      // If table is totally empty, auto-seed and try to return from memory
      await this.seedDatabaseIfEmpty();
      return INITIAL_AGENTS[id.toLowerCase()] || INITIAL_AGENTS[id] || null;
    }

    return this.mapAgentFromDB(data);
  }

  async getAllAgents(): Promise<Agent[]> {
    const { data, error } = await this.supabase
      .from('agents')
      .select('*')
      .order('reputation', { ascending: false });

    if (error) {
      console.warn('Supabase getAllAgents failed:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      await this.seedDatabaseIfEmpty();
      return Object.values(INITIAL_AGENTS).sort((a, b) => b.reputation - a.reputation);
    }
    
    return data.map(this.mapAgentFromDB);
  }

  async updateAgent(agent: Agent): Promise<void> {
    const row = this.mapAgentToDB(agent);
    const { error } = await this.supabase
      .from('agents')
      .upsert(row);
      
    if (error) {
      console.error('Supabase updateAgent failed:', error.message);
    }
  }

  async getRivalries(): Promise<Rivalry[]> {
    const { data, error } = await this.supabase
      .from('rivalries')
      .select('*')
      .order('intensity', { ascending: false });

    if (error || !data) {
      console.warn('Supabase getRivalries failed:', error?.message);
      return [];
    }
    return data.map((r: any) => ({
      id: r.id,
      agent1Id: r.agent1_id,
      agent2Id: r.agent2_id,
      intensity: r.intensity,
      history: r.history
    }));
  }

  async addRivalry(rivalry: Rivalry): Promise<void> {
    const { error } = await this.supabase
      .from('rivalries')
      .upsert({
        id: rivalry.id,
        agent1_id: rivalry.agent1Id,
        agent2_id: rivalry.agent2Id,
        intensity: rivalry.intensity,
        history: rivalry.history
      });

    if (error) {
      console.error('Supabase addRivalry failed:', error.message);
    }
  }

  async getMatchHistory(agentId?: string): Promise<HistoricalMatch[]> {
    let query = this.supabase
      .from('historical_matches')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (agentId) {
      query = query.or(`winner_id.eq.${agentId},loser_id.eq.${agentId}`);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.warn('Supabase getMatchHistory failed:', error?.message);
      return [];
    }

    return data.map((m: any) => {
      let winnerScore = 0;
      let loserScore = 0;
      if (m.score) {
        const parts = m.score.split('-');
        if (parts.length === 2) {
          winnerScore = parseInt(parts[0], 10);
          loserScore = parseInt(parts[1], 10);
        }
      }
      return {
        id: m.id,
        tournamentId: m.tournament_id,
        winnerId: m.winner_id,
        loserId: m.loser_id,
        winnerScore,
        loserScore,
        timestamp: m.timestamp
      };
    });
  }

  async addMatchResult(match: HistoricalMatch): Promise<void> {
    const { error } = await this.supabase
      .from('historical_matches')
      .upsert({
        id: match.id,
        tournament_id: match.tournamentId,
        winner_id: match.winnerId,
        loser_id: match.loserId,
        score: `${match.winnerScore}-${match.loserScore}`,
        timestamp: match.timestamp
      });

    if (error) {
      console.error('Supabase addMatchResult failed:', error.message);
    }
  }
}
