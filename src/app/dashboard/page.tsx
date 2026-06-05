'use client';

import React, { useEffect, useState } from 'react';
import { useSimulation } from '../../hooks/useSimulation';
import { globalAgentRepo, Agent } from '../../data/agentRepository';
import Link from 'next/link';

export default function DashboardPage() {
  const { simState, activities, commentary, highlights, tournaments, accounts } = useSimulation();
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    globalAgentRepo.getAllAgents().then(setAgents);
  }, []);

  const activeTournament = simState.activeTournamentId !== null ? tournaments[simState.activeTournamentId] : null;

  return (
    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px', height: '100%' }}>
      {/* Left Column: Civilization Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {highlights.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h2 className="glitch-text" data-text="LATEST HIGHLIGHTS" style={{ margin: 0, fontSize: '1.2rem', color: 'var(--neon-green)' }}>
              LATEST HIGHLIGHTS
            </h2>
            {highlights.slice(0, 3).map((hi, idx) => (
              <div key={hi.id} className="terminal-panel" style={{ padding: '15px', borderLeft: '4px solid var(--neon-green)', background: 'rgba(0, 255, 128, 0.05)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--neon-green)', marginBottom: '8px', letterSpacing: '1px', fontWeight: 'bold' }}>
                  ARCHIVAL AI — TOURNAMENT {hi.tournamentId} RECAP
                </div>
                <div style={{ fontSize: '0.95rem', lineHeight: '1.5', color: 'var(--text-main)', fontStyle: 'italic' }}>
                  "{hi.text}"
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'right' }}>
                  {new Date(hi.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="glitch-text" data-text="CIVILIZATION FEED" style={{ margin: '10px 0 0 0', fontSize: '1.2rem', color: 'var(--neon-cyan)' }}>
          CIVILIZATION FEED
        </h2>
        
        <div className="terminal-panel" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {commentary.slice(0, 15).map((msg, idx) => (
            <div key={idx} style={{ padding: '15px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--neon-magenta)', marginBottom: '5px', letterSpacing: '1px' }}>
                [COMMENTARY] — NEON CAST
              </div>
              <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{msg.text}</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'right' }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}

          {activities.slice(0, 5).map((act, idx) => (
            <div key={'act'+idx} style={{ padding: '15px', background: 'rgba(0, 240, 255, 0.05)', borderLeft: '2px solid var(--neon-cyan)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--neon-cyan)', marginBottom: '5px', letterSpacing: '1px' }}>
                [EVENT] — {act.agentName}
              </div>
              <div style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{act.action}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Status & Agents */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Active Tournament Status */}
        <div className="terminal-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: 'var(--neon-amber)' }}>CURRENT TOURNAMENT</h3>
          {activeTournament ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.8rem' }}><span style={{ color: 'var(--text-muted)' }}>ID:</span> #{activeTournament.id}</div>
              <div style={{ fontSize: '0.8rem' }}><span style={{ color: 'var(--text-muted)' }}>STATE:</span> <span className="magenta-glow">{activeTournament.state}</span></div>
              <div style={{ fontSize: '0.8rem' }}><span style={{ color: 'var(--text-muted)' }}>PRIZE POOL:</span> <span className="green-glow">{activeTournament.totalPrizePool} SAT</span></div>
              <div style={{ fontSize: '0.8rem' }}><span style={{ color: 'var(--text-muted)' }}>PHASE:</span> <span className="cyan-glow">{simState.phase}</span></div>
              <Link href="/arena" style={{ display: 'inline-block', marginTop: '10px', padding: '8px', background: 'var(--neon-cyan)', color: '#000', textAlign: 'center', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.8rem', borderRadius: '4px' }}>
                WATCH LIVE
              </Link>
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No active tournament. Awaiting Organizer.</div>
          )}
        </div>

        {/* Agent Roster */}
        <div className="terminal-panel" style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: 'var(--neon-magenta)' }}>AGENT ROSTER</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {agents.map(agent => (
              <Link key={agent.id} href={`/agent/${agent.id}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', textDecoration: 'none', color: 'var(--text-main)', border: '1px solid transparent', transition: 'all 0.2s' }}>
                <div style={{ fontSize: '1.5rem' }}>{agent.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{agent.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rep: {agent.reputation}</div>
                </div>
                <div style={{ fontSize: '1.2rem', color: 'var(--neon-cyan)' }}>›</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
