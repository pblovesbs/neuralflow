"use client";
import React, { useState } from 'react';
import { Sparkles, FlaskConical, Rocket } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { useWebSocketLogs } from '../../hooks/useWebSocketLogs';
import { useValidation } from '../../hooks/useValidation';
import { HelpTooltip } from './HelpTooltip';

export function OutputConfiguration() {
  const { 
    step, 
    setStep,
    triggerType, 
    sourcePath, 
    email,
    appPassword,
    aiTasks,
    targetPath, 
    setTargetPath,
    setIsExecuting,
    setExecutionStatus,
    setCompletedNodes,
    setTotalNodes,
    addLog,
    nodeStatuses,
    scheduleEnabled,
    cronExpression,
    addRunHistoryEntry,
    automationName,
    outputFormat,
    setOutputFormat
  } = useWorkflowStore();
  
  const { isValid, errors } = useValidation();
  const [showPreRunChecklist, setShowPreRunChecklist] = useState(false);
  const [showRamWarning, setShowRamWarning] = useState(false);
  const [explicitBypass, setExplicitBypass] = useState(false);
  const [runMode, setRunMode] = useState<'test' | 'activate'>('test');

  const status = nodeStatuses['action_1'] || 'idle';

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const wsUrl = backendUrl.replace('http', 'ws') + '/ws/logs';
  const { connect } = useWebSocketLogs(wsUrl);

  if (step < 4) return null;

  const pickSystemPath = async (type: 'folder' | 'save' | 'file') => {
    try {
      const endpoint = type === 'file' ? '/api/system/file-picker' : type === 'folder' ? '/api/system/folder-picker' : '/api/system/save-file-picker';
      const res = await fetch(`${backendUrl}${endpoint}`);
      const data = await res.json();
      if (data.path) setTargetPath(data.path);
    } catch {
      alert("Failed to open native file picker.");
    }
  };

  const executeRun = async (bypassRam: boolean = false) => {
    if (!bypassRam) {
      try {
        const ramRes = await fetch(`${backendUrl}/api/system/ram`);
        const ramData = await ramRes.json();
        if (ramData.status === 'success' && ramData.available_gb < ramData.safe_limit) {
          setShowPreRunChecklist(false);
          setShowRamWarning(true);
          return;
        }
      } catch (e) {
        console.warn("Failed to check RAM", e);
      }
    }

    setShowRamWarning(false);
    setShowPreRunChecklist(false);
    setIsExecuting(true);
    useWorkflowStore.getState().clearLogs();
    addLog("🚀 Initializing NeuralFlow Execution Pipeline...");
    setExecutionStatus('running');
    setCompletedNodes(0);
    
    const nodes: Record<string, unknown>[] = [];
    const edges: Record<string, unknown>[] = [];
    
    // 1. Trigger Node
    const triggerId = 'trigger_1';
    if (triggerType === 'email') {
      const inferImap = (emailAddr: string) => {
        if (emailAddr.endsWith('@gmail.com')) return { server: 'imap.gmail.com', port: 993 };
        if (emailAddr.endsWith('@yahoo.com')) return { server: 'imap.mail.yahoo.com', port: 993 };
        if (emailAddr.endsWith('@outlook.com') || emailAddr.endsWith('@hotmail.com')) return { server: 'outlook.office365.com', port: 993 };
        return { server: 'imap.example.com', port: 993 };
      };
      const imap = inferImap(email);
      nodes.push({ id: triggerId, type: 'email_trigger', data: { email_address: email, app_password: appPassword, imap_server: imap.server, imap_port: imap.port } });
    } else {
      nodes.push({ id: triggerId, type: 'trigger', data: { target_path: sourcePath } });
    }

    // 2. AI Tasks
    let lastNodeId = triggerId;
    aiTasks.forEach((task, idx) => {
      const taskId = `agent_${idx}`;
      nodes.push({
        id: taskId,
        type: 'agent',
        data: {
          model: task.model,
          prompt_template: `Act as a ${task.role || 'helpful assistant'}. Your task is to: ${task.task}. Format the output strictly as: ${task.format || 'text'}. \n\nData:\n{{input}}`
        }
      });
      edges.push({ source: lastNodeId, target: taskId });
      lastNodeId = taskId;
    });

    // 3. Action Node
    let finalTargetPath = targetPath.trim();
    if (finalTargetPath && !finalTargetPath.includes('.')) {
        const randomName = `output_${Math.random().toString(36).substring(2, 9)}`;
        finalTargetPath = `${finalTargetPath.replace(/[\/\\]$/, '')}/${randomName}`;
        addLog(`ℹ️ Auto-generating file name: ${randomName}`);
    }

    const actionId = 'action_1';
    nodes.push({ id: actionId, type: 'action', data: { target_path: finalTargetPath, output_format: outputFormat } });
    edges.push({ source: lastNodeId, target: actionId });

    setTotalNodes(nodes.length);
    connect();

    try {
      const res = await fetch(`${backendUrl}/execute-graph`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workflow_id: `wf_${Date.now()}`, 
          nodes, 
          edges,
          schedule: runMode === 'activate' && scheduleEnabled ? cronExpression : undefined,
          notify_email: runMode === 'activate' && scheduleEnabled && notifyOnRun ? useWorkflowStore.getState().notifyEmail : undefined,
          bypass_ram_check: bypassRam
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        addLog(`❌ Failed to execute: ${errorData.detail || res.statusText}`);
        setExecutionStatus('failed');
        addRunHistoryEntry({
          status: 'failed',
          summary: `Execution failed: ${errorData.detail || res.statusText}`,
          automationName: automationName || 'Untitled Automation'
        });
      } else {
        // Assume success is handled by websocket normally, but just to make sure we don't block
      }
    } catch {
      addLog("❌ Failed to connect to execution engine.");
      setExecutionStatus('failed');
      addRunHistoryEntry({
        status: 'failed',
        summary: "Connection to execution engine failed",
        automationName: automationName || 'Untitled Automation'
      });
    }
  };

  const handleActionClick = (mode: 'test' | 'activate') => {
    setRunMode(mode);
    setShowPreRunChecklist(true);
  };

  return (
    <div className="mb-12 p-6 rounded-2xl border bg-[var(--nf-bg-surface)] border-[var(--nf-accent-emerald)]/50 shadow-lg shadow-[var(--nf-accent-emerald)]/5 animate-fade-in relative">
      
      {/* Timeline Node */}
      <div className={`absolute -left-[53px] top-8 w-6 h-6 rounded-full border-4 border-[var(--nf-bg-primary)] z-10 transition-colors ${status === 'completed' ? 'bg-[var(--nf-accent-emerald)]' : status === 'running' ? 'bg-[var(--nf-accent-emerald)] animate-pulse' : status === 'error' ? 'bg-[var(--nf-accent-red)]' : 'bg-[var(--nf-border)]'}`} />

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-[var(--nf-text-primary)]">4. Where should we save the result?</h3>
        {status === 'completed' && <span className="text-[var(--nf-accent-emerald)] font-bold flex items-center gap-1 text-sm bg-[var(--nf-accent-emerald)]/10 px-3 py-1 rounded-full border border-[var(--nf-accent-emerald)]/20">✓ Completed</span>}
        {status === 'running' && <span className="text-[var(--nf-accent-cyan)] font-bold flex items-center gap-2 text-sm bg-[var(--nf-accent-cyan)]/10 px-3 py-1 rounded-full border border-[var(--nf-accent-cyan)]/20"><span className="w-4 h-4 border-2 border-[var(--nf-accent-cyan)] border-t-transparent rounded-full animate-spin"/> Processing</span>}
      </div>
      <p className="text-[var(--nf-text-secondary)] text-sm mb-4">Select a folder and we will automatically generate a randomized file name for your output.</p>
      
      <div className="flex gap-2 mb-8">
         <input type="text" placeholder="Select destination folder..." value={targetPath} onChange={e => setTargetPath(e.target.value)} className="flex-1 bg-[var(--nf-bg-input)] border border-[var(--nf-border)] focus:border-[var(--nf-accent-emerald)]/50 rounded-lg p-3 text-[var(--nf-text-primary)] outline-none transition-colors" />
         <select value={outputFormat} onChange={e => setOutputFormat(e.target.value)} className="bg-[var(--nf-bg-input)] border border-[var(--nf-border)] focus:border-[var(--nf-accent-emerald)]/50 rounded-lg px-3 text-[var(--nf-text-primary)] outline-none transition-colors">
           <option value="Plain Text">Plain Text (.txt)</option>
           <option value="Markdown">Markdown (.md)</option>
           <option value="JSON">JSON (.json)</option>
           <option value="CSV">CSV (.csv)</option>
           <option value="PDF">PDF (.pdf)</option>
           <option value="Docs">Word (.docx)</option>
         </select>
         <button onClick={() => pickSystemPath('folder')} className="px-4 bg-[var(--nf-accent-emerald)]/20 hover:bg-[var(--nf-accent-emerald)]/30 border border-[var(--nf-accent-emerald)]/30 text-[var(--nf-accent-emerald)] rounded-lg transition-colors whitespace-nowrap">Browse Folder</button>
      </div>
      
      {/* Error display if invalid */}
      {!isValid && (
        <div className="mb-4 p-3 bg-[var(--nf-accent-red)]/10 border border-[var(--nf-accent-red)]/30 rounded-lg">
          <p className="text-sm font-bold text-[var(--nf-accent-red)] mb-1">Cannot run yet. Please fix the following:</p>
          <ul className="text-xs text-[var(--nf-accent-red)] list-disc pl-5">
            {errors.map((e, i) => <li key={i}>{e.message}</li>)}
          </ul>
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-col gap-4 mt-8">
        <div className="flex gap-4">
          {scheduleEnabled ? (
            <>
              <button 
                onClick={() => handleActionClick('test')} 
                disabled={!isValid} 
                className="flex-1 py-4 bg-[var(--nf-bg-surface-hover)] border border-[var(--nf-border-hover)] rounded-xl text-[var(--nf-text-primary)] font-bold text-lg flex items-center justify-center gap-2 hover:bg-[var(--nf-bg-input)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <FlaskConical size={20}/> Test Run Once
              </button>
              <button 
                onClick={() => handleActionClick('activate')} 
                disabled={!isValid} 
                className="flex-1 py-4 bg-gradient-to-r from-[var(--nf-accent-cyan)] to-[var(--nf-accent-purple)] rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)]"
              >
                <Rocket size={20}/> Activate Automation
              </button>
            </>
          ) : (
            <button 
              onClick={() => handleActionClick('test')} 
              disabled={!isValid} 
              className="w-full py-4 bg-gradient-to-r from-[var(--nf-accent-cyan)] to-[var(--nf-accent-purple)] rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)]"
            >
              <Sparkles size={20}/> Run Automation
            </button>
          )}
        </div>
        
        <div className="flex justify-start">
          <button onClick={() => setStep(3)} className="px-4 py-2 text-[var(--nf-text-secondary)] hover:text-[var(--nf-text-primary)] font-bold transition-colors">
            Back to Schedule
          </button>
        </div>
      </div>

      {/* Pre-Run Checklist Modal */}
      {showPreRunChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass border border-[var(--nf-accent-cyan)]/30 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <h3 className="text-xl font-bold text-[var(--nf-text-primary)] mb-4 flex items-center gap-2">
              {runMode === 'activate' ? <Rocket className="text-[var(--nf-accent-purple)]" /> : <FlaskConical className="text-[var(--nf-accent-cyan)]" />}
              {runMode === 'activate' ? 'Activate Schedule?' : 'Ready to Test?'}
            </h3>
            
            <div className="space-y-4 mb-6 text-sm text-[var(--nf-text-secondary)]">
              <p>Here is what NeuralFlow will do:</p>
              <div className="bg-[var(--nf-bg-input)] p-3 rounded-lg border border-[var(--nf-border)]">
                <ul className="space-y-2">
                  <li className="flex gap-2"><strong>1.</strong> <span>Read from {triggerType === 'email' ? 'Inbox' : sourcePath}</span></li>
                  <li className="flex gap-2"><strong>2.</strong> <span>Run {aiTasks.length} AI task{aiTasks.length > 1 ? 's' : ''}</span></li>
                  <li className="flex gap-2"><strong>3.</strong> <span className="break-all">Save to {targetPath}</span></li>
                </ul>
              </div>
              
              {runMode === 'activate' && (
                <div className="p-3 bg-[var(--nf-accent-purple)]/10 border border-[var(--nf-accent-purple)]/20 rounded-lg text-[var(--nf-accent-purple)] font-medium">
                  This will run automatically in the background on your configured schedule.
                </div>
              )}

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

      {/* RAM Warning Modal */}
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
    </div>
  );
}
