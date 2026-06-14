'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSimulation } from '../hooks/useSimulation';

export function CivilizationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { simState, blocks, gasPrice, isRunning, toggleSimulation, resetChain, setGeminiApiKey, toggleLiveTestnet, observerAddress, setObserverAddress } = useSimulation();
  const [mounted, setMounted] = useState(false);

  const [walletBal, setWalletBal] = useState<string>('0.00');
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [claiming, setClaiming] = useState<boolean>(false);
  const [claimStatus, setClaimStatus] = useState<string>('');

  // Auto-connect to metamask if already authorized
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts && accounts[0]) {
            setObserverAddress(accounts[0]);
            setIsSimulated(false);
          } else {
            // Check for simulated sandbox wallet in localStorage
            const savedSim = localStorage.getItem('somnarena_sandbox_wallet');
            if (savedSim) {
              setObserverAddress(savedSim);
              setIsSimulated(true);
            }
          }
        });

      const handleAccounts = (accounts: string[]) => {
        if (accounts && accounts[0]) {
          setObserverAddress(accounts[0]);
          setIsSimulated(false);
        } else {
          setObserverAddress('');
        }
      };

      (window as any).ethereum.on('accountsChanged', handleAccounts);
      return () => {
        (window as any).ethereum?.removeListener('accountsChanged', handleAccounts);
      };
    } else {
      const savedSim = localStorage.getItem('somnarena_sandbox_wallet');
      if (savedSim) {
        setObserverAddress(savedSim);
        setIsSimulated(true);
      }
    }
  }, [setObserverAddress]);

  // Fetch balance dynamically
  useEffect(() => {
    if (observerAddress) {
      if (typeof window !== 'undefined' && (window as any).ethereum && !isSimulated) {
        import('ethers').then(({ ethers }) => {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          provider.getBalance(observerAddress)
            .then(bal => {
              setWalletBal(parseFloat(ethers.formatEther(bal)).toFixed(4));
            })
            .catch(() => setWalletBal('0.00'));
        });
      } else {
        setWalletBal('10.0000');
      }
    } else {
      setWalletBal('0.00');
    }
  }, [observerAddress, isSimulated, blocks]);

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          setObserverAddress(accounts[0]);
          setIsSimulated(false);
        }
      } catch (err) {
        console.error('Wallet connection rejected', err);
      }
    } else {
      // Sandbox Web3 wallet creation fallback
      import('ethers').then(({ ethers }) => {
        const randomWallet = ethers.Wallet.createRandom();
        localStorage.setItem('somnarena_sandbox_wallet', randomWallet.address);
        setObserverAddress(randomWallet.address);
        setIsSimulated(true);
      });
    }
  };

  const disconnectWallet = () => {
    setObserverAddress('');
    if (isSimulated) {
      localStorage.removeItem('somnarena_sandbox_wallet');
    }
  };

  const claimFaucet = async () => {
    if (!observerAddress) return;
    setClaiming(true);
    setClaimStatus('Requesting 0.1 STT from gas faucet...');
    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: observerAddress })
      });
      const data = await res.json();
      if (data.success) {
        setClaimStatus(`Funded! TX Hash: ${data.hash.slice(0, 10)}...`);
        if (typeof window !== 'undefined' && (window as any).ethereum && !isSimulated) {
          import('ethers').then(({ ethers }) => {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            provider.getBalance(observerAddress)
              .then(bal => setWalletBal(parseFloat(ethers.formatEther(bal)).toFixed(4)));
          });
        }
      } else {
        setClaimStatus(`Faucet: ${data.error || 'Failed'}`);
      }
    } catch (err: any) {
      setClaimStatus(`Error: ${err.message}`);
    }
    setClaiming(false);
    setTimeout(() => setClaimStatus(''), 6000);
  };

  if (!mounted) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      {/* Top Global Ticker */}
      <header style={{
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-color)',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 className="glitch-text" data-text="SOMNARENA" style={{ margin: 0, fontSize: '1.5rem', color: 'var(--neon-cyan)', letterSpacing: '2px' }}>
            SOMNARENA
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`pulse-indicator ${isRunning ? 'active' : ''}`} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: isRunning ? 'var(--neon-green)' : 'var(--neon-amber)' }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>
              {isRunning ? 'CIVILIZATION ENGINE: ONLINE' : 'CIVILIZATION ENGINE: PAUSED'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>BLOCK:</span> <span className="cyan-glow">{blocks[blocks.length - 1]?.number || 0}</span></div>
          <div><span style={{ color: 'var(--text-muted)' }}>GAS:</span> <span className="amber-glow">{gasPrice} GWEI</span></div>
          <div><span style={{ color: 'var(--text-muted)' }}>NETWORK:</span> <span className="magenta-glow">{simState.isLiveTestnet ? 'SHANNON TESTNET' : 'LOCAL SIMULATION'}</span></div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar Navigation */}
        <nav style={{
          width: '240px',
          background: 'var(--bg-panel)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 0'
        }}>
          <div style={{ padding: '0 20px 20px', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '1px', borderBottom: '1px solid var(--border-color)', marginBottom: '10px' }}>
            SYSTEM DIRECTORY
          </div>
          
          <NavItem href="/dashboard" current={pathname} icon="🌐" label="Civilization Hub" />
          <NavItem href="/arena" current={pathname} icon="⚔️" label="Live Arena" />
          <NavItem href="/legends" current={pathname} icon="🏆" label="Hall of Legends" />
          
          {/* Web3 Wallet Section */}
          <div style={{
            padding: '15px 20px',
            borderTop: '1px solid var(--border-color)',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(255, 255, 255, 0.02)',
            marginTop: '15px',
            marginBottom: '15px',
            fontSize: '0.85rem'
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '8px' }}>
              OBSERVER WALLET
            </div>
            {!observerAddress ? (
              <button
                onClick={connectWallet}
                className="pulse-glow"
                style={{
                  width: '100%',
                  background: 'var(--neon-cyan)',
                  color: '#000',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}
              >
                ⚡ CONNECT WALLET
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace' }}>
                  <span style={{ color: 'var(--text-muted)' }}>ADDR:</span>
                  <span style={{ color: 'var(--neon-green)' }}>
                    {observerAddress.slice(0, 6)}...{observerAddress.slice(-4)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace' }}>
                  <span style={{ color: 'var(--text-muted)' }}>BAL:</span>
                  <span>{walletBal} STT</span>
                </div>
                {isSimulated && (
                  <div style={{ fontSize: '0.65rem', color: 'var(--neon-amber)', fontStyle: 'italic' }}>
                    Sandbox Burner (No MetaMask)
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                  <button
                    onClick={claimFaucet}
                    disabled={claiming}
                    style={{
                      flex: 1,
                      background: 'rgba(0, 240, 255, 0.1)',
                      color: 'var(--neon-cyan)',
                      border: '1px solid var(--neon-cyan)',
                      padding: '5px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace'
                    }}
                  >
                    {claiming ? 'CLAIMING...' : '🎁 FAUCET'}
                  </button>
                  <button
                    onClick={disconnectWallet}
                    style={{
                      background: 'rgba(255, 0, 128, 0.1)',
                      color: 'var(--neon-magenta)',
                      border: '1px solid var(--neon-magenta)',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace'
                    }}
                  >
                    EXIT
                  </button>
                </div>
                {claimStatus && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--neon-amber)', fontFamily: 'monospace', wordBreak: 'break-all', marginTop: '5px' }}>
                    {claimStatus}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div style={{ flex: 1 }} />
          
          <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '5px' }}>GEMINI API KEY (Optional)</div>
              <input 
                type="password" 
                placeholder="AI Story Engine Key..."
                onChange={(e) => setGeminiApiKey(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  padding: '8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem'
                }}
              />
            </div>
            <button 
              onClick={toggleSimulation}
              style={{
                background: isRunning ? 'transparent' : 'var(--neon-cyan)',
                color: isRunning ? 'var(--neon-cyan)' : '#000',
                border: '1px solid var(--neon-cyan)',
                padding: '10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                letterSpacing: '1px'
              }}
            >
              {isRunning ? 'PAUSE CIVILIZATION' : 'START CIVILIZATION'}
            </button>
            <button 
              onClick={toggleLiveTestnet} 
              style={{
                background: simState.isLiveTestnet ? 'var(--neon-magenta)' : 'transparent',
                color: simState.isLiveTestnet ? '#000' : 'var(--neon-magenta)',
                border: '1px solid var(--neon-magenta)',
                padding: '10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                marginTop: '10px'
              }}
            >
              {simState.isLiveTestnet ? 'L1 NETWORK: ACTIVE' : 'SWITCH TO TESTNET L1'}
            </button>
            <button 
              onClick={resetChain}
              style={{
                background: 'transparent',
                color: 'var(--neon-amber)',
                border: '1px solid var(--neon-amber)',
                padding: '10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '0.8rem'
              }}
            >
              RESET LEDGER
            </button>
          </div>
        </nav>

        {/* Main Content Area */}
        <main style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({ href, current, icon, label }: { href: string; current: string; icon: string; label: string }) {
  const isActive = current === href || current.startsWith(href + '/');
  return (
    <Link href={href} style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 20px',
      textDecoration: 'none',
      color: isActive ? 'var(--neon-cyan)' : 'var(--text-main)',
      background: isActive ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
      borderLeft: isActive ? '4px solid var(--neon-cyan)' : '4px solid transparent',
      transition: 'all 0.2s',
      fontFamily: 'monospace',
      fontSize: '0.9rem'
    }}>
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
