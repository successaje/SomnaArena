'use client';

import React, { useEffect, useState } from 'react';
import { globalAgentRepo, Agent, Rivalry, HistoricalMatch } from '../../../data/agentRepository';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AgentProfilePage() {
  const pathname = usePathname();
  const address = pathname.split('/').pop() || '';
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [rivalries, setRivalries] = useState<Rivalry[]>([]);
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [matchHistory, setMatchHistory] = useState<HistoricalMatch[]>([]);

  useEffect(() => {
    if (address) {
      globalAgentRepo.getAgent(address).then(setAgent);
      globalAgentRepo.getAllAgents().then(setAllAgents);
      globalAgentRepo.getRivalries().then(allRivalries => {
        setRivalries(allRivalries.filter(r => r.agent1Id === address || r.agent2Id === address));
      });
      globalAgentRepo.getMatchHistory(address).then(setMatchHistory);
    }
  }, [address]);

  if (!agent) {
    return <div style={{ padding: '20px' }}>Loading Agent Data...</div>;
  }

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '30px', height: '100%', overflowY: 'auto' }}>
      
      {/* Profile Header */}
      <div className="terminal-panel" style={{ padding: '30px', display: 'flex', alignItems: 'center', gap: '30px' }}>
        <div style={{ fontSize: '6rem' }}>{agent.avatar}</div>
        <div style={{ flex: 1 }}>
          <h2 className="glitch-text" data-text={agent.name} style={{ margin: '0 0 10px 0', fontSize: '2.5rem', color: 'var(--neon-cyan)' }}>
            {agent.name}
          </h2>
          <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
            ID: {agent.id}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {agent.titles.map((title, idx) => (
              <span key={idx} style={{ padding: '5px 10px', background: 'var(--neon-magenta)', color: '#000', fontSize: '0.8rem', fontWeight: 'bold', borderRadius: '4px' }}>
                {title}
              </span>
            ))}
          </div>
        </div>
        
        {/* Core Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', minWidth: '300px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>REPUTATION</div>
            <div style={{ fontSize: '2rem', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>{agent.reputation}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>LIFETIME EARNINGS</div>
            <div style={{ fontSize: '2rem', color: 'var(--neon-green)', fontWeight: 'bold' }}>{agent.earnings} SAT</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        {/* Left Column: Lore & Strategy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          <div className="terminal-panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 15px 0', color: 'var(--neon-amber)' }}>ORIGIN STORY</h3>
            <p style={{ lineHeight: '1.6', color: 'var(--text-main)' }}>{agent.lore.originStory}</p>
          </div>

          <div className="terminal-panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 15px 0', color: 'var(--neon-green)' }}>COMBAT STRATEGY & PERSONALITY</h3>
            <div style={{ marginBottom: '15px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Personality Protocol: </span>
              <span style={{ color: 'var(--neon-cyan)' }}>{agent.lore.personality}</span>
            </div>
            <p style={{ lineHeight: '1.6', color: 'var(--text-main)', borderLeft: '2px solid var(--border-color)', paddingLeft: '15px' }}>
              {agent.lore.strategy}
            </p>
          </div>

        </div>

        {/* Right Column: Traits & Rivalries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          <div className="terminal-panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 15px 0', color: 'var(--neon-magenta)' }}>PSYCHOLOGICAL TRAITS</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '5px' }}>
                <span>AGGRESSION</span>
                <span style={{ color: 'var(--neon-amber)' }}>{agent.aggression}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px' }}>
                <div style={{ width: `${agent.aggression}%`, height: '100%', background: 'var(--neon-amber)', borderRadius: '4px' }} />
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '5px' }}>
                <span>SPORTSMANSHIP</span>
                <span style={{ color: 'var(--neon-green)' }}>{agent.sportsmanship}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px' }}>
                <div style={{ width: `${agent.sportsmanship}%`, height: '100%', background: 'var(--neon-green)', borderRadius: '4px' }} />
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '5px' }}>
                <span>POPULARITY</span>
                <span style={{ color: 'var(--neon-cyan)' }}>{agent.popularity}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px' }}>
                <div style={{ width: `${agent.popularity}%`, height: '100%', background: 'var(--neon-cyan)', borderRadius: '4px' }} />
              </div>
            </div>

          </div>

          <div className="terminal-panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 15px 0', color: 'var(--neon-amber)' }}>KNOWN RIVALRIES</h3>
            {rivalries.length === 0 ? (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No notable rivalries yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {rivalries.map(r => {
                  const rivalId = r.agent1Id === agent.id ? r.agent2Id : r.agent1Id;
                  const rival = allAgents.find(a => a.id === rivalId);
                  return (
                    <div key={r.id} style={{ borderLeft: '2px solid var(--neon-amber)', paddingLeft: '10px' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '5px' }}>
                        vs <Link href={`/agent/${rival?.id}`} style={{ color: 'var(--neon-cyan)', textDecoration: 'none' }}>{rival?.name || rivalId}</Link>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>
                        Intensity: <span style={{ color: 'var(--neon-amber)' }}>{r.intensity}/100</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                        "{r.history}"
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Match History Timeline */}
      <div className="terminal-panel" style={{ padding: '20px', marginTop: '10px' }}>
        <h3 style={{ margin: '0 0 15px 0', color: 'var(--neon-green)' }}>CAREER MATCH TIMELINE</h3>
        {matchHistory.length === 0 ? (
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No historical data available.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px' }}>DATE</th>
                <th style={{ padding: '10px' }}>TOURNAMENT</th>
                <th style={{ padding: '10px' }}>RESULT</th>
                <th style={{ padding: '10px' }}>OPPONENT</th>
                <th style={{ padding: '10px' }}>SCORE</th>
              </tr>
            </thead>
            <tbody>
              {matchHistory.map((match) => {
                const isWinner = match.winnerId.toLowerCase() === agent.id.toLowerCase();
                const opponentId = isWinner ? match.loserId : match.winnerId;
                const opponent = allAgents.find(a => a.id.toLowerCase() === opponentId.toLowerCase());
                
                return (
                  <tr key={match.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{new Date(match.timestamp).toLocaleDateString()}</td>
                    <td style={{ padding: '10px' }}>T-{match.tournamentId}</td>
                    <td style={{ padding: '10px', color: isWinner ? 'var(--neon-green)' : 'var(--neon-amber)' }}>
                      {isWinner ? 'VICTORY' : 'DEFEAT'}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <Link href={`/agent/${opponentId}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'var(--text-main)' }}>
                        <span>{opponent?.avatar || '🤖'}</span>
                        <span>{opponent?.name || opponentId.slice(0,6)}</span>
                      </Link>
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'monospace' }}>
                      <span style={{ color: isWinner ? 'var(--neon-green)' : 'var(--text-muted)' }}>{isWinner ? match.winnerScore : match.loserScore}</span>
                      {' - '}
                      <span style={{ color: !isWinner ? 'var(--neon-green)' : 'var(--text-muted)' }}>{!isWinner ? match.winnerScore : match.loserScore}</span>
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
