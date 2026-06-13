import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import type { FlowNode, DagNodeData } from '@/types/dag';

export default function ClipboardTriggerNode({ id, data, selected }: FlowNode) {
  const { updateNodeData } = useReactFlow();

  const updateField = (field: keyof DagNodeData, value: string | number | boolean) => {
    updateNodeData(id, { [field]: value });
  };

  return (
    <BaseNode
      selected={selected}
      nodeType="Clipboard Trigger"
      label={data.label || "System Clipboard"}
      icon={<span>📋</span>}
      accentColor="text-pink-400"
      accentRaw="#f472b6"
      glowRaw="rgba(244,114,182,0.3)"
      gradientVar="--nf-gradient-node-clipboard"
      badge={data.clipboard_enabled ? "Active" : "Inactive"}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <span className="nf-label mb-0 text-pink-400">Passive Listening</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={data.clipboard_enabled === true}
              onChange={(e) => updateField('clipboard_enabled', e.target.checked)}
            />
            <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500"></div>
          </label>
        </div>

        <div>
          <label className="nf-label">Filter Keyword / Regex (Optional)</label>
          <input
            type="text"
            className="nf-input"
            value={data.clipboard_filter as string || ''}
            onChange={(e) => updateField('clipboard_filter', e.target.value)}
            placeholder="e.g. ^http or 'summary'"
          />
        </div>

        <div className="text-[10px] text-gray-400 bg-white/5 p-2 rounded leading-relaxed">
          When active, the backend polls your system clipboard every 1.5s. If new text is copied and matches the filter, the workflow triggers.
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-pink-400 border-2 border-[#040914]"
      />
    </BaseNode>
  );
}
