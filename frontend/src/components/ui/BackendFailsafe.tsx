"use client";

import React, { useState, useEffect } from 'react';
import { ServerCrash, Loader2 } from 'lucide-react';

export function BackendFailsafe() {
  const [isConnected, setIsConnected] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/models', { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          setIsConnected(true);
          setIsStarting(false);
        } else {
          setIsConnected(false);
        }
      } catch {
        setIsConnected(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStartBackend = async () => {
    if (isStarting) return;
    setIsStarting(true);
    
    try {
      const res = await fetch('/api/system/start-backend', {
        method: 'POST'
      });
      if (!res.ok) {
        console.error('Failed to initiate backend startup');
        setIsStarting(false);
      }
    } catch (e) {
      console.error(e);
      setIsStarting(false);
    }
  };

  if (isConnected) return null;

  return (
    <button
      onClick={handleStartBackend}
      disabled={isStarting}
      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border shadow-sm ${
        isStarting 
          ? 'bg-[var(--nf-bg-surface)] border-[var(--nf-border)] text-[var(--nf-text-muted)] cursor-not-allowed'
          : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400 hover:text-red-300'
      }`}
      title="Backend Offline - Click to Start"
    >
      {isStarting ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          Starting Server...
        </>
      ) : (
        <>
          <ServerCrash size={14} />
          Start Backend Engine
        </>
      )}
    </button>
  );
}
