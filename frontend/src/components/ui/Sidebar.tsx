'use client';

/**
 * Sidebar v2 — Node palette with status bar, RAM indicator, and clear explanations.
 * Wider (272px) with larger drag targets and proper category grouping.
 */

import React, { useEffect, useState } from 'react';
import useFlowStore from '@/store/flowStore';
import useThemeStore from '@/store/themeStore';
import { NodeType } from '@/types/dag';
import { BackendFailsafe } from '@/components/ui/BackendFailsafe';

interface NodePaletteItemProps {
  type: NodeType;
  label: string;
  icon: string;
  description: string;
  hint?: string;
  accentRaw: string;
  step?: string;
}

function NodePaletteItem({ type, label, icon, description, accentRaw, step }: NodePaletteItemProps) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/neuralflow-node', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group relative flex items-start gap-3 px-3 py-3 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: 'var(--nf-bg-surface)',
        border: '1px solid var(--nf-border)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = `${accentRaw}40`;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 16px -4px ${accentRaw}20`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--nf-border)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* Step number */}
      {step && (
        <div
          className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: `${accentRaw}12`, color: accentRaw }}
        >
          {step}
        </div>
      )}

      {/* Icon */}
      <span
        className="flex items-center justify-center w-9 h-9 rounded-xl text-base shrink-0"
        style={{ background: `${accentRaw}15`, boxShadow: `0 0 16px -4px ${accentRaw}30` }}
      >
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold mb-0.5" style={{ color: 'var(--nf-text-primary)' }}>{label}</div>
        <div className="text-[10px] leading-snug mb-1.5" style={{ color: 'var(--nf-text-muted)' }}>{description}</div>
        <div className="flex items-center gap-1 text-[9px]" style={{ color: 'var(--nf-text-dim)' }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 8l14 0M5 16l14 0" /></svg>
          Drag to canvas
        </div>
      </div>
    </div>
  );
}

function StatusDot({ connected, label, detail }: { connected: boolean; label: string; detail?: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg" style={{ background: connected ? 'rgba(52,211,153,0.05)' : 'rgba(248,113,113,0.05)' }}>
      <span
        className="relative flex w-2 h-2 shrink-0"
      >
        {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40" style={{ background: '#34d399' }} />}
        <span className="relative w-2 h-2 rounded-full" style={{ background: connected ? '#34d399' : '#f87171' }} />
      </span>
      <div>
        <span className="text-[10px] font-semibold" style={{ color: connected ? '#34d399' : '#f87171' }}>{label}</span>
        {detail && <span className="text-[9px] ml-1.5" style={{ color: 'var(--nf-text-dim)' }}>{detail}</span>}
      </div>
    </div>
  );
}

function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = mode === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl w-full transition-all duration-200 hover:opacity-80"
      style={{ background: 'var(--nf-bg-surface)', border: '1px solid var(--nf-border)', color: 'var(--nf-text-secondary)' }}
    >
      <span>{isDark ? '☀️' : '🌙'}</span>
      <span className="text-[11px] font-medium">{isDark ? 'Switch to Light' : 'Switch to Dark'}</span>
      <div className="ml-auto w-8 h-4 rounded-full relative" style={{ background: isDark ? 'rgba(34,211,238,0.25)' : 'rgba(217,119,6,0.25)' }}>
        <div
          className="absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300"
          style={{ left: isDark ? '2px' : '14px', background: isDark ? '#22d3ee' : '#f59e0b' }}
        />
      </div>
    </button>
  );
}

export default function Sidebar() {
  const backendConnected = useFlowStore((s) => s.backendConnected);
  const ollamaConnected  = useFlowStore((s) => s.ollamaConnected);
  const checkHealth      = useFlowStore((s) => s.checkHealth);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);

  const [ram, setRam] = useState<{ total: number; free: number } | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    triggers: true,
    aimemory: true,
    actions: true,
  });

  const toggleSection = (sec: string) => setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));

  useEffect(() => {
    checkHealth();
    const iv = setInterval(checkHealth, 10000);
    return () => clearInterval(iv);
  }, [checkHealth]);

  useEffect(() => {
    fetch('http://localhost:8000/api/system/ram')
      .then(r => r.json())
      .then(d => setRam(d))
      .catch(() => {});
    const iv = setInterval(() => {
      fetch('http://localhost:8000/api/system/ram')
        .then(r => r.json())
        .then(d => setRam(d))
        .catch(() => {});
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  const ramPct = ram ? ((ram.total - ram.free) / ram.total) * 100 : null;
  const ramFreeGb = ram ? (ram.free / (1024 ** 3)).toFixed(1) : null;
  const ramColor = ramPct == null ? '#475569' : ramPct > 85 ? '#f87171' : ramPct > 65 ? '#fbbf24' : '#34d399';

  return (
    <div
      className="w-[320px] h-full flex flex-col shrink-0 transition-all duration-300"
      style={{ background: 'var(--nf-bg-sidebar)', borderRight: '1px solid var(--nf-border)' }}
    >
      {/* ── Logo ── */}
      <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid var(--nf-border)' }}>
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--nf-gradient-logo)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 animate-pulse" style={{ background: '#34d399', borderColor: 'var(--nf-bg-sidebar)' }} />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--nf-text-primary)' }}>NeuralFlow</h1>
            <p className="text-[10px]" style={{ color: 'var(--nf-text-dim)' }}>
              Local AI <span className="mx-1">·</span> 
              <span style={{ color: '#c084fc', fontWeight: 'bold' }}>Builder Mode</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {/* How it works */}
        <div className="px-2 py-2 rounded-xl" style={{ background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.08)' }}>
          <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#22d3ee' }}>How it works</p>
          <p className="text-[10px] leading-relaxed" style={{ color: 'var(--nf-text-dim)' }}>
            Drag blocks onto the canvas → connect them → press Deploy. Your files never leave your Mac.
          </p>
        </div>

        {/* Node Palette Accordions */}
        <div className="space-y-3">
          
          {/* Triggers Section */}
          <div>
            <button 
              onClick={() => toggleSection('triggers')}
              className="flex items-center justify-between w-full px-1 mb-2 group"
            >
              <span className="text-[12px] font-bold uppercase tracking-[0.1em] font-heading" style={{ color: 'var(--nf-text-dim)' }}>
                1. Triggers
              </span>
              <span className="text-[9px] transition-transform duration-200" style={{ transform: openSections.triggers ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--nf-text-ghost)' }}>▼</span>
            </button>
            {openSections.triggers && (
              <div className="space-y-2 animate-fade-in">
                <NodePaletteItem type="trigger" label="Source Data" icon="📂" description="Read local files/folders" hint="Drag to canvas" accentRaw="#f59e0b" />
                <NodePaletteItem type="email_trigger" label="IMAP Inbox" icon="📧" description="Listen to email inbox" hint="Drag to canvas" accentRaw="#ea580c" />
                <NodePaletteItem type="webhook_trigger" label="Webhook POST" icon="🌐" description="Receive HTTP payloads" hint="Drag to canvas" accentRaw="#16a34a" />
                <NodePaletteItem type="cron_trigger" label="Cron Schedule" icon="⏰" description="Timer-based intervals" hint="Drag to canvas" accentRaw="#9333ea" />
                <NodePaletteItem type="clipboard_trigger" label="Clipboard" icon="📋" description="Monitor copied text" hint="Drag to canvas" accentRaw="#db2777" />
              </div>
            )}
          </div>

          {/* AI & Memory Section */}
          <div>
            <button 
              onClick={() => toggleSection('aimemory')}
              className="flex items-center justify-between w-full px-1 mb-2 group"
            >
              <span className="text-[12px] font-bold uppercase tracking-[0.1em] font-heading" style={{ color: 'var(--nf-text-dim)' }}>
                2. AI & Memory
              </span>
              <span className="text-[9px] transition-transform duration-200" style={{ transform: openSections.aimemory ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--nf-text-ghost)' }}>▼</span>
            </button>
            {openSections.aimemory && (
              <div className="space-y-2 animate-fade-in">
                <NodePaletteItem type="agent" label="AI Brain" icon="🧠" description="LLM execution node" hint="Drag to canvas" accentRaw="#0891b2" />
                <NodePaletteItem type="memory_store" label="Memory Store" icon="💾" description="Ingest to ChromaDB" hint="Drag to canvas" accentRaw="#0d9488" />
                <NodePaletteItem type="memory_query" label="Memory Query" icon="🔍" description="RAG search & inject" hint="Drag to canvas" accentRaw="#4f46e5" />
              </div>
            )}
          </div>

          {/* Actions Section */}
          <div>
            <button 
              onClick={() => toggleSection('actions')}
              className="flex items-center justify-between w-full px-1 mb-2 group"
            >
              <span className="text-[12px] font-bold uppercase tracking-[0.1em] font-heading" style={{ color: 'var(--nf-text-dim)' }}>
                3. Actions
              </span>
              <span className="text-[9px] transition-transform duration-200" style={{ transform: openSections.actions ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--nf-text-ghost)' }}>▼</span>
            </button>
            {openSections.actions && (
              <div className="space-y-2 animate-fade-in">
                <NodePaletteItem type="action" label="Save Results" icon="📄" description="Write local files" hint="Drag to canvas" accentRaw="#2563eb" />
                <NodePaletteItem type="browser_action" label="Web Scraper" icon="🌍" description="Playwright automation" hint="Drag to canvas" accentRaw="#0284c7" />
                <NodePaletteItem type="subprocess_action" label="Code Runner" icon="⚙️" description="Execute scripts" hint="Drag to canvas" accentRaw="#dc2626" />
              </div>
            )}
          </div>

        </div>

        {/* Workflow stats */}
        <div>
          <div className="mb-2 px-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--nf-text-dim)' }}>Workflow</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Blocks', value: nodes.length, color: '#22d3ee' },
              { label: 'Connections', value: edges.length, color: '#c084fc' },
            ].map(stat => (
              <div key={stat.label} className="p-2.5 rounded-xl text-center" style={{ background: 'var(--nf-bg-surface)', border: '1px solid var(--nf-border)' }}>
                <div className="text-xl font-extrabold font-mono" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-[9px] mt-0.5" style={{ color: 'var(--nf-text-dim)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RAM indicator */}
        {ramPct !== null && (
          <div>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--nf-text-dim)' }}>Device Memory</span>
              <span className="text-[10px] font-mono font-semibold" style={{ color: ramColor }}>{ramFreeGb} GB free</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--nf-bg-input)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${ramPct}%`, background: ramColor, boxShadow: `0 0 8px ${ramColor}60` }}
              />
            </div>
            {ramPct > 80 && (
              <p className="text-[9px] mt-1 px-1" style={{ color: '#fbbf24' }}>
                ⚠ Low memory — consider a lighter model
              </p>
            )}
          </div>
        )}

        {/* Theme toggle */}
        <ThemeToggle />
        
        {/* Failsafe button */}
        <div className="pt-2 border-t border-[var(--nf-border)]">
          <BackendFailsafe />
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className="px-3 py-3 space-y-1 shrink-0" style={{ borderTop: '1px solid var(--nf-border)' }}>
        <StatusDot connected={backendConnected} label="NeuralFlow Backend" detail={backendConnected ? 'Running on :8000' : 'Offline'} />
        <StatusDot connected={ollamaConnected}  label="Ollama AI Engine"  detail={ollamaConnected  ? 'Ready to use' : 'Not running'} />
        {!ollamaConnected && (
          <p className="text-[9px] px-2 pt-0.5" style={{ color: '#475569' }}>
            Start Ollama: open Terminal → <code style={{ color: '#22d3ee' }}>ollama serve</code>
          </p>
        )}
      </div>
    </div>
  );
}
