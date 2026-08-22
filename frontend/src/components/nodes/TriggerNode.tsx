'use client';

/**
 * TriggerNode v2 — Source Data node.
 * Permission-gated file access. Shows selected filename chip with inferred type badge.
 */

import React, { useCallback, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import BaseNode from './BaseNode';
import PermissionModal from '@/components/ui/PermissionModal';
import useFlowStore from '@/store/flowStore';
import type { DagNodeData } from '@/types/dag';

const FILE_TYPE_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  txt:  { color: '#34d399', bg: 'rgba(52,211,153,0.15)',  label: 'TXT'  },
  md:   { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  label: 'MD'   },
  pdf:  { color: '#f87171', bg: 'rgba(248,113,113,0.15)', label: 'PDF'  },
  docx: { color: '#c084fc', bg: 'rgba(192,132,252,0.15)', label: 'DOCX' },
  csv:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  label: 'CSV'  },
};

function getFileType(path: string) {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return FILE_TYPE_COLORS[ext] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', label: ext.toUpperCase() || 'FILE' };
}

export default function TriggerNode({ id, data, selected }: NodeProps) {
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
      const res = await fetch('http://localhost:8000/api/system/file-picker');
      const data = await res.json();
      if (data.path) {
        setPendingPath(data.path);
        setTypedPath(data.path);
        setShowPermission(true);
      } else {
        alert("Failed to open native file picker. Ensure the backend is running in your local terminal and not a restricted background process.");
      }
    } catch (error) {
      // File picker not available — user types manually
    }
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
  const fileType = hasPath ? getFileType(nodeData.target_path || '') : null;
  const filename = hasPath ? (nodeData.target_path || '').split('/').pop() : null;

  return (
    <div style={{ '--accent-text': '#fbbf24', '--accent-bg': 'rgba(251,191,36,0.12)', '--accent-glow': 'rgba(251,191,36,0.25)' } as React.CSSProperties}>
      {showPermission && (
        <PermissionModal
          type="file_read"
          detail={pendingPath}
          extraInfo="Only the text content will be read and passed to the AI. The original file is never modified."
          onAllow={handleAllow}
          onDeny={handleDeny}
        />
      )}

      <BaseNode
        selected={selected}
        accentColor="yellow-400"
        accentRaw="#fbbf24"
        glowRaw="rgba(251,191,36,0.3)"
        gradientVar="--nf-gradient-node-trigger"
        icon={<span>📂</span>}
        label="Source Data"
        nodeType="Step 1"
        badge={hasPath ? "Ready" : undefined}
      >
        <div className="space-y-3">
          <div>
            <label className="nf-label">Choose a File or Folder</label>
            <p className="text-[10px] mb-2" style={{ color: 'var(--nf-text-dim)' }}>
              This is the document or folder the AI will read and process.
            </p>

            {/* Selected file chip */}
            {hasPath && fileType && filename && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2"
                style={{ background: fileType.bg, border: `1px solid ${fileType.color}30` }}
              >
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: fileType.color, color: '#000' }}>
                  {fileType.label}
                </span>
                <span className="text-[11px] font-medium truncate" style={{ color: 'var(--nf-text-primary)' }}>{filename}</span>
                <button
                  onClick={() => { updateNodeData(id, { target_path: '' }); setTypedPath(''); }}
                  className="ml-auto text-xs opacity-50 hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--nf-text-muted)' }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Path input + browse */}
            <div className="flex gap-2">
              <input
                type="text"
                value={typedPath}
                onChange={handlePathChange}
                onBlur={handlePathBlur}
                placeholder="Paste a file path, or click Browse →"
                className="nf-input"
              />
              <button
                onClick={handleBrowse}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold shrink-0 transition-all duration-200 hover:opacity-90"
                style={{
                  background: 'rgba(251,191,36,0.15)',
                  border: '1px solid rgba(251,191,36,0.25)',
                  color: '#fbbf24',
                }}
              >
                Browse
              </button>
            </div>
          </div>

          {/* Supported formats */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px]" style={{ color: 'var(--nf-text-dim)' }}>Supports:</span>
            {['TXT', 'MD', 'PDF', 'DOCX', 'CSV'].map(fmt => (
              <span key={fmt} className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--nf-bg-input)', color: 'var(--nf-text-dim)', border: '1px solid var(--nf-border)' }}>
                {fmt}
              </span>
            ))}
          </div>
        </div>
      </BaseNode>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ width: 14, height: 14, borderRadius: '50%', border: '2.5px solid #fbbf24', background: 'var(--nf-bg-primary)', boxShadow: '0 0 10px rgba(251,191,36,0.5)' }}
      />
    </div>
  );
}
