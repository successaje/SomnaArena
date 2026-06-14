import { createClient } from '@supabase/supabase-js';
import { Agent, AgentRepository, HistoricalMatch, Rivalry, getCanonicalAgentId } from './agentRepository';
import { INITIAL_AGENTS } from './agentRepository';

export class SupabaseAgentRepository implements AgentRepository {
  private supabase;
  private hasSeeded = false;

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  private mapAgentFromDB(row: any): Agent {
    return {
      id: getCanonicalAgentId(row.id),
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
    const canonicalId = getCanonicalAgentId(agent.id);
    return {
      id: canonicalId,
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
    const canonicalId = getCanonicalAgentId(id);
    const { data, error } = await this.supabase
      .from('agents')
      .select('*')
      .eq('id', canonicalId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase getAgent failed:', error.message);
      return null;
    }

    if (!data) {
      await this.seedDatabaseIfEmpty();
      return INITIAL_AGENTS[canonicalId.toLowerCase()] || INITIAL_AGENTS[canonicalId] || null;
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

    if (!data || data.length < Object.keys(INITIAL_AGENTS).length) {
      await this.seedDatabaseIfEmpty();
      // Refetch after seeding
      const { data: refetched } = await this.supabase
        .from('agents')
        .select('*')
        .order('reputation', { ascending: false });
      if (refetched && refetched.length > 0) {
        return refetched.map(this.mapAgentFromDB);
      }
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
      agent1Id: getCanonicalAgentId(r.agent1_id),
      agent2Id: getCanonicalAgentId(r.agent2_id),
      intensity: r.intensity,
      history: r.history
    }));
  }

  async addRivalry(rivalry: Rivalry): Promise<void> {
    const { error } = await this.supabase
      .from('rivalries')
      .upsert({
        id: rivalry.id,
        agent1_id: getCanonicalAgentId(rivalry.agent1Id),
        agent2_id: getCanonicalAgentId(rivalry.agent2Id),
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

    const canonicalId = agentId ? getCanonicalAgentId(agentId) : undefined;
    if (canonicalId) {
      query = query.or(`winner_id.eq.${canonicalId},loser_id.eq.${canonicalId}`);
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
        winnerId: getCanonicalAgentId(m.winner_id),
        loserId: getCanonicalAgentId(m.loser_id),
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
        winner_id: getCanonicalAgentId(match.winnerId),
        loser_id: getCanonicalAgentId(match.loserId),
        score: `${match.winnerScore}-${match.loserScore}`,
        timestamp: match.timestamp
      });

    if (error) {
      console.error('Supabase addMatchResult failed:', error.message);
    }
  }
}

