'use client';

/**
 * Toolbar — Top bar with Deploy, Clear, Export buttons and execution status.
 * Theme-aware with CSS variable support.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import useModeStore from '@/store/modeStore';
import useFlowStore from '@/store/flowStore';
import SetupModal from './SetupModal';


export default function Toolbar() {
  const router = useRouter();
  const setMode = useModeStore((s) => s.setMode);
  const deployWorkflow = useFlowStore((s) => s.deployWorkflow);
  const isExecuting = useFlowStore((s) => s.isExecuting);
  const executionStatus = useFlowStore((s) => s.executionStatus);
  const nodes = useFlowStore((s) => s.nodes);
  const exportJSON = useFlowStore((s) => s.exportJSON);
  const clearLogs = useFlowStore((s) => s.clearLogs);
  
  
  const [showSetup, setShowSetup] = useState(false);

  const handleExport = () => {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neuralflow-dag-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    useFlowStore.setState({ nodes: [], edges: [] });
  };

  const handleSwitchMode = () => {
    setMode('standard');
    router.push('/standard');
  };

  const statusConfig: Record<string, { label: string; pulse: boolean; colorVar: string }> = {
    idle: { label: 'Ready', pulse: false, colorVar: '--nf-text-dim' },
    running: { label: 'Executing...', pulse: true, colorVar: '--nf-accent-cyan' },
    started: { label: 'Starting...', pulse: true, colorVar: '--nf-accent-cyan' },
    completed: { label: 'Completed', pulse: false, colorVar: '--nf-accent-emerald' },
    failed: { label: 'Failed', pulse: false, colorVar: '--nf-accent-red' },
  };

  const status = statusConfig[executionStatus] || statusConfig.idle;

  return (
    <div
      className="h-12 flex items-center justify-between px-4 shrink-0 transition-colors duration-300"
      style={{
        background: 'var(--nf-bg-toolbar)',
        borderBottom: '1px solid var(--nf-border)',
      }}
    >
      {/* Left: Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {status.pulse && (
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: `var(${status.colorVar})` }}
              />
            )}
            <span
              className="relative inline-flex rounded-full h-2 w-2 shadow-[0_0_8px_currentColor]"
              style={{ background: `var(${status.colorVar})`, color: `var(${status.colorVar})` }}
            />
          </span>
          <span className="text-[11px] font-medium" style={{ color: 'var(--nf-text-muted)' }}>{status.label}</span>
        </div>
        {nodes.length > 0 && (
          <span
            className="text-[10px] pl-3"
            style={{ color: 'var(--nf-text-ghost)', borderLeft: '1px solid var(--nf-border)' }}
          >
            {nodes.length} node{nodes.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {showSetup && <SetupModal onClose={() => setShowSetup(false)} />}
        
        <button
          onClick={() => setShowSetup(true)}
          className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200"
          style={{ color: 'var(--nf-accent-purple)' }}
        >
          ✨ Hardware Setup
        </button>

        <div className="w-px h-4 bg-white/10 mx-1" />

        <button 
          onClick={handleSwitchMode}
          className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200"
          style={{ color: 'var(--nf-text-dim)' }}
        >
          ← Standard Mode
        </button>

        <div className="w-px h-4 bg-white/10 mx-1" />

        <button
          onClick={clearLogs}
          className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200"
          style={{ color: 'var(--nf-text-dim)' }}
        >
          Clear Logs
        </button>

        <button
          onClick={handleExport}
          disabled={nodes.length === 0}
          className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            color: 'var(--nf-text-muted)',
            border: '1px solid var(--nf-border)',
            background: 'var(--nf-bg-surface)',
          }}
        >
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export
          </span>
        </button>

        <button
          onClick={handleClear}
          disabled={nodes.length === 0}
          className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            color: 'var(--nf-text-muted)',
            border: '1px solid var(--nf-border)',
            background: 'var(--nf-bg-surface)',
          }}
        >
          Clear
        </button>

        <button
          id="deploy-button"
          onClick={deployWorkflow}
          disabled={isExecuting || nodes.length === 0}
          className="px-4 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all duration-300 ease-out disabled:opacity-30 disabled:cursor-not-allowed text-white hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          style={{
            background: isExecuting
              ? 'rgba(6,182,212,0.15)'
              : 'var(--nf-gradient-deploy)',
            border: isExecuting ? '1px solid rgba(6,182,212,0.3)' : '1px solid rgba(255,255,255,0.1)',
            boxShadow: isExecuting ? 'none' : '0 6px 20px -4px rgba(6,182,212,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
            color: isExecuting ? 'var(--nf-accent-cyan)' : 'white',
          }}
        >
          {isExecuting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Running
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Deploy
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
