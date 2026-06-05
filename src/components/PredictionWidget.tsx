'use client';

import React, { useState, useEffect } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { globalAgentRepo, Agent } from '../data/agentRepository';
import { PredictionType } from '../agents/agentSystem';

export default function PredictionWidget() {
  const { simState, placePrediction } = useSimulation();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [betType, setBetType] = useState<PredictionType>('MATCH_WINNER');
  const [targetAgent, setTargetAgent] = useState<string>('');
  const [stake, setStake] = useState<number>(100);
  const [targetValue, setTargetValue] = useState<number>(3); // For win streak
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    globalAgentRepo.getAllAgents().then(data => {
      setAgents(data);
      if (data.length > 0 && !targetAgent) {
        setTargetAgent(data[0].id);
      }
    });
  }, [simState.activeTournamentId]);

  // Calculate dynamic odds/multipliers
  const getOdds = (type: PredictionType, agentId: string): number => {
    if (type === 'UPSET') return 2.8;
    if (type === 'CHAMPION') return 3.5;
    if (type === 'WIN_STREAK') return 4.5;
    
    // For MATCH_WINNER, check if match is active and calculate based on reputation
    if (type === 'MATCH_WINNER' && simState.player1Address && simState.player2Address) {
      const p1 = simState.player1Address.toLowerCase();
      const p2 = simState.player2Address.toLowerCase();
      const target = agentId.toLowerCase();

      if (target === p1 || target === p2) {
        const agent1 = agents.find(a => a.id.toLowerCase() === p1);
        const agent2 = agents.find(a => a.id.toLowerCase() === p2);
        
        if (agent1 && agent2) {
          const rep1 = agent1.reputation;
          const rep2 = agent2.reputation;
          const diff = rep1 - rep2;
          
          if (target === p1) {
            return diff >= 0 
              ? Math.max(1.2, parseFloat((2.0 - (diff / 400)).toFixed(2))) 
              : Math.max(1.8, parseFloat((2.0 + (Math.abs(diff) / 200)).toFixed(2)));
          } else {
            return diff <= 0 
              ? Math.max(1.2, parseFloat((2.0 - (Math.abs(diff) / 400)).toFixed(2))) 
              : Math.max(1.8, parseFloat((2.0 + (diff / 200)).toFixed(2)));
          }
        }
      }
    }
    return 1.9; // Default tie/even odds
  };

  const handlePlaceBet = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!targetAgent) {
      setErrorMsg('Please select a target gladiator.');
      return;
    }

    if (stake <= 0) {
      setErrorMsg('Stake must be greater than 0.');
      return;
    }

    if (simState.observerBalance < stake) {
      setErrorMsg('Insufficient SAT balance.');
      return;
    }

    // Validation for Match predictions
    if (betType === 'MATCH_WINNER' || betType === 'UPSET') {
      if (simState.phase !== 'PLAYERS_THINKING' && simState.phase !== 'MATCH_STARTING') {
        setErrorMsg('Bets can only be placed during thinking rounds.');
        return;
      }
      const p1 = simState.player1Address?.toLowerCase();
      const p2 = simState.player2Address?.toLowerCase();
      const target = targetAgent.toLowerCase();
      if (target !== p1 && target !== p2) {
        setErrorMsg('Target gladiator is not fighting in the active match.');
        return;
      }
    }

    // Validation for Tournament predictions
    if (betType === 'CHAMPION') {
      if (simState.phase !== 'PLAYERS_JOINING') {
        setErrorMsg('Champion bets can only be placed while players are joining.');
        return;
      }
    }

    const odds = getOdds(betType, targetAgent);

    try {
      placePrediction(betType, targetAgent, stake, odds, betType === 'WIN_STREAK' ? targetValue : undefined);
      setSuccessMsg(`Prediction placed successfully! Staked ${stake} SAT.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to place prediction.');
    }
  };

  const activeOdds = getOdds(betType, targetAgent);

  return (
    <div className="terminal-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--neon-green)', letterSpacing: '1px' }}>
        ⚡ OBSERVER PREDICTION SLIP
      </h3>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(0, 255, 128, 0.2)' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>YOUR BALANCE:</span>
        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--neon-green)' }}>
          {simState.observerBalance} SAT
        </span>
      </div>

      <form onSubmit={handlePlaceBet} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Bet Type */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PREDICTION TYPE</label>
          <select
            value={betType}
            onChange={(e) => setBetType(e.target.value as PredictionType)}
            style={{ background: '#090a10', color: '#fff', border: '1px solid var(--border-color)', padding: '8px', fontSize: '0.8rem', borderRadius: '4px' }}
          >
            <option value="MATCH_WINNER">Match Winner (Dynamic Odds)</option>
            <option value="UPSET">Underdog Upset (2.8x)</option>
            <option value="CHAMPION">Tournament Champion (3.5x)</option>
            <option value="WIN_STREAK">Gladiator Win Streak (4.5x)</option>
          </select>
        </div>

        {/* Target Agent */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TARGET GLADIATOR</label>
          <select
            value={targetAgent}
            onChange={(e) => setTargetAgent(e.target.value)}
            style={{ background: '#090a10', color: '#fff', border: '1px solid var(--border-color)', padding: '8px', fontSize: '0.8rem', borderRadius: '4px' }}
          >
            {agents.map(a => (
              <option key={a.id} value={a.id}>
                {a.avatar} {a.name} (Rep: {a.reputation})
              </option>
            ))}
          </select>
        </div>

        {/* Streak target count if Win Streak selected */}
        {betType === 'WIN_STREAK' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>WIN STREAK TARGET</label>
            <input
              type="number"
              min="2"
              max="5"
              value={targetValue}
              onChange={(e) => setTargetValue(parseInt(e.target.value) || 3)}
              style={{ background: '#090a10', color: '#fff', border: '1px solid var(--border-color)', padding: '8px', fontSize: '0.8rem', borderRadius: '4px' }}
            />
          </div>
        )}

        {/* Stake */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>STAKE (SAT)</label>
          <input
            type="number"
            min="10"
            step="10"
            value={stake}
            onChange={(e) => setStake(parseInt(e.target.value) || 0)}
            style={{ background: '#090a10', color: '#fff', border: '1px solid var(--border-color)', padding: '8px', fontSize: '0.8rem', borderRadius: '4px' }}
          />
        </div>

        {/* Odds & Potential Payout info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '4px' }}>
          <span>Estimated Multiplier:</span>
          <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>{activeOdds}x</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '4px', marginTop: '-8px' }}>
          <span>Est. Payout:</span>
          <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>{Math.round(stake * activeOdds)} SAT</span>
        </div>

        {errorMsg && <div style={{ color: '#ff4d4d', fontSize: '0.75rem', fontWeight: 'bold' }}>{errorMsg}</div>}
        {successMsg && <div style={{ color: 'var(--neon-green)', fontSize: '0.75rem', fontWeight: 'bold' }}>{successMsg}</div>}

        <button
          type="submit"
          style={{
            background: 'var(--neon-green)',
            color: '#000',
            border: 'none',
            padding: '10px',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 0 10px rgba(0,255,128,0.2)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.2)'}
          onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
        >
          LOCK PREDICTION
        </button>
      </form>

      {/* Active Slip / Bets */}
      <div style={{ marginTop: '10px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>ACTIVE PREDICTIONS</h4>
        {simState.activePredictions.length === 0 ? (
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>No active bets.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
            {simState.activePredictions.map((p) => {
              const agent = agents.find(a => a.id.toLowerCase() === p.targetAddress.toLowerCase());
              return (
                <div key={p.id} style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span style={{ color: 'var(--neon-cyan)' }}>{p.type}</span>
                    <span style={{ color: '#fff' }}>{p.stake} SAT ({p.multiplier}x)</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '2px' }}>
                    Target: {agent ? agent.name : 'Unknown'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History */}
      <div>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>PREDICTION ARCHIVE</h4>
        {simState.predictionHistory.length === 0 ? (
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>No past predictions.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
            {simState.predictionHistory.map((p) => {
              const agent = agents.find(a => a.id.toLowerCase() === p.targetAddress.toLowerCase());
              return (
                <div key={p.id} style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.02)', borderRadius: '4px', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{p.type}</span>
                    <span style={{ color: p.won ? 'var(--neon-green)' : '#ff4d4d', fontWeight: 'bold' }}>
                      {p.won ? `+${p.payout} SAT` : `-${p.stake} SAT`}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                    Gladiator: {agent ? agent.name : 'Unknown'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
