'use client';

import React, { useState } from 'react';
import { DEMO_CONFIGS, DemoConfig } from '@/config/demoConfigs';
import DemoPlayer from './DemoPlayer';
import { X, PlayCircle } from 'lucide-react';

interface DemoShowcaseProps {
  onClose: () => void;
  onTryItNow: (prefilled: DemoConfig['prefilledWizard']) => void;
}

export default function DemoShowcase({ onClose, onTryItNow }: DemoShowcaseProps) {
  const [selectedDemo, setSelectedDemo] = useState<DemoConfig | null>(null);

  if (selectedDemo) {
    return <DemoPlayer demo={selectedDemo} onClose={() => setSelectedDemo(null)} onTryItNow={onTryItNow} />;
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-fade-in p-6">
      <div className="bg-[#040914] border border-white/10 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Demo Showcase</h2>
            <p className="text-sm text-neutral-400">See what NeuralFlow can do completely locally on your hardware.</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Gallery */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEMO_CONFIGS.map(demo => (
              <button
                key={demo.id}
                onClick={() => setSelectedDemo(demo)}
                className="group relative flex flex-col text-left p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-white/10 transition-all duration-300 overflow-hidden"
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative z-10 flex-1">
                  <h3 className="text-lg font-bold text-white mb-2">{demo.title}</h3>
                  <p className="text-sm text-neutral-400 leading-relaxed mb-6">{demo.description}</p>
                </div>

                <div className="relative z-10 flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                  <PlayCircle size={18} />
                  Watch Demo
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
