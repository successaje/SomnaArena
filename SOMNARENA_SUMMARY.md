# SomnArena — AI Tournament Civilization Progress Summary

SomnArena is an autonomous multi-agent tournament system executing on a stateful, client-side simulation layer as well as a live connection to **Somnia's Agentic L1** blockchain. It models an onchain digital civilization where smart contracts coordinate organizers, referees, competitors, and commentary agents with zero human interaction.

---

## 🛠️ What We Have Built So Far

### 1. Smart Contract Layer (`contracts/SomnArenaTournament.sol`)
We built a Solidity tournament contract that handles the core rules of the game:
- **Escrow & Stakes**: Holds native STT tokens staked by organizers (for prize pools) and players (for entry fees).
- **Matchmaking & Progress**: Tracks matches, registers players, and allows the referee to start matches.
- **Onchain Resolution**: The Referee submits match outcomes, and the contract programmatically distributes the prize funds to the champion's escrow balance.
- **View Helpers**: Exposes functions (`getTournamentPlayers`, `getTournamentMatches`) for client-side synchronization.

### 2. Hardhat v3 & Deployment Infrastructure
- **Hardhat Config (`hardhat.config.js`)**: Upgraded to Hardhat v3 ESM format using `defineConfig`. It specifies solidity compiler configurations, registers ethers, and hooks up the **Somnia Shannon Testnet** network settings (`chainId: 50312`, RPC endpoint, and Blockscout integration).
- **Deployment Script (`scripts/deploy.js`)**: An ESM script that queries deployer balances, deploys the tournament contract, and waits for block confirmation.

### 3. Dual-Mode Blockchain Clients
- **Local Sandbox Simulator (`src/blockchain/somniaSim.ts`)**: Models local accounts, blocks, transactions, receipts, and EVM variables on a fast, simulated client-side loop.
- **Live Testnet Client (`src/blockchain/somniaTestnetClient.ts`)**: Interfaces with the live Somnia Shannon Testnet using `ethers.js`. It generates and saves deterministic private keys for 7 autonomous agents in the browser's `localStorage`, syncs real native balances (STT gas) and contract escrow funds, and formats arguments for contract function calls.

### 4. Multi-Agent Engine (`src/agents/`)
We established an autonomous agent loop containing:
- **Organizer Agent**: Automatically creates tournaments and sponsors prize pools.
- **Player Agents (4 Profiles)**: *ShadowByte*, *QuantumCore*, *CyberSlasher*, and *NeonViper*. Each agent evaluates the game state and submits rock-paper-scissors choices. They run on **Claude LLM reasoning (specifically `claude-haiku-4-5-20251001`)** or fall back to rule-based heuristic modules.
- **Referee Agent**: Coordinates matchmaking, verifies commitments, reveals moves, and submits onchain results.
- **Commentary Agent (`Neon Cast`)**: Listens to block logs and outputs trash talk and play-by-play tournament analysis.

### 5. Cyberpunk HUD Frontend (`src/app/`)
- **Main App (`src/app/page.tsx`)**: An interactive dashboard showing:
  - **Civilization Grid**: Agent balances (native and contract escrow), faucet triggers, and public keys.
  - **Tournament Brackets**: Active tree showing Semifinals and Grand Finals progression.
  - **Match Arena**: Visual head-to-head ring with move reveals and reasoning text shards.
  - **Leaderboard**: Win/Loss/Tie stats and strategy descriptions.
  - **L1 Explorer**: Transaction logs, block height tickers, gas prices, and transaction receipts.
- **Styling (`src/app/globals.css`)**: Dark glassmorphic styling, glowing borders, custom scrollbars, and scanline overlay effects.

---

## 📈 The Development Process

1. **Simulated Sandbox First**: We began by building the complete agent system and game logic using a client-side blockchain simulator (`somniaSim.ts`). This allowed fast iterations on tournament stages, commentary feeds, and UI layouts without needing faucet funding or block delays.
2. **Onchain Contract Formulation**: Next, we wrote the smart contract `SomnArenaTournament.sol` mirroring the simulator's logic, compiled it, and set up Hardhat for the Shannon Testnet.
3. **Shannon Testnet Client Integration**: We created the `SomniaTestnetClient` to connect the autonomous browser loop directly to the live blockchain. This involved generating local storage wallets for the 7 agents, syncing their testnet parameters, and waiting on actual transaction confirmations (`tx.wait(1)`).
4. **Build & ABI Verification**: We tested the compilation, resolved compiler discrepancies, and updated the client's ABI to support the view methods required to synchronize tournament structures.

---

## 🎯 Current Status

- **Smart Contract**: Successfully deployed to the Shannon Testnet.
- **Frontend/Backend Build**: Successfully verified (`npm run build` succeeds).
- **Client Sync**: Fully wired to connect to the testnet contract address.
