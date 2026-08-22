'use client';

/**
 * AgentNode v2 — AI Brain node.
 * 25+ models in tiered groups. Permission-gated install. Free-text Mad-Libs builder.
 * Memory-efficient: context capped at 6000 chars, num_ctx injected per model tier.
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import BaseNode from './BaseNode';
import PermissionModal from '@/components/ui/PermissionModal';
import InfoTooltip from '@/components/ui/InfoTooltip';
import useFlowStore from '@/store/flowStore';
import type { DagNodeData } from '@/types/dag';

const BACKEND_URL = 'http://localhost:8000';

// ─── 25+ Model Catalog (tiered) ──────────────────────────────────────────────
export const MODEL_TIERS = [
  {
    tier: '⚡ Speed Tier — Under 2GB RAM',
    description: 'Extremely lightweight. Best for quick summarization, bullet points, simple Q&A.',
    models: [
      { id: 'tinyllama:1.1b',    name: 'TinyLlama 1.1B',          params: '1.1B', ram: '~0.8 GB', numCtx: 2048,  badge: 'Fastest',    desc: 'Ultra-compact. Instant responses. Great for short documents.' },
      { id: 'qwen2.5:0.5b',     name: 'Qwen 2.5 — 0.5B',         params: '0.5B', ram: '~0.7 GB', numCtx: 2048,  badge: 'Lightest',   desc: 'Chinese-English bilingual. Incredible for its size.' },
      { id: 'qwen2.5:1.5b',     name: 'Qwen 2.5 — 1.5B',         params: '1.5B', ram: '~1.2 GB', numCtx: 4096,  badge: 'Efficient',  desc: 'Better quality than 0.5B, still very fast.' },
      { id: 'phi3:mini',        name: 'Phi-3 Mini (Microsoft)',   params: '3.8B', ram: '~2.4 GB', numCtx: 4096,  badge: 'Compact',   desc: "Microsoft's precision-trained mini model. Punches above its weight." },
    ],
  },
  {
    tier: '⚖️ Balanced Tier — 2–6GB RAM',
    description: 'Great all-rounders for most tasks: summaries, rewriting, extraction, translation.',
    models: [
      { id: 'llama3.2:1b',      name: 'Llama 3.2 — 1B (Meta)',   params: '1B',   ram: '~1.3 GB', numCtx: 4096,  badge: 'Popular',   desc: "Meta's latest lightweight Llama. Reliable and well-tested." },
      { id: 'llama3.2:3b',      name: 'Llama 3.2 — 3B (Meta)',   params: '3B',   ram: '~2.2 GB', numCtx: 4096,  badge: 'Recommended', desc: 'Best balance of speed and quality for everyday tasks.' },
      { id: 'gemma3:1b',        name: 'Gemma 3 — 1B (Google)',   params: '1B',   ram: '~0.8 GB', numCtx: 4096,  badge: 'Google',    desc: "Google's newest Gemma. Excellent instruction following." },
      { id: 'gemma3:4b',        name: 'Gemma 3 — 4B (Google)',   params: '4B',   ram: '~3.0 GB', numCtx: 8192,  badge: 'Strong',    desc: 'Handles longer documents and complex tasks with ease.' },
      { id: 'qwen2.5:3b',       name: 'Qwen 2.5 — 3B',          params: '3B',   ram: '~2.0 GB', numCtx: 8192,  badge: 'Long CTX',  desc: 'Supports very long context (32K). Great for large files.' },
      { id: 'mistral:7b',       name: 'Mistral 7B',              params: '7B',   ram: '~4.5 GB', numCtx: 8192,  badge: 'Classic',   desc: 'The original open-source favourite. Rock-solid for all tasks.' },
    ],
  },
  {
    tier: '🔮 Power Tier — 6–16GB RAM',
    description: 'Advanced reasoning, nuanced writing, complex analysis. Best quality outputs.',
    models: [
      { id: 'llama3.1:8b',      name: 'Llama 3.1 — 8B (Meta)',   params: '8B',   ram: '~5.5 GB', numCtx: 8192,  badge: 'Smart',     desc: 'Meta flagship 8B model. Exceptional instruction following.' },
      { id: 'llama3:8b',        name: 'Llama 3 — 8B (Meta)',     params: '8B',   ram: '~5.2 GB', numCtx: 8192,  badge: 'Proven',    desc: 'Widely tested, reliable for professional use.' },
      { id: 'gemma2:9b',        name: 'Gemma 2 — 9B (Google)',   params: '9B',   ram: '~6.0 GB', numCtx: 8192,  badge: 'Capable',   desc: "Google's Gemma 2 in 9B parameter size. Excellent at writing." },
      { id: 'qwen2.5:7b',       name: 'Qwen 2.5 — 7B',          params: '7B',   ram: '~5.0 GB', numCtx: 32768, badge: 'Long CTX',  desc: 'Up to 128K context. Best for very long documents.' },
      { id: 'mistral-nemo',     name: 'Mistral NeMo 12B',        params: '12B',  ram: '~8.0 GB', numCtx: 16384, badge: 'Premium',   desc: 'NVIDIA & Mistral collaboration. Very capable reasoning model.' },
      { id: 'phi4:14b',         name: 'Phi-4 14B (Microsoft)',   params: '14B',  ram: '~9.0 GB', numCtx: 16384, badge: 'Research',  desc: "Microsoft's largest Phi model. State-of-the-art reasoning." },
    ],
  },
  {
    tier: '💻 Coding Tier — Specialized for Code',
    description: 'Optimized for writing, reviewing, or explaining code in any language.',
    models: [
      { id: 'codellama:7b',     name: 'Code Llama 7B (Meta)',     params: '7B',   ram: '~4.5 GB', numCtx: 16384, badge: 'Code',      desc: 'Meta\'s code-specialized model. Write and explain code with ease.' },
      { id: 'codegemma:2b',     name: 'CodeGemma 2B (Google)',    params: '2B',   ram: '~1.6 GB', numCtx: 8192,  badge: 'Lightweight',desc: 'Lightweight code model by Google. Fast autocomplete and fixes.' },
      { id: 'qwen2.5-coder:7b', name: 'Qwen Coder 7B',           params: '7B',   ram: '~5.0 GB', numCtx: 32768, badge: 'Advanced',  desc: 'Best open-source coding model. Handles complex multi-file tasks.' },
      { id: 'deepseek-coder:6.7b', name: 'DeepSeek Coder 6.7B',  params: '6.7B', ram: '~4.2 GB', numCtx: 16384, badge: 'DeepSeek', desc: 'Strong at algorithmic problems and code generation.' },
    ],
  },
  {
    tier: '🌐 Multilingual Tier — Non-English Languages',
    description: 'Documents in French, Spanish, German, Chinese, Japanese, Arabic, and more.',
    models: [
      { id: 'qwen2.5:7b',       name: 'Qwen 2.5 7B (multilingual)', params: '7B', ram: '~5.0 GB', numCtx: 32768, badge: '100+ langs', desc: 'Supports 100+ languages natively. Best for non-English documents.' },
      { id: 'aya:8b',           name: 'Aya 8B (Cohere)',            params: '8B', ram: '~5.5 GB', numCtx: 8192,  badge: '23 langs', desc: 'Cohere research model trained on 23 languages.' },
    ],
  },
];

function compilePrompt(role: string, task: string, format: string): string {
  const r = role.trim() || 'a helpful assistant';
  const t = task.trim() || 'process and analyze the input data';
  const f = format.trim() || 'a clear, direct response';
  return `You are ${r}.\nYour task is to ${t}.\nPresent the result as ${f}.\n\nIMPORTANT: Return only the direct output. No conversational preamble, no "Here is..." or "Certainly!" — just the result.\n\n[INPUT CONTENT]:\n{{input}}`;
}

// Find model meta by ID
function findModel(id: string) {
  for (const tier of MODEL_TIERS) {
    const m = tier.models.find(m => m.id === id);
    if (m) return { ...m, tierName: tier.tier };
  }
  return null;
}

export default function AgentNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const nodeData = data as DagNodeData;

  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [showInstallPermission, setShowInstallPermission] = useState(false);
  const [pendingModelId, setPendingModelId] = useState('');
  const [installing, setInstalling] = useState(false);
  const [installStatus, setInstallStatus] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [role, setRole] = useState('');
  const [task, setTask] = useState('');
  const [format, setFormat] = useState('');
  const [showModelList, setShowModelList] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/models/installed`)
      .then(r => r.json())
      .then(d => setInstalledModels(d.installed || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isManualMode) {
      updateNodeData(id, { prompt_template: compilePrompt(role, task, format) });
    }
  }, [role, task, format, isManualMode, id, updateNodeData]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModelList(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleModelSelect = useCallback(async (modelId: string) => {
    setShowModelList(false);
    const isInstalled = installedModels.includes(modelId);
    if (isInstalled) {
      updateNodeData(id, { model: modelId });
    } else {
      setPendingModelId(modelId);
      setShowInstallPermission(true);
    }
  }, [installedModels, id, updateNodeData]);

  const handleInstall = useCallback(async () => {
    setShowInstallPermission(false);
    setInstalling(true);
    setInstallStatus(`Downloading ${pendingModelId}... This may take a few minutes.`);
    updateNodeData(id, { model: pendingModelId });
    try {
      await fetch(`${BACKEND_URL}/api/models/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: pendingModelId }),
      });
      setInstallStatus('Download started in background ✓');
      setTimeout(() => { setInstalling(false); setInstallStatus(''); }, 5000);
    } catch {
      setInstallStatus('Failed to start download. Is Ollama running?');
      setInstalling(false);
    }
  }, [pendingModelId, id, updateNodeData]);

  const selectedModelMeta = nodeData.model ? findModel(nodeData.model) : null;
  const isInstalled = nodeData.model ? installedModels.includes(nodeData.model) : false;



  const pendingMeta = findModel(pendingModelId);

  return (
    <div style={{ '--accent-text': '#22d3ee', '--accent-bg': 'rgba(34,211,238,0.12)', '--accent-glow': 'rgba(34,211,238,0.25)' } as React.CSSProperties}>
      {showInstallPermission && pendingMeta && (
        <PermissionModal
          type="model_download"
          detail={`${pendingMeta.name} (${pendingMeta.params} parameters)`}
          extraInfo={`Download size: ${pendingMeta.ram} · Will be stored locally in Ollama`}
          onAllow={handleInstall}
          onDeny={() => setShowInstallPermission(false)}
        />
      )}

      <Handle type="target" position={Position.Top}
        style={{ width: 14, height: 14, borderRadius: '50%', border: '2.5px solid #22d3ee', background: 'var(--nf-bg-primary)', boxShadow: '0 0 10px rgba(34,211,238,0.5)' }}
      />

      <BaseNode
        selected={selected}
        accentColor="cyan-400"
        accentRaw="#22d3ee"
        glowRaw="rgba(34,211,238,0.3)"
        gradientVar="--nf-gradient-node-agent"
        icon={<span>🧠</span>}
        tainted={data.tainted as boolean}
        label={
          <div className="flex justify-between items-center w-full">
            <span>AI Processing</span>
            <InfoTooltip 
              title="How AI Processing Works" 
              description={
                <>
                  <p>This node acts as the &quot;Brain&quot; of your automation.</p>
                  <p className="mt-1">1. <b>100% Local:</b> NeuralFlow downloads the open-source LLM you select to your machine. The data never leaves your computer.</p>
                  <p className="mt-1">2. <b>Input:</b> It reads the data sent from the previous node (e.g., an Email or File).</p>
                  <p className="mt-1">3. <b>Processing:</b> Using your custom prompt, it processes the data using your GPU/CPU.</p>
                  <p className="mt-1">4. <b>Output:</b> The extracted or summarized result is passed to the next node.</p>
                </>
              } 
            />
          </div>
        }
        nodeType="Step 2"
        badge={selectedModelMeta ? (isInstalled ? 'Ready' : 'Not installed') : undefined}
      >
        <div className="space-y-4">

          {/* Model Selector */}
          <div>
            <label className="nf-label">AI Model — Your Brain</label>
            <p className="text-[10px] mb-2" style={{ color: 'var(--nf-text-dim)' }}>
              Choose how powerful you want the AI to be. More power = better results, but needs more RAM.
            </p>

            {/* Custom dropdown trigger */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowModelList(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all"
                style={{
                  background: 'var(--nf-bg-input)',
                  border: `1px solid ${showModelList ? 'rgba(34,211,238,0.4)' : 'var(--nf-border)'}`,
                  boxShadow: showModelList ? '0 0 0 3px rgba(34,211,238,0.1)' : 'none',
                }}
              >
                {selectedModelMeta ? (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(34,211,238,0.15)', color: '#22d3ee' }}>
                      {selectedModelMeta.params}
                    </span>
                    <span className="text-xs font-semibold truncate" style={{ color: 'var(--nf-text-primary)' }}>{selectedModelMeta.name}</span>
                    <span className="text-[9px] shrink-0" style={{ color: 'var(--nf-text-dim)' }}>{selectedModelMeta.ram}</span>
                  </div>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--nf-text-dim)' }}>Select an AI model...</span>
                )}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`shrink-0 ml-2 transition-transform ${showModelList ? 'rotate-180' : ''}`} style={{ color: 'var(--nf-text-dim)' }}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {/* Dropdown panel */}
              {showModelList && (
                <div
                  className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 rounded-xl overflow-y-auto animate-slide-up nowheel nodrag"
                  onWheel={(e) => e.stopPropagation()}
                  style={{
                    background: 'var(--nf-bg-modal)',
                    border: '1px solid var(--nf-border-accent)',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
                    maxHeight: '320px',
                  }}
                >
                  {MODEL_TIERS.map(tier => (
                    <div key={tier.tier}>
                      {/* Tier header */}
                      <div className="sticky top-0 px-3 py-2" style={{ background: 'var(--nf-bg-modal)', borderBottom: '1px solid var(--nf-border-subtle)' }}>
                        <p className="text-[10px] font-bold" style={{ color: 'var(--nf-text-muted)' }}>{tier.tier}</p>
                        <p className="text-[9px]" style={{ color: 'var(--nf-text-dim)' }}>{tier.description}</p>
                      </div>
                      {/* Models in tier */}
                      {tier.models.map(model => {
                        const installed = installedModels.includes(model.id);
                        const isCurrent = nodeData.model === model.id;
                        return (
                          <button
                            key={model.id}
                            onClick={() => handleModelSelect(model.id)}
                            className="w-full flex items-start gap-3 px-3 py-2.5 text-left transition-all"
                            style={{
                              background: isCurrent ? 'rgba(34,211,238,0.08)' : 'transparent',
                              borderLeft: isCurrent ? '2px solid #22d3ee' : '2px solid transparent',
                            }}
                            onMouseEnter={e => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                            onMouseLeave={e => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[11px] font-semibold truncate" style={{ color: isCurrent ? '#22d3ee' : 'var(--nf-text-primary)' }}>
                                  {model.name}
                                </span>
                                <span className="text-[9px] font-bold px-1 py-0.5 rounded shrink-0" style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee' }}>
                                  {model.badge}
                                </span>
                                {installed && (
                                  <span className="text-[9px] px-1 py-0.5 rounded shrink-0" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
                                    ✓ Installed
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px]" style={{ color: 'var(--nf-text-dim)' }}>{model.desc}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-[9px] font-mono font-semibold" style={{ color: 'var(--nf-text-muted)' }}>{model.params}</p>
                              <p className="text-[9px]" style={{ color: 'var(--nf-text-dim)' }}>{model.ram}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Install status */}
            {installing && (
              <div className="mt-2 px-3 py-2 rounded-lg text-[10px]" style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)', color: '#22d3ee' }}>
                <span className="animate-pulse">⬇</span> {installStatus}
              </div>
            )}

            {/* Not installed warning */}
            {selectedModelMeta && !isInstalled && !installing && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-[10px]" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                <span>⚠</span>
                <span>Not downloaded yet — workflow will auto-download it when you run.</span>
              </div>
            )}
          </div>

          {/* Prompt Builder */}
          {!isManualMode ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between mb-1">
                <label className="nf-label" style={{ marginBottom: 0 }}>What should the AI do?</label>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee' }}>Guided Mode</span>
              </div>
              <p className="text-[10px] mb-2" style={{ color: 'var(--nf-text-dim)' }}>
                Fill in these three fields. NeuralFlow will build a precise instruction from them automatically.
              </p>

              {/* Role */}
              <div>
                <label className="nf-label">① The AI should act as...</label>
                <input type="text" value={role} onChange={e => setRole(e.target.value)}
                  placeholder="e.g. a financial analyst, a copy editor, a meeting summarizer..."
                  className="nf-input"
                />
              </div>

              {/* Task */}
              <div>
                <label className="nf-label">② Its main job is to...</label>
                <input type="text" value={task} onChange={e => setTask(e.target.value)}
                  placeholder="e.g. extract every action item, rewrite in simple English, identify key dates..."
                  className="nf-input"
                />
              </div>

              {/* Format */}
              <div>
                <label className="nf-label">③ Deliver the result as...</label>
                <input type="text" value={format} onChange={e => setFormat(e.target.value)}
                  placeholder="e.g. a numbered list, a short paragraph, a table with two columns..."
                  className="nf-input"
                />
              </div>

              <button
                onClick={() => setIsManualMode(true)}
                className="text-[10px] underline underline-offset-2 transition-colors hover:opacity-80"
                style={{ color: 'var(--nf-text-dim)' }}
              >
                ✏️ I want to write the prompt myself
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="nf-label" style={{ marginBottom: 0 }}>Your Instruction</label>
                <button
                  onClick={() => setIsManualMode(false)}
                  className="text-[10px] underline underline-offset-2 transition-colors"
                  style={{ color: '#22d3ee' }}
                >
                  ← Use guided builder
                </button>
              </div>
              <textarea
                value={nodeData.prompt_template || ''}
                onChange={e => updateNodeData(id, { prompt_template: e.target.value })}
                placeholder={'Write your full instruction here.\nUse {{input}} to insert the file content.'}
                rows={5}
                className="nf-input resize-none"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: '1.6' }}
              />
              <p className="text-[10px]" style={{ color: 'var(--nf-text-dim)' }}>
                Tip: Use <code style={{ color: '#22d3ee', background: 'rgba(34,211,238,0.1)', padding: '0 3px', borderRadius: 3 }}>{'{{input}}'}</code> to insert the document content from the Source step.
              </p>
            </div>
          )}

          {/* Advanced Settings */}
          <div className="pt-2 border-t border-white/5">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-[10px] font-semibold text-neutral-400 hover:text-white transition-colors"
            >
              <Settings2 size={12} />
              Advanced Settings
              {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 animate-slide-up bg-black/20 p-3 rounded-xl border border-white/5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="nf-label">Temperature</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={nodeData.temperature ?? 0.7}
                      onChange={e => updateNodeData(id, { temperature: parseFloat(e.target.value) })}
                      className="nf-input"
                    />
                  </div>
                  <div>
                    <label className="nf-label">Top P</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={nodeData.top_p ?? 0.9}
                      onChange={e => updateNodeData(id, { top_p: parseFloat(e.target.value) })}
                      className="nf-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="nf-label">Max Tokens</label>
                    <input
                      type="number"
                      step="128"
                      min="0"
                      placeholder="e.g. 2048"
                      value={nodeData.max_tokens ?? ''}
                      onChange={e => updateNodeData(id, { max_tokens: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="nf-input"
                    />
                  </div>
                  <div>
                    <label className="nf-label">Repeat Penalty</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="2"
                      value={nodeData.repeat_penalty ?? 1.1}
                      onChange={e => updateNodeData(id, { repeat_penalty: parseFloat(e.target.value) })}
                      className="nf-input"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="nf-label flex justify-between">
                      <span>Keep Alive (mins)</span>
                      <InfoTooltip title="VRAM Cache" description="How long the model stays hot in VRAM after finishing. 0 = unload immediately." />
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="60"
                      placeholder="e.g. 5"
                      value={(nodeData.keep_alive as number) ?? 5}
                      onChange={e => updateNodeData(id, { keep_alive: parseInt(e.target.value) })}
                      className="nf-input"
                    />
                  </div>
                  <div>
                    <label className="nf-label">Quantization</label>
                    <select
                      value={((nodeData.quantization as string) ?? 'q4_K_M')}
                      onChange={e => updateNodeData(id, { quantization: e.target.value })}
                      className="nf-input"
                    >
                      <option value="q4_K_M">Q4_K_M (Default)</option>
                      <option value="q8_0">Q8_0 (High Quality)</option>
                      <option value="fp16">FP16 (Uncompressed)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="nf-label flex justify-between">
                    <span>Context Window Limits</span>
                    <span className="text-[9px] text-neutral-500">{(nodeData.num_ctx as number) ?? 4096} tokens</span>
                  </label>
                  <input
                    type="range"
                    min="2048"
                    max="32768"
                    step="1024"
                    value={(nodeData.num_ctx as number) ?? 4096}
                    onChange={e => updateNodeData(id, { num_ctx: parseInt(e.target.value) })}
                    className="w-full mt-2 accent-cyan-400"
                  />
                </div>
                
                <div>
                  <label className="nf-label flex justify-between">
                    <span>Stop Sequences</span>
                    <span className="text-[9px] text-neutral-500 normal-case">Comma-separated</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. User:, \n\n"
                    value={nodeData.stop_sequences ?? ''}
                    onChange={e => updateNodeData(id, { stop_sequences: e.target.value })}
                    className="nf-input"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </BaseNode>

      <Handle type="source" position={Position.Bottom}
        style={{ width: 14, height: 14, borderRadius: '50%', border: '2.5px solid #22d3ee', background: 'var(--nf-bg-primary)', boxShadow: '0 0 10px rgba(34,211,238,0.5)' }}
      />
    </div>
  );
}
