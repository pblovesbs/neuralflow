'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import useModeStore from '@/store/modeStore';
import { Play } from 'lucide-react';
import DemoShowcase from '@/components/ui/DemoShowcase';
import { DemoConfig } from '@/config/demoConfigs';

export default function StandardHeader() {
  const router = useRouter();
  const setMode = useModeStore((s) => s.setMode);
  const [showDemo, setShowDemo] = useState(false);

  const handleSwitchMode = () => {
    setMode('builder');
    router.push('/builder');
  };
  const handleTryItNow = (_prefilled: DemoConfig['prefilledWizard']) => {
    setShowDemo(false);
    // In a real implementation, we'd pass this via context/store to prefill StandardPage.
    // For now, we just close the modal.
  };

  return (
    <>
      <header className="h-14 shrink-0 flex items-center justify-between px-6 bg-[#040914]/95 border-b border-white/5 backdrop-blur-xl">
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

      <div className="flex items-center gap-4">
        <button 
          onClick={() => setShowDemo(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 transition-colors text-xs font-semibold"
        >
          <Play size={12} className="fill-cyan-400" />
          Demo
        </button>

        <div className="w-px h-4 bg-white/10" />

        <button 
          onClick={handleSwitchMode}
          className="text-xs font-medium text-neutral-400 hover:text-white transition-colors"
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
