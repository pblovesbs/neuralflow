"use client";
import React, { useState } from 'react';
import { FlaskConical, Rocket, Save } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { useWebSocketLogs } from '../../hooks/useWebSocketLogs';
import { useValidation } from '../../hooks/useValidation';

export function OutputConfiguration() {
  const { 
    step,
    setStep,
    outputStrategy, 
    setOutputStrategy,
    outputFormat,
    setOutputFormat,
    targetPath,
    setTargetPath,
    topology,
    setTopology,
    triggerType, 
    sourcePath, 
    email,
    appPassword,
    itemCount,
    aiTasks,
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
    notifyOnRun
  } = useWorkflowStore();
  
  const { isValid, errors } = useValidation();
  const [showPreRunChecklist, setShowPreRunChecklist] = useState(false);
  const [showRamWarning, setShowRamWarning] = useState(false);
  const [runMode, setRunMode] = useState<'test' | 'activate'>('test');
  const [explicitBypass, setExplicitBypass] = useState(false);
  const [engineRunning, setEngineRunning] = useState(false);
  const [activeTasksCount, setActiveTasksCount] = useState(0);

  const status = nodeStatuses['action_1'] || 'idle';

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const wsUrl = backendUrl.replace('http', 'ws') + '/ws/logs';
  const { connect } = useWebSocketLogs(wsUrl);

  // Poll Engine Status
  React.useEffect(() => {
    const checkEngine = async () => {
      try {
        const res = await fetch(`${backendUrl}/engine-status`);
        const data = await res.json();
        setEngineRunning(data.is_running);
        setActiveTasksCount(data.active_tasks);
      } catch {
        setEngineRunning(false);
      }
    };
    checkEngine();
    const interval = setInterval(checkEngine, 2000);
    return () => clearInterval(interval);
  }, [backendUrl]);

  const stopEngine = async () => {
    try {
      await fetch(`${backendUrl}/stop-engine`, { method: 'POST' });
      setExecutionStatus('failed'); // or stopped
      addLog("🛑 ENGINE STOPPED: User requested force stop.");
    } catch {
      console.warn("Failed to stop engine");
    }
  };

  const isActive = step >= 4;
  const isPast = step > 4;

  if (!isActive && !isPast) return null;

  if (!isActive) {
    return (
      <div className="mb-6 p-4 rounded-xl border border-[var(--nf-border)] bg-transparent opacity-80 hover:opacity-100 transition-opacity flex items-center justify-between group cursor-pointer" onClick={() => setStep(4)}>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-[var(--nf-bg-surface)] border border-[var(--nf-border)] flex items-center justify-center text-[var(--nf-text-muted)]">
            <Save size={14} className="text-[var(--nf-accent-cyan)]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--nf-text-muted)] uppercase tracking-wider">Step 4: Output</h4>
            <p className="text-sm font-medium text-[var(--nf-text-primary)]">
              {outputStrategy === 'single_file' ? 'Single Unified File' : 'Multiple Outputs'}
            </p>
          </div>
        </div>
        <button onClick={() => setStep(4)} className="px-3 py-1.5 text-xs font-bold text-[var(--nf-text-secondary)] hover:text-[var(--nf-text-primary)] bg-[var(--nf-bg-input)] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
          Edit
        </button>
      </div>
    );
  }

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
    // 1. Core Server Health Check & Auto-Start
    let isBackendRunning = false;
    try {
      const healthRes = await fetch(`${backendUrl}/engine-status`, { method: 'GET' });
      if (healthRes.ok) isBackendRunning = true;
    } catch {
      isBackendRunning = false;
    }

    if (!isBackendRunning) {
      addLog("⚠️ Backend server not found. Attempting auto-start...");
      try {
        await fetch('/api/system/start-backend', { method: 'POST' });
        
        // Poll for up to 10 seconds to wait for backend to boot
        let retries = 10;
        while (retries > 0) {
          await new Promise(r => setTimeout(r, 1000));
          try {
            const check = await fetch(`${backendUrl}/engine-status`, { method: 'GET' });
            if (check.ok) {
              isBackendRunning = true;
              addLog("✅ Backend server successfully started.");
              break;
            }
          } catch {}
          retries--;
        }
      } catch (error) {
        console.error("Auto-start failed:", error);
      }
    }

    if (!isBackendRunning) {
      setShowPreRunChecklist(false);
      addLog("❌ Critical Error: Backend server is unreachable and auto-start failed.");
      setExecutionStatus('failed');
      alert("The Backend Server could not be started automatically. Please run it manually from the terminal.");
      return;
    }

    // 2. Memory check (if not bypassed)
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
      nodes.push({ 
        id: triggerId, 
        type: 'email_trigger', 
        data: { 
          email_address: email, 
          app_password: appPassword, 
          imap_server: imap.server, 
          imap_port: imap.port,
          email_count: itemCount,
          item_count: itemCount
        } 
      });
    } else {
      nodes.push({ id: triggerId, type: 'trigger', data: { target_path: sourcePath, item_count: itemCount } });
    }

    // 2. AI Tasks & 3. Actions based on Topology
    let finalTargetPath = targetPath.trim();
    if (finalTargetPath && !finalTargetPath.includes('.')) {
        const randomName = `output_${Math.random().toString(36).substring(2, 9)}`;
        finalTargetPath = `${finalTargetPath.replace(/[\/\\]$/, '')}/${randomName}`;
        addLog(`ℹ️ Auto-generating file name: ${randomName}`);
    }

    if (topology === 'pipeline_final') {
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

      const actionId = 'action_final';
      nodes.push({ id: actionId, type: 'action', data: { target_path: finalTargetPath, output_format: outputFormat } });
      edges.push({ source: lastNodeId, target: actionId });

    } else if (topology === 'pipeline_all' || topology === 'parallel') {
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

        if (topology === 'pipeline_all') {
          edges.push({ source: lastNodeId, target: taskId });
          lastNodeId = taskId;
        } else {
          // Parallel: everyone connects to the trigger
          edges.push({ source: triggerId, target: taskId });
        }

        // Action Routing
        if (outputStrategy === 'single_file') {
          // Edges to a unified action added after the loop
        } else {
          // Separate files or folders
          let tp = finalTargetPath;
          if (outputStrategy === 'separate_folders') {
            const baseDir = targetPath.trim() || '.';
            tp = `${baseDir}/Step_${idx + 1}/output_${Math.random().toString(36).substring(2, 9)}`;
          } else if (outputStrategy === 'separate_files') {
            const baseDir = targetPath.trim() || '.';
            tp = `${baseDir}/step_${idx + 1}_${Math.random().toString(36).substring(2, 9)}`;
          }
          
          nodes.push({ id: `action_${idx}`, type: 'action', data: { target_path: tp, output_format: outputFormat } });
          edges.push({ source: taskId, target: `action_${idx}` });
        }
      });

      if (outputStrategy === 'single_file') {
        nodes.push({ id: 'action_unified', type: 'action', data: { target_path: finalTargetPath, output_format: outputFormat } });
        aiTasks.forEach((_, idx) => {
          edges.push({ source: `agent_${idx}`, target: 'action_unified' });
        });
      }
    }

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
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      addLog(`❌ Failed to connect to execution engine: ${errorMessage}`);
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
      
      {aiTasks.length > 1 && (
        <div className="mb-12 pb-12 border-b border-[var(--nf-border)] relative">
          {/* Timeline Node */}
          <div className={`absolute -left-[53px] top-2 w-6 h-6 rounded-full border-4 border-[var(--nf-bg-primary)] z-10 transition-colors bg-[var(--nf-border)]`} />
          <h3 className="text-xl font-bold text-[var(--nf-text-primary)] mb-4">Multi-Step Routing</h3>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-[var(--nf-text-secondary)] mb-2">Execution Topology</label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-[var(--nf-border)] hover:bg-[var(--nf-bg-input)] cursor-pointer transition-colors">
                  <input type="radio" name="topology" checked={topology === 'pipeline_final'} onChange={() => setTopology('pipeline_final')} className="mt-1" />
                  <div>
                    <div className="text-sm font-bold text-[var(--nf-text-primary)]">Sequential (Final Output Only)</div>
                    <div className="text-xs text-[var(--nf-text-muted)]">Step 1 passes data to Step 2. Only the final result is saved.</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-lg border border-[var(--nf-border)] hover:bg-[var(--nf-bg-input)] cursor-pointer transition-colors">
                  <input type="radio" name="topology" checked={topology === 'pipeline_all'} onChange={() => setTopology('pipeline_all')} className="mt-1" />
                  <div>
                    <div className="text-sm font-bold text-[var(--nf-text-primary)]">Sequential (Save All Steps)</div>
                    <div className="text-xs text-[var(--nf-text-muted)]">Step 1 saves output, then passes data to Step 2 which also saves output.</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-lg border border-[var(--nf-border)] hover:bg-[var(--nf-bg-input)] cursor-pointer transition-colors">
                  <input type="radio" name="topology" checked={topology === 'parallel'} onChange={() => setTopology('parallel')} className="mt-1" />
                  <div>
                    <div className="text-sm font-bold text-[var(--nf-text-primary)]">Parallel (Independent)</div>
                    <div className="text-xs text-[var(--nf-text-muted)]">All steps read the original source data simultaneously.</div>
                  </div>
                </label>
              </div>
            </div>

            {(topology === 'pipeline_all' || topology === 'parallel') && (
              <div className="animate-fade-in">
                <label className="block text-sm font-bold text-[var(--nf-text-secondary)] mb-2">Output Strategy</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-[var(--nf-border)] hover:bg-[var(--nf-bg-input)] cursor-pointer transition-colors">
                    <input type="radio" name="outputStrat" checked={outputStrategy === 'single_file'} onChange={() => setOutputStrategy('single_file')} className="mt-1" />
                    <div>
                      <div className="text-sm font-bold text-[var(--nf-text-primary)]">Single File</div>
                      <div className="text-xs text-[var(--nf-text-muted)]">Append all step outputs together.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-[var(--nf-border)] hover:bg-[var(--nf-bg-input)] cursor-pointer transition-colors">
                    <input type="radio" name="outputStrat" checked={outputStrategy === 'separate_files'} onChange={() => setOutputStrategy('separate_files')} className="mt-1" />
                    <div>
                      <div className="text-sm font-bold text-[var(--nf-text-primary)]">Separate Files</div>
                      <div className="text-xs text-[var(--nf-text-muted)]">Save each step in a separate file (e.g., step_1.txt, step_2.txt).</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-[var(--nf-border)] hover:bg-[var(--nf-bg-input)] cursor-pointer transition-colors">
                    <input type="radio" name="outputStrat" checked={outputStrategy === 'separate_folders'} onChange={() => setOutputStrategy('separate_folders')} className="mt-1" />
                    <div>
                      <div className="text-sm font-bold text-[var(--nf-text-primary)]">Separate Folders</div>
                      <div className="text-xs text-[var(--nf-text-muted)]">Create subfolders for each step (e.g., /Step_1/output.txt).</div>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Engine Status Indicator */}
      <div className="flex items-center justify-between mb-4 mt-8 px-4 py-3 bg-[var(--nf-bg-input)] border border-[var(--nf-border)] rounded-xl">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            {engineRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--nf-accent-emerald)] opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${engineRunning ? 'bg-[var(--nf-accent-emerald)]' : 'bg-[var(--nf-text-muted)]'}`}></span>
          </div>
          <span className="text-sm font-bold text-[var(--nf-text-primary)]">Engine Status: {engineRunning ? 'Running' : 'Stopped'}</span>
          {engineRunning && <span className="text-xs text-[var(--nf-text-muted)] bg-[var(--nf-bg-surface)] px-2 py-1 rounded-md border border-[var(--nf-border)]">{activeTasksCount} Active Task{activeTasksCount !== 1 ? 's' : ''}</span>}
        </div>
        {engineRunning && (
          <button 
            onClick={stopEngine} 
            className="px-4 py-2 bg-[var(--nf-accent-red)]/20 hover:bg-[var(--nf-accent-red)]/40 border border-[var(--nf-accent-red)]/50 text-[var(--nf-accent-red)] font-bold text-xs rounded-lg transition-colors flex items-center gap-2"
          >
            <div className="w-2 h-2 bg-[var(--nf-accent-red)] rounded-sm"></div> Force Stop
          </button>
        )}
      </div>

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
              <FlaskConical size={20}/> Run Automation
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
