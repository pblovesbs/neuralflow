"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal, CheckCircle, AlertTriangle, History, ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

export function ExecutionTelemetry() {
  const { 
    logs, 
    executionStatus, 
    completedNodes, 
    totalNodes,
    setIsExecuting,
    runHistory,
    reset,
    feedbackPrompt,
    submitFeedback,
    dismissFeedback,
  } = useWorkflowStore();

  const logsEndRef = useRef<HTMLDivElement>(null);
  const [passiveDismissed, setPassiveDismissed] = useState(false);
  const passiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Auto-dismiss passive feedback prompt after 15 seconds
  useEffect(() => {
    if (feedbackPrompt && feedbackPrompt.resilience_events.length === 0) {
      passiveTimerRef.current = setTimeout(() => {
        setPassiveDismissed(true);
        dismissFeedback();
      }, 15000);
    }
    return () => {
      if (passiveTimerRef.current) clearTimeout(passiveTimerRef.current);
    };
  }, [feedbackPrompt, dismissFeedback]);

  // Reset passive dismissed state when feedbackPrompt changes
  useEffect(() => {
    // eslint-disable-next-line
    if (feedbackPrompt) setPassiveDismissed(false);
  }, [feedbackPrompt]);

  const handleThumbsFeedback = useCallback((isPositive: boolean) => {
    submitFeedback(
      isPositive ? 5 : 2,
      'output_quality'
    );
  }, [submitFeedback]);

  const handleCategoryFeedback = useCallback((category: 'recovery_worked' | 'output_quality', rating: number) => {
    submitFeedback(rating, category);
  }, [submitFeedback]);

  // Try to parse structured stats from logs for success view
  const stats = { emails: 0, generated: 0, time: 0 };
  if (executionStatus === 'completed') {
    const timeMatch = logs.find(l => l.includes('Total time:'))?.match(/([0-9.]+)/);
    if (timeMatch) stats.time = parseFloat(timeMatch[1]);
  }

  const handleClear = () => {
    setIsExecuting(false);
    reset();
  };

  const progressPercentage = totalNodes > 0 ? Math.min(100, Math.round((completedNodes / totalNodes) * 100)) : 0;

  // Describe which interventions occurred for the assertive prompt
  const interventionLabel = feedbackPrompt?.resilience_events
    ?.map(e => {
      switch (e.event_type) {
        case 'context_pruned': return 'Pruned Context';
        case 'model_auto_pulled': return 'Auto-Pulled Model';
        case 'vram_serialized': return 'Serialized VRAM';
        case 'ram_guardrail_paused': return 'RAM Guardrail';
        case 'resumed_from_cache': return 'Resumed from Cache';
        default: return e.event_type;
      }
    })
    .filter((v, i, a) => a.indexOf(v) === i) // dedupe
    .join(', ');

  if (!useWorkflowStore.getState().isExecuting && executionStatus !== 'completed' && executionStatus !== 'failed') {
    return (
      <div className="w-full h-full flex flex-col bg-[var(--nf-bg-sidebar)] border-l border-[var(--nf-border)] p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Terminal className="text-[var(--nf-text-muted)]"/> 
            <h2 className="text-xl font-bold text-[var(--nf-text-muted)]">Telemetry</h2>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-6">
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[var(--nf-border)] rounded-2xl">
            <div className="bg-[var(--nf-bg-surface-hover)] p-4 rounded-full inline-flex mb-4">
              <Terminal className="text-[var(--nf-text-dim)]" size={32}/>
            </div>
            <p className="text-[var(--nf-text-secondary)] font-medium">Idle / Not Running</p>
            <p className="text-xs text-[var(--nf-text-muted)] mt-2 max-w-[200px]">Configure your workflow and click &quot;Test Run&quot; or &quot;Activate&quot; to see real-time logs here.</p>
          </div>

          {runHistory.length > 0 && (
            <div className="bg-[var(--nf-bg-surface)] border border-[var(--nf-border)] rounded-xl p-4">
              <h3 className="text-sm font-bold text-[var(--nf-text-primary)] flex items-center gap-2 mb-3">
                <History size={16} /> Recent Runs
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
                {runHistory.map(entry => (
                  <div key={entry.id} className="text-xs p-2 rounded-lg bg-[var(--nf-bg-input)] border border-[var(--nf-border-subtle)]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-[var(--nf-text-primary)] truncate max-w-[150px]">{entry.automationName}</span>
                      <span className="text-[var(--nf-text-muted)]">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${entry.status === 'completed' ? 'text-[var(--nf-accent-emerald)]' : 'text-[var(--nf-accent-red)]'}`}>
                      {entry.status === 'completed' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                      <span className="truncate">{entry.summary}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[var(--nf-bg-sidebar)] border-l border-[var(--nf-border)] p-6 h-screen sticky top-0 overflow-hidden">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-lg font-bold text-[var(--nf-text-primary)] flex items-center gap-2">
          <Terminal className="text-[var(--nf-accent-cyan)]" size={20}/> Telemetry
        </h2>
        <button onClick={handleClear} className="px-3 py-1 bg-[var(--nf-bg-surface-hover)] hover:bg-[var(--nf-border)] text-[var(--nf-text-primary)] rounded-md text-xs font-medium transition-colors border border-[var(--nf-border-subtle)]">
          Clear
        </button>
      </div>

      <div className="bg-[var(--nf-bg-surface)] border border-[var(--nf-border)] rounded-xl p-6 mb-6">
        <div className="flex justify-between text-sm font-medium mb-2 text-[var(--nf-text-secondary)]">
          <span>Overall Progress</span>
          <span>{progressPercentage}% ({completedNodes}/{totalNodes} Steps)</span>
        </div>
        <div className="w-full bg-[var(--nf-bg-input)] rounded-full h-3 overflow-hidden border border-[var(--nf-border-subtle)]">
          <div 
            className={`h-full transition-all duration-500 ${executionStatus === 'failed' ? 'bg-[var(--nf-accent-red)]' : executionStatus === 'completed' ? 'bg-[var(--nf-accent-emerald)]' : 'bg-[var(--nf-accent-cyan)]'}`} 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        
        {executionStatus === 'completed' && (
          <div className="mt-4 p-4 bg-[var(--nf-accent-emerald)]/10 border border-[var(--nf-accent-emerald)]/20 rounded-lg text-[var(--nf-accent-emerald)]">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={18} className="shrink-0" />
              <p className="font-bold text-sm">Execution Completed</p>
            </div>
            <ul className="text-xs space-y-1.5 opacity-90 pl-6 list-disc">
              <li>Processed input data successfully</li>
              <li>Generated outputs via AI model</li>
              <li>Saved results to destination folder</li>
              {stats.time > 0 && <li>Completed in {stats.time}s</li>}
            </ul>
          </div>
        )}
        {executionStatus === 'failed' && (
          <div className="mt-4 p-4 bg-[var(--nf-accent-red)]/10 border border-[var(--nf-accent-red)]/20 rounded-lg text-[var(--nf-accent-red)]">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="shrink-0" />
              <p className="font-bold text-sm">Execution Failed</p>
            </div>
            <p className="text-xs opacity-90 pl-6">
              Review the logs below to identify the issue. Common fixes: check your API keys or app passwords.
            </p>
          </div>
        )}
      </div>

      {/* ── HITL Recovery Prompt ────────────────────────────────────────── */}
      {useWorkflowStore.getState().recoveryPrompt && (
        (() => {
          const prompt = useWorkflowStore.getState().recoveryPrompt!;
          const isHardware = prompt.violation?.module_name === 'hardware';
          const isConfidence = prompt.violation?.module_name === 'confidence';
          const isSandbox = !isHardware && !isConfidence;
          
          let title = "⚠️ Execution Paused: Sandbox Violation";
          let color = "var(--nf-accent-red)";
          let bg = "var(--nf-accent-red)";
          
          if (isHardware) {
            title = "⚠️ Hardware Deadlock Detected";
            color = "var(--nf-accent-yellow)";
            bg = "var(--nf-accent-yellow)";
          } else if (isConfidence) {
            title = "⚠️ Low Confidence Output";
            color = "var(--nf-accent-purple)";
            bg = "var(--nf-accent-purple)";
          }
          
          return (
            <div 
              className="mb-4 p-4 rounded-xl border shrink-0"
              style={{ borderColor: `${color}80`, backgroundColor: `${bg}15` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: color }}>
                    {title}
                  </p>
                  <p className="text-[10px] text-[var(--nf-text-primary)] mb-1">
                    Node: {prompt.node_id}
                  </p>
                  <p className="text-[10px] text-[var(--nf-text-secondary)] font-mono p-2 bg-black/30 rounded border border-white/10">
                    {prompt.reason}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => useWorkflowStore.getState().submitRecovery('skip')}
                  className="px-3 py-1.5 text-[10px] font-semibold rounded-lg bg-[var(--nf-bg-surface)] text-[var(--nf-text-primary)] border border-[var(--nf-border)] hover:bg-[var(--nf-bg-surface-hover)] transition-colors"
                >
                  {isConfidence ? "⏭️ Keep Output (Skip Review)" : "⏭️ Skip Node"}
                </button>
                
                {isSandbox && (
                  <button
                    onClick={() => {
                      const newCode = window.prompt("Enter edited code:", "");
                      if (newCode !== null) useWorkflowStore.getState().submitRecovery('edit', undefined, newCode);
                    }}
                    className="px-3 py-1.5 text-[10px] font-semibold rounded-lg bg-[var(--nf-accent-yellow)]/15 text-[var(--nf-accent-yellow)] border border-[var(--nf-accent-yellow)]/30 hover:bg-[var(--nf-accent-yellow)]/25 transition-colors"
                  >
                    ✏️ Edit Code & Resume
                  </button>
                )}
                
                {isHardware && (
                  <button
                    onClick={() => useWorkflowStore.getState().submitRecovery('retry')}
                    className="px-3 py-1.5 text-[10px] font-semibold rounded-lg bg-[var(--nf-accent-cyan)]/15 text-[var(--nf-accent-cyan)] border border-[var(--nf-accent-cyan)]/30 hover:bg-[var(--nf-accent-cyan)]/25 transition-colors"
                  >
                    📉 Downgrade Model & Retry
                  </button>
                )}
                
                {isConfidence && (
                  <button
                    onClick={() => {
                      const newOutput = window.prompt("Enter edited output:", prompt.original_output || "");
                      if (newOutput !== null) useWorkflowStore.getState().submitRecovery('edit', newOutput);
                    }}
                    className="px-3 py-1.5 text-[10px] font-semibold rounded-lg bg-[var(--nf-accent-purple)]/15 text-[var(--nf-accent-purple)] border border-[var(--nf-accent-purple)]/30 hover:bg-[var(--nf-accent-purple)]/25 transition-colors"
                  >
                    ✏️ Edit Output & Resume
                  </button>
                )}
                
                {(!isHardware && !isConfidence) && (
                  <button
                    onClick={() => useWorkflowStore.getState().submitRecovery('retry')}
                    className="px-3 py-1.5 text-[10px] font-semibold rounded-lg bg-[var(--nf-accent-cyan)]/15 text-[var(--nf-accent-cyan)] border border-[var(--nf-accent-cyan)]/30 hover:bg-[var(--nf-accent-cyan)]/25 transition-colors"
                  >
                    🔄 Fail & Retry Workflow
                  </button>
                )}
              </div>
            </div>
          );
        })()
      )}

      {/* ── Resilience Feedback Prompt ──────────────────────────────────── */}
      {feedbackPrompt && !passiveDismissed && (
        <div className={`mb-4 p-4 rounded-xl border transition-all duration-300 shrink-0 ${
          feedbackPrompt.resilience_events.length > 0
            ? 'bg-[var(--nf-accent-yellow)]/10 border-[var(--nf-accent-yellow)]/30'
            : 'bg-[var(--nf-bg-surface)] border-[var(--nf-border)]'
        }`}>
          {feedbackPrompt.resilience_events.length > 0 ? (
            /* ── Assertive Prompt: Interventions occurred ── */
            <div>
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold text-[var(--nf-text-primary)]">
                  ⚡ NeuralFlow adjusted resources mid-run ({interventionLabel}). How is the output quality?
                </p>
                <button onClick={dismissFeedback} className="text-[var(--nf-text-muted)] hover:text-[var(--nf-text-primary)] ml-2 shrink-0">
                  <X size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleCategoryFeedback('recovery_worked', 5)}
                  className="px-3 py-1.5 text-[10px] font-semibold rounded-lg bg-[var(--nf-accent-emerald)]/15 text-[var(--nf-accent-emerald)] border border-[var(--nf-accent-emerald)]/30 hover:bg-[var(--nf-accent-emerald)]/25 transition-colors"
                >
                  ✅ Recovery Worked
                </button>
                <button
                  onClick={() => handleCategoryFeedback('output_quality', 3)}
                  className="px-3 py-1.5 text-[10px] font-semibold rounded-lg bg-[var(--nf-accent-yellow)]/15 text-[var(--nf-accent-yellow)] border border-[var(--nf-accent-yellow)]/30 hover:bg-[var(--nf-accent-yellow)]/25 transition-colors"
                >
                  ⚠️ Lost Some Details
                </button>
                <button
                  onClick={() => handleCategoryFeedback('output_quality', 1)}
                  className="px-3 py-1.5 text-[10px] font-semibold rounded-lg bg-[var(--nf-accent-red)]/15 text-[var(--nf-accent-red)] border border-[var(--nf-accent-red)]/30 hover:bg-[var(--nf-accent-red)]/25 transition-colors"
                >
                  ❌ Missed the Point
                </button>
              </div>
            </div>
          ) : (
            /* ── Passive Prompt: No interventions — auto-dismisses in 15s ── */
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--nf-text-secondary)]">How was the output?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleThumbsFeedback(true)}
                  className="p-1.5 rounded-lg bg-[var(--nf-accent-emerald)]/10 text-[var(--nf-accent-emerald)] hover:bg-[var(--nf-accent-emerald)]/20 transition-colors"
                >
                  <ThumbsUp size={14} />
                </button>
                <button
                  onClick={() => handleThumbsFeedback(false)}
                  className="p-1.5 rounded-lg bg-[var(--nf-accent-red)]/10 text-[var(--nf-accent-red)] hover:bg-[var(--nf-accent-red)]/20 transition-colors"
                >
                  <ThumbsDown size={14} />
                </button>
                <button onClick={dismissFeedback} className="p-1.5 text-[var(--nf-text-muted)] hover:text-[var(--nf-text-primary)]">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 bg-[var(--nf-bg-terminal)] border border-[var(--nf-border)] rounded-xl p-4 font-mono text-[10px] overflow-y-auto shadow-inner shadow-black/50 scrollbar-thin scrollbar-thumb-white/10">
        {logs.map((log, i) => (
          <div key={i} className={`mb-2 ${log.includes('Hardware optimization') ? 'text-[var(--nf-accent-yellow)]' : log.includes('❌') || log.includes('FAILED') || log.includes('ERROR') ? 'text-[var(--nf-accent-red)]' : log.includes('✓') || log.includes('SUCCESS') ? 'text-[var(--nf-accent-emerald)]' : 'text-[var(--nf-text-primary)]'}`}>
            {log}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}

