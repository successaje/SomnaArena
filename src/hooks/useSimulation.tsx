'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { globalAgentSimulator, SimState, AgentActivityLog, CommentaryMessage } from '../agents/agentSystem';
import { globalSomniaChain, Block, TxEvent, Account, TournamentData, MatchData } from '../blockchain/somniaSim';

interface SimulationContextProps {
  simState: SimState;
  activities: AgentActivityLog[];
  commentary: CommentaryMessage[];
  highlights: { id: string; tournamentId: number; text: string; timestamp: number }[];
  isRunning: boolean;
  blocks: Block[];
  events: TxEvent[];
  accounts: Account[];
  tournaments: Record<number, TournamentData>;
  matches: Record<number, MatchData>;
  gasPrice: number;
  toggleSimulation: () => void;
  resetChain: () => void;
  setGeminiApiKey: (key: string) => void;
}

const SimulationContext = createContext<SimulationContextProps | undefined>(undefined);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [simState, setSimState] = useState<SimState>(globalAgentSimulator.state);
  const [activities, setActivities] = useState<AgentActivityLog[]>(globalAgentSimulator.activities);
  const [commentary, setCommentary] = useState<CommentaryMessage[]>(globalAgentSimulator.commentary);
  const [highlights, setHighlights] = useState(globalAgentSimulator.highlights);
  const [isRunning, setIsRunning] = useState<boolean>(globalAgentSimulator.timerId !== null);
  
  const [blocks, setBlocks] = useState<Block[]>(globalSomniaChain.blocks);
  const [events, setEvents] = useState<TxEvent[]>(globalSomniaChain.events);
  const [accounts, setAccounts] = useState<Account[]>(globalSomniaChain.accounts);
  const [tournaments, setTournaments] = useState<Record<number, TournamentData>>(globalSomniaChain.tournaments);
  const [matches, setMatches] = useState<Record<number, MatchData>>(globalSomniaChain.matches);
  const [gasPrice, setGasPrice] = useState(110);

  useEffect(() => {
    const unsubscribeSim = globalAgentSimulator.subscribe((state) => {
      setSimState({ ...state });
      setActivities([...globalAgentSimulator.activities]);
      setCommentary([...globalAgentSimulator.commentary]);
      setHighlights([...globalAgentSimulator.highlights]);
      setIsRunning(globalAgentSimulator.timerId !== null);
    });

    const unsubscribeChain = globalSomniaChain.subscribe((_event) => {
      setBlocks([...globalSomniaChain.blocks]);
      setEvents([...globalSomniaChain.events]);
      setAccounts([...globalSomniaChain.accounts]);
      setTournaments({ ...globalSomniaChain.tournaments });
      setMatches({ ...globalSomniaChain.matches });
    });

    const interval = setInterval(() => {
      setGasPrice(prev => Math.max(90, Math.min(130, prev + Math.floor(Math.random() * 9) - 4)));
    }, 4000);

    return () => {
      unsubscribeSim();
      unsubscribeChain();
      clearInterval(interval);
    };
  }, []);

  const toggleSimulation = () => {
    if (isRunning) {
      globalAgentSimulator.stopSimulation();
      setIsRunning(false);
    } else {
      globalAgentSimulator.startSimulation();
      setIsRunning(true);
    }
  };

  const resetChain = () => {
    if (window.confirm('Are you sure you want to hard reset the Somnia L1 simulation?')) {
      globalSomniaChain.resetChain();
      globalAgentSimulator.activities = [];
      globalAgentSimulator.commentary = [];
      globalAgentSimulator.state = {
        ...globalAgentSimulator.state,
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
      };
      
      globalSomniaChain.saveToLocalStorage();
      globalAgentSimulator.saveToLocalStorage();

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

  return (
    <SimulationContext.Provider
      value={{
        simState,
        activities,
        commentary,
        highlights,
        isRunning,
        blocks,
        events,
        accounts,
        tournaments,
        matches,
        gasPrice,
        toggleSimulation,
        resetChain,
        setGeminiApiKey: (key: string) => globalAgentSimulator.setGeminiApiKey(key)
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
}
