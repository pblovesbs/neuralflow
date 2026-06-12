'use client';

import React, { useState } from 'react';
import { ArrowRight, Plus, Folder, Mail, FileText, Download, Code2, Receipt, Languages, Trash2, ArrowLeft, RefreshCw, Zap } from 'lucide-react';

const BACKEND_URL = 'http://localhost:8000';

type StepCategory = 'input' | 'process' | 'output';

interface StepDefinition {
  id: string;
  category: StepCategory;
  label: string;
  icon: React.ReactNode;
  desc: string;
  defaultConfig?: any;
}

const STEP_TYPES: Record<string, StepDefinition> = {
  // Inputs
  'folder_input': { id: 'folder_input', category: 'input', label: 'Local Folder', icon: <Folder size={18} />, desc: 'Read files from a directory.', defaultConfig: { path: '' } },
  'email_input': { id: 'email_input', category: 'input', label: 'Email Inbox', icon: <Mail size={18} />, desc: 'Fetch recent unread emails.', defaultConfig: { path: 'imap://...' } },
  'file_input': { id: 'file_input', category: 'input', label: 'Single File', icon: <FileText size={18} />, desc: 'Read a specific document.', defaultConfig: { path: '' } },
  
  // Processes
  'summarize': { id: 'summarize', category: 'process', label: 'Summarize', icon: <FileText size={18} />, desc: 'AI creates a concise summary.', defaultConfig: { prompt: 'Summarize this content in 3-5 bullet points.' } },
  'extract': { id: 'extract', category: 'process', label: 'Extract Data', icon: <Receipt size={18} />, desc: 'Pull out specific fields (e.g. JSON).', defaultConfig: { prompt: 'Extract key data into a JSON format.' } },
  'translate': { id: 'translate', category: 'process', label: 'Translate', icon: <Languages size={18} />, desc: 'Translate text to English.', defaultConfig: { prompt: 'Translate this to English.' } },
  'code_review': { id: 'code_review', category: 'process', label: 'Code Review', icon: <Code2 size={18} />, desc: 'Find bugs and optimize.', defaultConfig: { prompt: 'Review this code for bugs.' } },
  
  // Outputs
  'save_folder': { id: 'save_folder', category: 'output', label: 'Save to Folder', icon: <Folder size={18} />, desc: 'Save results as new files.', defaultConfig: { path: '' } },
  'save_file': { id: 'save_file', category: 'output', label: 'Save to File', icon: <Download size={18} />, desc: 'Append results to a file.', defaultConfig: { path: '' } },
};

interface WorkflowStep {
  instanceId: string;
  typeId: string;
  config: any;
}

export default function StandardPage() {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showStepPicker, setShowStepPicker] = useState<StepCategory | null>(null);

  const addStep = (typeId: string) => {
    const def = STEP_TYPES[typeId];
    setSteps([...steps, {
      instanceId: `step_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      typeId,
      config: { ...def.defaultConfig }
    }]);
    setShowStepPicker(null);
  };

  const removeStep = (instanceId: string) => {
    setSteps(steps.filter(s => s.instanceId !== instanceId));
  };

  const updateStepConfig = (instanceId: string, key: string, value: any) => {
    setSteps(steps.map(s => s.instanceId === instanceId ? { ...s, config: { ...s.config, [key]: value } } : s));
  };

  const pickSystemPath = async (instanceId: string, type: 'file' | 'folder' | 'save') => {
    try {
      const endpoint = type === 'file' ? '/api/system/file-picker' : type === 'folder' ? '/api/system/folder-picker' : '/api/system/save-file-picker';
      const res = await fetch(`${BACKEND_URL}${endpoint}`);
      const data = await res.json();
      if (data.path) {
        updateStepConfig(instanceId, 'path', data.path);
      }
    } catch (e) {
      console.error("Failed to pick path", e);
      alert("Failed to open native file picker.");
    }
  };

  const handleDeploy = async () => {
    if (steps.length === 0) return;
    setIsDeploying(true);
    setStatus('Building AI workflow...');

    // Convert linear steps to DAG
    const nodes: any[] = [];
    const edges: any[] = [];
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const def = STEP_TYPES[step.typeId];
      
      let nodeType = 'action';
      if (def.category === 'input') nodeType = 'trigger';
      if (def.category === 'process') nodeType = 'agent';

      nodes.push({
        id: step.instanceId,
        type: nodeType,
        data: {
          label: def.label,
          target_path: step.config.path || '',
          prompt_template: step.config.prompt || '',
          model: 'qwen2.5:0.5b' // default fast model
        }
      });

      if (i > 0) {
        edges.push({
          source: steps[i-1].instanceId,
          target: step.instanceId
        });
      }
    }

    try {
      const res = await fetch(`${BACKEND_URL}/execute-graph`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_id: `wf_std_${Date.now()}`,
          nodes,
          edges
        })
      });
      if (res.ok) {
        setStatus('Deployed successfully! Check logs in Builder Mode for progress.');
      } else {
        setStatus('Deployment failed.');
      }
    } catch (e) {
      setStatus('Network error.');
    } finally {
      setIsDeploying(false);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex justify-between items-center mb-12 animate-fade-in">
        <div>
          <h2 className="text-3xl font-bold text-white mb-3">Build an Automation</h2>
          <p className="text-neutral-400">Chain steps together to create a powerful AI workflow.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setSteps([])} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-neutral-400 hover:text-white transition-colors">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="space-y-4 mb-12">
        {steps.map((step, index) => {
          const def = STEP_TYPES[step.typeId];
          return (
            <div key={step.instanceId} className="flex flex-col relative animate-slide-up group">
              {/* Connection Line */}
              {index > 0 && (
                <div className="absolute -top-6 left-8 w-0.5 h-6 bg-cyan-500/30" />
              )}
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative hover:border-cyan-500/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    def.category === 'input' ? 'bg-blue-500/20 text-blue-400' :
                    def.category === 'process' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {def.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-white text-lg">{def.label}</h3>
                      <button onClick={() => removeStep(step.instanceId)} className="text-neutral-500 hover:text-red-400 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                    
                    {/* Native File Picker UI for path config */}
                    {step.config.path !== undefined && def.id !== 'email_input' && (
                      <div className="mt-4 flex gap-2">
                        <input 
                          type="text" 
                          value={step.config.path}
                          onChange={(e) => updateStepConfig(step.instanceId, 'path', e.target.value)}
                          placeholder="Select a path..."
                          className="flex-1 bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-neutral-300 outline-none focus:border-cyan-500"
                        />
                        <button 
                          onClick={() => pickSystemPath(step.instanceId, def.id.includes('folder') ? 'folder' : def.id.includes('save') ? 'save' : 'file')}
                          className="px-4 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap"
                        >
                          Browse...
                        </button>
                      </div>
                    )}

                    {/* Email Input Note */}
                    {def.id === 'email_input' && (
                      <p className="mt-2 text-sm text-neutral-400 italic">
                        Uses configured IMAP credentials in Builder Mode.
                      </p>
                    )}

                    {/* Prompt UI for process config */}
                    {step.config.prompt !== undefined && (
                      <div className="mt-4">
                        <textarea 
                          value={step.config.prompt}
                          onChange={(e) => updateStepConfig(step.instanceId, 'prompt', e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-neutral-300 outline-none focus:border-purple-500 resize-none h-20"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Step Button */}
        <div className="relative pt-4">
          {steps.length > 0 && <div className="absolute top-0 left-8 w-0.5 h-4 bg-cyan-500/30" />}
          
          {!showStepPicker ? (
            <button 
              onClick={() => setShowStepPicker(steps.length === 0 ? 'input' : 'process')}
              className="w-full py-6 rounded-2xl border-2 border-dashed border-white/10 hover:border-cyan-500/40 hover:bg-white/5 transition-all flex items-center justify-center gap-3 text-neutral-400 hover:text-cyan-400 font-bold"
            >
              <Plus size={20} /> Add Step
            </button>
          ) : (
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-2xl animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Zap size={18} className="text-cyan-400" /> Choose Action
                </h3>
                <button onClick={() => setShowStepPicker(null)} className="text-neutral-500 hover:text-white">
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['input', 'process', 'output'].map(cat => (
                  <div key={cat}>
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">{cat}s</h4>
                    <div className="space-y-2">
                      {Object.values(STEP_TYPES).filter(t => t.category === cat).map(type => (
                        <button
                          key={type.id}
                          onClick={() => addStep(type.id)}
                          className="w-full flex items-center gap-3 p-3 text-left rounded-xl bg-white/5 hover:bg-white/10 hover:text-cyan-400 transition-colors group"
                        >
                          <div className="text-neutral-400 group-hover:text-cyan-400 transition-colors">
                            {type.icon}
                          </div>
                          <span className="text-sm font-semibold">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {steps.length > 0 && (
        <div className="flex flex-col items-center mt-12">
          <button
            onClick={handleDeploy}
            disabled={isDeploying}
            className="w-full md:w-2/3 py-4 rounded-xl font-bold text-white transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_30px_-5px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_-5px_rgba(6,182,212,0.6)] disabled:opacity-50"
          >
            {isDeploying ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Run Workflow <ArrowRight size={18} /></>
            )}
          </button>
          
          {status && (
            <p className="mt-4 text-sm font-semibold text-cyan-400 animate-pulse">
              {status}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
