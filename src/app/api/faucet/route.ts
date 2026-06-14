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

    let sttTransferred = false;
    let satTransferred = false;
    let sttTxHash = '';
    let satTxHash = '';

    // Check STT balance
    const targetBal = await provider.getBalance(address);
    if (targetBal < ethers.parseEther('0.05')) {
      console.log(`[Faucet API] Sending 0.1 STT to ${address} from ${faucetWallet.address}...`);
      const tx = await faucetWallet.sendTransaction({
        to: address,
        value: ethers.parseEther('0.1')
      });
      const receipt = await tx.wait(1);
      sttTxHash = receipt?.hash || '';
      sttTransferred = true;
    }

    // Check SAT balance
    const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS || '0x1a983C4e0B9f57B5b34b6C753Ab13828ad21969F';
    const tokenContract = new ethers.Contract(tokenAddress, [
      "function transfer(address to, uint256 value) returns (bool)",
      "function balanceOf(address) view returns (uint256)"
    ], faucetWallet);

    const tokenBal = await tokenContract.balanceOf(address);
    if (tokenBal < ethers.parseEther('500')) {
      console.log(`[Faucet API] Sending 2000 SAT to ${address} from ${faucetWallet.address}...`);
      const tokenTx = await tokenContract.transfer(address, ethers.parseEther('2000'));
      const receipt = await tokenTx.wait(1);
      satTxHash = receipt?.hash || '';
      satTransferred = true;
    }

    if (!sttTransferred && !satTransferred) {
      return NextResponse.json({ message: 'Address already fully funded with STT and SAT', balance: ethers.formatEther(targetBal) });
    }

    return NextResponse.json({ 
      success: true, 
      hash: sttTxHash || satTxHash || '',
      message: `Successfully funded address. STT: ${sttTransferred ? '0.1 STT sent' : 'sufficient'}, SAT: ${satTransferred ? '2000 SAT sent' : 'sufficient'}`
    });
  } catch (error: any) {
    console.error('Gas Faucet error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
