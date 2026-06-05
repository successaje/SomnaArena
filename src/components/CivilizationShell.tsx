'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSimulation } from '../hooks/useSimulation';

export function CivilizationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { simState, blocks, gasPrice, isRunning, toggleSimulation, resetChain, setGeminiApiKey, toggleLiveTestnet } = useSimulation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
