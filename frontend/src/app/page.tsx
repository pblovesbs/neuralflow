'use client';

/**
 * NeuralFlow — Mode Selection Landing Page
 * A centralized, glassmorphic modal against a moody backdrop.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import useModeStore, { Mode } from '@/store/modeStore';
import { Sparkles, Hammer } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const setMode = useModeStore((s) => s.setMode);
  const [selected, setSelected] = useState<Mode>('standard');
  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunch = () => {
    setIsLaunching(true);
    setMode(selected);
    setTimeout(() => {
      router.push(`/${selected}`);
    }, 300);
  };

  return (
    <main className="flex h-screen w-screen items-center justify-center bg-neutral-950 overflow-hidden relative">
      {/* Subtle ambient glow in background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />

      <div 
        className={`relative z-10 w-full max-w-md bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl transition-all duration-500 ${isLaunching ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">NeuralFlow</h1>
          <p className="text-sm text-neutral-400 mt-1">Select your workspace</p>
        </div>

        {/* Segmented Control */}
        <div className="bg-white/5 p-1 rounded-xl flex mb-6 relative">
          {/* Active Slider */}
          <div 
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 rounded-lg border border-white/5 shadow-sm transition-all duration-300 ease-out"
            style={{ left: selected === 'standard' ? '4px' : 'calc(50%)' }}
          />
          
          <button
            onClick={() => setSelected('standard')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-colors relative z-10 ${selected === 'standard' ? 'text-cyan-400' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <Sparkles size={16} />
            Standard
          </button>
          
          <button
            onClick={() => setSelected('builder')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-colors relative z-10 ${selected === 'builder' ? 'text-purple-400' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <Hammer size={16} />
            Builder
          </button>
        </div>

        {/* Dynamic Context */}
        <div className="h-10 flex items-center justify-center mb-8 text-center">
          <p className="text-sm text-neutral-400 animate-fade-in key={selected}">
            {selected === 'standard' 
              ? 'Frictionless AI workflows. Select a task and get results.' 
              : 'Full architectural control. Build, wire, and fine-tune your DAG.'}
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={handleLaunch}
          disabled={isLaunching}
          className="w-full py-4 rounded-xl font-bold text-white transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
          style={{
            background: selected === 'standard' 
              ? 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)'
              : 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
            boxShadow: selected === 'standard'
              ? '0 8px 30px -8px rgba(14, 165, 233, 0.5)'
              : '0 8px 30px -8px rgba(139, 92, 246, 0.5)'
          }}
        >
          {isLaunching ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Launch Workspace'
          )}
        </button>
      </div>
    </main>
  );
}
