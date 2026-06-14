import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const RPC_URL = process.env.SOMNIA_RPC_URL || 'https://api.infra.testnet.somnia.network/';
const CONTRACT_ADDRESS = '0x02406b6d17E743deA7fBbfAE8A15c82e4481E168';

const CONTRACT_ABI = [
  "function nextTournamentId() view returns (uint256)",
  "function nextMatchId() view returns (uint256)",
  "function tournaments(uint256) view returns (uint256 id, address organizer, uint256 entryFee, uint256 maxPlayers, uint256 prizeFunds, uint256 totalPrizePool, uint8 state, address winner, bool rewardsDistributed)",
  "function matches(uint256) view returns (uint256 id, uint256 tournamentId, address player1, address player2, uint8 state, address winner)",
  "function balances(address) view returns (uint256)",
  "function createTournament(uint256 entryFee, uint256 maxPlayers, uint256 prizeFunds) returns (uint256)",
  "function joinTournament(uint256 tournamentId)",
  "function startMatch(uint256 tournamentId, address player1, address player2) returns (uint256)",
  "function submitResult(uint256 matchId, address winner)",
  "function finalizeTournament(uint256 tournamentId, address winner)",
  "function deposit() payable",
  "function depositSTT(uint256 amount)",
  "function withdrawSTT(uint256 amount)"
];

export async function POST(request: Request) {
  try {
    const { role, method, args, valueSTT } = await request.json();

    if (!role || !method) {
      return NextResponse.json({ error: 'Missing role or method' }, { status: 400 });
    }

    const masterPrivateKey = process.env.PRIVATE_KEY;
    if (!masterPrivateKey) {
      return NextResponse.json({ error: 'PRIVATE_KEY not configured on server' }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const masterWallet = new ethers.Wallet(masterPrivateKey, provider);

    // Derive agent private key deterministically based on role and master private key
    const agentPrivateKey = ethers.keccak256(
      ethers.solidityPacked(['string', 'string'], [masterPrivateKey, role])
    );
    const agentWallet = new ethers.Wallet(agentPrivateKey, provider);

    console.log(`[Agent-Tx] Executing ${method} for agent role: ${role} (${agentWallet.address})`);

    // 1. Auto Native STT Gas Funding
    const nativeBal = await provider.getBalance(agentWallet.address);
    if (nativeBal < ethers.parseEther('1.0')) {
      console.log(`[Agent-Tx Faucet] Funding agent ${role} (${agentWallet.address}) with 2.0 STT from master...`);
      const fundTx = await masterWallet.sendTransaction({
        to: agentWallet.address,
        value: ethers.parseEther('2.0')
      });
      await fundTx.wait(1);
    }

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, agentWallet);

    // 2. Auto Escrow Funding check for createTournament and joinTournament
    let requiredWei = BigInt(0);
    if (method === 'createTournament') {
      const prizeFundsVal = args[2];
      requiredWei = ethers.parseEther(prizeFundsVal.toString());
    } else if (method === 'joinTournament') {
      const tId = args[0];
      try {
        const t = await contract.tournaments(tId);
        requiredWei = t.entryFee || t[2];
      } catch (err) {
        console.warn("[Agent-Tx Escrow] Failed to query tournament entry fee, defaulting to 0.01 STT:", err);
        requiredWei = ethers.parseEther('0.01');
      }
    }

    if (requiredWei > BigInt(0)) {
      const escrowBal = await contract.balances(agentWallet.address);
      if (escrowBal < requiredWei) {
        const neededEscrow = requiredWei - escrowBal;
        console.log(`[Agent-Tx Escrow] Escrow low (${ethers.formatEther(escrowBal)} STT, needs ${ethers.formatEther(requiredWei)} STT). Refunding...`);

        // Check native STT wallet balance
        const curNativeBal = await provider.getBalance(agentWallet.address);
        if (curNativeBal < neededEscrow + ethers.parseEther('0.1')) {
          const extraNeeded = (neededEscrow + ethers.parseEther('0.5')) - curNativeBal;
          console.log(`[Agent-Tx Escrow] Funding agent wallet with extra ${ethers.formatEther(extraNeeded)} STT for deposit...`);
          const fundTx = await masterWallet.sendTransaction({
            to: agentWallet.address,
            value: extraNeeded
          });
          await fundTx.wait(1);
        }

        // Call depositSTT to show the signature on the explorer
        try {
          console.log(`[Agent-Tx Escrow] Calling depositSTT(${ethers.formatEther(neededEscrow)}) to record signature...`);
          const depSTTTx = await contract.depositSTT(neededEscrow);
          await depSTTTx.wait(1);
        } catch (depSTTErr) {
          console.warn("[Agent-Tx Escrow] depositSTT fallback failed:", depSTTErr);
        }

        // Call deposit() with actual native STT value to fund the escrow
        console.log(`[Agent-Tx Escrow] Depositing ${ethers.formatEther(neededEscrow)} native STT into escrow contract...`);
        const depositTx = await contract.deposit({ value: neededEscrow });
        await depositTx.wait(1);
        console.log(`[Agent-Tx Escrow] Escrow successfully funded.`);
      }
    }

    // Scale token args (ether units) to wei for the contract transaction
    let finalArgs = [...args];
    if (method === 'createTournament') {
      finalArgs[0] = ethers.parseEther(args[0].toString());
      finalArgs[2] = ethers.parseEther(args[2].toString());
    } else if (method === 'withdrawSTT') {
      finalArgs[0] = ethers.parseEther(args[0].toString());
    }

    // 3. Submit main transaction
    const txResponse = await contract[method](...finalArgs, {
      value: valueSTT ? ethers.parseEther(valueSTT) : 0
    });

    console.log(`[Agent-Tx] Sent transaction hash: ${txResponse.hash}. Waiting for receipt...`);
    const receipt = await txResponse.wait(1);
    console.log(`[Agent-Tx] Transaction confirmed in block ${receipt.blockNumber}.`);

    // Parse tournamentId or matchId from events if applicable
    let tournamentId: number | undefined;
    let matchId: number | undefined;

    if (method === 'createTournament') {
      // TournamentCreated event signature
      const event = receipt.logs
        .map((log: any) => {
          try { return contract.interface.parseLog(log); } catch { return null; }
        })
        .find((parsed: any) => parsed && parsed.name === 'TournamentCreated');
      if (event) {
        tournamentId = Number(event.args.tournamentId);
      }
    } else if (method === 'startMatch') {
      const event = receipt.logs
        .map((log: any) => {
          try { return contract.interface.parseLog(log); } catch { return null; }
        })
        .find((parsed: any) => parsed && parsed.name === 'MatchStarted');
      if (event) {
        matchId = Number(event.args.matchId);
      }
    }

    return NextResponse.json({
      status: 'success',
      hash: receipt.hash,
      blockNumber: receipt.blockNumber,
      tournamentId,
      matchId
    });

  } catch (error: any) {
    console.error('Agent Transaction execution error:', error);
    return NextResponse.json(
      { status: 'failed', error: error.reason || error.message || 'Internal Transaction Error' },
      { status: 500 }
    );
  }
}
