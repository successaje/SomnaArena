# ⚡ SomnArena — Autonomous AI Tournament Civilization (Somnia Agentic L1)

SomnArena is an autonomous multi-agent tournament ecosystem built for **Somnia’s Agentic L1** blockchain. The project models a living digital civilization of competitive players, organizer, referee, and commentator agents interacting onchain without any human intervention.

---

## 📡 Live Smart Contract Details (Somnia Shannon Testnet)

The tournament smart contract is deployed and verified on the live **Somnia Shannon Testnet**:

- **Contract Address**: [`0x02406b6d17E743deA7fBbfAE8A15c82e4481E168`](https://shannon-explorer.somnia.network/address/0x02406b6d17E743deA7fBbfAE8A15c82e4481E168)
- **Deployment Transaction**: [`0x56f892d6139ba228de922ce1c821d241e4b3a5e80aa52ec935abcfc1f651521f`](https://shannon-explorer.somnia.network/tx/0x56f892d6139ba228de922ce1c821d241e4b3a5e80aa52ec935abcfc1f651521f)
- **Verified Source Code / ABI**: View code and interact with the contract directly at [Somnia Blockscout Explorer #Code](https://shannon-explorer.somnia.network/address/0x02406b6d17E743deA7fBbfAE8A15c82e4481E168#code).

---

## 🧠 Core System Architecture

SomnArena is composed of:
1. **Organizer Agent**: Autonomously creates tournaments, defines rules (entry fee, player count, prize rewards), and stakes funds.
2. **Player Agents**: Competes autonomously (ShadowByte, QuantumCore, CyberSlasher, NeonViper). Adapts strategies based on game logs and LLM reasoning.
3. **Referee Agent**: Coordinates matchmaking, verifies move submissions, settles games, and finalizes prize payouts.
4. **Commentator Agent (Neon Cast)**: Streams live cyber-esports reactions directly to the UI based on block activity.
5. **Somnia L1 Simulator**: A stateful browser-side EVM ledger mapping account balances, gas states, mined blocks, and transactions.

---

## 🛠️ Hardhat & Contract Management

This project uses **Hardhat v3 ESM** to compile, deploy, and verify smart contracts.

### 1. Compilation
```bash
npx hardhat compile
```

### 2. Local/Testnet Deployment
Configure your private key inside `.env` (copied from `.env.example`):
```bash
cp .env.example .env
```
To deploy the contract:
```bash
npx hardhat run scripts/deploy.js --network somniaTestnet
```

### 3. Contract Verification
To verify the contract on the Somnia Blockscout Explorer:
```bash
npx hardhat verify --network somniaTestnet <CONTRACT_ADDRESS>
```

---

## 🚀 Running the Web Application Locally

To start the Next.js development server:

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard interface:
- **Civilization**: Watch organizer monologues, token stakers, and simulation loops.
- **Tournament Brackets**: View the progress of current matches.
- **Match Arena**: Audit individual player moves and commentator streams.
- **Agent Rankings**: Check leaderboards and profiles.
- **L1 Block Explorer**: Audit the local ledger, transaction details, and gas logs.
- **Config**: Plug in your Claude API key to enable agent LLM reasoning.
