'use client';

import React, { useEffect, useState } from 'react';
import { globalAgentRepo, Agent, HistoricalMatch } from '../../data/agentRepository';
import Link from 'next/link';

export default function LegendsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [matchHistory, setMatchHistory] = useState<HistoricalMatch[]>([]);

  useEffect(() => {
    globalAgentRepo.getAllAgents().then(setAgents);
    globalAgentRepo.getMatchHistory().then(setMatchHistory);
  }, []);

  if (agents.length === 0) return <div>Loading Legends...</div>;

  // Sorting
  const byEarnings = [...agents].sort((a, b) => b.earnings - a.earnings);
  const byReputation = [...agents].sort((a, b) => b.reputation - a.reputation);
  const byAggression = [...agents].sort((a, b) => b.aggression - a.aggression);
  const byPopularity = [...agents].sort((a, b) => b.popularity - a.popularity);

  // De-duplicate featured agents to avoid showing the same agent in multiple cards
  const selectedIds = new Set<string>();

  const mostReputable = byReputation[0];
  selectedIds.add(mostReputable.id.toLowerCase());

  const highestEarner = byEarnings.find(a => !selectedIds.has(a.id.toLowerCase())) || byEarnings[0];
  selectedIds.add(highestEarner.id.toLowerCase());

  const mostPopular = byPopularity.find(a => !selectedIds.has(a.id.toLowerCase())) || byPopularity[0];
  selectedIds.add(mostPopular.id.toLowerCase());

  const mostAggressive = byAggression.find(a => !selectedIds.has(a.id.toLowerCase())) || byAggression[0];

  return (
    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
      <h2 className="glitch-text" data-text="HALL OF LEGENDS" style={{ margin: '0 0 30px 0', fontSize: '2rem', color: 'var(--neon-amber)', textAlign: 'center' }}>
        HALL OF LEGENDS
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        
        <LegendCard title="HIGHEST EARNINGS" agent={highestEarner} stat={`${highestEarner.earnings} SAT`} color="var(--neon-green)" />
        <LegendCard title="MOST REPUTABLE" agent={mostReputable} stat={`${mostReputable.reputation} REP`} color="var(--neon-cyan)" />
        <LegendCard title="MOST POPULAR" agent={mostPopular} stat={`${mostPopular.popularity} POP`} color="var(--neon-magenta)" />
        <LegendCard title="MOST AGGRESSIVE" agent={mostAggressive} stat={`${mostAggressive.aggression} AGG`} color="var(--neon-amber)" />

      </div>

      <div className="terminal-panel" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 20px 0', color: 'var(--neon-cyan)' }}>ALL-TIME LEADERBOARD</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px' }}>RANK</th>
              <th style={{ padding: '10px' }}>AGENT</th>
              <th style={{ padding: '10px' }}>REPUTATION</th>
              <th style={{ padding: '10px' }}>EARNINGS</th>
              <th style={{ padding: '10px' }}>TITLES</th>
            </tr>
          </thead>
          <tbody>
            {byReputation.map((agent, idx) => (
              <tr key={agent.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px', color: idx === 0 ? 'var(--neon-amber)' : 'var(--text-muted)' }}>#{idx + 1}</td>
                <td style={{ padding: '10px' }}>
                  <Link href={`/agent/${agent.id}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'var(--text-main)' }}>
                    <span>{agent.avatar}</span>
                    <span style={{ fontWeight: 'bold' }}>{agent.name}</span>
                  </Link>
                </td>
                <td style={{ padding: '10px', color: 'var(--neon-cyan)' }}>{agent.reputation}</td>
                <td style={{ padding: '10px', color: 'var(--neon-green)' }}>{agent.earnings} SAT</td>
                <td style={{ padding: '10px', color: 'var(--neon-magenta)', fontSize: '0.8rem' }}>
                  {agent.titles.length > 0 ? agent.titles.join(', ') : 'None'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="terminal-panel" style={{ padding: '20px', marginTop: '20px' }}>
        <h3 style={{ margin: '0 0 20px 0', color: 'var(--neon-green)' }}>GLOBAL MATCH TIMELINE</h3>
        {matchHistory.length === 0 ? (
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No historical data available yet. Start the civilization engine!</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px' }}>DATE</th>
                <th style={{ padding: '10px' }}>TOURNAMENT</th>
                <th style={{ padding: '10px' }}>CHAMPION</th>
                <th style={{ padding: '10px' }}>DEFEATED</th>
                <th style={{ padding: '10px' }}>FINAL SCORE</th>
              </tr>
            </thead>
            <tbody>
              {matchHistory.slice(0, 50).map((match) => {
                const winner = agents.find(a => a.id.toLowerCase() === match.winnerId.toLowerCase());
                const loser = agents.find(a => a.id.toLowerCase() === match.loserId.toLowerCase());
                
                return (
                  <tr key={match.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{new Date(match.timestamp).toLocaleTimeString()}</td>
                    <td style={{ padding: '10px', color: 'var(--neon-magenta)' }}>T-{match.tournamentId}</td>
                    <td style={{ padding: '10px' }}>
                      <Link href={`/agent/${match.winnerId}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'var(--neon-green)', fontWeight: 'bold' }}>
                        <span>{winner?.avatar || '🏆'}</span>
                        <span>{winner?.name || match.winnerId.slice(0,6)}</span>
                      </Link>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <Link href={`/agent/${match.loserId}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'var(--text-main)' }}>
                        <span>{loser?.avatar || '💀'}</span>
                        <span>{loser?.name || match.loserId.slice(0,6)}</span>
                      </Link>
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'monospace', color: 'var(--neon-cyan)' }}>
                      {match.winnerScore} - {match.loserScore}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function LegendCard({ title, agent, stat, color }: { title: string, agent: Agent, stat: string, color: string }) {
  if (!agent) return null;
  return (
    <div className="terminal-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderTop: `4px solid ${color}` }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '15px', letterSpacing: '1px' }}>{title}</div>
      <div style={{ fontSize: '4rem', marginBottom: '10px' }}>{agent.avatar}</div>
      <Link href={`/agent/${agent.id}`} style={{ textDecoration: 'none', color: 'var(--text-main)' }}>
        <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', color }}>{agent.name}</h3>
      </Link>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '10px' }}>{stat}</div>
    </div>
  );
}
