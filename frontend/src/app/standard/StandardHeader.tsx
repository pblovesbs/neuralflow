'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import useModeStore from '@/store/modeStore';
import useFlowStore from '@/store/flowStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { Play, Home, PowerOff, Loader2 } from 'lucide-react';
import DemoShowcase from '@/components/ui/DemoShowcase';
import { DemoConfig } from '@/config/demoConfigs';

export default function StandardHeader() {
  const router = useRouter();
  const setMode = useModeStore((s) => s.setMode);
  const [showDemo, setShowDemo] = useState(false);
  const [isKillingAI, setIsKillingAI] = useState(false);

  const handleSwitchMode = () => {
    setMode('builder');
    router.push('/builder');
  };

  const handleHome = () => {
    document.cookie = 'nf-mode=;path=/;max-age=0;samesite=lax';
    setMode(null);
    router.push('/');
  };

  const handleKillAI = async () => {
    setIsKillingAI(true);
    try {
      await fetch('http://localhost:8000/api/system/kill-ai', { method: 'POST' });
      useFlowStore.getState().showAiKilledToast("AI execution forcefully terminated and memory freed.");
      useWorkflowStore.setState({ isExecuting: false, executionStatus: 'failed' });
    } catch (e) {
      console.error('Failed to kill AI:', e);
    } finally {
      setIsKillingAI(false);
    }
  };

  const handleTryItNow = (_prefilled: DemoConfig['prefilledWizard']) => {
    setShowDemo(false);
    // In a real implementation, we'd pass this via context/store to prefill StandardPage.
    // For now, we just close the modal.
  };

  return (
    <>
      <header className="min-h-[3.5rem] py-2 h-auto shrink-0 flex flex-wrap md:flex-nowrap items-center justify-between gap-y-3 px-6 bg-[#040914]/95 border-b border-white/5 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white">NeuralFlow</h1>
          <p className="text-[10px] text-cyan-400 font-medium">Standard Mode</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 md:gap-4 w-full md:w-auto">
        <button 
          onClick={handleKillAI}
          disabled={isKillingAI}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors text-xs font-semibold disabled:opacity-50"
          title="Force Stop AI and Free Memory"
        >
          {isKillingAI ? <Loader2 size={12} className="animate-spin" /> : <PowerOff size={12} />}
          Kill AI
        </button>

        <button 
          onClick={() => setShowDemo(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 transition-colors text-xs font-semibold"
        >
          <Play size={12} className="fill-cyan-400" />
          Demo
        </button>

        <div className="w-px h-4 bg-white/10" />

        <button 
          onClick={handleHome}
          className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
          title="Return to Welcome Screen"
        >
          <Home size={14} />
          Home
        </button>

        <button 
          onClick={handleSwitchMode}
          className="text-xs font-medium text-neutral-400 hover:text-white transition-colors ml-2"
        >
          Switch to Builder
        </button>
      </div>
    </header>

    {showDemo && (
      <DemoShowcase 
        onClose={() => setShowDemo(false)} 
        onTryItNow={handleTryItNow}
      />
    )}
    </>
  );
}
