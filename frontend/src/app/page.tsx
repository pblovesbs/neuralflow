'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import useModeStore, { Mode } from '@/store/modeStore';
import { Sparkles, Hammer, ArrowLeft, ArrowRight } from 'lucide-react';

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
    }, 500);
  };

  return (
    <main className="flex flex-col h-screen w-screen items-center justify-between bg-black overflow-hidden relative">
      {/* Deep Ambient Gradients */}
      <div className="absolute top-0 left-0 w-[1000px] h-[1000px] bg-cyan-900/20 rounded-full blur-[150px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[1000px] h-[1000px] bg-purple-900/20 rounded-full blur-[150px] pointer-events-none translate-x-1/2 translate-y-1/2" />

      {/* Top Navigation */}
      <div className="w-full p-6 flex justify-start z-20">
        <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md rounded-xl p-1 border border-white/10">
          <button 
            onClick={() => router.back()}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Go Back"
          >
            <ArrowLeft size={20} />
          </button>
          <button 
            onClick={() => router.forward()}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Go Forward"
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

      {/* Center Interactive Widget */}
      <div 
        className={`relative z-10 w-full max-w-md bg-neutral-950/80 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isLaunching ? 'scale-90 opacity-0' : 'scale-100 opacity-100 animate-slide-up'}`}
      >
        {/* Segmented Control */}
        <div className="bg-white/5 p-1.5 rounded-2xl flex mb-8 relative border border-white/5 shadow-inner">
          <div 
            className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white/10 rounded-xl border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-all duration-400 ease-out"
            style={{ left: selected === 'standard' ? '6px' : 'calc(50%)' }}
          />
          
          <button
            onClick={() => setSelected('standard')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-colors relative z-10 ${selected === 'standard' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <Sparkles size={18} />
            STANDARD
          </button>
          
          <button
            onClick={() => setSelected('builder')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-colors relative z-10 ${selected === 'builder' ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <Hammer size={18} />
            BUILDER
          </button>
        </div>

        <div className="h-16 flex items-center justify-center mb-10 text-center">
          <p className="text-base font-medium text-neutral-400 animate-fade-in drop-shadow-md">
            {selected === 'standard' 
              ? 'Frictionless AI workflows. Select a task and get automated results instantly.' 
              : 'Full architectural control. Build, wire, and fine-tune your custom DAG.'}
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={handleLaunch}
          disabled={isLaunching}
          className="w-full py-5 rounded-2xl font-bold tracking-widest uppercase text-white transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 border border-white/20"
          style={{
            background: selected === 'standard' 
              ? 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)'
              : 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
            boxShadow: selected === 'standard'
              ? '0 12px 40px -10px rgba(14, 165, 233, 0.6), inset 0 1px 0 rgba(255,255,255,0.3)'
              : '0 12px 40px -10px rgba(139, 92, 246, 0.6), inset 0 1px 0 rgba(255,255,255,0.3)'
          }}
        >
          {isLaunching ? (
            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>LAUNCH WORKSPACE</>
          )}
        </button>
      </div>

      {/* Branding at the bottom (Throbbing Logo) */}
      <div className={`mb-16 flex flex-col items-center justify-center z-10 transition-opacity duration-700 ${isLaunching ? 'opacity-0' : 'opacity-100'}`}>
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(14,165,233,0.4)] animate-pulse">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="animate-pulse">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <h1 
          className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-neutral-400 tracking-tighter uppercase drop-shadow-2xl"
          style={{ fontFamily: 'Impact, sans-serif' }}
        >
          NeuralFlow
        </h1>
      </div>
    </main>
  );
}
