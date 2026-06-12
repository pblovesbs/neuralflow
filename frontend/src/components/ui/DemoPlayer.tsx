'use client';

import React, { useState, useEffect } from 'react';
import { DemoConfig } from '@/config/demoConfigs';
import { Play, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

interface DemoPlayerProps {
  demo: DemoConfig;
  onClose: () => void;
  onTryItNow: (prefilled: DemoConfig['prefilledWizard']) => void;
}

export default function DemoPlayer({ demo, onClose, onTryItNow }: DemoPlayerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!isPlaying || isFinished) return;

    const step = demo.steps[currentStep];
    const timer = setTimeout(() => {
      if (currentStep < demo.steps.length - 1) {
        setCurrentStep(s => s + 1);
      } else {
        setIsFinished(true);
        setIsPlaying(false);
      }
    }, step.durationMs);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, demo.steps, isFinished]);

  const handleStart = () => {
    setCurrentStep(0);
    setIsFinished(false);
    setIsPlaying(true);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-6">
      <div className="bg-[#080c16] border border-white/10 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors text-sm">
              ← Back
            </button>
            <div className="w-px h-4 bg-white/10" />
            <h2 className="text-lg font-bold text-white tracking-tight">{demo.title}</h2>
          </div>
          
          <button 
            onClick={handleStart}
            disabled={isPlaying}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-400 transition-colors"
          >
            {isPlaying ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} className="fill-white" />}
            {isPlaying ? 'Running...' : 'Play Demo'}
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-[#080c16] to-[#080c16]">
          
          {/* Animated Mini Canvas Simulation */}
          <div className="flex items-center gap-4 mb-16 relative z-10 w-full max-w-lg justify-between">
            {/* Input Node */}
            <div className={`flex flex-col items-center transition-all duration-500 ${isPlaying && currentStep >= 0 ? 'opacity-100 scale-100' : 'opacity-40 scale-95'}`}>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl border-2 transition-all duration-500 ${isPlaying && currentStep === 0 ? 'bg-amber-500/20 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.4)]' : 'bg-white/5 border-white/10'}`}>
                📄
              </div>
              <p className="text-[10px] text-neutral-400 mt-3 font-semibold uppercase tracking-wider">Source</p>
            </div>

            {/* Connecting Line 1 */}
            <div className="flex-1 h-0.5 bg-white/5 relative">
              <div className={`absolute top-0 bottom-0 left-0 bg-cyan-500 transition-all duration-1000 ease-in-out ${isPlaying && currentStep >= 1 ? 'w-full shadow-[0_0_10px_#06b6d4]' : 'w-0'}`} />
            </div>

            {/* AI Node */}
            <div className={`flex flex-col items-center transition-all duration-500 ${isPlaying && currentStep >= 1 ? 'opacity-100 scale-100' : 'opacity-40 scale-95'}`}>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl border-2 transition-all duration-500 ${isPlaying && currentStep === 1 ? 'bg-cyan-500/20 border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.4)]' : 'bg-white/5 border-white/10'}`}>
                🧠
              </div>
              <p className="text-[10px] text-neutral-400 mt-3 font-semibold uppercase tracking-wider">AI Brain</p>
            </div>

            {/* Connecting Line 2 */}
            <div className="flex-1 h-0.5 bg-white/5 relative">
              <div className={`absolute top-0 bottom-0 left-0 bg-purple-500 transition-all duration-1000 ease-in-out ${isPlaying && currentStep >= 2 ? 'w-full shadow-[0_0_10px_#a855f7]' : 'w-0'}`} />
            </div>

            {/* Output Node */}
            <div className={`flex flex-col items-center transition-all duration-500 ${isPlaying && currentStep >= 2 ? 'opacity-100 scale-100' : 'opacity-40 scale-95'}`}>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl border-2 transition-all duration-500 ${isPlaying && currentStep === 2 ? 'bg-purple-500/20 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.4)]' : 'bg-white/5 border-white/10'}`}>
                💾
              </div>
              <p className="text-[10px] text-neutral-400 mt-3 font-semibold uppercase tracking-wider">Destination</p>
            </div>
          </div>

          {/* Dynamic Annotation Bubble */}
          <div className="h-24 w-full flex items-center justify-center relative z-10">
            {!isPlaying && !isFinished ? (
              <p className="text-neutral-500 text-sm">Click Play Demo to see how this works.</p>
            ) : isFinished ? (
              <div className="flex flex-col items-center animate-slide-up">
                <div className="flex items-center gap-2 text-green-400 mb-4">
                  <CheckCircle2 size={20} />
                  <span className="font-semibold text-lg">Workflow Complete</span>
                </div>
                <button
                  onClick={() => onTryItNow(demo.prefilledWizard)}
                  className="px-6 py-2 rounded-xl bg-white text-black font-bold flex items-center gap-2 hover:bg-neutral-200 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                  Try it now <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div key={currentStep} className="bg-white/10 border border-white/20 backdrop-blur-md rounded-xl p-4 max-w-md w-full text-center animate-slide-up shadow-2xl">
                <h4 className="text-white font-bold mb-1">{demo.steps[currentStep].title}</h4>
                <p className="text-sm text-neutral-300">{demo.steps[currentStep].description}</p>
              </div>
            )}
          </div>

        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-white/5 w-full">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-[200ms] ease-linear"
            style={{ width: `${isFinished ? 100 : isPlaying ? ((currentStep) / demo.steps.length) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}
