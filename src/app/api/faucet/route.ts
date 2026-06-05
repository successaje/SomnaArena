import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const RPC_URL = process.env.SOMNIA_RPC_URL || 'https://api.infra.testnet.somnia.network/';

export async function POST(request: Request) {
  try {
    const { address } = await request.json();

    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json({ error: 'Invalid Ethereum address' }, { status: 400 });
    }

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ error: 'Faucet PRIVATE_KEY not configured on server' }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const faucetWallet = new ethers.Wallet(privateKey, provider);

    // Check balance of faucet wallet to ensure it has enough funds
    const faucetBal = await provider.getBalance(faucetWallet.address);
    const requiredGas = ethers.parseEther('0.1');

    if (faucetBal < requiredGas) {
      return NextResponse.json({ 
        error: `Faucet wallet ${faucetWallet.address} has insufficient funds. Please fund it with STT from the faucet first.` 
      }, { status: 500 });
    }

    // Check if target address already has some balance to avoid wasting gas
    const targetBal = await provider.getBalance(address);
    if (targetBal >= ethers.parseEther('0.05')) {
      return NextResponse.json({ message: 'Address already funded', balance: ethers.formatEther(targetBal) });
    }

    console.log(`[Faucet API] Sending 0.1 STT to ${address} from ${faucetWallet.address}...`);

    const tx = await faucetWallet.sendTransaction({
      to: address,
      value: ethers.parseEther('0.1')
    });

    const receipt = await tx.wait(1);

    return NextResponse.json({ 
      success: true, 
      hash: receipt?.hash || '',
      message: `Successfully transferred 0.1 STT to ${address}`
    });
  } catch (error: any) {
    console.error('Gas Faucet error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
