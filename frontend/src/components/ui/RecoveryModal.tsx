'use client';

import React, { useState, useEffect } from 'react';
import useFlowStore from '@/store/flowStore';
import { AlertCircle, ShieldAlert, CheckCircle, RefreshCw, Edit3, SkipForward, Shield, X, Eye, Code, Cpu, HardDrive } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function RecoveryModal() {
  const { recoveryPrompt, resolveRecovery, dismissRecovery } = useFlowStore();
  const [editing, setEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hardware deadlock state
  const [models, setModels] = useState<{name: string, size: number}[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');

  // Reset state when a new prompt appears
  useEffect(() => {
    if (recoveryPrompt) {
      // eslint-disable-next-line
      setEditing(false);
      setEditedText(recoveryPrompt.original_output || '');
      setPreviewMode(false);
      setErrorMsg(null);
      
      if (recoveryPrompt.violation.module_name === 'hardware') {
        fetch('http://localhost:8000/api/models')
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data) && data.length > 0) {
              setModels(data);
              setSelectedModel(data[0].name || data[0].id || 'qwen2.5:0.5b');
            }
          })
          .catch(err => console.error("Failed to fetch models:", err));
      }
    }
  }, [recoveryPrompt]);

  if (!recoveryPrompt) return null;

  const isHardwareDeadlock = recoveryPrompt.violation.module_name === 'hardware';
  const isSecurityAlert = recoveryPrompt.violation.module_name !== 'confidence' && !isHardwareDeadlock;
  
  const headerIcon = isHardwareDeadlock ? <Cpu className="w-6 h-6 text-orange-500" /> : (isSecurityAlert ? <ShieldAlert className="w-6 h-6 text-red-500" /> : <AlertCircle className="w-6 h-6 text-yellow-500" />);
  const headerTitle = isHardwareDeadlock ? "Hardware Deadlock: Out of VRAM" : (isSecurityAlert ? "Security Alert: Sandbox Violation" : "Quality Warning: Low Confidence");
  const headerColor = isHardwareDeadlock ? "text-orange-500" : (isSecurityAlert ? "text-red-500" : "text-yellow-500");

  const handleAction = async (action: 'retry' | 'edit' | 'skip' | 'whitelist' | 'force_free' | 'fallback') => {
    console.log("Triggered handleAction:", action);
    if (action === 'edit' && !editing) {
      setEditing(true);
      return;
    }
    
    try {
      let output = undefined;
      if (action === 'edit') output = editedText;
      if (action === 'fallback') output = selectedModel || 'qwen2.5:0.5b';
      
      console.log("Resolving recovery...", action, output);
      await resolveRecovery(action, output);
    } catch (err: unknown) {
      console.error("Resolve error:", err);
      setErrorMsg((err as Error).message || 'Failed to communicate with backend.');
    }
  };

  const handleForceExit = async () => {
    console.log("Triggered handleForceExit");
    try {
      await fetch('http://localhost:8000/stop-engine', { method: 'POST' });
    } catch (e) {
      console.warn("Backend might already be down:", e);
    }
    dismissRecovery();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-800 bg-[#252525] flex items-center space-x-4">
          <div className="p-3 bg-black/30 rounded-full border border-gray-700">
            {headerIcon}
          </div>
          <div>
            <h2 className={`text-xl font-bold ${headerColor}`}>{headerTitle}</h2>
            <p className="text-sm text-gray-400 mt-1">Workflow execution paused at Node <span className="font-mono text-gray-300 bg-gray-800 px-1 py-0.5 rounded">{recoveryPrompt.node_id}</span></p>
          </div>
          <button
            onClick={handleForceExit}
            className="ml-auto p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors"
            title="Force Stop and Exit"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[60vh]">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-start space-x-3 text-red-400 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Backend Sync Error</p>
                <p className="text-xs mt-1">{errorMsg}</p>
                <button 
                  onClick={handleForceExit} 
                  className="mt-2 text-xs bg-red-500/20 hover:bg-red-500/30 px-3 py-1 rounded transition-colors border border-red-500/50"
                >
                  Clear & Exit
                </button>
              </div>
            </div>
          )}

          <div className="bg-black/40 border border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Reason for pause</h3>
            <p className="text-gray-100 font-medium">{recoveryPrompt.reason}</p>
            {recoveryPrompt.violation.message && !isHardwareDeadlock && (
              <p className="text-sm text-gray-400 mt-2 bg-gray-800/50 p-2 rounded font-mono border border-gray-700/50">
                {recoveryPrompt.violation.message}
              </p>
            )}
            
            {/* Hardware Deadlock specific stats */}
            {isHardwareDeadlock && recoveryPrompt.violation.req_vram && (
               <div className="mt-4 flex flex-col gap-2">
                 <div className="flex items-center justify-between p-2 rounded bg-gray-800/50 border border-red-500/30">
                    <span className="text-sm text-gray-400 flex items-center gap-1.5"><HardDrive size={14}/> Required VRAM:</span>
                    <span className="text-sm font-mono text-red-400">{formatBytes(recoveryPrompt.violation.req_vram)}</span>
                 </div>
                 <div className="flex items-center justify-between p-2 rounded bg-gray-800/50 border border-gray-700/50">
                    <span className="text-sm text-gray-400 flex items-center gap-1.5"><Cpu size={14}/> Available VRAM:</span>
                    <span className="text-sm font-mono text-gray-300">{formatBytes(recoveryPrompt.violation.available_vram || 0)}</span>
                 </div>
               </div>
            )}
          </div>

          {/* Standard manual override editor */}
          {editing && !isHardwareDeadlock && (
            <div className="space-y-3 animate-in slide-in-from-top-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Manual Override (Edit Output)</h3>
                <div className="flex space-x-2 bg-black/50 p-1 rounded-lg border border-gray-700">
                  <button 
                    onClick={() => setPreviewMode(false)}
                    className={`px-3 py-1 text-xs rounded flex items-center space-x-1 transition-colors ${!previewMode ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-400 hover:text-gray-200'}`}
                  >
                    <Code className="w-3 h-3" />
                    <span>Raw</span>
                  </button>
                  <button 
                    onClick={() => setPreviewMode(true)}
                    className={`px-3 py-1 text-xs rounded flex items-center space-x-1 transition-colors ${previewMode ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-400 hover:text-gray-200'}`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Preview</span>
                  </button>
                </div>
              </div>

              {previewMode ? (
                <div className="w-full h-48 bg-[#1a1a1a] border border-gray-700 rounded-lg p-4 overflow-y-auto prose prose-invert max-w-none text-sm">
                  {editedText.trim() ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{editedText}</ReactMarkdown>
                  ) : (
                    <p className="text-gray-500 italic">Nothing to preview...</p>
                  )}
                </div>
              ) : (
                <textarea 
                  className="w-full h-48 bg-[#1a1a1a] border border-gray-700 rounded-lg p-4 text-gray-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                  placeholder="Type the corrected output here to bypass the AI..."
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  autoFocus
                />
              )}
            </div>
          )}
          
          {/* Hardware Deadlock specific controls */}
          {isHardwareDeadlock && (
            <div className="space-y-4 animate-in slide-in-from-top-4 border border-orange-500/20 bg-orange-500/5 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-2">Resolution Options</h3>
              
              <div className="space-y-4">
                 <div className="flex flex-col gap-2">
                    <p className="text-xs text-gray-400">1. Purge dormant models from memory and retry with current settings:</p>
                    <button 
                      onClick={() => handleAction('force_free')}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors border border-orange-500 focus:outline-none shadow-lg"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Force Free Memory & Retry</span>
                    </button>
                 </div>
                 
                 <div className="border-t border-gray-700/50 my-2"></div>
                 
                 <div className="flex flex-col gap-2">
                    <p className="text-xs text-gray-400">2. Select a lighter model guaranteed to fit in available VRAM:</p>
                    <div className="flex gap-2">
                      <select 
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="flex-1 bg-black/40 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                      >
                        {models.length > 0 ? (
                           models.map(m => (
                              <option key={m.name} value={m.name}>{m.name} ({formatBytes(m.size)})</option>
                           ))
                        ) : (
                           <option value="qwen2.5:0.5b">qwen2.5:0.5b (Default Fallback)</option>
                        )}
                      </select>
                      <button 
                        onClick={() => handleAction('fallback')}
                        disabled={!selectedModel}
                        className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors border border-indigo-500 focus:outline-none disabled:opacity-50"
                      >
                        <span>Use Fallback</span>
                      </button>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-800 bg-[#252525] flex flex-wrap gap-3 justify-end">
          
          <button 
            onClick={() => handleAction('skip')}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors border border-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            <SkipForward className="w-4 h-4" />
            <span>Ignore & Continue</span>
          </button>

          {!isHardwareDeadlock && (
            <>
              {!editing ? (
                <button 
                  onClick={() => handleAction('edit')}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors border border-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>I'll Do It Myself</span>
                </button>
              ) : (
                <button 
                  onClick={() => handleAction('edit')}
                  disabled={!editedText.trim()}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors border border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Submit & Resume</span>
                </button>
              )}

              {isSecurityAlert && (
                <button 
                  onClick={() => handleAction('whitelist')}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <Shield className="w-4 h-4" />
                  <span>Trust this Action (Whitelist)</span>
                </button>
              )}

              <button 
                onClick={() => handleAction('retry')}
                className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors border border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
