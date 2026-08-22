'use client';

import React from 'react';
import useFlowStore from '@/store/flowStore';
import { PowerOff } from 'lucide-react';

export default function GlobalToast() {
  const { aiKilledMessage } = useFlowStore();

  if (!aiKilledMessage) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-red-500/10 backdrop-blur-md border border-red-500/50 text-red-100 px-6 py-3 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.2)] flex items-center gap-3">
        <div className="bg-red-500/20 p-1.5 rounded-full text-red-400">
          <PowerOff className="w-4 h-4" />
        </div>
        <span className="font-medium text-sm">{aiKilledMessage}</span>
      </div>
    </div>
  );
}
