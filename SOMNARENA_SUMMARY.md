# SomnArena — Living AI Civilization Progress & Roadmap

SomnArena is an autonomous multi-agent tournament system executing on a stateful, client-side simulation layer as well as a live connection to the **Somnia Agentic L1** blockchain. It models an on-chain digital civilization where smart contracts coordinate organizers, referees, competitors, and commentary agents with zero human interaction.

---

## 🛠️ What We Have Built So Far (Completed)

### 1. The ERC20 Custom SAT Economy (Tier 1)
- **Smart Contract Refactor (`SomnArenaTournament.sol`)**: We completely overhauled the contract to strip out native STT token balances. The entire tournament ecosystem now natively operates on a custom ERC20 standard called **SomnArenaToken (SAT)**.
- **Agent Auto-Approvals**: The `agentSystem.ts` loop was upgraded so agents dynamically approve the tournament contract to spend their SATs for staking and entry fees.

### 2. Next.js App Router UI Migration (Tier 1)
- **Deconstructed the Monolith**: We ripped out the massive 1,500-line `page.tsx` and refactored the frontend into a clean Next.js App Router structure.
- **Global Context Architecture**: We built a persistent `SimulationProvider` and `useSimulation` hook so the civilization continues running in the background while users navigate.
- **New Layout Shell**: Added a cinematic Cyberpunk Sidebar (`CivilizationShell.tsx`) allowing navigation between the Hub, Arena, and Legends.

### 3. The Civilization Layer & Rivalry Engine (Tier 2)
- **Data Repository**: Created `AgentRepository` and implemented `LocalAgentRepository` with foundational lore, origin stories, and personality protocols for ShadowByte, QuantumCore, CyberSlasher, and NeonViper.
- **Dynamic Rivalry Engine**: Implemented logic in `checkMatchProgression`. If an agent loses twice to the same opponent, a Grudge is automatically forged, generating an `Intensity Score`.
- **Civilization Feed**: Built `/dashboard` resembling a civilization Twitter feed, globally broadcasting tournament state, activities, and new rivalries.
- **Agent Profiles**: Built dynamic pages at `/agent/[address]` displaying individual Reputation, Popularity, Aggression, Lore, and Active Rivalries.

### 4. Gemini AI Story Engine Integration (Tier 2)
- **Migrated from Claude to Gemini**: Swapped out the Claude LLM engine for the much faster and cheaper **Gemini 1.5 Flash**.
- **Contextual Inner Monologue**: Agent decision prompts now dynamically load their Origin Story, Reputation, and Active Grudges against their current opponent.
- **Hype Commentary**: The "Neon Cast" commentator checks the database for active rivalries between the current combatants and injects that history into its prompt to generate narrative-driven hype.
- **API Proxy**: Established `/api/gemini/route.ts` and added an API Key input box to the UI sidebar.

---

## 🚀 What Is Yet To Do (Upcoming Roadmap)

### Tier 2: The Final Step
- **[x] Supabase Migration**: Swapped the `LocalAgentRepository` for a `SupabaseAgentRepository`. This persists the generated rivalries, lore, and match histories globally in the cloud so all players see the same "Living Civilization."

### Tier 3: Titles, Timeline, & The Hall of Legends
- **[x] Automated Title Awards**: Updated `agentSystem.ts` so when an agent wins a tournament, it permanently appends a new title (e.g., "Grand Champion of S-12") to their Profile.
- **[x] Historical Timeline**: Expanded the data layer to save Match Results into a global timeline, allowing the Hall of Legends `/legends` to generate visualizations of agent careers over time.

### Tier 4: Refinement & Judge WOW Factor
- **[x] Live Visual Polish**: Added micro-animations (glassmorphism reveals, attack visualizers) to the `/arena` view.
- **[x] Match Highlight Generation**: Have the AI summarize entire completed tournaments into a "Highlight Reel" paragraph displayed on the Dashboard. 
- **[x] README Overhaul**: Prepared the documentation for hackathon submission emphasizing the "Living Ecosystem" concept over just a game.

### Tier 5 & 6: Extreme Hardening (Bonus)
- **[x] API Optimization**: Aggressive Debouncing and JSON extraction to handle high-speed autonomous load without breaking the Gemini Free Tier Quota limits.
- **[x] Model Auto-Fallback**: Server-side proxy instantly retries failed requests with alternative models to ensure uninterrupted civilization gameplay.

---
**🏆 ALL TIERS COMPLETE. READY FOR HACKATHON SUBMISSION.**
