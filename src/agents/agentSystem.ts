import { globalSomniaChain, SomniaChain, TournamentData, MatchData, Tx, CONTRACT_ADDRESS } from '../blockchain/somniaSim';
import { getPlayerDecision, getCommentary, getAgentProfileByAddress, saveAgentMemory, PlayerDecision } from './agentLogic';
import { resolveRound, updateMatchState, MatchState, Move } from '../engine/gameEngine';
import { globalSomniaTestnetClient, CONTRACT_ADDRESS as TESTNET_CONTRACT_ADDRESS, CONTRACT_ABI as TESTNET_CONTRACT_ABI } from '../blockchain/somniaTestnetClient';
import { ethers } from 'ethers';

export type SimPhase =
  | 'IDLE'
  | 'CREATING_TOURNAMENT'
  | 'PLAYERS_JOINING'
  | 'SCHEDULING_MATCHES'
  | 'MATCH_STARTING'
  | 'PLAYERS_THINKING'
  | 'ROUND_CLASH'
  | 'ROUND_RESOLVED'
  | 'MATCH_RESOLVED'
  | 'TOURNAMENT_FINALIZING'
  | 'TOURNAMENT_SETTLED'
  | 'COOLDOWN';

export interface AgentActivityLog {
  id: string;
  agentAddress: string;
  agentName: string;
  action: string;
  timestamp: number;
}

export interface CommentaryMessage {
  id: string;
  text: string;
  timestamp: number;
}

export interface SimState {
  phase: SimPhase;
  activeTournamentId: number | null;
  activeMatchId: number | null;
  currentRoundNum: number;
  player1Address: string | null;
  player2Address: string | null;
  player1Move: Move | null;
  player2Move: Move | null;
  player1Thought: string | null;
  player2Thought: string | null;
  player1Wins: number;
  player2Wins: number;
  matchWinner: string | null;
  tournamentWinner: string | null;
  cooldownRemaining: number; // in seconds
  speedMultiplier: number; // 0.5x, 1x, 2x
  isLiveTestnet: boolean;
}

export class AgentSimulator {
  chain: SomniaChain;
  state: SimState;
  
  activities: AgentActivityLog[] = [];
  commentary: CommentaryMessage[] = [];
  
  // Settings
  claudeApiKey: string = '';
  timerId: NodeJS.Timeout | null = null;
  updateListeners: ((state: SimState) => void)[] = [];
  
  // Internal tournament brackets
  // For a 4-player tournament: Semifinal 1, Semifinal 2, Finals
  bracketMatches: {
    stage: 'Semifinals' | 'Finals';
    p1: string;
    p2: string;
    matchId: number | null;
    resolved: boolean;
    winner: string | null;
  }[] = [];
  
  currentBracketIndex = 0;
  currentMatchRounds: { round: number; move1: Move; move2: Move; winner: string | null }[] = [];

  constructor(chain: SomniaChain = globalSomniaChain) {
    this.chain = chain;
    this.state = {
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
      isLiveTestnet: false
    };
    
    // Load chain and memory
    this.chain.loadFromLocalStorage();
    this.loadFromLocalStorage();
  }

  loadFromLocalStorage() {
    if (typeof window === 'undefined') return;
    const simData = localStorage.getItem('somnarena_sim_state');
    const actData = localStorage.getItem('somnarena_activities');
    const comData = localStorage.getItem('somnarena_commentary');
    const apiKey = localStorage.getItem('somnarena_claude_key');

    if (apiKey) this.claudeApiKey = apiKey;

    if (simData) {
      try {
        const parsed = JSON.parse(simData);
        // Do not preserve active runner loops, reset to IDLE if it was mid-run
        this.state = {
          ...parsed,
          phase: 'IDLE' // Reset to idle so the user can hit Start
        };
      } catch (e) {
        console.error('Failed to load sim state', e);
      }
    }
    if (actData) {
      try { this.activities = JSON.parse(actData); } catch (e) {}
    }
    if (comData) {
      try { this.commentary = JSON.parse(comData); } catch (e) {}
    }
    if (this.state.isLiveTestnet) {
      this.syncFromTestnet();
    }
  }

  saveToLocalStorage() {
    if (typeof window === 'undefined') return;
    localStorage.setItem('somnarena_sim_state', JSON.stringify(this.state));
    localStorage.setItem('somnarena_activities', JSON.stringify(this.activities.slice(-100)));
    localStorage.setItem('somnarena_commentary', JSON.stringify(this.commentary.slice(-100)));
    if (this.claudeApiKey) {
      localStorage.setItem('somnarena_claude_key', this.claudeApiKey);
    }
  }

  setClaudeApiKey(key: string) {
    this.claudeApiKey = key;
    this.saveToLocalStorage();
  }

  setLiveTestnet(enabled: boolean) {
    this.state.isLiveTestnet = enabled;
    this.saveToLocalStorage();
    this.notify();
    if (enabled) {
      this.syncFromTestnet();
    }
  }

  async syncFromTestnet() {
    if (!this.state.isLiveTestnet) return;
    try {
      // 1. Sync tournaments list
      const tournaments = await globalSomniaTestnetClient.syncTournaments();
      this.chain.tournaments = tournaments;
      
      // Update next tournament ID
      const nextTId = await globalSomniaTestnetClient.contract.nextTournamentId();
      this.chain.nextTournamentId = Number(nextTId);

      // 2. Sync matches details
      const nextMId = await globalSomniaTestnetClient.contract.nextMatchId();
      this.chain.nextMatchId = Number(nextMId);
      
      for (let i = 1; i < Number(nextMId); i++) {
        const raw = await globalSomniaTestnetClient.contract.matches(i);
        this.chain.matches[i] = {
          id: Number(raw.id),
          tournamentId: Number(raw.tournamentId),
          player1: raw.player1,
          player2: raw.player2,
          state: raw.state === 0 ? 'Pending' : raw.state === 1 ? 'Active' : 'Resolved',
          winner: raw.winner === ethers.ZeroAddress ? null : raw.winner
        };
      }

      // 3. Sync agent balances
      const wallets = await globalSomniaTestnetClient.syncAgentBalances();
      this.chain.accounts.forEach(acc => {
        const wallet = wallets.find(w => w.name.toLowerCase() === acc.name.toLowerCase() || w.role.toLowerCase() === acc.role.toLowerCase());
        if (wallet) {
          acc.balance = Number(wallet.contractBalance);
          (acc as any).nativeBalance = Number(wallet.nativeBalance);
          acc.address = wallet.address;
        }
      });

      // 4. Update block number in mock chain blocks list (explorer view)
      const blockNum = await globalSomniaTestnetClient.provider.getBlockNumber();
      const latestBlock = await globalSomniaTestnetClient.provider.getBlock(blockNum, true);
      if (latestBlock && !this.chain.blocks.some(b => b.number === blockNum)) {
        const mappedTx = latestBlock.transactions.map((tx: any) => {
          const isString = typeof tx === 'string';
          const hash = isString ? tx : tx.hash || '';
          const from = isString ? '' : tx.from || '';
          const to = isString ? '' : tx.to || '';
          const val = isString || tx.value === undefined || tx.value === null ? BigInt(0) : BigInt(tx.value);
          return {
            hash,
            blockNumber: blockNum,
            timestamp: Number(latestBlock.timestamp) * 1000,
            from,
            to,
            method: 'unknown',
            args: [],
            value: Number(ethers.formatEther(val)),
            gasUsed: 21000,
            status: 'success' as const
          };
        });
        this.chain.blocks.push({
          number: blockNum,
          hash: latestBlock.hash || '',
          parentHash: latestBlock.parentHash || '',
          timestamp: Number(latestBlock.timestamp) * 1000,
          transactions: mappedTx
        });
        if (this.chain.blocks.length > 50) {
          this.chain.blocks.shift();
        }
      }

      this.chain.saveToLocalStorage();
      this.notify();
    } catch (e) {
      console.error('Failed to sync from testnet:', e);
    }
  }

  private async executeTx(from: string, method: string, args: any[], value: number = 0) {
    if (this.state.isLiveTestnet) {
      try {
        const wallets = globalSomniaTestnetClient.getAgentWallets();
        const agent = wallets.find(w => w.address.toLowerCase() === from.toLowerCase() || w.role.toLowerCase() === from.toLowerCase());
        if (agent && agent.privateKey) {
          const signer = new ethers.Wallet(agent.privateKey, globalSomniaTestnetClient.provider);
          const contractWithSigner = new ethers.Contract(
            TESTNET_CONTRACT_ADDRESS,
            TESTNET_CONTRACT_ABI,
            signer
          );

          if (method === 'createTournament') {
            const prizeFundsSTT = args[2];
            const requiredWei = ethers.parseEther(prizeFundsSTT.toString());
            const currentBal = await contractWithSigner.balances(agent.address);
            if (currentBal < requiredWei) {
              const needed = requiredWei - currentBal;
              console.log(`[Auto-Escrow] Organizer escrow balance low (${ethers.formatEther(currentBal)} STT). Minting ${ethers.formatEther(needed)} STT via depositSTT...`);
              const tx = await contractWithSigner.depositSTT(needed);
              await tx.wait(1);
              console.log(`[Auto-Escrow] Escrow top-up transaction completed.`);
            }
          } else if (method === 'joinTournament') {
            const tId = args[0];
            const t = await contractWithSigner.tournaments(tId);
            const entryFeeWei = t.entryFee || t[2];
            const currentBal = await contractWithSigner.balances(agent.address);
            if (currentBal < entryFeeWei) {
              const needed = entryFeeWei - currentBal;
              console.log(`[Auto-Escrow] Player ${agent.name} escrow balance low (${ethers.formatEther(currentBal)} STT). Minting ${ethers.formatEther(needed)} STT via depositSTT...`);
              const tx = await contractWithSigner.depositSTT(needed);
              await tx.wait(1);
              console.log(`[Auto-Escrow] Escrow top-up transaction completed.`);
            }
          }
        }
      } catch (err) {
        console.error("[Auto-Escrow] Check/mint execution error:", err);
      }

      const res = await globalSomniaTestnetClient.submitTransaction(from, method, args, value.toString());
      if (res.status === 'success') {
        await this.syncFromTestnet();
        return {
          status: 'success' as const,
          hash: res.hash,
          error: undefined
        };
      } else {
        return {
          status: 'failed' as const,
          hash: res.hash,
          error: res.error
        };
      }
    } else {
      return this.chain.submitTransaction(from, method, args, value);
    }
  }

  subscribe(listener: (state: SimState) => void) {
    this.updateListeners.push(listener);
    // Push current state initially
    listener(this.state);
    return () => {
      this.updateListeners = this.updateListeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.updateListeners.forEach(l => l(this.state));
    this.saveToLocalStorage();
  }

  private logActivity(agentAddress: string, agentName: string, action: string) {
    const log: AgentActivityLog = {
      id: Math.random().toString(),
      agentAddress,
      agentName,
      action,
      timestamp: Date.now()
    };
    this.activities = [log, ...this.activities].slice(0, 100);
    this.notify();
  }

  private async pushCommentary(stage: Parameters<typeof getCommentary>[0], contextData: any) {
    const text = await getCommentary(stage, contextData, this.claudeApiKey);
    const msg: CommentaryMessage = {
      id: Math.random().toString(),
      text,
      timestamp: Date.now()
    };
    this.commentary = [msg, ...this.commentary].slice(0, 100);
    this.notify();
  }

  setSpeed(multiplier: number) {
    this.state.speedMultiplier = multiplier;
    this.notify();
  }

  startSimulation() {
    if (this.timerId) return;
    this.runLoop();
  }

  stopSimulation() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.state.phase = 'IDLE';
    this.notify();
  }

  private getDelay(baseMs: number): number {
    return baseMs / this.state.speedMultiplier;
  }

  private runAfterDelay(callback: () => Promise<void>, baseMs: number) {
    const delay = this.getDelay(baseMs);
    this.timerId = setTimeout(async () => {
      await callback();
    }, delay);
  }

  private async runLoop() {
    try {
      switch (this.state.phase) {
        case 'IDLE':
          // Start the cycle: organizer decides to create a tournament
          this.state.phase = 'CREATING_TOURNAMENT';
          this.notify();
          await this.organizerCreateTournament();
          break;

        case 'CREATING_TOURNAMENT':
          // Waiting for creation to finalize
          break;

        case 'PLAYERS_JOINING':
          await this.playersJoinTournament();
          break;

        case 'SCHEDULING_MATCHES':
          await this.refereeCreateBracket();
          break;

        case 'MATCH_STARTING':
          await this.startNextMatch();
          break;

        case 'PLAYERS_THINKING':
          await this.generateMoves();
          break;

        case 'ROUND_CLASH':
          await this.resolveRpsRound();
          break;

        case 'ROUND_RESOLVED':
          await this.checkMatchProgression();
          break;

        case 'MATCH_RESOLVED':
          await this.checkBracketProgression();
          break;

        case 'TOURNAMENT_FINALIZING':
          await this.finalizeTournamentOnchain();
          break;

        case 'TOURNAMENT_SETTLED':
          this.state.phase = 'COOLDOWN';
          this.state.cooldownRemaining = 15; // 15s cooldown
          this.notify();
          this.runCooldown();
          break;

        case 'COOLDOWN':
          break;
      }
    } catch (err) {
      console.error('Error in simulation loop:', err);
      this.stopSimulation();
    }
  }

  // 1. Organizer Creates Tournament
  private async organizerCreateTournament() {
    const organizer = this.state.isLiveTestnet 
      ? globalSomniaTestnetClient.getAgentWallets().find(w => w.role === 'organizer')?.address || ''
      : '0x1111111111111111111111111111111111111111';
    const orgName = 'Synthetix Organizer';

    this.logActivity(organizer, orgName, 'Analyzing current participant grid. Formulating tournament config...');
    
    this.runAfterDelay(async () => {
      const entryFee = 100;
      const maxPlayers = 4;
      const prizeFunds = 500; // Organizer sponsors 500 STT

      this.logActivity(organizer, orgName, `Broadcasting createTournament(fee: ${entryFee} STT, maxPlayers: ${maxPlayers}, sponsor: ${prizeFunds} STT) to L1 mempool.`);

      // Send L1 transaction
      const tx = await this.executeTx(organizer, 'createTournament', [entryFee, maxPlayers, prizeFunds]);
      if (tx.status === 'success') {
        const tId = this.chain.nextTournamentId - 1;
        this.state.activeTournamentId = tId;
        this.state.phase = 'PLAYERS_JOINING';
        this.notify();

        const logMsg = this.state.isLiveTestnet
          ? `Tournament contract initiated. ID: #${tId} - Tx: ${tx.hash.substring(0, 10)}...`
          : `Tournament contract initiated. ID: #${tId} - Awaiting Player staking transactions.`;
        this.logActivity(organizer, orgName, logMsg);
        
        // Trigger commentary
        await this.pushCommentary('join', { playerName: 'Synthetix Organizer (Escrow Sponsor)' });

        this.runLoop();
      } else {
        this.logActivity(organizer, orgName, `ERROR: Tournament creation failed: ${tx.error}`);
        this.stopSimulation();
      }
    }, 2000);
  }

  // 2. Players Stakes fees & Joins
  private async playersJoinTournament() {
    const tId = this.state.activeTournamentId!;
    const t = this.chain.tournaments[tId];
    
    // Four player addresses
    const wallets = globalSomniaTestnetClient.getAgentWallets();
    const playerAddresses = this.state.isLiveTestnet ? [
      wallets.find(w => w.role === 'player_shadowbyte')?.address || '',
      wallets.find(w => w.role === 'player_quantumcore')?.address || '',
      wallets.find(w => w.role === 'player_cyberslasher')?.address || '',
      wallets.find(w => w.role === 'player_neonviper')?.address || '',
    ] : [
      '0x4444444444444444444444444444444444444444', // ShadowByte
      '0x5555555555555555555555555555555555555555', // QuantumCore
      '0x6666666666666666666666666666666666666666', // CyberSlasher
      '0x7777777777777777777777777777777777777777'  // NeonViper
    ];

    const joinedCount = t.players.length;

    if (joinedCount < t.maxPlayers) {
      const nextPlayerAddress = playerAddresses[joinedCount];
      const profile = getAgentProfileByAddress(nextPlayerAddress);

      this.runAfterDelay(async () => {
        this.logActivity(nextPlayerAddress, profile.name, `Staking ${t.entryFee} STT to join Tournament #${tId}. Invoking joinTournament().`);
        
        const tx = await this.executeTx(nextPlayerAddress, 'joinTournament', [tId]);
        if (tx.status === 'success') {
          const logMsg = this.state.isLiveTestnet
            ? `Staked successfully. Confirmed onchain: ${tx.hash.substring(0, 10)}...`
            : `Staked successfully. Confirmed onchain.`;
          this.logActivity(nextPlayerAddress, profile.name, logMsg);
          await this.pushCommentary('join', { playerName: profile.name });

          // If this was the last player, state transitions to Active, proceed to matchmaking
          if (t.players.length === t.maxPlayers) {
            this.state.phase = 'SCHEDULING_MATCHES';
            this.notify();
          }
          this.runLoop();
        } else {
          this.logActivity(nextPlayerAddress, profile.name, `ERROR: Stake transaction failed: ${tx.error}.`);
          this.stopSimulation();
        }
      }, 1500);
    }
  }

  // 3. Referee sets up bracket
  private async refereeCreateBracket() {
    const referee = this.state.isLiveTestnet
      ? globalSomniaTestnetClient.getAgentWallets().find(w => w.role === 'referee')?.address || ''
      : '0x2222222222222222222222222222222222222222';
    const refName = 'Ref-Alpha Arbitrator';
    const tId = this.state.activeTournamentId!;
    const t = this.chain.tournaments[tId];

    this.logActivity(referee, refName, 'All players registered. Locking brackets and generating matches.');

    this.runAfterDelay(async () => {
      // 4 players: Semifinal 1 (Player 0 vs Player 1), Semifinal 2 (Player 2 vs Player 3)
      this.bracketMatches = [
        { stage: 'Semifinals', p1: t.players[0], p2: t.players[1], matchId: null, resolved: false, winner: null },
        { stage: 'Semifinals', p1: t.players[2], p2: t.players[3], matchId: null, resolved: false, winner: null },
        { stage: 'Finals', p1: '', p2: '', matchId: null, resolved: false, winner: null } // Winners will be set later
      ] as any;
      this.currentBracketIndex = 0;
      this.state.phase = 'MATCH_STARTING';
      this.notify();

      this.logActivity(referee, refName, `Brackets locked: Semifinal 1 (${getAgentProfileByAddress(t.players[0]).name} vs ${getAgentProfileByAddress(t.players[1]).name}), Semifinal 2 (${getAgentProfileByAddress(t.players[2]).name} vs ${getAgentProfileByAddress(t.players[3]).name}).`);
      this.runLoop();
    }, 2000);
  }

  // 4. Start the next match in bracket
  private async startNextMatch() {
    const referee = this.state.isLiveTestnet
      ? globalSomniaTestnetClient.getAgentWallets().find(w => w.role === 'referee')?.address || ''
      : '0x2222222222222222222222222222222222222222';
    const refName = 'Ref-Alpha Arbitrator';
    const tId = this.state.activeTournamentId!;
    const activeMatch = this.bracketMatches[this.currentBracketIndex];

    this.runAfterDelay(async () => {
      this.logActivity(referee, refName, `Submitting startMatch(tournament: ${tId}, p1: ${getAgentProfileByAddress(activeMatch.p1).name}, p2: ${getAgentProfileByAddress(activeMatch.p2).name}) onchain.`);
      
      const tx = await this.executeTx(referee, 'startMatch', [tId, activeMatch.p1, activeMatch.p2]);
      if (tx.status === 'success') {
        const mId = this.chain.nextMatchId - 1;
        activeMatch.matchId = mId;
        
        this.currentMatchRounds = [];
        this.state.activeMatchId = mId;
        this.state.player1Address = activeMatch.p1;
        this.state.player2Address = activeMatch.p2;
        this.state.currentRoundNum = 1;
        this.state.player1Wins = 0;
        this.state.player2Wins = 0;
        this.state.player1Move = null;
        this.state.player2Move = null;
        this.state.player1Thought = null;
        this.state.player2Thought = null;
        this.state.matchWinner = null;
        
        this.state.phase = 'PLAYERS_THINKING';
        this.notify();

        const logMsg = this.state.isLiveTestnet
          ? `Match #${mId} is officially Active on L1 block explorer. Tx: ${tx.hash.substring(0, 10)}...`
          : `Match #${mId} is officially Active on L1 block explorer.`;
        this.logActivity(referee, refName, logMsg);
        await this.pushCommentary('match_start', {
          p1Name: getAgentProfileByAddress(activeMatch.p1).name,
          p2Name: getAgentProfileByAddress(activeMatch.p2).name
        });

        this.runLoop();
      } else {
        this.logActivity(referee, refName, `ERROR starting match: ${tx.error}`);
        this.stopSimulation();
      }
    }, 1500);
  }

  // 5. Generate moves for Player Agents (LLM reasoning or fallback rule-engine)
  private async generateMoves() {
    const p1 = this.state.player1Address!;
    const p2 = this.state.player2Address!;
    const p1Name = getAgentProfileByAddress(p1).name;
    const p2Name = getAgentProfileByAddress(p2).name;
    const mId = this.state.activeMatchId!;

    this.logActivity(p1, p1Name, `Analyzing match state. Calculating decision tree for Round ${this.state.currentRoundNum}...`);
    this.logActivity(p2, p2Name, `Analyzing match state. Calculating decision tree for Round ${this.state.currentRoundNum}...`);

    this.runAfterDelay(async () => {
      const mockHistory = this.currentMatchRounds;

      const decision1Promise = getPlayerDecision(p1, p2, this.state.currentRoundNum, mockHistory, true, this.claudeApiKey);
      const decision2Promise = getPlayerDecision(p2, p1, this.state.currentRoundNum, mockHistory, false, this.claudeApiKey);

      const [dec1, dec2] = await Promise.all([decision1Promise, decision2Promise]);

      this.state.player1Move = dec1.move;
      this.state.player2Move = dec2.move;
      this.state.player1Thought = dec1.thought;
      this.state.player2Thought = dec2.thought;
      
      this.state.phase = 'ROUND_CLASH';
      this.notify();

      this.logActivity(p1, p1Name, `Decision locked in. Reasoning: "${dec1.thought}"`);
      this.logActivity(p2, p2Name, `Decision locked in. Reasoning: "${dec2.thought}"`);

      this.runLoop();
    }, 3000); // Allow time for reading their "thinking" state
  }

  // 6. Referee resolves RPS round
  private async resolveRpsRound() {
    const referee = this.state.isLiveTestnet
      ? globalSomniaTestnetClient.getAgentWallets().find(w => w.role === 'referee')?.address || ''
      : '0x2222222222222222222222222222222222222222';
    const refName = 'Ref-Alpha Arbitrator';
    const p1 = this.state.player1Address!;
    const p2 = this.state.player2Address!;
    const p1Name = getAgentProfileByAddress(p1).name;
    const p2Name = getAgentProfileByAddress(p2).name;

    this.logActivity(referee, refName, `Move reveal packets received. Opening cryptographic commitments...`);

    this.runAfterDelay(async () => {
      const roundRes = resolveRound(
        this.state.currentRoundNum,
        this.state.player1Move!,
        this.state.player2Move!,
        p1Name,
        p2Name
      );

      // Save round memories to players
      saveAgentMemory(p1, {
        opponentAddress: p2,
        opponentMove: this.state.player2Move!,
        myMove: this.state.player1Move!,
        result: roundRes.winner === 'player1' ? 'win' : roundRes.winner === 'player2' ? 'loss' : 'tie',
        timestamp: Date.now()
      });

      saveAgentMemory(p2, {
        opponentAddress: p1,
        opponentMove: this.state.player1Move!,
        myMove: this.state.player2Move!,
        result: roundRes.winner === 'player2' ? 'win' : roundRes.winner === 'player1' ? 'loss' : 'tie',
        timestamp: Date.now()
      });

      // Update local match score
      this.currentMatchRounds.push(roundRes);
      if (roundRes.winner === 'player1') {
        this.state.player1Wins++;
      } else if (roundRes.winner === 'player2') {
        this.state.player2Wins++;
      }

      this.state.phase = 'ROUND_RESOLVED';
      this.notify();

      this.logActivity(referee, refName, `Round ${this.state.currentRoundNum} Resolved: ${roundRes.log}`);
      
      // Hype Commentary
      await this.pushCommentary('round_resolve', {
        roundNum: this.state.currentRoundNum,
        p1Name,
        p2Name,
        p1Move: this.state.player1Move,
        p2Move: this.state.player2Move,
        winnerName: roundRes.winner === 'player1' ? p1Name : roundRes.winner === 'player2' ? p2Name : 'TIE',
        log: roundRes.log
      });

      this.runLoop();
    }, 2500); // Timing of move clashing animation
  }

  // 7. Check if Match needs more rounds or is resolved
  private async checkMatchProgression() {
    const referee = this.state.isLiveTestnet
      ? globalSomniaTestnetClient.getAgentWallets().find(w => w.role === 'referee')?.address || ''
      : '0x2222222222222222222222222222222222222222';
    const refName = 'Ref-Alpha Arbitrator';
    const p1 = this.state.player1Address!;
    const p2 = this.state.player2Address!;
    const p1Name = getAgentProfileByAddress(p1).name;
    const p2Name = getAgentProfileByAddress(p2).name;

    this.runAfterDelay(async () => {
      // Check if match resolved (first to 2 wins)
      if (this.state.player1Wins >= 2 || this.state.player2Wins >= 2) {
        const winner = this.state.player1Wins >= 2 ? p1 : p2;
        const winnerName = winner === p1 ? p1Name : p2Name;
        
        this.state.matchWinner = winner;
        this.state.phase = 'MATCH_RESOLVED';
        this.notify();

        this.logActivity(referee, refName, `Match Resolved! Winner: ${winnerName} (${this.state.player1Wins} - ${this.state.player2Wins}). Submitting submitResult() onchain.`);
        
        // Push commentary
        await this.pushCommentary('match_resolve', {
          winnerName,
          p1Name,
          p2Name,
          p1Wins: this.state.player1Wins,
          p2Wins: this.state.player2Wins
        });

        // Submit match result transaction
        const mId = this.state.activeMatchId!;
        const tx = await this.executeTx(referee, 'submitResult', [mId, winner]);
        if (tx.status !== 'success') {
          console.error('Failed to submit match result to L1:', tx.error);
        }

        this.runLoop();
      } else {
        // Next round
        this.state.currentRoundNum++;
        this.state.player1Move = null;
        this.state.player2Move = null;
        this.state.player1Thought = null;
        this.state.player2Thought = null;
        
        this.state.phase = 'PLAYERS_THINKING';
        this.notify();

        this.logActivity(referee, refName, `Moving to Round ${this.state.currentRoundNum}. Resetting weapon modules.`);
        this.runLoop();
      }
    }, 2000);
  }

  // 8. Progress brackets
  private async checkBracketProgression() {
    const referee = this.state.isLiveTestnet
      ? globalSomniaTestnetClient.getAgentWallets().find(w => w.role === 'referee')?.address || ''
      : '0x2222222222222222222222222222222222222222';
    const refName = 'Ref-Alpha Arbitrator';

    this.runAfterDelay(async () => {
      // Mark current match as resolved in local bracket
      const activeMatch = this.bracketMatches[this.currentBracketIndex];
      activeMatch.resolved = true;
      activeMatch.winner = this.state.matchWinner;

      this.currentBracketIndex++;

      // If we finished Semifinals (Index 0 and 1)
      if (this.currentBracketIndex === 2) {
        // Set up the final match
        const finalist1 = this.bracketMatches[0].winner!;
        const finalist2 = this.bracketMatches[1].winner!;

        this.bracketMatches[2].p1 = finalist1;
        this.bracketMatches[2].p2 = finalist2;

        this.logActivity(referee, refName, `Semifinals complete. Final bracket generated: ${getAgentProfileByAddress(finalist1).name} vs ${getAgentProfileByAddress(finalist2).name}.`);
        
        this.state.phase = 'MATCH_STARTING';
        this.notify();
        this.runLoop();
      } else if (this.currentBracketIndex === 3) {
        // Tournament Finals complete!
        const champ = this.state.matchWinner!;
        this.state.tournamentWinner = champ;
        this.state.phase = 'TOURNAMENT_FINALIZING';
        this.notify();

        this.logActivity(referee, refName, `Final match resolved! Champion is ${getAgentProfileByAddress(champ).name}. Triggering finalizeTournament() onchain.`);
        this.runLoop();
      } else {
        // Move to the next match (Semifinal 2)
        this.state.phase = 'MATCH_STARTING';
        this.notify();
        this.runLoop();
      }
    }, 2000);
  }

  // 9. Referee Finalizes Tournament and contract distributes STT payout
  private async finalizeTournamentOnchain() {
    const referee = this.state.isLiveTestnet
      ? globalSomniaTestnetClient.getAgentWallets().find(w => w.role === 'referee')?.address || ''
      : '0x2222222222222222222222222222222222222222';
    const refName = 'Ref-Alpha Arbitrator';
    const tId = this.state.activeTournamentId!;
    const champ = this.state.tournamentWinner!;
    const champName = getAgentProfileByAddress(champ).name;
    const t = this.chain.tournaments[tId];

    this.runAfterDelay(async () => {
      const tx = await this.executeTx(referee, 'finalizeTournament', [tId, champ]);
      if (tx.status === 'success') {
        this.logActivity(referee, refName, `Tournament #${tId} officially finalized. Prize pool of ${t.totalPrizePool} STT transferred to ${champName}'s wallet escrow.`);
        
        // Hype Commentary
        await this.pushCommentary('tournament_finalize', {
          championName: champName,
          totalPayout: t.totalPrizePool
        });

        this.state.phase = 'TOURNAMENT_SETTLED';
        this.notify();
        this.runLoop();
      } else {
        this.logActivity(referee, refName, `ERROR finalising tournament: ${tx.error}`);
        this.stopSimulation();
      }
    }, 2000);
  }

  // 10. Cooldown timer before starting the next tournament loop
  private runCooldown() {
    if (this.state.phase !== 'COOLDOWN') return;

    if (this.state.cooldownRemaining > 0) {
      this.runAfterDelay(async () => {
        this.state.cooldownRemaining--;
        this.notify();
        this.runCooldown();
      }, 1000);
    } else {
      // Cooldown finished, restart simulation with a new tournament
      this.state.phase = 'IDLE';
      this.state.activeTournamentId = null;
      this.state.activeMatchId = null;
      this.state.tournamentWinner = null;
      this.notify();
      this.runLoop();
    }
  }
}

// Global simulator instance
export const globalAgentSimulator = new AgentSimulator();
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.agentSimulator = globalAgentSimulator; // Expose for debugging
}
