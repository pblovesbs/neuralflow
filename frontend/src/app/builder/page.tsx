'use client';

/**
 * NeuralFlow — Builder Mode Main Page.
 * Composes the full layout: Sidebar | Canvas + Toolbar + Terminal
 */

import dynamic from 'next/dynamic';
import Sidebar from '@/components/ui/Sidebar';
import Toolbar from '@/components/ui/Toolbar';
import Terminal from '@/components/ui/Terminal';

// Dynamic import for React Flow canvas (uses browser APIs)
const Canvas = dynamic(() => import('@/components/ui/Canvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-neutral-950">
      <div className="text-center space-y-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 animate-pulse mx-auto" />
        </div>
        <p className="text-xs text-neutral-600 tracking-wider uppercase">Loading canvas...</p>
      </div>
    </div>
  ),
});

export default function BuilderPage() {
  return (
    <main className="flex h-screen w-screen overflow-hidden bg-neutral-950">
      {/* Left: Sidebar */}
      <Sidebar />

      {/* Right: Canvas + Toolbar + Terminal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top: Toolbar */}
        <Toolbar />

        {/* Center: Canvas */}
        <div className="flex-1 min-h-0">
          <Canvas />
        </div>

        {/* Bottom: Terminal */}
        <Terminal />
      </div>
    </main>
  );
}
