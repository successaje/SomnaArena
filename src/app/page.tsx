'use client';

import { useEffect, useState, useRef } from 'react';
import { globalSomniaChain, Tx, Block, ChainEvent, TournamentData, MatchData, AGENT_ACCOUNTS } from '../blockchain/somniaSim';
import { globalAgentSimulator, SimState, AgentActivityLog, CommentaryMessage } from '../agents/agentSystem';
import { getAgentProfileByAddress, getAgentMemory } from '../agents/agentLogic';
import { MOVE_NAMES, Move } from '../engine/gameEngine';
import { globalSomniaTestnetClient } from '../blockchain/somniaTestnetClient';

export default function SomnArenaApp() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bracket' | 'arena' | 'leaderboard' | 'explorer' | 'settings'>('dashboard');
  const [mounted, setMounted] = useState(false);
  
  // Simulated Chain & Sim states
  const [simState, setSimState] = useState<SimState>(globalAgentSimulator.state);
  const [blocks, setBlocks] = useState<Block[]>(globalSomniaChain.blocks);
  const [events, setEvents] = useState<ChainEvent[]>(globalSomniaChain.events);
  const [accounts, setAccounts] = useState(globalSomniaChain.accounts);
  const [tournaments, setTournaments] = useState<Record<number, TournamentData>>(globalSomniaChain.tournaments);
  const [matches, setMatches] = useState<Record<number, MatchData>>(globalSomniaChain.matches);
  
  // Logs & Feeds
  const [activities, setActivities] = useState<AgentActivityLog[]>(globalAgentSimulator.activities);
  const [commentary, setCommentary] = useState<CommentaryMessage[]>(globalAgentSimulator.commentary);
  const [isRunning, setIsRunning] = useState(false);
  
  // Selected Tx/Block for Explorer Modal
  const [selectedTx, setSelectedTx] = useState<Tx | null>(null);
  
  // Settings API Key
  const [claudeKeyInput, setClaudeKeyInput] = useState('');
  const [gasPrice, setGasPrice] = useState(105);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-scroll feeds
  const activityEndRef = useRef<HTMLDivElement>(null);
  const commentaryEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to changes in chain and simulator state
  useEffect(() => {
    // Load local storage values initially
    globalAgentSimulator.loadFromLocalStorage();
    setClaudeKeyInput(globalAgentSimulator.claudeApiKey);

    const unsubscribeSim = globalAgentSimulator.subscribe((state) => {
      setSimState({ ...state });
      setActivities([...globalAgentSimulator.activities]);
      setCommentary([...globalAgentSimulator.commentary]);
      setIsRunning(globalAgentSimulator.timerId !== null);
    });

    const unsubscribeChain = globalSomniaChain.subscribe((_event) => {
      setBlocks([...globalSomniaChain.blocks]);
      setEvents([...globalSomniaChain.events]);
      setAccounts([...globalSomniaChain.accounts]);
      setTournaments({ ...globalSomniaChain.tournaments });
      setMatches({ ...globalSomniaChain.matches });
    });

    // Simulate empty blocks and minor gas price fluctuations
    const interval = setInterval(() => {
      setGasPrice(prev => Math.max(90, Math.min(130, prev + Math.floor(Math.random() * 9) - 4)));
      if (globalAgentSimulator.timerId && Math.random() < 0.25) {
        // Mine an empty block to simulate blockchain progression when idle
        globalSomniaChain.mineEmptyBlock();
        setBlocks([...globalSomniaChain.blocks]);
      }
    }, 4000);

    return () => {
      unsubscribeSim();
      unsubscribeChain();
      clearInterval(interval);
    };
  }, []);

  // Sync scroll on logs update
  useEffect(() => {
    activityEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activities]);

  useEffect(() => {
    commentaryEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [commentary]);

  const toggleSimulation = () => {
    if (isRunning) {
      globalAgentSimulator.stopSimulation();
      setIsRunning(false);
    } else {
      globalAgentSimulator.startSimulation();
      setIsRunning(true);
    }
  };

  const handleResetChain = () => {
    if (confirm('Are you sure you want to hard reset the Somnia L1 simulation and all agent memories?')) {
      globalSomniaChain.resetChain();
      globalAgentSimulator.activities = [];
      globalAgentSimulator.commentary = [];
      globalAgentSimulator.state = {
        phase: 'IDLE',
        activeTournamentId: null,
        activeMatchId: null,
        currentRoundNum: 1,
        player1Address: null,
        player2Address: null,
        player1Move: null,
        player2Move: null,
        player1Thought: null,
        player2Thought: null,
        player1Wins: 0,
        player2Wins: 0,
        matchWinner: null,
        tournamentWinner: null,
        cooldownRemaining: 0,
        speedMultiplier: 1,
        isLiveTestnet: globalAgentSimulator.state.isLiveTestnet
      };
      
      // Save
      globalSomniaChain.saveToLocalStorage();
      globalAgentSimulator.saveToLocalStorage();

      // Refresh UI state
      setBlocks([...globalSomniaChain.blocks]);
      setEvents([...globalSomniaChain.events]);
      setAccounts([...globalSomniaChain.accounts]);
      setTournaments({ ...globalSomniaChain.tournaments });
      setMatches({ ...globalSomniaChain.matches });
      setActivities([]);
      setCommentary([]);
      setSimState(globalAgentSimulator.state);
      setIsRunning(false);
    }
  };

  const handleSaveApiKey = () => {
    globalAgentSimulator.setClaudeApiKey(claudeKeyInput);
    alert('Claude API key configured successfully! Falling back to rule engine if API calls fail or keys are invalid.');
  };

  const handleFaucetDrip = (addr: string) => {
    globalSomniaChain.submitTransaction(addr, 'faucetClaim', []);
  };

  // Helper to extract method displays
  const getMethodBadgeClass = (method: string) => {
    switch (method) {
      case 'createTournament': return 'badge-cyan';
      case 'joinTournament': return 'badge-amber';
      case 'startMatch': return 'badge-blue';
      case 'submitResult': return 'badge-magenta';
      case 'finalizeTournament': return 'badge-green';
      default: return 'badge-muted';
    }
  };

  const activeTournament = simState.activeTournamentId !== null ? tournaments[simState.activeTournamentId] : null;
  const activeMatch = simState.activeMatchId !== null ? matches[simState.activeMatchId] : null;

  if (!mounted) {
    return (
      <div style={{
        background: '#040408',
        color: '#00f0ff',
        fontFamily: 'monospace',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textShadow: '0 0 10px #00f0ff'
      }}>
        <div style={{ fontSize: '1.5rem', letterSpacing: '4px', marginBottom: '10px' }}>SOMNARENA_SYS_BOOT</div>
        <div style={{ fontSize: '0.8rem', color: 'rgba(0, 240, 255, 0.5)' }}>SYNCING ONCHAIN CYBER LEDGER...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top Header Section */}
      <header style={styles.header}>
        <div style={styles.headerTitleContainer}>
          <div style={styles.liveIndicator}>
            <span className="pulse-indicator active" style={{ color: isRunning ? 'var(--neon-green)' : 'var(--neon-amber)', backgroundColor: isRunning ? 'var(--neon-green)' : 'var(--neon-amber)' }} />
            <span style={styles.liveIndicatorText}>
              {isRunning ? 'SOMNIA AGENTIC L1 // ACTIVE' : 'SOMNIA AGENTIC L1 // PAUSED'}
            </span>
          </div>
          <h1 className="glitch-text" data-text="SOMNARENA" style={styles.headerLogo}>SOMNARENA</h1>
        </div>

        {/* Global Block Explorer Ticker */}
        <div style={styles.tickerContainer}>
          <div style={styles.tickerItem}>
            <span style={styles.tickerLabel}>NETWORK MODE:</span>
            <select
              value={simState.isLiveTestnet ? 'testnet' : 'sandbox'}
              onChange={(e) => {
                const isTestnet = e.target.value === 'testnet';
                globalAgentSimulator.stopSimulation();
                globalAgentSimulator.setLiveTestnet(isTestnet);
                setSimState({ ...globalAgentSimulator.state });
                setIsRunning(false);
              }}
              style={styles.selectDropdown}
            >
              <option value="sandbox">LOCAL SANDBOX</option>
              <option value="testnet">SHANNON TESTNET</option>
            </select>
          </div>
          <div style={styles.tickerItem}>
            <span style={styles.tickerLabel}>BLOCK HEIGHT:</span>
            <span className="cyan-glow mono-text" style={{ fontWeight: 'bold' }}>{blocks[blocks.length - 1]?.number || 0}</span>
          </div>
          <div style={styles.tickerItem}>
            <span style={styles.tickerLabel}>GAS PRICE:</span>
            <span className="amber-glow mono-text" style={{ fontWeight: 'bold' }}>{gasPrice} GWEI</span>
          </div>
          <div style={styles.tickerItem}>
            <span style={styles.tickerLabel}>ESCROW CONTRACT:</span>
            {simState.isLiveTestnet ? (
              <a 
                href="https://shannon-explorer.somnia.network/address/0x02406b6d17E743deA7fBbfAE8A15c82e4481E168"
                target="_blank"
                rel="noopener noreferrer"
                className="cyan-glow mono-text"
                style={{ fontSize: '0.8rem', textDecoration: 'underline', fontWeight: 'bold' }}
              >
                0x0240...E168
              </a>
            ) : (
              <span className="mono-text" style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>0xSomn...Tournament</span>
            )}
          </div>
        </div>

        {/* Simulation Controls */}
        <div style={styles.controls}>
          <button 
            className={`cyber-btn ${isRunning ? 'magenta' : 'green'}`}
            onClick={toggleSimulation}
            style={styles.actionBtn}
          >
            {isRunning ? '⏸️ PAUSE SIM' : '▶️ RUN AUTONOMY'}
          </button>
          
          <div style={styles.speedControl}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-header)' }}>SPEED:</span>
            <button 
              className={`cyber-btn ${simState.speedMultiplier === 0.5 ? '' : 'magenta'}`}
              onClick={() => globalAgentSimulator.setSpeed(0.5)}
              style={styles.speedBtn}
            >
              0.5x
            </button>
            <button 
              className={`cyber-btn ${simState.speedMultiplier === 1 ? '' : 'magenta'}`}
              onClick={() => globalAgentSimulator.setSpeed(1)}
              style={styles.speedBtn}
            >
              1.0x
            </button>
            <button 
              className={`cyber-btn ${simState.speedMultiplier === 2 ? '' : 'magenta'}`}
              onClick={() => globalAgentSimulator.setSpeed(2)}
              style={styles.speedBtn}
            >
              2.0x
            </button>
          </div>

          <button 
            className="cyber-btn"
            onClick={handleResetChain}
            style={styles.resetBtn}
          >
            🧹 RESET
          </button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav style={styles.nav}>
        <button 
          onClick={() => setActiveTab('dashboard')} 
          style={{ ...styles.navTab, ...(activeTab === 'dashboard' ? styles.navTabActive : {}) }}
        >
          👾 CIVILIZATION
        </button>
        <button 
          onClick={() => setActiveTab('bracket')} 
          style={{ ...styles.navTab, ...(activeTab === 'bracket' ? styles.navTabActive : {}) }}
        >
          📦 TOURNAMENT BRACKETS
        </button>
        <button 
          onClick={() => setActiveTab('arena')} 
          style={{ ...styles.navTab, ...(activeTab === 'arena' ? styles.navTabActive : {}) }}
        >
          ⚔️ MATCH ARENA
        </button>
        <button 
          onClick={() => setActiveTab('leaderboard')} 
          style={{ ...styles.navTab, ...(activeTab === 'leaderboard' ? styles.navTabActive : {}) }}
        >
          🏆 AGENT RANKINGS
        </button>
        <button 
          onClick={() => setActiveTab('explorer')} 
          style={{ ...styles.navTab, ...(activeTab === 'explorer' ? styles.navTabActive : {}) }}
        >
          📡 L1 BLOCK EXPLORER
        </button>
        <button 
          onClick={() => setActiveTab('settings')} 
          style={{ ...styles.navTab, ...(activeTab === 'settings' ? styles.navTabActive : {}) }}
        >
          ⚙️ CONFIG
        </button>
      </nav>

      {/* Tab Panels */}
      <main style={styles.main}>
        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <div style={styles.grid2Col}>
            {/* Left Column: Active Tournament status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="cyber-card cyan-border" style={{ flex: 1 }}>
                <div className="cyber-card-header">
                  <h3>ACTIVE TOURNEY STATUS</h3>
                  <span className="mono-text cyan-glow">PHASE: {simState.phase}</span>
                </div>
                <div className="cyber-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {activeTournament ? (
                    <div>
                      <div style={styles.statsRow}>
                        <span>Tournament ID:</span>
                        <span className="mono-text">#{activeTournament.id}</span>
                      </div>
                      <div style={styles.statsRow}>
                        <span>Escrow prize pool:</span>
                        <span className="mono-text cyan-glow" style={{ fontWeight: 'bold' }}>{activeTournament.totalPrizePool} STT</span>
                      </div>
                      <div style={styles.statsRow}>
                        <span>Entry stake fee:</span>
                        <span className="mono-text">{activeTournament.entryFee} STT</span>
                      </div>
                      <div style={styles.statsRow}>
                        <span>Contract Status:</span>
                        <span className="mono-text green-glow" style={{ textTransform: 'uppercase' }}>{activeTournament.state}</span>
                      </div>

                      <div style={{ marginTop: '20px' }}>
                        <h4 style={styles.subHeading}>Registered Players ({activeTournament.players.length}/{activeTournament.maxPlayers})</h4>
                        <div style={styles.playerStakersList}>
                          {activeTournament.players.map((addr) => {
                            const prof = getAgentProfileByAddress(addr);
                            return (
                              <div key={addr} style={styles.playerStakerCard}>
                                <span style={{ fontSize: '1.25rem' }}>{prof?.avatar || '🤖'}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 'bold' }}>{prof?.name || 'Agent'}</div>
                                  <div className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{addr.substring(0, 10)}...{addr.slice(-4)}</div>
                                </div>
                                <span style={styles.stakeBadge}>STAKED ✓</span>
                              </div>
                            );
                          })}
                          {activeTournament.players.length === 0 && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '15px' }}>
                              Waiting for player staking transactions...
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={styles.emptyState}>
                      <span style={{ fontSize: '3rem' }}>💤</span>
                      <h3>No Active Tournament</h3>
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>
                        The Organizer Agent is idle or calculating rules for the next tournament deployment. Enable simulation to resume automatic cycle.
                      </p>
                    </div>
                  )}

                  {simState.phase === 'COOLDOWN' && (
                    <div className="cyber-card magenta-border" style={styles.cooldownAlert}>
                      <span className="magenta-glow" style={{ fontWeight: 'bold' }}>🏆 Champion crowned! Cooldown in progress:</span>
                      <span className="mono-text magenta-glow" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}> {simState.cooldownRemaining}s</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Agent status strip */}
              <div className="cyber-card cyan-border">
                <div className="cyber-card-header">
                  <h3>AGENT WORLD BALANCES</h3>
                </div>
                <div className="cyber-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '15px' }}>
                  {accounts.map((acc) => {
                    const isTestnet = simState.isLiveTestnet;
                    const nativeBal = (acc as any).nativeBalance !== undefined ? (acc as any).nativeBalance : 0;
                    
                    // Recover key from localstorage
                    let pkey = '';
                    if (typeof window !== 'undefined') {
                      pkey = localStorage.getItem('somnarena_agent_pkey_' + acc.role) || '';
                    }

                    return (
                      <div key={acc.address} style={{ ...styles.agentBalanceCard, borderColor: acc.color, position: 'relative' }}>
                        <span style={{ fontSize: '1.2rem', filter: `drop-shadow(0 0 5px ${acc.color})` }}>
                          {acc.role === 'organizer' ? '🏢' : acc.role === 'referee' ? '⚖️' : acc.role === 'commentator' ? '🎤' : '👾'}
                        </span>
                        <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginTop: '5px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{acc.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{acc.role}</div>
                        
                        <div style={{ marginTop: '5px', fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Escrow: </span>
                          <span className="mono-text" style={{ color: acc.color, fontWeight: 'bold' }}>{acc.balance} STT</span>
                        </div>

                        {isTestnet && (
                          <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Gas: </span>
                            <span className="mono-text cyan-glow" style={{ fontWeight: 'bold' }}>{Number(nativeBal).toFixed(4)} STT</span>
                          </div>
                        )}

                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', wordBreak: 'break-all' }}>
                          {acc.address.substring(0, 6)}...{acc.address.slice(-4)}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px', width: '100%' }}>
                          <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
                            <button
                              onClick={() => {
                                if (isTestnet) {
                                  window.open('https://shannon-faucet.somnia.network', '_blank');
                                } else {
                                  handleFaucetDrip(acc.address);
                                }
                              }}
                              style={{ ...styles.faucetBtn, flex: 1, marginTop: 0 }}
                            >
                              💧 FAUCET
                            </button>
                            
                            {isTestnet && pkey && (
                              <button
                                onClick={() => {
                                  prompt(`Private Key for ${acc.name} (${acc.role}):\nKeep this secure!`, pkey);
                                }}
                                style={{ ...styles.keyBtn, flex: 1 }}
                                title="Show Private Key"
                              >
                                🔑 KEY
                              </button>
                            )}
                          </div>
                          
                          {isTestnet && (
                            <button
                              onClick={async () => {
                                const defaultAmt = acc.role === 'organizer' ? '500' : '100';
                                const amt = prompt(`Enter native STT amount to deposit into contract escrow for ${acc.name}:`, defaultAmt);
                                if (!amt) return;
                                try {
                                  await globalSomniaTestnetClient.depositToContract(acc.role, amt);
                                  alert(`Successfully deposited ${amt} STT into escrow for ${acc.name}!`);
                                  await globalAgentSimulator.syncFromTestnet();
                                } catch (e: any) {
                                  alert(`Deposit failed: ${e.message || e}`);
                                }
                              }}
                              style={{ ...styles.keyBtn, width: '100%', color: 'var(--neon-cyan)', borderColor: 'rgba(0, 240, 255, 0.3)' }}
                              title="Deposit native STT into escrow contract"
                            >
                              📥 DEPOSIT STT
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Live Agent Activities Feed */}
            <div className="cyber-card magenta-border" style={{ display: 'flex', flexDirection: 'column', height: '650px' }}>
              <div className="cyber-card-header">
                <h3>AGENT DECISION MATRIX LOGS</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="pulse-indicator active" style={{ color: 'var(--neon-magenta)', backgroundColor: 'var(--neon-magenta)' }} />
                  <span className="mono-text" style={{ fontSize: '0.8rem', color: 'var(--neon-magenta)' }}>LIVE THREAD</span>
                </div>
              </div>
              <div className="cyber-card-body" style={styles.feedBody}>
                {activities.map((act) => {
                  const acc = globalSomniaChain.getAccount(act.agentAddress);
                  const color = acc?.color || 'var(--neon-cyan)';
                  return (
                    <div key={act.id} style={styles.logRow}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }} className="mono-text">
                        [{new Date(act.timestamp).toLocaleTimeString()}]
                      </span>
                      <span style={{ color, fontWeight: 'bold', fontSize: '0.85rem', fontFamily: 'var(--font-header)' }}>
                        {act.agentName}:
                      </span>
                      <span style={{ flex: 1, fontSize: '0.9rem', lineHeight: '1.4' }}>
                        {act.action}
                      </span>
                    </div>
                  );
                })}
                <div ref={activityEndRef} />
                {activities.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '100px' }}>
                    No decisions mined yet. Turn on simulation to activate agents.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Tournament Bracket */}
        {activeTab === 'bracket' && (
          <div className="cyber-card cyan-border">
            <div className="cyber-card-header">
              <h3>ACTIVE TOURNAMENT BRACKET</h3>
              {activeTournament && (
                <span className="mono-text cyan-glow">POOL ESCROW: {activeTournament.totalPrizePool} STT</span>
              )}
            </div>
            <div className="cyber-card-body">
              {globalAgentSimulator.bracketMatches.length > 0 ? (
                <div style={styles.bracketContainer}>
                  {/* Semifinals column */}
                  <div style={styles.bracketColumn}>
                    <h4 style={styles.bracketColHeader}>SEMIFINALS</h4>
                    <div style={styles.bracketMatchWrapper}>
                      {/* Semifinal 1 */}
                      <div style={{ 
                        ...styles.bracketMatchCard, 
                        borderColor: globalAgentSimulator.currentBracketIndex === 0 ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.05)',
                        boxShadow: globalAgentSimulator.currentBracketIndex === 0 ? '0 0 15px rgba(0, 240, 255, 0.15)' : 'none'
                      }}>
                        <div style={styles.bracketMatchHeader}>
                          <span>SF 1</span>
                          {globalAgentSimulator.bracketMatches[0].resolved ? (
                            <span className="green-glow" style={{ fontSize: '0.75rem' }}>RESOLVED</span>
                          ) : (
                            <span className="amber-glow" style={{ fontSize: '0.75rem' }}>{globalAgentSimulator.currentBracketIndex === 0 ? 'PLAYING' : 'PENDING'}</span>
                          )}
                        </div>
                        <div style={styles.bracketPlayers}>
                          <div style={{ ...styles.bracketPlayerRow, fontWeight: globalAgentSimulator.bracketMatches[0].winner === globalAgentSimulator.bracketMatches[0].p1 ? 'bold' : 'normal' }}>
                            <span>{getAgentProfileByAddress(globalAgentSimulator.bracketMatches[0].p1)?.name}</span>
                            <span className="mono-text">{globalAgentSimulator.bracketMatches[0].winner === globalAgentSimulator.bracketMatches[0].p1 ? '🏆' : ''}</span>
                          </div>
                          <div style={{ ...styles.bracketPlayerRow, fontWeight: globalAgentSimulator.bracketMatches[0].winner === globalAgentSimulator.bracketMatches[0].p2 ? 'bold' : 'normal' }}>
                            <span>{getAgentProfileByAddress(globalAgentSimulator.bracketMatches[0].p2)?.name}</span>
                            <span className="mono-text">{globalAgentSimulator.bracketMatches[0].winner === globalAgentSimulator.bracketMatches[0].p2 ? '🏆' : ''}</span>
                          </div>
                        </div>
                      </div>

                      {/* Semifinal 2 */}
                      <div style={{ 
                        ...styles.bracketMatchCard, 
                        borderColor: globalAgentSimulator.currentBracketIndex === 1 ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.05)',
                        boxShadow: globalAgentSimulator.currentBracketIndex === 1 ? '0 0 15px rgba(0, 240, 255, 0.15)' : 'none'
                      }}>
                        <div style={styles.bracketMatchHeader}>
                          <span>SF 2</span>
                          {globalAgentSimulator.bracketMatches[1].resolved ? (
                            <span className="green-glow" style={{ fontSize: '0.75rem' }}>RESOLVED</span>
                          ) : (
                            <span className="amber-glow" style={{ fontSize: '0.75rem' }}>{globalAgentSimulator.currentBracketIndex === 1 ? 'PLAYING' : 'PENDING'}</span>
                          )}
                        </div>
                        <div style={styles.bracketPlayers}>
                          <div style={{ ...styles.bracketPlayerRow, fontWeight: globalAgentSimulator.bracketMatches[1].winner === globalAgentSimulator.bracketMatches[1].p1 ? 'bold' : 'normal' }}>
                            <span>{getAgentProfileByAddress(globalAgentSimulator.bracketMatches[1].p1)?.name}</span>
                            <span className="mono-text">{globalAgentSimulator.bracketMatches[1].winner === globalAgentSimulator.bracketMatches[1].p1 ? '🏆' : ''}</span>
                          </div>
                          <div style={{ ...styles.bracketPlayerRow, fontWeight: globalAgentSimulator.bracketMatches[1].winner === globalAgentSimulator.bracketMatches[1].p2 ? 'bold' : 'normal' }}>
                            <span>{getAgentProfileByAddress(globalAgentSimulator.bracketMatches[1].p2)?.name}</span>
                            <span className="mono-text">{globalAgentSimulator.bracketMatches[1].winner === globalAgentSimulator.bracketMatches[1].p2 ? '🏆' : ''}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Connector lines spacer */}
                  <div style={styles.bracketLinkContainer}>
                    <div style={styles.bracketLineLeft} />
                    <div style={styles.bracketLineRight} />
                  </div>

                  {/* Finals column */}
                  <div style={styles.bracketColumn}>
                    <h4 style={styles.bracketColHeader}>FINALS</h4>
                    <div style={styles.bracketMatchWrapper}>
                      <div style={{ 
                        ...styles.bracketMatchCard, 
                        borderColor: globalAgentSimulator.currentBracketIndex === 2 ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.05)',
                        boxShadow: globalAgentSimulator.currentBracketIndex === 2 ? '0 0 15px rgba(0, 240, 255, 0.15)' : 'none',
                        marginTop: '65px'
                      }}>
                        <div style={styles.bracketMatchHeader}>
                          <span>GRAND FINALS</span>
                          {globalAgentSimulator.bracketMatches[2].resolved ? (
                            <span className="green-glow" style={{ fontSize: '0.75rem' }}>RESOLVED</span>
                          ) : (
                            <span className="amber-glow" style={{ fontSize: '0.75rem' }}>{globalAgentSimulator.currentBracketIndex === 2 ? 'PLAYING' : 'PENDING'}</span>
                          )}
                        </div>
                        <div style={styles.bracketPlayers}>
                          {globalAgentSimulator.bracketMatches[2].p1 ? (
                            <div style={{ ...styles.bracketPlayerRow, fontWeight: globalAgentSimulator.bracketMatches[2].winner === globalAgentSimulator.bracketMatches[2].p1 ? 'bold' : 'normal' }}>
                              <span>{getAgentProfileByAddress(globalAgentSimulator.bracketMatches[2].p1)?.name}</span>
                              <span className="mono-text">{globalAgentSimulator.bracketMatches[2].winner === globalAgentSimulator.bracketMatches[2].p1 ? '👑' : ''}</span>
                            </div>
                          ) : (
                            <div style={{ ...styles.bracketPlayerRow, color: 'var(--text-muted)' }}>
                              <span>SF 1 Winner</span>
                            </div>
                          )}

                          {globalAgentSimulator.bracketMatches[2].p2 ? (
                            <div style={{ ...styles.bracketPlayerRow, fontWeight: globalAgentSimulator.bracketMatches[2].winner === globalAgentSimulator.bracketMatches[2].p2 ? 'bold' : 'normal' }}>
                              <span>{getAgentProfileByAddress(globalAgentSimulator.bracketMatches[2].p2)?.name}</span>
                              <span className="mono-text">{globalAgentSimulator.bracketMatches[2].winner === globalAgentSimulator.bracketMatches[2].p2 ? '👑' : ''}</span>
                            </div>
                          ) : (
                            <div style={{ ...styles.bracketPlayerRow, color: 'var(--text-muted)' }}>
                              <span>SF 2 Winner</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={styles.emptyState}>
                  <h3>No Active Bracket Matrix</h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>
                    Brackets will compile autonomously once organizer deploys the tournament contract and player stakes are locked in.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Match Arena */}
        {activeTab === 'arena' && (
          <div style={styles.grid2Col}>
            {/* Left: Interactive Arena clash visual */}
            <div className="cyber-card cyan-border" style={{ height: '620px', display: 'flex', flexDirection: 'column' }}>
              <div className="cyber-card-header">
                <h3>CLASH VISUALIZATION</h3>
                {simState.activeMatchId !== null && (
                  <span className="mono-text cyan-glow">MATCH #{simState.activeMatchId} // ROUND {simState.currentRoundNum}</span>
                )}
              </div>
              <div className="cyber-card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
                {simState.player1Address && simState.player2Address ? (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Arena Header: Scores */}
                    <div style={styles.arenaHeaderScore}>
                      <div style={styles.arenaScorePanel}>
                        <h2 className="cyan-glow" style={{ fontSize: '2.5rem' }}>{simState.player1Wins}</h2>
                        <span>{getAgentProfileByAddress(simState.player1Address)?.name}</span>
                      </div>
                      <div style={styles.arenaScoreVs}>VS</div>
                      <div style={styles.arenaScorePanel}>
                        <h2 className="magenta-glow" style={{ fontSize: '2.5rem' }}>{simState.player2Wins}</h2>
                        <span>{getAgentProfileByAddress(simState.player2Address)?.name}</span>
                      </div>
                    </div>

                    {/* Ring: Player side-by-side moves */}
                    <div style={styles.ringContainer}>
                      {/* Player 1 Card */}
                      <div style={styles.arenaFighterCard}>
                        <div style={{ ...styles.fighterAvatar, borderColor: 'var(--neon-cyan)', boxShadow: '0 0 15px rgba(0,240,255,0.2)' }}>
                          <span style={{ fontSize: '3rem' }}>{getAgentProfileByAddress(simState.player1Address)?.avatar}</span>
                        </div>
                        <h4 className="cyan-glow">{getAgentProfileByAddress(simState.player1Address)?.name}</h4>
                        
                        {/* Revealed Move */}
                        <div style={styles.revealMoveBox}>
                          {simState.phase === 'ROUND_CLASH' || simState.phase === 'ROUND_RESOLVED' || simState.phase === 'MATCH_RESOLVED' ? (
                            <div className="clash-element-1" style={styles.moveToken}>
                              {MOVE_NAMES[simState.player1Move!]}
                            </div>
                          ) : simState.phase === 'PLAYERS_THINKING' ? (
                            <div className="pulse-indicator active" style={{ color: 'var(--neon-cyan)', backgroundColor: 'var(--neon-cyan)', padding: '5px 15px', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'var(--font-header)' }}>
                              THINKING...
                            </div>
                          ) : (
                            <div style={{ color: 'var(--text-muted)' }}>WAITING...</div>
                          )}
                        </div>
                      </div>

                      {/* VS energy lock animation indicator */}
                      <div style={styles.arenaClashCenter}>
                        {simState.phase === 'ROUND_CLASH' && (
                          <div style={styles.clashPulseBeam} />
                        )}
                        <span style={{ fontSize: '2rem', zIndex: 10 }}>⚡</span>
                      </div>

                      {/* Player 2 Card */}
                      <div style={styles.arenaFighterCard}>
                        <div style={{ ...styles.fighterAvatar, borderColor: 'var(--neon-magenta)', boxShadow: '0 0 15px rgba(255,0,127,0.2)' }}>
                          <span style={{ fontSize: '3rem' }}>{getAgentProfileByAddress(simState.player2Address)?.avatar}</span>
                        </div>
                        <h4 className="magenta-glow">{getAgentProfileByAddress(simState.player2Address)?.name}</h4>
                        
                        {/* Revealed Move */}
                        <div style={styles.revealMoveBox}>
                          {simState.phase === 'ROUND_CLASH' || simState.phase === 'ROUND_RESOLVED' || simState.phase === 'MATCH_RESOLVED' ? (
                            <div className="clash-element-2" style={styles.moveTokenMagenta}>
                              {MOVE_NAMES[simState.player2Move!]}
                            </div>
                          ) : simState.phase === 'PLAYERS_THINKING' ? (
                            <div className="pulse-indicator active" style={{ color: 'var(--neon-magenta)', backgroundColor: 'var(--neon-magenta)', padding: '5px 15px', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'var(--font-header)' }}>
                              THINKING...
                            </div>
                          ) : (
                            <div style={{ color: 'var(--text-muted)' }}>WAITING...</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Agent Inner reasoning console logs */}
                    <div style={styles.reasoningConsole}>
                      <h4 className="mono-text cyan-glow" style={{ fontSize: '0.8rem', borderBottom: '1px solid rgba(0, 240, 255, 0.1)', paddingBottom: '5px', marginBottom: '8px' }}>
                        🧠 AGENT REASONING DATA SHARDS
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '0.8rem', display: 'flex', gap: '5px' }}>
                          <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>[{getAgentProfileByAddress(simState.player1Address)?.name} THOUGHTS]</span>
                          <span className="mono-text" style={{ flex: 1, color: 'var(--text-main)', fontStyle: 'italic' }}>
                            {simState.player1Thought || 'Waiting for core decision packet...'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', display: 'flex', gap: '5px' }}>
                          <span style={{ color: 'var(--neon-magenta)', fontWeight: 'bold' }}>[{getAgentProfileByAddress(simState.player2Address)?.name} THOUGHTS]</span>
                          <span className="mono-text" style={{ flex: 1, color: 'var(--text-main)', fontStyle: 'italic' }}>
                            {simState.player2Thought || 'Waiting for core decision packet...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={styles.emptyState}>
                    <span style={{ fontSize: '3rem' }}>🏟️</span>
                    <h3>Arena Empty</h3>
                    <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>
                      No active head-to-head match scheduled. Once the Referee registers players, matches are automatically deployed onto this arena screen.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: AI Hype Commentary Stream */}
            <div className="cyber-card magenta-border" style={{ height: '620px', display: 'flex', flexDirection: 'column' }}>
              <div className="cyber-card-header">
                <h3>🎤 LIVE AI COMMENTARY</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="pulse-indicator active" style={{ color: 'var(--neon-green)', backgroundColor: 'var(--neon-green)' }} />
                  <span style={{ color: 'var(--neon-green)', fontFamily: 'var(--font-header)', fontSize: '0.8rem' }}>COMMENTATOR: NEON CAST</span>
                </div>
              </div>
              <div className="cyber-card-body" style={styles.commentaryBody}>
                {commentary.map((msg) => (
                  <div key={msg.id} style={styles.commentaryCard}>
                    <div style={styles.commentaryMeta}>
                      <span style={{ fontWeight: 'bold', color: 'var(--neon-magenta)' }}>🎙️ Neon Cast</span>
                      <span className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p style={styles.commentaryText}>"{msg.text}"</p>
                  </div>
                ))}
                <div ref={commentaryEndRef} />
                {commentary.length === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '100px', gap: '10px', color: 'var(--text-muted)' }}>
                    <span>📡 Waiting for commentator grid link...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Agent Rankings / Leaderboard */}
        {activeTab === 'leaderboard' && (
          <div className="cyber-card cyan-border">
            <div className="cyber-card-header">
              <h3>AGENT RANKINGS</h3>
            </div>
            <div className="cyber-card-body" style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>RANK</th>
                    <th style={styles.th}>AGENT</th>
                    <th style={styles.th}>STRATEGY PROFILE</th>
                    <th style={styles.th}>CURRENT BALANCE</th>
                    <th style={styles.th}>HISTORY VS OTHERS</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.filter(a => a.role === 'player').map((acc, index) => {
                    const prof = getAgentProfileByAddress(acc.address);
                    const memory = getAgentMemory(acc.address);
                    
                    const totalWins = memory.history.filter(h => h.result === 'win').length;
                    const totalLosses = memory.history.filter(h => h.result === 'loss').length;
                    const totalTies = memory.history.filter(h => h.result === 'tie').length;
                    
                    return (
                      <tr key={acc.address} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: 'bold' }} className="cyan-glow mono-text">#{index + 1}</td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.5rem' }}>{prof.avatar}</span>
                            <div>
                              <div style={{ fontWeight: 'bold' }}>{prof.name}</div>
                              <div className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{acc.address.substring(0, 12)}...</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ ...styles.td, fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--neon-amber)', fontWeight: 'bold' }}>{prof.personality}</span>
                          <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.8rem' }}>{prof.strategyDescription}</p>
                        </td>
                        <td style={{ ...styles.td, fontWeight: 'bold' }} className="cyan-glow mono-text">{acc.balance} STT</td>
                        <td style={{ ...styles.td, fontSize: '0.85rem' }} className="mono-text">
                          <span style={{ color: 'var(--neon-green)' }}>W: {totalWins}</span> / <span style={{ color: 'var(--neon-red)' }}>L: {totalLosses}</span> / <span style={{ color: 'var(--text-muted)' }}>T: {totalTies}</span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {memory.history.length > 0 ? (
                              <span>Last opponent: {getAgentProfileByAddress(memory.history[memory.history.length-1].opponentAddress)?.name || 'Unknown'} ({memory.history[memory.history.length-1].result})</span>
                            ) : 'No battles logged'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Block Explorer */}
        {activeTab === 'explorer' && (
          <div style={styles.grid2Col}>
            {/* Left: Block list */}
            <div className="cyber-card cyan-border" style={{ height: '620px', display: 'flex', flexDirection: 'column' }}>
              <div className="cyber-card-header">
                <h3>RECENT BLOCKS MINED</h3>
              </div>
              <div className="cyber-card-body" style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
                {blocks.slice().reverse().map((b) => (
                  <div key={b.hash} style={styles.explorerRow} className="explorer-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="cyan-glow mono-text" style={{ fontWeight: 'bold' }}>BLOCK #{b.number}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }} className="mono-text">
                        {new Date(b.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span className="mono-text">HASH: {b.hash.substring(0, 16)}...</span>
                      <span className="mono-text" style={{ color: 'var(--neon-amber)' }}>{b.transactions.length} TXS</span>
                    </div>
                    {b.transactions.map((tx) => (
                      <div 
                        key={tx.hash} 
                        style={styles.blockTxRow}
                        onClick={() => setSelectedTx(tx)}
                      >
                        <span className={`mono-text ${getMethodBadgeClass(tx.method)}`} style={styles.txBadge}>
                          {tx.method}
                        </span>
                        <span style={{ fontSize: '0.8rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} className="mono-text">
                          {tx.from.substring(0, 8)}... called Contract
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }} className={tx.status === 'success' ? 'green-glow' : 'amber-glow'}>
                          {tx.status === 'success' ? '✓' : '✗'}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Selected Transaction Explorer Detail */}
            <div className="cyber-card magenta-border" style={{ height: '620px', display: 'flex', flexDirection: 'column' }}>
              <div className="cyber-card-header">
                <h3>TRANSACTION RECEIPT INSPECTOR</h3>
              </div>
              <div className="cyber-card-body" style={{ flex: 1, overflowY: 'auto' }}>
                {selectedTx ? (
                  <div style={styles.receiptContainer}>
                    <div style={styles.receiptItem}>
                      <span style={styles.receiptLabel}>TX HASH:</span>
                      <span className="mono-text cyan-glow" style={{ wordBreak: 'break-all' }}>{selectedTx.hash}</span>
                    </div>
                    <div style={styles.receiptItem}>
                      <span style={styles.receiptLabel}>BLOCK PRODUCED:</span>
                      <span className="mono-text">#{selectedTx.blockNumber}</span>
                    </div>
                    <div style={styles.receiptItem}>
                      <span style={styles.receiptLabel}>TIMESTAMP:</span>
                      <span className="mono-text">{new Date(selectedTx.timestamp).toLocaleString()}</span>
                    </div>
                    <div style={styles.receiptItem}>
                      <span style={styles.receiptLabel}>SENDER ADDRESS (FROM):</span>
                      <span className="mono-text" style={{ color: globalSomniaChain.getAccount(selectedTx.from)?.color || 'var(--text-main)' }}>
                        {selectedTx.from} ({globalSomniaChain.getAccount(selectedTx.from)?.name || 'User'})
                      </span>
                    </div>
                    <div style={styles.receiptItem}>
                      <span style={styles.receiptLabel}>CONTRACT ADDRESS (TO):</span>
                      <span className="mono-text" style={{ color: 'var(--text-muted)' }}>{selectedTx.to}</span>
                    </div>
                    <div style={styles.receiptItem}>
                      <span style={styles.receiptLabel}>METHOD CALLED:</span>
                      <span className={`mono-text ${getMethodBadgeClass(selectedTx.method)}`} style={styles.txBadgeLarge}>
                        {selectedTx.method}
                      </span>
                    </div>
                    <div style={styles.receiptItem}>
                      <span style={styles.receiptLabel}>METHOD DECODED PARAMETERS:</span>
                      <pre style={styles.receiptPre} className="mono-text">
                        {JSON.stringify(selectedTx.args, null, 2)}
                      </pre>
                    </div>
                    <div style={styles.receiptItem}>
                      <span style={styles.receiptLabel}>ESCROW VALUE SENT:</span>
                      <span className="mono-text">{selectedTx.value} STT</span>
                    </div>
                    <div style={styles.receiptItem}>
                      <span style={styles.receiptLabel}>GAS USED:</span>
                      <span className="mono-text amber-glow">{selectedTx.gasUsed} GWEI</span>
                    </div>
                    <div style={styles.receiptItem}>
                      <span style={styles.receiptLabel}>EXECUTION STATUS:</span>
                      <span className={`mono-text ${selectedTx.status === 'success' ? 'green-glow' : 'amber-glow'}`} style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                        {selectedTx.status === 'success' ? 'SUCCESS (0x1)' : `FAILED (0x0) - ${selectedTx.error}`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={styles.emptyState}>
                    <span style={{ fontSize: '3rem' }}>🔬</span>
                    <h3>Select a transaction</h3>
                    <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>
                      Click on any method invocation in the recent blocks panel to parse its onchain EVM storage modifications, gas parameters, and event arguments.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Settings / Config */}
        {activeTab === 'settings' && (
          <div className="cyber-card cyan-border" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="cyber-card-header">
              <h3>LLM ENGINE SETTINGS</h3>
            </div>
            <div className="cyber-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={styles.fieldLabel}>CLAUDE API KEY (OPTIONAL)</label>
                <input 
                  type="password"
                  value={claudeKeyInput}
                  onChange={(e) => setClaudeKeyInput(e.target.value)}
                  placeholder="Paste your Claude API key here..."
                  style={styles.inputField}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
                  If provided, player agents will invoke the live `claude-haiku-4-5-20251001` model to analyze current round histories, personality structures, and devise custom moves. The AI commentator will draft custom esports trash talk. If left empty, a fast, stateful deterministic rule engine simulates decisions and commentary.
                </p>
              </div>

              <button 
                className="cyber-btn"
                onClick={handleSaveApiKey}
                style={{ alignSelf: 'flex-start' }}
              >
                🔒 SAVE CONFIG
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Inline component layout styles
const styles: Record<string, React.CSSProperties> = {
  header: {
    backgroundColor: 'var(--bg-header)',
    borderBottom: '1px solid rgba(0, 240, 255, 0.15)',
    padding: '12px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as 'wrap',
    gap: '15px',
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)'
  },
  headerTitleContainer: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '4px'
  },
  headerLogo: {
    fontSize: '1.6rem',
    color: 'var(--text-main)',
    fontWeight: 900,
    textShadow: '0 0 10px rgba(0, 240, 255, 0.4)'
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  liveIndicatorText: {
    fontSize: '0.65rem',
    fontFamily: 'var(--font-header)',
    color: 'var(--text-muted)',
    letterSpacing: '0.08em'
  },
  tickerContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '25px',
    background: 'rgba(0,0,0,0.3)',
    padding: '8px 15px',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.02)'
  },
  tickerItem: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '2px'
  },
  tickerLabel: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-header)'
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  actionBtn: {
    minWidth: '180px',
    height: '42px',
    fontSize: '0.9rem'
  },
  speedControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(0,0,0,0.2)',
    padding: '5px 10px',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.03)'
  },
  speedBtn: {
    padding: '4px 8px',
    fontSize: '0.7rem',
    minWidth: '45px',
    borderWidth: '1px'
  },
  resetBtn: {
    fontSize: '0.75rem',
    padding: '8px 12px',
    borderColor: 'var(--neon-red)',
    color: 'var(--neon-red)'
  },
  nav: {
    display: 'flex',
    background: 'rgba(5, 6, 15, 0.95)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '0 30px',
    gap: '5px',
    overflowX: 'auto' as 'auto'
  },
  navTab: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-header)',
    fontWeight: 'bold',
    fontSize: '0.8rem',
    padding: '16px 20px',
    cursor: 'pointer',
    letterSpacing: '0.05em',
    borderBottom: '2px solid transparent',
    transition: 'all var(--transition-speed)',
    whiteSpace: 'nowrap' as 'nowrap'
  },
  navTabActive: {
    color: 'var(--neon-cyan)',
    borderBottomColor: 'var(--neon-cyan)',
    textShadow: '0 0 8px rgba(0, 240, 255, 0.5)',
    background: 'rgba(0, 240, 255, 0.03)'
  },
  main: {
    flex: 1,
    padding: '30px',
    maxWidth: '1400px',
    width: '100%',
    margin: '0 auto'
  },
  grid2Col: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
    gap: '30px'
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.03)'
  },
  subHeading: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    marginBottom: '10px'
  },
  playerStakersList: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '8px'
  },
  playerStakerCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(255,255,255,0.02)',
    padding: '10px 15px',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.03)'
  },
  stakeBadge: {
    fontSize: '0.75rem',
    backgroundColor: 'rgba(57, 255, 20, 0.1)',
    color: 'var(--neon-green)',
    border: '1px solid var(--neon-green)',
    padding: '3px 8px',
    borderRadius: '2px',
    fontWeight: 'bold',
    fontFamily: 'var(--font-header)'
  },
  agentBalanceCard: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid',
    borderRadius: '4px',
    padding: '12px',
    alignItems: 'center',
    textAlign: 'center' as 'center'
  },
  faucetBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--text-muted)',
    fontSize: '0.65rem',
    marginTop: '8px',
    padding: '3px 6px',
    borderRadius: '2px',
    cursor: 'pointer',
    fontFamily: 'var(--font-header)',
    transition: 'all 0.2s'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '220px',
    padding: '30px'
  },
  cooldownAlert: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    background: 'rgba(255, 0, 127, 0.05)',
    marginTop: '10px'
  },
  feedBody: {
    flex: 1,
    overflowY: 'auto' as 'auto',
    display: 'flex',
    flexDirection: 'column-reverse' as 'column-reverse',
    gap: '12px',
    padding: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.45)'
  },
  logRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
    paddingBottom: '8px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as 'collapse',
    textAlign: 'left' as 'left',
    marginTop: '10px'
  },
  th: {
    borderBottom: '2px solid rgba(0, 240, 255, 0.15)',
    padding: '12px 16px',
    color: 'var(--neon-cyan)',
    fontFamily: 'var(--font-header)',
    fontSize: '0.85rem'
  },
  td: {
    padding: '18px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)'
  },
  tr: {
    transition: 'background var(--transition-speed)',
    cursor: 'default'
  },
  receiptContainer: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '16px'
  },
  receiptItem: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '4px'
  },
  receiptLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-header)'
  },
  receiptPre: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: '12px',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.05)',
    fontSize: '0.8rem',
    color: 'var(--neon-green)',
    overflowX: 'auto' as 'auto'
  },
  fieldLabel: {
    display: 'block',
    fontSize: '0.8rem',
    fontFamily: 'var(--font-header)',
    color: 'var(--neon-cyan)',
    marginBottom: '8px'
  },
  inputField: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    border: '1px solid rgba(0, 240, 255, 0.2)',
    borderRadius: '4px',
    padding: '12px',
    color: 'var(--text-main)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border var(--transition-speed)'
  },
  blockTxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid rgba(255,255,255,0.03)',
    borderRadius: '4px',
    padding: '8px 12px',
    marginTop: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  txBadge: {
    fontSize: '0.65rem',
    padding: '2px 6px',
    borderRadius: '2px',
    textTransform: 'uppercase' as 'uppercase',
    fontWeight: 'bold',
    minWidth: '100px',
    textAlign: 'center' as 'center'
  },
  txBadgeLarge: {
    fontSize: '0.8rem',
    padding: '4px 10px',
    borderRadius: '2px',
    textTransform: 'uppercase' as 'uppercase',
    fontWeight: 'bold',
    alignSelf: 'flex-start'
  },
  bracketContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '30px 10px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '6px'
  },
  bracketColumn: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    width: '280px',
    gap: '20px'
  },
  bracketColHeader: {
    textAlign: 'center' as 'center',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '8px',
    fontSize: '0.8rem',
    color: 'var(--text-muted)'
  },
  bracketMatchWrapper: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '40px'
  },
  bracketMatchCard: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid',
    borderRadius: '4px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '10px',
    position: 'relative' as 'relative'
  },
  bracketMatchHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    borderBottom: '1px solid rgba(255,255,255,0.02)',
    paddingBottom: '4px',
    fontFamily: 'var(--font-header)'
  },
  bracketPlayers: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '6px'
  },
  bracketPlayerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem'
  },
  bracketLinkContainer: {
    width: '40px',
    height: '180px',
    position: 'relative' as 'relative',
    display: 'flex'
  },
  bracketLineLeft: {
    position: 'absolute',
    left: 0,
    top: '40px',
    width: '20px',
    height: '100px',
    border: '1px solid rgba(0, 240, 255, 0.15)',
    borderLeft: 'none'
  },
  bracketLineRight: {
    position: 'absolute',
    right: 0,
    top: '90px',
    width: '20px',
    height: '1px',
    borderTop: '1px solid rgba(0, 240, 255, 0.15)'
  },
  arenaHeaderScore: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.02)',
    borderRadius: '4px',
    padding: '15px'
  },
  arenaScorePanel: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    alignItems: 'center',
    fontSize: '0.85rem'
  },
  arenaScoreVs: {
    fontSize: '1.2rem',
    fontFamily: 'var(--font-header)',
    color: 'var(--text-muted)'
  },
  ringContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '40px 10px',
    gap: '15px'
  },
  arenaFighterCard: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    alignItems: 'center',
    width: '200px',
    gap: '10px'
  },
  fighterAvatar: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    border: '2px solid'
  },
  revealMoveBox: {
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.03)',
    borderRadius: '4px',
    width: '100%',
    textAlign: 'center' as 'center'
  },
  moveToken: {
    fontSize: '0.9rem',
    color: 'var(--neon-cyan)',
    fontWeight: 'bold',
    fontFamily: 'var(--font-header)',
    textShadow: 'var(--glow-cyan)'
  },
  moveTokenMagenta: {
    fontSize: '0.9rem',
    color: 'var(--neon-magenta)',
    fontWeight: 'bold',
    fontFamily: 'var(--font-header)',
    textShadow: 'var(--glow-magenta)'
  },
  arenaClashCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '60px',
    height: '60px',
    position: 'relative' as 'relative'
  },
  clashPulseBeam: {
    position: 'absolute',
    width: '120px',
    height: '2px',
    background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-magenta))',
    boxShadow: '0 0 10px rgba(0, 240, 255, 0.8)',
    animation: 'pulseGradual 1s infinite'
  },
  reasoningConsole: {
    background: 'rgba(0,0,0,0.6)',
    border: '1px solid rgba(0,240,255,0.08)',
    borderRadius: '4px',
    padding: '12px',
    minHeight: '110px'
  },
  commentaryBody: {
    flex: 1,
    overflowY: 'auto' as 'auto',
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '15px',
    padding: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.45)'
  },
  commentaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderLeft: '3px solid var(--neon-magenta)',
    padding: '12px 15px',
    borderRadius: '0 4px 4px 0'
  },
  commentaryMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    marginBottom: '6px'
  },
  commentaryText: {
    fontSize: '0.95rem',
    fontStyle: 'italic',
    lineHeight: '1.4'
  },
  explorerRow: {
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    padding: '16px 20px',
    cursor: 'default'
  },
  selectDropdown: {
    background: '#090a12',
    color: 'var(--neon-cyan)',
    border: '1px solid var(--neon-cyan)',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontFamily: 'var(--font-mono)',
    fontWeight: 'bold',
    outline: 'none',
    cursor: 'pointer',
    textShadow: '0 0 5px rgba(0, 240, 255, 0.4)',
    boxShadow: '0 0 5px rgba(0, 240, 255, 0.2)'
  },
  keyBtn: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'var(--text-muted)',
    fontSize: '0.65rem',
    padding: '4px 6px',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }
};
