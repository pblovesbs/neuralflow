import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import type { FlowNode, DagNodeData } from '@/types/dag';

export default function MemoryStoreNode({ id, data, selected }: FlowNode) {
  const { updateNodeData } = useReactFlow();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateField = (field: keyof DagNodeData, value: string | number | boolean) => {
    updateNodeData(id, { [field]: value });
  };

  return (
    <BaseNode
      selected={selected}
      nodeType="Memory Store"
      label={data.label || "Vector DB Ingest"}
      icon={<span>🧠</span>}
      accentColor="text-teal-400"
      accentRaw="#2dd4bf"
      glowRaw="rgba(45,212,191,0.3)"
      gradientVar="--nf-gradient-node-memory_st"
      badge="ChromaDB"
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-teal-400 border-2 border-[#040914]"
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

        <div className="text-[10px] text-gray-400 bg-white/5 p-2 rounded leading-relaxed">
          Embeds upstream context using <span className="text-teal-400">nomic-embed-text</span> and saves to local ChromaDB.
        </div>

        <button 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-[10px] text-gray-400 hover:text-white uppercase tracking-wider font-bold w-full text-left mt-2"
        >
          {showAdvanced ? "▼ Hide Advanced" : "▶ Show Advanced"}
        </button>

        {showAdvanced && (
          <div className="pt-2 border-t border-white/5">
            <label className="nf-label flex justify-between">
              <span>Chunk Size (chars)</span>
              <span className="text-teal-400">{data.memory_chunk_size as number || 512}</span>
            </label>
            <input
              type="range"
              min="128"
              max="2048"
              step="128"
              value={data.memory_chunk_size as number || 512}
              onChange={(e) => updateField('memory_chunk_size', parseInt(e.target.value))}
              className="w-full accent-teal-400"
            />
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-teal-400 border-2 border-[#040914]"
      />
    </BaseNode>
  );
}
