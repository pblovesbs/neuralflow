'use client';

/**
 * ActionNode v2 — Save To node.
 * Permission-gated file write. Shows output path with directory badge.
 */

import React, { useCallback, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import BaseNode from './BaseNode';
import PermissionModal from '@/components/ui/PermissionModal';
import useFlowStore from '@/store/flowStore';
import type { DagNodeData } from '@/types/dag';

const FORMAT_OPTIONS = [
  { ext: '.txt',  label: 'Plain Text (.txt)',  icon: '📄' },
  { ext: '.md',   label: 'Markdown (.md)',     icon: '📝' },
  { ext: '.json', label: 'JSON (.json)',        icon: '🔧' },
];

function inferFormat(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'md')   return '.md';
  if (ext === 'json') return '.json';
  return '.txt';
}

export default function ActionNode({ id, data, selected }: NodeProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const nodeData = data as DagNodeData;

  const [showPermission, setShowPermission] = useState(false);
  const [pendingPath, setPendingPath] = useState('');
  const [typedPath, setTypedPath] = useState(nodeData.target_path || '');

  const handlePathChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTypedPath(e.target.value);
  }, []);

  const handlePathBlur = useCallback(() => {
    if (typedPath && typedPath !== nodeData.target_path) {
      setPendingPath(typedPath);
      setShowPermission(true);
    }
  }, [typedPath, nodeData.target_path]);

  const handleBrowse = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/system/save-file-picker');
      const data = await res.json();
      if (data.path) {
        setPendingPath(data.path);
        setTypedPath(data.path);
        setShowPermission(true);
      }
    } catch { /* manual input fallback */ }
  }, []);

  const handleAllow = useCallback(() => {
    updateNodeData(id, { target_path: pendingPath });
    setShowPermission(false);
  }, [id, pendingPath, updateNodeData]);

  const handleDeny = useCallback(() => {
    setTypedPath(nodeData.target_path || '');
    setPendingPath('');
    setShowPermission(false);
  }, [nodeData.target_path]);

  const hasPath = !!nodeData.target_path;
  const currentFormat = hasPath ? inferFormat(nodeData.target_path || '') : '.txt';
  const directory = hasPath ? (nodeData.target_path || '').split('/').slice(0, -1).join('/') : null;
  const filename = hasPath ? (nodeData.target_path || '').split('/').pop() : null;

  const handleFormatChange = useCallback((ext: string) => {
    if (!nodeData.target_path) return;
    const base = nodeData.target_path.replace(/\.[^.]+$/, '');
    const newPath = base + ext;
    updateNodeData(id, { target_path: newPath });
    setTypedPath(newPath);
  }, [id, nodeData.target_path, updateNodeData]);

  return (
    <div style={{ '--accent-text': '#c084fc', '--accent-bg': 'rgba(192,132,252,0.12)', '--accent-glow': 'rgba(192,132,252,0.25)' } as React.CSSProperties}>
      {showPermission && (
        <PermissionModal
          type="file_write"
          detail={pendingPath}
          extraInfo="Only the AI-generated output will be written here. No other files are affected."
          onAllow={handleAllow}
          onDeny={handleDeny}
        />
      )}

      <Handle
        type="target"
        position={Position.Top}
        style={{ width: 14, height: 14, borderRadius: '50%', border: '2.5px solid #c084fc', background: 'var(--nf-bg-primary)', boxShadow: '0 0 10px rgba(192,132,252,0.5)' }}
      />

      <BaseNode
        selected={selected}
        accentColor="purple-400"
        accentRaw="#c084fc"
        glowRaw="rgba(192,132,252,0.3)"
        gradientVar="--nf-gradient-node-action"
        icon={<span>💾</span>}
        label="Save Results"
        nodeType="Step 3"
        badge={hasPath ? "Output Set" : undefined}
      >
        <div className="space-y-3">
          <div>
            <label className="nf-label">Where to Save</label>
            <p className="text-[10px] mb-2" style={{ color: 'var(--nf-text-dim)' }}>
              The AI&apos;s finished output will be written to this file on your Mac.
            </p>

            {/* Saved path chip */}
            {hasPath && filename && directory && (
              <div className="rounded-lg px-3 py-2 mb-2" style={{ background: 'rgba(192,132,252,0.08)', border: '1px solid rgba(192,132,252,0.2)' }}>
                <p className="text-[9px] font-medium mb-0.5" style={{ color: 'var(--nf-text-dim)' }}>📁 {directory}/</p>
                <p className="text-[11px] font-semibold" style={{ color: '#c084fc' }}>{filename}</p>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={typedPath}
                onChange={handlePathChange}
                onBlur={handlePathBlur}
                placeholder="e.g. /Users/you/Desktop/summary.txt"
                className="nf-input"
              />
              <button
                onClick={handleBrowse}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold shrink-0 transition-all"
                style={{ background: 'rgba(192,132,252,0.15)', border: '1px solid rgba(192,132,252,0.25)', color: '#c084fc' }}
              >
                Browse
              </button>
            </div>
          </div>

          {/* Format selector */}
          {hasPath && (
            <div>
              <label className="nf-label">Output Format</label>
              <div className="flex gap-2">
                {FORMAT_OPTIONS.map(fmt => (
                  <button
                    key={fmt.ext}
                    onClick={() => handleFormatChange(fmt.ext)}
                    className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                    style={{
                      background: currentFormat === fmt.ext ? 'rgba(192,132,252,0.2)' : 'var(--nf-bg-input)',
                      border: `1px solid ${currentFormat === fmt.ext ? 'rgba(192,132,252,0.4)' : 'var(--nf-border)'}`,
                      color: currentFormat === fmt.ext ? '#c084fc' : 'var(--nf-text-muted)',
                    }}
                  >
                    {fmt.icon} {fmt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </BaseNode>
    </div>
  );
}
