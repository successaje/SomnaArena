import { ethers } from 'ethers';

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x02406b6d17E743deA7fBbfAE8A15c82e4481E168';
export const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS || '0x1a983C4e0B9f57B5b34b6C753Ab13828ad21969F';
export const RPC_URL = process.env.NEXT_PUBLIC_SOMNIA_RPC_URL || 'https://api.infra.testnet.somnia.network/';

export const CONTRACT_ABI = [
  "function nextTournamentId() view returns (uint256)",
  "function nextMatchId() view returns (uint256)",
  "function tournaments(uint256) view returns (uint256 id, address organizer, uint256 entryFee, uint256 maxPlayers, uint256 prizeFunds, uint256 totalPrizePool, uint8 state, address winner, bool rewardsDistributed)",
  "function matches(uint256) view returns (uint256 id, uint256 tournamentId, address player1, address player2, uint8 state, address winner)",
  "function balances(address) view returns (uint256)",
  "function token() view returns (address)",
  "function createTournament(uint256 entryFee, uint256 maxPlayers, uint256 prizeFunds) returns (uint256)",
  "function joinTournament(uint256 tournamentId)",
  "function startMatch(uint256 tournamentId, address player1, address player2) returns (uint256)",
  "function submitResult(uint256 matchId, address winner)",
  "function finalizeTournament(uint256 tournamentId, address winner)",
  "function getTournamentPlayers(uint256 tournamentId) view returns (address[] memory)",
  "function getTournamentMatches(uint256 tournamentId) view returns (uint256[] memory)",
  "event TournamentCreated(uint256 indexed tournamentId, address indexed organizer, uint256 entryFee, uint256 maxPlayers, uint256 prizeFunds)",
  "event PlayerJoined(uint256 indexed tournamentId, address indexed player, uint256 feePaid)",
  "event MatchStarted(uint256 indexed tournamentId, uint256 indexed matchId, address player1, address player2)",
  "event MatchResolved(uint256 indexed tournamentId, uint256 indexed matchId, address winner)",
  "event TournamentFinalized(uint256 indexed tournamentId, address indexed winner, uint256 totalPayout)"
];

export const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address, address) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
  "function claimFaucet()"
];

export interface AgentWallet {
  role: string;
  name: string;
  address: string;
  privateKey: string;
  nativeBalance: string; // STT gas
  contractBalance: string; // SAT Token
}

export class SomniaTestnetClient {
  provider: ethers.JsonRpcProvider;
  contract: ethers.Contract;
  tokenContract: ethers.Contract;
  
  // Agent roles
  agentRoles = [
    { role: 'organizer', name: 'Synthetix Organizer' },
    { role: 'referee', name: 'Ref-Alpha Arbitrator' },
    { role: 'commentator', name: 'Neon Cast Commentator' },
    { role: 'player_shadowbyte', name: 'ShadowByte' },
    { role: 'player_quantumcore', name: 'QuantumCore' },
    { role: 'player_cyberslasher', name: 'CyberSlasher' },
    { role: 'player_neonviper', name: 'NeonViper' }
  ];

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.provider);
    this.tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, this.provider);

    // Fetch derived agent addresses from server asynchronously and cache them in localStorage
    if (typeof window !== 'undefined') {
      fetch('/api/agents')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            localStorage.setItem('somnarena_derived_agents', JSON.stringify(data));
          }
        })
        .catch(err => console.error('Failed to fetch derived agents:', err));
    }
  }

  // Load private keys for all agents from localStorage, generating them if they do not exist
  getAgentWallets(): AgentWallet[] {
    if (typeof window === 'undefined') {
      return this.agentRoles.map(a => ({
        ...a,
        address: '0x0000000000000000000000000000000000000000',
        privateKey: '',
        nativeBalance: '0',
        contractBalance: '0'
      }));
    }

    const cachedStr = localStorage.getItem('somnarena_derived_agents');
    if (cachedStr) {
      try {
        const cached = JSON.parse(cachedStr);
        if (Array.isArray(cached) && cached.length > 0) {
          return cached.map((c: any) => ({
            role: c.role,
            name: c.name,
            address: c.address,
            privateKey: 'HIDDEN_ON_CLIENT',
            nativeBalance: '0',
            contractBalance: '0'
          }));
        }
      } catch (e) {
        console.error('Failed to parse cached derived agents', e);
      }
    }

    return this.agentRoles.map(agent => {
      const keyName = `somnarena_agent_pkey_${agent.role}`;
      let privateKey = localStorage.getItem(keyName);

      if (!privateKey) {
        // Generate a new wallet randomly
        const wallet = ethers.Wallet.createRandom();
        privateKey = wallet.privateKey;
        localStorage.setItem(keyName, privateKey);
      }

      const wallet = new ethers.Wallet(privateKey);
      return {
        role: agent.role,
        name: agent.name,
        address: wallet.address,
        privateKey: privateKey,
        nativeBalance: '0',
        contractBalance: '0'
      };
    });
  }

  // Fetch balances of all agent wallets
  async syncAgentBalances(): Promise<AgentWallet[]> {
    const wallets = this.getAgentWallets();
    
    const synced = await Promise.all(
      wallets.map(async (wallet) => {
        try {
          const rawNative = await this.provider.getBalance(wallet.address);
          const rawToken = await this.contract.balances(wallet.address);
          
          return {
            ...wallet,
            nativeBalance: ethers.formatEther(rawNative),
            contractBalance: ethers.formatEther(rawToken)
          };
        } catch (e) {
          console.error(`Failed to sync balance for ${wallet.name}:`, e);
          return wallet;
        }
      })
    );

    return synced;
  }

  // Claim SAT tokens from faucet for an agent
  async claimTokenFaucet(role: string): Promise<ethers.TransactionReceipt> {
    const wallets = this.getAgentWallets();
    const agent = wallets.find(w => w.role === role);
    if (!agent || !agent.privateKey) {
      throw new Error(`Agent wallet not found for role ${role}`);
    }

    const signer = new ethers.Wallet(agent.privateKey, this.provider);
    const tokenContractWithSigner = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
    
    const tx = await tokenContractWithSigner.claimFaucet();
    return await tx.wait();
  }

  // Submit onchain transaction from an agent wallet
  async submitTransaction(
    role: string,
    method: string,
    args: any[],
    valueSTT: string = '0'
  ): Promise<{
    status: 'success' | 'failed';
    hash: string;
    error?: string;
    receipt?: ethers.TransactionReceipt;
    tournamentId?: number;
    matchId?: number;
  }> {
    try {
      let resolvedRole = role;
      const wallets = this.getAgentWallets();
      if (role.startsWith('0x')) {
        const match = wallets.find(w => w.address.toLowerCase() === role.toLowerCase());
        if (match) {
          resolvedRole = match.role;
        }
      }

      console.log(`[TestnetClient] Sending tx ${method} for role ${resolvedRole} to server API...`);
      const res = await fetch('/api/agent-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: resolvedRole,
          method,
          args,
          valueSTT
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Server transaction execution failed');
      }

      const txResult = await res.json();
      return {
        status: 'success',
        hash: txResult.hash,
        tournamentId: txResult.tournamentId,
        matchId: txResult.matchId
      };
    } catch (error: any) {
      console.error(`Onchain transaction failed for ${method}:`, error);
      return {
        status: 'failed',
        hash: '',
        error: error.reason || error.message || 'Onchain execution reverted'
      };
    }
  }

  // Fetch all tournament records from the testnet contract
  async syncTournaments(): Promise<any> {
    try {
      const nextTId = await this.contract.nextTournamentId();
      const tournamentsObj: Record<number, any> = {};

      const count = Number(nextTId);
      for (let i = 0; i < count; i++) {
        const raw = await this.contract.tournaments(i);
        // Map raw struct values
        const players = await this.contract.getTournamentPlayers(i);
        
        tournamentsObj[i] = {
          id: Number(raw.id),
          organizer: raw.organizer,
          entryFee: Number(ethers.formatEther(raw.entryFee)),
          maxPlayers: Number(raw.maxPlayers),
          prizeFunds: Number(ethers.formatEther(raw.prizeFunds)),
          totalPrizePool: Number(ethers.formatEther(raw.totalPrizePool)),
          state: raw.state === 0 ? 'Open' : raw.state === 1 ? 'Active' : 'Finalized',
          players: players,
          matchIds: [], // loaded separately if needed
          winner: raw.winner === ethers.ZeroAddress ? null : raw.winner
        };
      }
      return tournamentsObj;
    } catch (e) {
      console.error('Failed to sync tournaments from testnet:', e);
      return {};
    }
  }
}

export const globalSomniaTestnetClient = new SomniaTestnetClient();
