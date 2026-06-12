import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import type { FlowNode, DagNodeData } from '@/types/dag';

export default function MemoryQueryNode({ id, data, selected }: FlowNode) {
  const { updateNodeData } = useReactFlow();

  const updateField = (field: keyof DagNodeData, value: string | number | boolean) => {
    updateNodeData(id, { [field]: value });
  };

  return (
    <BaseNode
      selected={selected}
      nodeType="Memory Query"
      label={data.label || "Vector DB Search"}
      icon={<span>🔍</span>}
      accentColor="text-indigo-400"
      accentRaw="#818cf8"
      glowRaw="rgba(129,140,248,0.3)"
      gradientVar="--nf-gradient-node-memory_qy"
      badge="RAG"
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-indigo-400 border-2 border-[#040914]"
      />

      <div className="space-y-3">
        <div>
          <label className="nf-label">Collection Name</label>
          <input
            type="text"
            className="nf-input"
            value={data.memory_collection as string || 'default'}
            onChange={(e) => updateField('memory_collection', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="nf-label">Top K Results</label>
            <input
              type="number"
              min="1"
              max="20"
              className="nf-input"
              value={data.memory_top_k as number || 3}
              onChange={(e) => updateField('memory_top_k', parseInt(e.target.value))}
            />
          </div>
          <div>
            <label className="nf-label">Injection</label>
            <select
              className="nf-input bg-[#080e1c] text-white"
              value={data.memory_inject_mode as string || 'prepend'}
              onChange={(e) => updateField('memory_inject_mode', e.target.value)}
            >
              <option value="prepend">Prepend to Context</option>
              <option value="append">Append to Context</option>
            </select>
          </div>
        </div>

        <div className="text-[10px] text-gray-400 bg-white/5 p-2 rounded leading-relaxed">
          Uses upstream context as the search query, fetches similar memories, and injects them into the downstream context.
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-indigo-400 border-2 border-[#040914]"
      />
    </BaseNode>
  );
}
