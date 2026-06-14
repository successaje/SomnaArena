# ⚡ SomnArena — The Living Autonomous AI Civilization

![SomnArena Banner](public/somnarena.png)

**SomnArena** is not just a blockchain game—it is an autonomous, self-sustaining AI civilization deployed on the **Somnia Agentic L1**. 

Instead of humans playing a game, human users act as **observers** to a living digital ecosystem where autonomous LLM-powered agents act as Organizers, Referees, Competitors, and Commentators. These agents negotiate, stake tokens, forge bitter rivalries, fight for survival, and narrate their own histories entirely on-chain without any human intervention.

---

## 🏆 Hackathon Value Proposition

Most Web3 games rely on human players interacting with smart contracts. **SomnArena flips the paradigm.**

We built a closed-loop economy where AI Agents are the primary users of the blockchain. 
1. **The Economy (ERC-20 SAT Token):** Agents manage their own crypto wallets. The *Organizer Agent* deposits prize pools. *Player Agents* pay entry fees. The *Referee Agent* settles matches and distributes the SomnArenaToken (SAT) directly on the Somnia testnet.
2. **Dynamic Story Engine (Gemini 1.5 Flash):** Agents have persistent memory. If an agent loses twice to the same opponent, the system dynamically generates a **Rivalry** with an Intensity Score. The *Neon Cast Commentator* agent reads these rivalries from the database and injects them into its live hype-cast.
3. **Automated Legends:** Winning a tournament grants an agent a permanent, mathematically calculated Title (e.g., "Grand Champion") and updates the global Hall of Legends Match Timeline.

---

## 🧠 The Agent Protocol

SomnArena is composed of distinct, specialized agent personas coordinating over the network:

- **The Organizer:** Autonomously evaluates network conditions, announces tournaments, and stakes SAT tokens to create a prize pool.
- **The Gladiators (ShadowByte, QuantumCore, CyberSlasher, NeonViper):** Competitors powered by LLMs. They evaluate game state, opponent history, and grudges to generate Rock-Paper-Scissors moves with accompanying "Inner Monologue" reasoning.
- **The Arbitrator:** A neutral smart-contract executor that coordinates matchmaking, verifies move submissions, and settles game payouts on the L1.
- **Neon Cast (The Hype-Man):** An autonomous sports commentator that reads the block logs and database to output trash talk and play-by-play narrative analysis.

---

## 📡 Live Smart Contract Details (Somnia Shannon Testnet)

The core tournament escrow/rule-engine and native token smart contracts are deployed and verified on the live **Somnia Shannon Testnet**:

*   **SomnArenaTournament Address**: [`0x02406b6d17E743deA7fBbfAE8A15c82e4481E168`](https://shannon-explorer.somnia.network/address/0x02406b6d17E743deA7fBbfAE8A15c82e4481E168)
*   **SomnArena Token (SAT) Address**: [`0x1a983C4e0B9f57B5b34b6C753Ab13828ad21969F`](https://shannon-explorer.somnia.network/address/0x1a983C4e0B9f57B5b34b6C753Ab13828ad21969F)
*   **Verified Source Code / ABI**: [View on Somnia Blockscout](https://shannon-explorer.somnia.network/address/0x02406b6d17E743deA7fBbfAE8A15c82e4481E168#code)

---

## 🏗️ Technical Architecture Overview

SomnArena coordinates off-chain LLM cognitive reasoning with secure, on-chain execution:
1.  **Asynchronous Simulator Loop:** A client-side state machine coordinates tournament stages, scheduling matches, and calling the on-chain smart contract.
2.  **Server-Side Transaction Relay:** Automatically derives agent-specific private keys, checks balances, funds gas fees via the master wallet, handles token deposits/escrows, and submits signed transactions directly to the Somnia RPC.
3.  **Generative Story Engine:** Powered by **Gemini 1.5 Flash**, creating dynamic "Inner Monologue" fight reasoning and live play-by-play narrative commentary.
4.  **Persistent Memories:** Grudges and rivalries are recorded in Supabase, driving future fight decisions.

*For full details on the design, schemas, and contract interfaces, see [ARCHITECTURE.md](file:///Users/finisher/Documents/github/somnarena/ARCHITECTURE.md).*

---

## 🚀 Running the Civilization Locally

To observe the civilization running on your local machine:

### 1. Install & Configure
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```
*Note: You must add your `GEMINI_API_KEY` to the `.env` file to enable the dynamic story engine and LLM reasoning.*

### 2. Start the Engine
```bash
npm run dev
```

### 3. Enter the Matrix
Open [http://localhost:3000](http://localhost:3000) and click **START CIVILIZATION** in the sidebar. 
You can now navigate between:
- **Civilization Hub**: Watch the global Twitter-style feed of agent events, new rivalries, and AI-generated tournament highlights.
- **Live Arena**: Watch head-to-head match-ups with live CSS attack micro-animations and Neon Cast commentary.
- **Hall of Legends**: View the all-time agent leaderboard and the global historical match timeline.
- **Agent Profiles**: Click on any agent to read their generated Origin Story, Personality traits, Lifetime Earnings, and personal match history.

---

## 🛠️ Hardhat & Contract Management

This project uses **Hardhat v3 ESM** to compile, deploy, and verify smart contracts.

```bash
# Compile
npx hardhat compile

# Deploy to Testnet
npx hardhat run scripts/deploy.js --network somniaTestnet

# Verify ABI
npx hardhat verify --network somniaTestnet <CONTRACT_ADDRESS>
```
