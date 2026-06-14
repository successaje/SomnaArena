import { Move } from '../engine/gameEngine';

export interface Tx {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  method: string;
  args: any[];
  value: number; // STT
  gasUsed: number;
  status: 'success' | 'failed';
  error?: string;
}

export interface Block {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: number;
  transactions: Tx[];
}

export interface ChainEvent {
  id: string;
  name: 'TournamentCreated' | 'PlayerJoined' | 'MatchStarted' | 'MatchResolved' | 'TournamentFinalized' | 'Deposit' | 'Withdrawal';
  data: any;
  timestamp: number;
  blockNumber: number;
  txHash: string;
}

export interface TournamentData {
  id: number;
  organizer: string;
  entryFee: number;
  maxPlayers: number;
  prizeFunds: number;
  totalPrizePool: number;
  state: 'Open' | 'Active' | 'Finalized';
  players: string[]; // addresses
  matchIds: number[];
  winner: string | null;
}

export interface MatchData {
  id: number;
  tournamentId: number;
  player1: string;
  player2: string;
  state: 'Pending' | 'Active' | 'Resolved';
  winner: string | null;
}

export interface Account {
  address: string;
  name: string;
  role: string;
  balance: number; // STT
  color: string; // for UI representation
}

// Preset Addresses
export const AGENT_ACCOUNTS: Account[] = [
  { address: '0x1111111111111111111111111111111111111111', name: 'Synthetix Organizer', role: 'organizer', balance: 5000, color: '#00F0FF' },
  { address: '0x2222222222222222222222222222222222222222', name: 'Ref-Alpha Arbitrator', role: 'referee', balance: 500, color: '#39FF14' },
  { address: '0x3333333333333333333333333333333333333333', name: 'Neon Cast Commentator', role: 'commentator', balance: 500, color: '#FF007F' },
  { address: '0x4444444444444444444444444444444444444444', name: 'ShadowByte', role: 'player_shadowbyte', balance: 1000, color: '#A020F0' },
  { address: '0x5555555555555555555555555555555555555555', name: 'QuantumCore', role: 'player_quantumcore', balance: 1000, color: '#FFB800' },
  { address: '0x6666666666666666666666666666666666666666', name: 'CyberSlasher', role: 'player_cyberslasher', balance: 1000, color: '#FF3333' },
  { address: '0x7777777777777777777777777777777777777777', name: 'NeonViper', role: 'player_neonviper', balance: 1000, color: '#00FF66' },
];

export const CONTRACT_ADDRESS = '0xSomnArenaTournamentContractXXXXXXXXXXXX';

export class SomniaChain {
  blocks: Block[] = [];
  txQueue: Tx[] = [];
  events: ChainEvent[] = [];
  accounts: Account[] = [];
  
  // Contract storage variables
  tournaments: Record<number, TournamentData> = {};
  matches: Record<number, MatchData> = {};
  escrowBalances: Record<string, number> = {}; // Address -> STT in escrow
  
  nextTournamentId = 1;
  nextMatchId = 1;
  
  listeners: ((event: ChainEvent) => void)[] = [];

  constructor() {
    this.resetChain();
  }

  resetChain() {
    this.blocks = [];
    this.txQueue = [];
    this.events = [];
    this.tournaments = {};
    this.matches = {};
    this.escrowBalances = {};
    this.nextTournamentId = 1;
    this.nextMatchId = 1;
    
    // Deep copy starting accounts
    this.accounts = JSON.parse(JSON.stringify(AGENT_ACCOUNTS));
    
    // Initialize Genesis Block
    const genesisBlock: Block = {
      number: 0,
      hash: this.generateHash(),
      parentHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      timestamp: Date.now() - 1000 * 60 * 60, // 1 hour ago
      transactions: []
    };
    this.blocks.push(genesisBlock);
  }

  // Load from local storage
  loadFromLocalStorage() {
    if (typeof window === 'undefined') return;
    const dataStr = localStorage.getItem('somnia_chain_state');
    if (!dataStr) return;

    try {
      const state = JSON.parse(dataStr);
      this.blocks = state.blocks || [];
      this.txQueue = state.txQueue || [];
      this.events = state.events || [];
      this.accounts = state.accounts || [];
      this.tournaments = state.tournaments || {};
      this.matches = state.matches || {};
      this.escrowBalances = state.escrowBalances || {};
      this.nextTournamentId = state.nextTournamentId || 1;
      this.nextMatchId = state.nextMatchId || 1;
    } catch (e) {
      console.error('Failed to parse local chain state, resetting:', e);
      this.resetChain();
    }
  }

  // Save to local storage
  saveToLocalStorage() {
    if (typeof window === 'undefined') return;
    try {
      const state = {
        blocks: this.blocks,
        txQueue: this.txQueue,
        events: this.events,
        accounts: this.accounts,
        tournaments: this.tournaments,
        matches: this.matches,
        escrowBalances: this.escrowBalances,
        nextTournamentId: this.nextTournamentId,
        nextMatchId: this.nextMatchId
      };
      localStorage.setItem('somnia_chain_state', JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save chain state:', e);
    }
  }

  subscribe(listener: (event: ChainEvent) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emitEvent(name: ChainEvent['name'], data: any, txHash: string, blockNumber: number) {
    const event: ChainEvent = {
      id: this.generateHash().substring(0, 16),
      name,
      data,
      timestamp: Date.now(),
      blockNumber,
      txHash
    };
    this.events.push(event);
    this.listeners.forEach(l => l(event));
  }

  generateHash(): string {
    return '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  getAccount(address: string): Account | undefined {
    return this.accounts.find(a => a.address.toLowerCase() === address.toLowerCase());
  }

  // Simulates transaction execution
  submitTransaction(from: string, method: string, args: any[], value: number = 0): Tx {
    const txHash = this.generateHash();
    const blockNumber = this.blocks.length;
    const gasUsed = Math.floor(21000 + Math.random() * 80000);
    const sender = this.getAccount(from);

    let status: 'success' | 'failed' = 'success';
    let error: string | undefined = undefined;

    if (!sender) {
      status = 'failed';
      error = 'Sender address not registered';
    } else {
      // Auto-faucet for local simulation so agents never run out of STT
      if (sender.balance < 1000) {
        sender.balance += 10000;
      }
      
      if (sender.balance + (method === 'deposit' ? 0 : 0) < value) {
        status = 'failed';
        error = 'Insufficient gas or value balance';
      }
    }

    if (status === 'success' && sender) {
      // Execute Solidity Logic
      try {
        if (method === 'createTournament') {
          // Args: [entryFee, maxPlayers, prizeFunds]
          const [entryFee, maxPlayers, prizeFunds] = args as [number, number, number];
          if (maxPlayers < 2) throw new Error('Need at least 2 players');
          
          if (prizeFunds > 0) {
            if (sender.balance < prizeFunds) throw new Error('Insufficient balance for prize escrow');
            sender.balance -= prizeFunds;
          }

          const tId = this.nextTournamentId++;
          this.tournaments[tId] = {
            id: tId,
            organizer: from,
            entryFee,
            maxPlayers,
            prizeFunds,
            totalPrizePool: prizeFunds,
            state: 'Open',
            players: [],
            matchIds: [],
            winner: null
          };

          this.emitEvent('TournamentCreated', {
            tournamentId: tId,
            organizer: from,
            entryFee,
            maxPlayers,
            prizeFunds
          }, txHash, blockNumber);

        } else if (method === 'joinTournament') {
          // Args: [tournamentId]
          const [tId] = args as [number];
          const t = this.tournaments[tId];
          if (!t) throw new Error('Tournament not found');
          if (t.state !== 'Open') throw new Error('Tournament not open');
          if (t.players.length >= t.maxPlayers) throw new Error('Tournament full');
          if (t.players.includes(from)) throw new Error('Already joined');

          if (t.entryFee > 0) {
            if (sender.balance < t.entryFee) throw new Error('Insufficient balance to join');
            sender.balance -= t.entryFee;
            t.totalPrizePool += t.entryFee;
          }

          t.players.push(from);
          this.emitEvent('PlayerJoined', {
            tournamentId: tId,
            player: from,
            feePaid: t.entryFee
          }, txHash, blockNumber);

          if (t.players.length === t.maxPlayers) {
            t.state = 'Active';
          }

        } else if (method === 'startMatch') {
          // Args: [tournamentId, player1, player2]
          const [tId, p1, p2] = args as [number, string, string];
          const t = this.tournaments[tId];
          if (!t) throw new Error('Tournament not found');
          if (t.state !== 'Active') throw new Error('Tournament not active');

          const mId = this.nextMatchId++;
          this.matches[mId] = {
            id: mId,
            tournamentId: tId,
            player1: p1,
            player2: p2,
            state: 'Active',
            winner: null
          };
          t.matchIds.push(mId);

          this.emitEvent('MatchStarted', {
            tournamentId: tId,
            matchId: mId,
            player1: p1,
            player2: p2
          }, txHash, blockNumber);

        } else if (method === 'submitResult') {
          // Args: [matchId, winner]
          const [mId, winner] = args as [number, string];
          const m = this.matches[mId];
          if (!m) throw new Error('Match not found');
          if (m.state !== 'Active') throw new Error('Match not active');
          if (winner !== m.player1 && winner !== m.player2) throw new Error('Winner must be a participant');

          m.winner = winner;
          m.state = 'Resolved';

          this.emitEvent('MatchResolved', {
            tournamentId: m.tournamentId,
            matchId: mId,
            winner
          }, txHash, blockNumber);

        } else if (method === 'finalizeTournament') {
          // Args: [tournamentId, winner]
          const [tId, winner] = args as [number, string];
          const t = this.tournaments[tId];
          if (!t) throw new Error('Tournament not found');
          if (t.state !== 'Active') throw new Error('Tournament not active');
          if (!t.players.includes(winner)) throw new Error('Winner must be a tournament player');

          t.winner = winner;
          t.state = 'Finalized';

          // Distribute balance
          const winnerAcc = this.getAccount(winner);
          if (winnerAcc) {
            winnerAcc.balance += t.totalPrizePool;
          }

          this.emitEvent('TournamentFinalized', {
            tournamentId: tId,
            winner,
            totalPayout: t.totalPrizePool
          }, txHash, blockNumber);

        } else if (method === 'deposit') {
          sender.balance += value;
          this.emitEvent('Deposit', {
            user: from,
            amount: value
          }, txHash, blockNumber);
        } else if (method === 'faucetClaim') {
          sender.balance += 200; // standard drip
          this.emitEvent('Deposit', {
            user: from,
            amount: 200
          }, txHash, blockNumber);
        } else {
          throw new Error(`Unknown contract method: ${method}`);
        }
      } catch (e: any) {
        status = 'failed';
        error = e.message || 'Unknown EVM execution error';
      }
    }

    const tx: Tx = {
      hash: txHash,
      blockNumber,
      timestamp: Date.now(),
      from,
      to: CONTRACT_ADDRESS,
      method,
      args,
      value,
      gasUsed,
      status,
      error
    };

    // If success, mine block containing this transaction
    if (status === 'success') {
      this.mineBlockWithTx(tx);
    } else {
      // In a real blockchain, even failed transactions are mined on-chain, consuming gas
      this.mineBlockWithTx(tx);
    }

    this.saveToLocalStorage();
    return tx;
  }

  private mineBlockWithTx(tx: Tx) {
    const parentBlock = this.blocks[this.blocks.length - 1];
    const newBlock: Block = {
      number: parentBlock.number + 1,
      hash: this.generateHash(),
      parentHash: parentBlock.hash,
      timestamp: Date.now(),
      transactions: [tx]
    };
    this.blocks.push(newBlock);
  }

  // Generates an empty block (mined when chain is idle to simulate block times)
  mineEmptyBlock() {
    const parentBlock = this.blocks[this.blocks.length - 1];
    const newBlock: Block = {
      number: parentBlock.number + 1,
      hash: this.generateHash(),
      parentHash: parentBlock.hash,
      timestamp: Date.now(),
      transactions: []
    };
    this.blocks.push(newBlock);
    this.saveToLocalStorage();
    return newBlock;
  }
}

// Global chain instance
export const globalSomniaChain = new SomniaChain();
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.somniaChain = globalSomniaChain; // Expose for console debugging
}
