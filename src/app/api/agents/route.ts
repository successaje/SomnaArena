import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const agentRoles = [
  { role: 'organizer', name: 'Synthetix Organizer' },
  { role: 'referee', name: 'Ref-Alpha Arbitrator' },
  { role: 'commentator', name: 'Neon Cast Commentator' },
  { role: 'player_shadowbyte', name: 'ShadowByte' },
  { role: 'player_quantumcore', name: 'QuantumCore' },
  { role: 'player_cyberslasher', name: 'CyberSlasher' },
  { role: 'player_neonviper', name: 'NeonViper' }
];

export async function GET() {
  try {
    const masterPrivateKey = process.env.PRIVATE_KEY;
    if (!masterPrivateKey) {
      return NextResponse.json({ error: 'PRIVATE_KEY not configured on server' }, { status: 500 });
    }

    const agents = agentRoles.map(agent => {
      const agentPrivateKey = ethers.keccak256(
        ethers.solidityPacked(['string', 'string'], [masterPrivateKey, agent.role])
      );
      const wallet = new ethers.Wallet(agentPrivateKey);
      return {
        role: agent.role,
        name: agent.name,
        address: wallet.address
      };
    });

    return NextResponse.json(agents);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
