'use client';

/**
 * Toolbar — Top bar with Deploy, Clear, Export buttons and execution status.
 * Theme-aware with CSS variable support.
 * Also handles Builder Pre-Run Checklist, RAM checks, Permissions, and Automation management.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useModeStore from '@/store/modeStore';
import useFlowStore from '@/store/flowStore';
import SetupModal from './SetupModal';
import PermissionModal, { PermissionType } from './PermissionModal';
import { ArrowLeft, ArrowRight, FlaskConical, ChevronDown, Save, Trash2, Play, Square } from 'lucide-react';

export default function Toolbar() {
  const router = useRouter();
  const setMode = useModeStore((s) => s.setMode);
  
  const deployWorkflow = useFlowStore((s) => s.deployWorkflow);
  const stopWorkflow = useFlowStore((s) => s.stopWorkflow);
  const isExecuting = useFlowStore((s) => s.isExecuting);
  const executionStatus = useFlowStore((s) => s.executionStatus);
  const nodes = useFlowStore((s) => s.nodes);
  const exportJSON = useFlowStore((s) => s.exportJSON);
  const clearLogs = useFlowStore((s) => s.clearLogs);
  
  // Automation Naming & Saving
  const automationName = useFlowStore((s) => s.automationName);
  const setAutomationName = useFlowStore((s) => s.setAutomationName);
  const saveCurrentAutomation = useFlowStore((s) => s.saveCurrentAutomation);
  const savedBuilderAutomations = useFlowStore((s) => s.savedBuilderAutomations);
  const loadAutomation = useFlowStore((s) => s.loadAutomation);
  const deleteAutomation = useFlowStore((s) => s.deleteAutomation);
  
  const [showSetup, setShowSetup] = useState(false);
  const [showAutomationsMenu, setShowAutomationsMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Execution Modals State
  const [showPreRunChecklist, setShowPreRunChecklist] = useState(false);
  const [showRamWarning, setShowRamWarning] = useState(false);
  const [explicitBypass, setExplicitBypass] = useState(false);
  const [permissionsQueue, setPermissionsQueue] = useState<{ type: PermissionType; detail: string; node_id: string }[]>([]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAutomationsMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    useFlowStore.setState({ nodes: [], edges: [], automationName: '' });
  };

  const handleSwitchMode = () => {
    setMode('standard');
    router.push('/standard');
  };

  const handleForceStart = () => {
    setShowPreRunChecklist(false);
    setShowRamWarning(false);
    setPermissionsQueue([]);
    deployWorkflow({ bypassRam: true, forceStart: true });
  };

  const handleDeployClick = () => {
    // Gather permissions needed based on nodes
    const queue: { type: PermissionType; detail: string; node_id: string }[] = [];
    nodes.forEach(n => {
      if (n.type === 'trigger' && n.data.target_path) {
        queue.push({ type: 'file_read', detail: String(n.data.target_path), node_id: n.id });
      }
      if (n.type === 'action' && n.data.target_path) {
        queue.push({ type: 'file_write', detail: String(n.data.target_path), node_id: n.id });
      }
    });

    if (queue.length > 0) {
      setPermissionsQueue(queue);
    } else {
      setShowPreRunChecklist(true);
    }
  };

  const handlePermissionAllow = () => {
    const newQueue = [...permissionsQueue];
    newQueue.shift();
    if (newQueue.length === 0) {
      setPermissionsQueue([]);
      setShowPreRunChecklist(true);
    } else {
      setPermissionsQueue(newQueue);
    }
  };

  const handlePermissionDeny = () => {
    setPermissionsQueue([]);
  };

  const executeRun = async (bypassRam: boolean) => {
    if (!bypassRam) {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const ramRes = await fetch(`${backendUrl}/api/system/ram`);
        if (ramRes.ok) {
          const ramData = await ramRes.json();
          if (ramData.status === 'success' && ramData.available_gb < ramData.safe_limit) {
            setShowPreRunChecklist(false);
            setShowRamWarning(true);
            return;
          }
        }
      } catch (e) {
        console.warn("Failed to check RAM", e);
      }
    }

    setShowRamWarning(false);
    setShowPreRunChecklist(false);
    deployWorkflow({ bypassRam });
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
    <>
      {permissionsQueue.length > 0 && (
        <PermissionModal
          type={permissionsQueue[0].type}
          detail={permissionsQueue[0].detail}
          onAllow={handlePermissionAllow}
          onDeny={handlePermissionDeny}
        />
      )}

      {showPreRunChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass border border-[var(--nf-accent-cyan)]/30 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <h3 className="text-xl font-bold text-[var(--nf-text-primary)] mb-4 flex items-center gap-2">
              <FlaskConical className="text-[var(--nf-accent-cyan)]" /> Ready to Test?
            </h3>
            
            <div className="space-y-4 mb-6 text-sm text-[var(--nf-text-secondary)]">
              <p>Here is what NeuralFlow will execute:</p>
              <div className="bg-[var(--nf-bg-input)] p-3 rounded-lg border border-[var(--nf-border)]">
                <ul className="space-y-2">
                  <li className="flex gap-2"><strong>1.</strong> <span>Run {nodes.length} nodes from the Canvas</span></li>
                  <li className="flex gap-2"><strong>2.</strong> <span>Connect to the local AI engine</span></li>
                  <li className="flex gap-2"><strong>3.</strong> <span>Process the data flow</span></li>
                </ul>
              </div>

              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={explicitBypass}
                  onChange={e => setExplicitBypass(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--nf-border)] text-[var(--nf-accent-red)] focus:ring-[var(--nf-accent-red)] bg-[var(--nf-bg-input)]"
                />
                <span className="text-xs font-bold text-[var(--nf-accent-red)] uppercase tracking-wider">Bypass Memory & Safety Checks</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowPreRunChecklist(false)} 
                className="flex-1 py-3 bg-[var(--nf-bg-input)] hover:bg-[var(--nf-bg-surface-hover)] text-[var(--nf-text-primary)] font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => executeRun(explicitBypass)} 
                className="flex-1 py-3 bg-[var(--nf-accent-cyan)] hover:bg-[var(--nf-accent-cyan)]/80 text-[var(--nf-bg-primary)] font-bold rounded-xl transition-colors"
              >
                Looks Good!
              </button>
            </div>
          </div>
        </div>
      )}

      {showRamWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass border border-[var(--nf-accent-red)]/30 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <h3 className="text-xl font-bold text-[var(--nf-accent-red)] mb-4 flex items-center gap-2">
              ⚠️ Heavy Memory Load
            </h3>
            
            <div className="space-y-4 mb-6 text-sm text-[var(--nf-text-secondary)]">
              <p>Device memory is heavily loaded. Please exit some open programs to allow NeuralFlow to process safely.</p>
              <p>Bypassing this check may cause your computer to freeze or become unresponsive.</p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowRamWarning(false)} 
                className="flex-1 py-3 bg-[var(--nf-bg-input)] hover:bg-[var(--nf-bg-surface-hover)] text-[var(--nf-text-primary)] font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => executeRun(true)} 
                className="flex-1 py-3 bg-[var(--nf-accent-red)] hover:bg-[var(--nf-accent-red)]/80 text-[var(--nf-bg-primary)] font-bold rounded-xl transition-colors"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="h-12 flex items-center justify-between px-4 shrink-0 transition-colors duration-300"
        style={{
          background: 'var(--nf-bg-toolbar)',
          borderBottom: '1px solid var(--nf-border)',
        }}
      >
        {/* Left: Status & Navigation */}
        <div className="flex items-center gap-3">
          {/* Back/Forward Navigation */}
          <div className="flex items-center gap-1 border-r border-[var(--nf-border)] pr-3">
            <button 
              onClick={() => router.push('/')}
              className="p-1 rounded text-[var(--nf-text-secondary)] hover:text-[var(--nf-text-primary)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              title="Go to Home"
            >
              <ArrowLeft size={16} />
            </button>
            <button 
              onClick={() => router.forward()}
              className="p-1 rounded text-[var(--nf-text-secondary)] hover:text-[var(--nf-text-primary)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              title="Go Forward"
            >
              <ArrowRight size={16} />
            </button>
          </div>

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

        {/* Center: Automation Name & Save */}
        <div className="flex items-center gap-3">
          <input 
            type="text" 
            value={automationName}
            onChange={(e) => setAutomationName(e.target.value)}
            placeholder="Untitled Builder Automation"
            className="bg-transparent border-none outline-none text-[13px] font-medium placeholder-[var(--nf-text-ghost)] text-[var(--nf-text-primary)] w-56 focus:ring-0 text-center"
          />
          
          <button 
            onClick={saveCurrentAutomation}
            disabled={!automationName || nodes.length === 0}
            className="p-1.5 rounded-lg bg-[var(--nf-bg-input)] hover:bg-[var(--nf-bg-surface-hover)] text-[var(--nf-text-secondary)] hover:text-[var(--nf-text-primary)] transition-colors disabled:opacity-30 border border-[var(--nf-border)]"
            title="Save Automation"
          >
            <Save size={14} />
          </button>

          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowAutomationsMenu(!showAutomationsMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--nf-bg-input)] hover:bg-[var(--nf-bg-surface-hover)] text-[12px] font-medium text-[var(--nf-text-primary)] border border-[var(--nf-border)] transition-colors"
            >
              My Automations <ChevronDown size={14} />
            </button>

            {showAutomationsMenu && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-[var(--nf-bg-surface)] border border-[var(--nf-border)] rounded-xl shadow-2xl py-2 z-[100] animate-in fade-in slide-in-from-top-2">
                <div className="px-3 pb-2 mb-2 border-b border-[var(--nf-border)]">
                  <span className="text-[11px] font-bold text-[var(--nf-text-ghost)] uppercase tracking-wider">Saved Configurations</span>
                </div>
                {savedBuilderAutomations.length === 0 ? (
                  <div className="px-4 py-3 text-[12px] text-[var(--nf-text-muted)] text-center">
                    No saved automations yet.
                  </div>
                ) : (
                  savedBuilderAutomations.map(auto => (
                    <div key={auto.id} className="flex items-center justify-between px-2 py-1 mx-2 rounded-lg hover:bg-[var(--nf-bg-surface-hover)] group transition-colors">
                      <button 
                        onClick={() => {
                          loadAutomation(auto.id);
                          setShowAutomationsMenu(false);
                        }}
                        className="flex-1 text-left px-2 py-1.5 text-[13px] text-[var(--nf-text-primary)] font-medium truncate"
                      >
                        {auto.name}
                      </button>
                      <button 
                        onClick={() => deleteAutomation(auto.id)}
                        className="p-1.5 text-[var(--nf-text-muted)] hover:text-[var(--nf-accent-red)] hover:bg-[var(--nf-accent-red)]/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
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

          {isExecuting && (
            <button
              onClick={stopWorkflow}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all duration-300 ease-out text-white hover:shadow-lg bg-[var(--nf-accent-red)] hover:bg-[var(--nf-accent-red)]/80 flex items-center gap-1.5"
            >
              <Square size={12} fill="currentColor" />
              Force Stop
            </button>
          )}

          {!isExecuting && (
            <button
              onClick={handleForceStart}
              disabled={nodes.length === 0}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all duration-300 ease-out disabled:opacity-30 disabled:cursor-not-allowed text-[var(--nf-accent-cyan)] border border-[var(--nf-accent-cyan)]/30 hover:bg-[var(--nf-accent-cyan)]/10 flex items-center gap-1.5"
            >
              <Play size={12} fill="currentColor" />
              Force Start
            </button>
          )}

          <button
            id="deploy-button"
            onClick={handleDeployClick}
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
    </>
  );
}
