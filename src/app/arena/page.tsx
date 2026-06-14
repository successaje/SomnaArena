'use client';

import React from 'react';
import { useSimulation } from '../../hooks/useSimulation';
import { getAgentProfileByAddress } from '../../agents/agentLogic';

export default function ArenaPage() {
  const { simState, matches, commentary } = useSimulation();
  
  const activeMatch = simState.activeMatchId !== null ? matches[simState.activeMatchId] : null;

  if (!activeMatch) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🏟️</div>
          <div className="glitch-text" data-text="ARENA OFFLINE">ARENA OFFLINE</div>
          <div style={{ marginTop: '10px', fontSize: '0.8rem' }}>Waiting for next scheduled match...</div>
        </div>
      </div>
    );
  }

  const p1 = getAgentProfileByAddress(simState.player1Address || '');
  const p2 = getAgentProfileByAddress(simState.player2Address || '');

  // Animation Class Logic
  let p1Class = '';
  let p2Class = '';
  let moveClass = '';

  if (simState.phase === 'ROUND_CLASH') {
    moveClass = 'attack-reveal';
  } else if (simState.phase === 'ROUND_RESOLVED') {
    // Assuming we can derive the last round winner from the fact that someone's score increased or just look at last activity
    // But a simple heuristic: if they won the match, pulse. 
    // Actually, we can check the commentary or just apply shake if they just lost a round.
    // For simplicity, let's just make the Match Winner pulse.
    if (simState.matchWinner === p1.address) {
      p1Class = 'winner-pulse';
      p2Class = 'damage-shake';
    } else if (simState.matchWinner === p2.address) {
      p2Class = 'winner-pulse';
      p1Class = 'damage-shake';
    }
  }

  return (
    <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 className="glitch-text" data-text="LIVE ARENA" style={{ margin: 0, fontSize: '1.2rem', color: 'var(--neon-green)' }}>
        LIVE ARENA // MATCH #{activeMatch.id}
      </h2>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', alignItems: 'stretch' }}>
        {/* Player 1 Card */}
        <div className={`terminal-panel player-card ${p1Class}`} style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: simState.matchWinner === p1.address ? '2px solid var(--neon-green)' : '1px solid var(--border-color)', transition: 'all 0.3s' }}>
          <div style={{ fontSize: '4rem', marginBottom: '10px' }}>{p1.avatar}</div>
          <h3 style={{ margin: 0, color: 'var(--neon-cyan)', fontSize: '1.2rem' }}>{p1.name}</h3>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>WINS: {simState.player1Wins}</div>
          
          <div style={{ marginTop: '20px', width: '100%', flex: 1, background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
            {simState.player1Thought ? `"${simState.player1Thought}"` : 'Analyzing...'}
          </div>

          <div className={simState.player1Move ? moveClass : ''} style={{ marginTop: '20px', fontSize: '2rem', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {simState.player1Move ? simState.player1Move.toUpperCase() : '???'}
          </div>
        </div>

        {/* Center Versus Indicator */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
          <div style={{ fontSize: '1.5rem', color: 'var(--neon-magenta)', fontWeight: 'bold' }}>VS</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ROUND {simState.currentRoundNum}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--neon-cyan)' }}>{simState.phase}</div>
        </div>

        {/* Player 2 Card */}
        <div className={`terminal-panel player-card ${p2Class}`} style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: simState.matchWinner === p2.address ? '2px solid var(--neon-green)' : '1px solid var(--border-color)', transition: 'all 0.3s' }}>
          <div style={{ fontSize: '4rem', marginBottom: '10px' }}>{p2.avatar}</div>
          <h3 style={{ margin: 0, color: 'var(--neon-amber)', fontSize: '1.2rem' }}>{p2.name}</h3>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>WINS: {simState.player2Wins}</div>
          
          <div style={{ marginTop: '20px', width: '100%', flex: 1, background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
            {simState.player2Thought ? `"${simState.player2Thought}"` : 'Analyzing...'}
          </div>

          <div className={simState.player2Move ? moveClass : ''} style={{ marginTop: '20px', fontSize: '2rem', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {simState.player2Move ? simState.player2Move.toUpperCase() : '???'}
          </div>
        </div>
      </div>

      {/* Live Commentary */}
      <div className="terminal-panel" style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: 'var(--neon-magenta)' }}>LIVE COMMENTARY STREAM</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {commentary.slice(0, 10).map((msg, idx) => (
            <div key={idx} style={{ fontSize: '0.9rem', padding: '10px', borderLeft: '2px solid var(--neon-magenta)', background: 'rgba(255, 0, 255, 0.05)' }}>
              {msg.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
