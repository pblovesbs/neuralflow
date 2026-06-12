'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, Zap, Settings, Brain, ArrowRight, Loader2, CheckCircle2, ShieldCheck, Download } from 'lucide-react';

type Step = 'choose-mode' | 'auto-ram' | 'auto-analyzing' | 'reveal' | 'pro-select' | 'pulling' | 'done';

export default function SetupModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('choose-mode');
  const [ram, setRam] = useState<number>(8);
  const [manualModel, setManualModel] = useState<string | null>(null);
  
  const [result, setResult] = useState<{ model: string; rationale: string; message: string } | null>(null);

  const handleSetupSubmit = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/models/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ram_gb: ram, manual_model: manualModel }),
      });
      const data = await res.json();
      setResult(data);
      if (manualModel) {
        setStep('pulling');
      } else {
        setStep('reveal');
      }
    } catch (e) {
      console.error(e);
      setResult({ model: 'Error', rationale: 'Failed to connect to backend.', message: 'Connection Error' });
      setStep('done');
    }
  }, [ram, manualModel]);

  // Auto-advance from analyzing to reveal
  useEffect(() => {
    if (step === 'auto-analyzing') {
      const timer = setTimeout(() => {
        handleSetupSubmit();
      }, 1500); // 1.5s artificial delay for trust
      return () => clearTimeout(timer);
    }
  }, [step, handleSetupSubmit]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 transition-all">
      <div 
        className="w-full max-w-[500px] rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-500 ease-in-out relative border"
        style={{
          background: 'var(--nf-bg-secondary)',
          borderColor: 'rgba(255,255,255,0.1)'
        }}
      >
        {/* Glow Effects */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-cyan-500 to-purple-500 opacity-50" />
        
        <div className="p-8 flex flex-col gap-6">
          
          {step === 'choose-mode' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2 text-white">Hardware Setup</h2>
                <p className="text-sm" style={{ color: 'var(--nf-text-secondary)' }}>
                  How would you like to install your AI models?
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => setStep('auto-ram')}
                  className="flex items-start gap-4 p-4 rounded-xl border border-transparent hover:border-purple-500/50 hover:bg-purple-500/10 transition-all text-left group"
                  style={{ background: 'var(--nf-bg-surface)' }}
                >
                  <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Auto-Pilot (Recommended)</h3>
                    <p className="text-xs" style={{ color: 'var(--nf-text-dim)' }}>
                      Tell us your Mac&apos;s RAM, and we&apos;ll automatically download the perfect model to ensure zero lag.
                    </p>
                  </div>
                </button>

                <button 
                  onClick={() => setStep('pro-select')}
                  className="flex items-start gap-4 p-4 rounded-xl border border-transparent hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all text-left group"
                  style={{ background: 'var(--nf-bg-surface)' }}
                >
                  <div className="p-3 rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Pro Mode</h3>
                    <p className="text-xs" style={{ color: 'var(--nf-text-dim)' }}>
                      I know exactly what I want. Let me select from the curated menu.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 'auto-ram' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-6">
                <Cpu className="mx-auto mb-4 text-purple-400" size={32} />
                <h2 className="text-xl font-bold mb-2 text-white">System Memory</h2>
                <p className="text-sm" style={{ color: 'var(--nf-text-secondary)' }}>
                  Select your Mac&apos;s Total Unified Memory (RAM).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-8">
                {[
                  { val: 4, label: '4 GB', desc: 'Basic' },
                  { val: 8, label: '8 GB', desc: 'Standard' },
                  { val: 16, label: '16 GB', desc: 'Pro' },
                  { val: 32, label: '32 GB+', desc: 'Max' }
                ].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => setRam(opt.val)}
                    className={`p-4 rounded-xl border text-center transition-all ${ram === opt.val ? 'border-purple-500 bg-purple-500/10' : 'border-transparent hover:border-white/10'}`}
                    style={{ background: ram === opt.val ? 'var(--nf-bg-surface)' : 'var(--nf-bg-input)' }}
                  >
                    <div className={`font-bold text-lg ${ram === opt.val ? 'text-purple-400' : 'text-white'}`}>{opt.label}</div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--nf-text-dim)' }}>{opt.desc}</div>
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setStep('auto-analyzing')}
                className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all"
                style={{ background: 'var(--nf-accent-purple)' }}
              >
                Analyze System <ArrowRight size={18} />
              </button>
            </div>
          )}

          {step === 'auto-analyzing' && (
            <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="animate-spin text-purple-400 mb-6" size={48} />
              <h2 className="text-lg font-semibold text-white mb-2">Analyzing Hardware...</h2>
              <p className="text-sm" style={{ color: 'var(--nf-text-dim)' }}>
                Finding the optimal neural engine for {ram}GB of RAM.
              </p>
            </div>
          )}

          {step === 'reveal' && result && (
            <div className="animate-in zoom-in-95 duration-500 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Optimal Model Found</h2>
              <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-purple-300 mb-6">
                {result.model}
              </div>
              <p className="text-sm leading-relaxed mb-8 px-4" style={{ color: 'var(--nf-text-secondary)' }}>
                {result.rationale}
              </p>
              
              <button 
                onClick={() => setStep('pulling')}
                className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all"
                style={{ background: 'var(--nf-accent-emerald)' }}
              >
                <Download size={18} /> Download & Install Now
              </button>
            </div>
          )}

          {step === 'pro-select' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-6">
                <Brain className="mx-auto mb-4 text-cyan-400" size={32} />
                <h2 className="text-xl font-bold mb-2 text-white">Curated Models</h2>
                <p className="text-sm" style={{ color: 'var(--nf-text-secondary)' }}>
                  Select your preferred digital brain.
                </p>
              </div>

              <div className="flex flex-col gap-3 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {[
                  { id: 'qwen2.5:0.5b', icon: '⚡', name: 'Lightning Fast', desc: 'Extremely fast, basic tasks. Runs on anything.', req: '4GB+' },
                  { id: 'llama3.2:1b', icon: '⚖️', name: 'Balanced Engine', desc: 'Meta’s optimized model. Great everyday assistant.', req: '8GB+' },
                  { id: 'llama3.2', icon: '🚀', name: 'Advanced Reasoner', desc: 'Deep logic and code generation.', req: '16GB+' },
                  { id: 'gemma:2b', icon: '🧠', name: 'Heavy Duty', desc: 'Google’s massive 2B parameter logic engine.', req: '16GB+' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setManualModel(opt.id)}
                    className={`flex items-center gap-4 p-3 rounded-xl border transition-all text-left ${manualModel === opt.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-transparent hover:border-white/10'}`}
                    style={{ background: manualModel === opt.id ? 'var(--nf-bg-surface)' : 'var(--nf-bg-input)' }}
                  >
                    <div className="text-2xl">{opt.icon}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-white">{opt.name} <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-white/10 ml-2">{opt.id}</span></div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--nf-text-dim)' }}>{opt.desc}</div>
                    </div>
                    <div className="text-[10px] font-mono text-cyan-500/70">{opt.req}</div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setStep('choose-mode')}
                  className="px-4 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
                  style={{ color: 'var(--nf-text-dim)' }}
                >
                  Back
                </button>
                <button 
                  onClick={handleSetupSubmit}
                  disabled={!manualModel}
                  className="flex-1 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'var(--nf-accent-cyan)' }}
                >
                  Install Selection
                </button>
              </div>
            </div>
          )}

          {step === 'pulling' && (
             <div className="animate-in zoom-in duration-500 flex flex-col items-center justify-center py-8 text-center">
               <div className="relative mb-8">
                 <div className="absolute inset-0 rounded-full blur-xl bg-purple-500/30 animate-pulse"></div>
                 <Loader2 className="animate-spin text-purple-400 relative z-10" size={64} />
               </div>
               <h2 className="text-xl font-bold text-white mb-2">Downloading Brain...</h2>
               <p className="text-sm max-w-xs mx-auto mb-6" style={{ color: 'var(--nf-text-secondary)' }}>
                 {result?.message || 'Fetching the model from Ollama. This runs quietly in the background.'}
               </p>
               <button 
                 onClick={onClose}
                 className="px-6 py-2.5 rounded-xl text-sm font-medium border border-white/10 hover:bg-white/5 transition-all text-white"
               >
                 Close & Continue Working
               </button>
             </div>
          )}

          {step === 'done' && (
             <div className="animate-in zoom-in duration-500 flex flex-col items-center justify-center py-8 text-center">
               <CheckCircle2 className="text-emerald-400 mb-6" size={64} />
               <h2 className="text-xl font-bold text-white mb-2">Setup Complete</h2>
               <p className="text-sm max-w-xs mx-auto mb-6" style={{ color: 'var(--nf-text-secondary)' }}>
                 The model is queued and running in the background. It will appear in your Agent nodes shortly.
               </p>
               <button 
                 onClick={onClose}
                 className="px-6 py-2.5 rounded-xl text-sm font-medium bg-white/10 hover:bg-white/20 transition-all text-white"
               >
                 Done
               </button>
             </div>
          )}

        </div>
        
        {/* Close Button top right */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
          style={{ color: 'var(--nf-text-dim)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  );
}
