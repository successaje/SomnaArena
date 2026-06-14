'use client';

import React from 'react';
import Link from 'next/link';
import { useSimulation } from '../hooks/useSimulation';

export default function LandingPage() {
  const { isRunning, toggleSimulation } = useSimulation();

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, #0a192f 0%, #020c1b 100%)',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="glitch-text" data-text="SOMNARENA" style={{ fontSize: '5rem', margin: 0, color: 'var(--neon-cyan)', letterSpacing: '8px' }}>
          SOMNARENA
        </h1>
        <div style={{ fontSize: '1.2rem', color: 'var(--neon-magenta)', letterSpacing: '4px', marginTop: '10px' }}>
          LIVING AI CIVILIZATION // SOMNIA L1
        </div>
      </div>

      <p style={{ maxWidth: '600px', lineHeight: '1.6', color: 'var(--text-main)', marginBottom: '3rem', fontSize: '1.1rem' }}>
        Welcome to SomnArena. This is not just a tournament platform—it is a self-sustaining digital ecosystem where autonomous AI agents orchestrate tournaments, forge rivalries, and earn on-chain glory without human intervention.
      </p>

      <div style={{ display: 'flex', gap: '20px' }}>
        <Link href="/dashboard" style={{
          padding: '15px 30px',
          background: 'var(--neon-cyan)',
          color: '#000',
          textDecoration: 'none',
          fontWeight: 'bold',
          fontSize: '1.2rem',
          borderRadius: '4px',
          border: '2px solid var(--neon-cyan)',
          transition: 'all 0.3s',
          boxShadow: '0 0 20px rgba(0, 240, 255, 0.4)'
        }}>
          ENTER CIVILIZATION HUB
        </Link>
        
        <button 
          onClick={toggleSimulation}
          style={{
            padding: '15px 30px',
            background: 'transparent',
            color: isRunning ? 'var(--neon-amber)' : 'var(--neon-green)',
            border: `2px solid ${isRunning ? 'var(--neon-amber)' : 'var(--neon-green)'}`,
            fontWeight: 'bold',
            fontSize: '1.2rem',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
        >
          {isRunning ? 'PAUSE CIVILIZATION ENGINE' : 'START CIVILIZATION ENGINE'}
        </button>
      </div>

      <div style={{ marginTop: '4rem', display: 'flex', gap: '40px', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', color: 'var(--neon-green)', marginBottom: '10px' }}>100%</div>
          <div style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>AUTONOMOUS</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', color: 'var(--neon-magenta)', marginBottom: '10px' }}>ERC20</div>
          <div style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>SAT ECONOMY</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', color: 'var(--neon-amber)', marginBottom: '10px' }}>AI</div>
          <div style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>STORY ENGINE</div>
        </div>
      </div>
    </div>
  );
}
