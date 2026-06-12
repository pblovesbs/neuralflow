'use client';

/**
 * Terminal v2 — Precision console with icon-coded log levels, progress tracking,
 * human-readable node labels, and a taller default height (h-72).
 */

import React, { useEffect, useRef, useState } from 'react';
import useFlowStore from '@/store/flowStore';
import type { LogEntry } from '@/types/dag';

// ─── Map raw node IDs to human labels ─────────────────────────────────────────
function humanizeNodeId(nodeId: string): string {
  if (nodeId === 'system') return '⚙ System';
  if (nodeId.startsWith('trigger')) return '📂 Source';
  if (nodeId.startsWith('agent'))   return '🧠 AI Brain';
  if (nodeId.startsWith('action'))  return '💾 Save To';
  return nodeId;
}

// ─── Log level config ─────────────────────────────────────────────────────────
const LEVEL_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  INFO:    { icon: '✦', color: '#60a5fa', bg: 'rgba(96,165,250,0.06)' },
  WARN:    { icon: '⚠', color: '#fbbf24', bg: 'rgba(251,191,36,0.06)' },
  ERROR:   { icon: '✗', color: '#f87171', bg: 'rgba(248,113,113,0.06)' },
  SUCCESS: { icon: '✓', color: '#34d399', bg: 'rgba(52,211,153,0.06)' },
};

function LogLine({ log }: { log: LogEntry }) {
  const level = log.level || 'INFO';
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.INFO;

  const time = log.timestamp
    ? new Date(log.timestamp).toLocaleTimeString('en-US', {
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    : '--:--:--';

  const label = humanizeNodeId(log.node_id || 'system');

  // Detect progress lines (streaming chunks)
  const isProgress = log.message?.includes('Streaming...');
  const isMajor = log.level === 'SUCCESS' || log.level === 'ERROR';

  return (
    <div
      className="flex items-start gap-2.5 py-1 px-2 rounded-lg transition-colors"
      style={{
        background: isProgress ? 'transparent' : (isMajor ? cfg.bg : 'transparent'),
        opacity: isProgress ? 0.65 : 1,
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        lineHeight: '1.5',
        borderLeft: isMajor ? `2px solid ${cfg.color}` : '2px solid transparent',
        marginBottom: '1px',
      }}
    >
      {/* Timestamp */}
      <span className="shrink-0 tabular-nums" style={{ color: '#334155', fontSize: '10px', marginTop: '1px' }}>
        {time}
      </span>

      {/* Level icon */}
      <span className="shrink-0 font-bold w-3 text-center" style={{ color: cfg.color, fontSize: '10px', marginTop: '1px' }}>
        {cfg.icon}
      </span>

      {/* Node label */}
      <span
        className="shrink-0 font-semibold rounded px-1"
        style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', fontSize: '10px' }}
      >
        {label}
      </span>

      {/* Message */}
      <span className="break-all" style={{ color: isMajor ? '#e2e8f0' : '#94a3b8' }}>
        {log.message}
      </span>
    </div>
  );
}

export default function Terminal() {
  const logs = useFlowStore((s) => s.logs);
  const isExecuting = useFlowStore((s) => s.isExecuting);
  const statusMessage = useFlowStore((s) => s.statusMessage);
  const clearLogs = useFlowStore((s) => s.clearLogs);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const totalChars = logs
    .filter(l => l.message?.includes('chars received'))
    .reduce((acc, l) => {
      const match = l.message?.match(/(\d+) chars received/);
      return match ? Math.max(acc, parseInt(match[1])) : acc;
    }, 0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      className={`flex flex-col shrink-0 transition-all duration-300 ease-out ${isCollapsed ? 'h-9' : 'h-72'}`}
      style={{ background: 'var(--nf-bg-terminal)', borderTop: '1px solid var(--nf-border)' }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 h-9 cursor-pointer shrink-0 select-none"
        style={{ borderBottom: '1px solid var(--nf-border-subtle)' }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          {/* macOS traffic lights */}
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f56' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ffbd2e' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#27c93f' }} />
          </div>

          <span className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: '#334155', fontFamily: 'var(--font-mono)' }}>
            Console
          </span>

          {isExecuting && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)' }}>
              <span className="animate-pulse w-1.5 h-1.5 rounded-full" style={{ background: '#22d3ee' }} />
              <span className="text-[9px] font-semibold" style={{ color: '#22d3ee' }}>LIVE</span>
            </div>
          )}

          {logs.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', color: '#475569' }}>
              {logs.length} entries
            </span>
          )}
        </div>

        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
          {logs.length > 0 && (
            <button
              onClick={clearLogs}
              className="text-[10px] transition-colors hover:opacity-80"
              style={{ color: '#475569' }}
            >
              Clear
            </button>
          )}
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className={`transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
            style={{ color: '#334155' }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* ── Status Ticker ── */}
          {statusMessage && (
            <div
              className="flex items-center gap-2.5 px-4 py-2 shrink-0"
              style={{ background: 'rgba(34,211,238,0.04)', borderBottom: '1px solid rgba(34,211,238,0.08)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: '#22d3ee' }} />
              <span className="text-[11px] font-medium" style={{ color: '#94a3b8', fontFamily: 'var(--font-sans)' }}>
                {statusMessage}
              </span>

              {/* Generation progress bar */}
              {isExecuting && totalChars > 0 && (
                <div className="ml-auto flex items-center gap-2">
                  <div className="h-1 w-24 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (totalChars / 3000) * 100)}%`, background: 'linear-gradient(90deg, #22d3ee, #c084fc)' }}
                    />
                  </div>
                  <span className="text-[9px] font-mono" style={{ color: '#475569' }}>{totalChars} chars</span>
                </div>
              )}
            </div>
          )}

          {/* ── Log content ── */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2.5">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#1e293b' }}>
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-medium" style={{ color: '#1e293b' }}>Console is empty</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#0f172a' }}>Run a workflow to see live logs here</p>
                </div>
              </div>
            ) : (
              <div>
                {logs.map((log, i) => <LogLine key={i} log={log} />)}
                {/* Blinking cursor */}
                {!isExecuting && (
                  <div className="flex items-center gap-1.5 mt-1 pl-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                    <span style={{ color: '#22d3ee' }}>$</span>
                    <span className="animate-blink inline-block w-1.5 h-3" style={{ background: '#22d3ee', borderRadius: 1 }} />
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
