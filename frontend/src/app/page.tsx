'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useModeStore, { Mode } from '@/store/modeStore';
import { Sparkles, Hammer } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const setMode = useModeStore((s) => s.setMode);
  
  // States
  const [splashState, setSplashState] = useState<'splash' | 'selection'>('splash');
  const [isLaunching, setIsLaunching] = useState<Mode | null>(null);

  useEffect(() => {
    // Throb for a few seconds before revealing the mode selection
    const timer = setTimeout(() => {
      setSplashState('selection');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleLaunch = (selectedMode: Mode) => {
    setIsLaunching(selectedMode);
    setMode(selectedMode);
    setTimeout(() => {
      router.push(`/${selectedMode}`);
    }, 600); // Wait for transition animation
  };

  return (
    <main className="flex flex-col h-screen w-screen items-center justify-center bg-black overflow-hidden relative">
      {/* Deep Ambient Gradients */}
      <div className="absolute top-0 left-0 w-[1000px] h-[1000px] bg-cyan-900/20 rounded-full blur-[150px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[1000px] h-[1000px] bg-purple-900/20 rounded-full blur-[150px] pointer-events-none translate-x-1/2 translate-y-1/2" />

      {/* --- SPLASH PHASE --- */}
      <div 
        className={`absolute inset-0 flex items-center justify-center z-50 transition-all duration-1000 ease-in-out pointer-events-none ${
          splashState === 'splash' ? 'opacity-100 scale-100' : 'opacity-0 scale-150'
        }`}
      >
        <div className="relative flex flex-col items-center">
          <img 
            src="/logo.png" 
            alt="NeuralFlow Logo" 
            className="w-48 h-48 object-contain animate-hover-throb rounded-3xl mb-8"
          />
          <h1 
            className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-neutral-400 tracking-tighter uppercase drop-shadow-2xl"
            style={{ fontFamily: 'Impact, sans-serif' }}
          >
            NeuralFlow
          </h1>
        </div>
      </div>

      {/* --- SELECTION PHASE --- */}
      <div 
        className={`w-full h-full flex flex-col items-center justify-center transition-all duration-1000 ease-out z-10 ${
          splashState === 'selection' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
        }`}
      >
        
        <div className={`text-center mb-16 transition-all duration-700 ${isLaunching ? 'opacity-0 -translate-y-8' : 'opacity-100'}`}>
          <h2 className="text-3xl font-bold text-white mb-3">Choose Your Workspace</h2>
          <p className="text-neutral-400">Select how you want to interact with the NeuralFlow AI Engine.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 px-6 max-w-5xl w-full justify-center">
          {/* Standard Mode Card */}
          <button
            onClick={() => handleLaunch('standard')}
            disabled={isLaunching !== null}
            className={`group relative flex flex-col items-center p-10 bg-black/60 backdrop-blur-3xl border border-white/20 rounded-[2rem] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] w-full md:w-96 text-left overflow-hidden ${
              isLaunching === 'standard' 
                ? 'scale-105 border-cyan-500/50 shadow-[0_0_50px_rgba(34,211,238,0.4)] z-20' 
                : isLaunching === 'builder'
                  ? 'opacity-0 scale-90 blur-sm pointer-events-none'
                  : 'hover:scale-105 hover:border-cyan-500/30 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]'
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 transition-opacity duration-500 ${isLaunching === 'standard' ? 'opacity-100' : 'group-hover:opacity-100'}`} />
            
            <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 text-cyan-400 group-hover:scale-110 transition-transform duration-500">
              {isLaunching === 'standard' ? (
                <div className="w-8 h-8 border-3 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              ) : (
                <Sparkles size={40} />
              )}
            </div>
            
            <h3 className="text-3xl font-black text-white mb-4 tracking-wide group-hover:text-cyan-400 transition-colors break-words">STANDARD MODE</h3>
            <p className="text-neutral-400 text-center leading-relaxed">
              Frictionless AI workflows. Select a task and get automated results instantly without worrying about the underlying architecture.
            </p>
          </button>

          {/* Builder Mode Card */}
          <button
            onClick={() => handleLaunch('builder')}
            disabled={isLaunching !== null}
            className={`group relative flex flex-col items-center p-10 bg-black/60 backdrop-blur-3xl border border-white/20 rounded-[2rem] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] w-full md:w-96 text-left overflow-hidden ${
              isLaunching === 'builder' 
                ? 'scale-105 border-purple-500/50 shadow-[0_0_50px_rgba(168,85,247,0.4)] z-20' 
                : isLaunching === 'standard'
                  ? 'opacity-0 scale-90 blur-sm pointer-events-none'
                  : 'hover:scale-105 hover:border-purple-500/30 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]'
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 transition-opacity duration-500 ${isLaunching === 'builder' ? 'opacity-100' : 'group-hover:opacity-100'}`} />
            
            <div className="w-20 h-20 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 transition-transform duration-500">
              {isLaunching === 'builder' ? (
                <div className="w-8 h-8 border-3 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
              ) : (
                <Hammer size={40} />
              )}
            </div>
            
            <h3 className="text-3xl font-black text-white mb-4 tracking-wide group-hover:text-purple-400 transition-colors break-words">BUILDER MODE</h3>
            <p className="text-neutral-400 text-center leading-relaxed">
              Full architectural control. Build, wire, and fine-tune your custom DAG visually with total flexibility and advanced tools.
            </p>
          </button>
        </div>

        {/* Branding at the bottom */}
        <div className={`absolute bottom-10 flex flex-col items-center justify-center transition-opacity duration-700 ${isLaunching ? 'opacity-0' : 'opacity-100'}`}>
          <div className="flex items-center gap-3 opacity-50">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg" />
            <span className="font-bold tracking-widest text-sm uppercase">NeuralFlow Engine</span>
          </div>
        </div>
      </div>
    </main>
  );
}
