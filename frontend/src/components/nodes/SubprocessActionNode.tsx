import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import type { FlowNode, DagNodeData } from '@/types/dag';

export default function SubprocessActionNode({ id, data, selected }: FlowNode) {
  const { updateNodeData } = useReactFlow();

  const updateField = (field: keyof DagNodeData, value: string | number | boolean) => {
    updateNodeData(id, { [field]: value });
  };

  return (
    <BaseNode
      selected={selected}
      nodeType="Subprocess Action"
      label={data.label || "Code Execution"}
      icon={<span>⚙️</span>}
      accentColor="text-red-400"
      accentRaw="#f87171"
      glowRaw="rgba(248,113,113,0.3)"
      gradientVar="--nf-gradient-node-subprocess"
      badge={data.subprocess_runtime as string || 'bash'}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-red-400 border-2 border-[#040914]"
      />

      <div className="space-y-3">
        <div>
          <label className="nf-label">Runtime</label>
          <select
            className="nf-input bg-[#080e1c] text-white"
            value={data.subprocess_runtime as string || 'bash'}
            onChange={(e) => updateField('subprocess_runtime', e.target.value)}
          >
            <option value="bash">Bash / Shell</option>
            <option value="python3">Python 3</option>
            <option value="node">Node.js</option>
          </select>
        </div>

        <div>
          <label className="nf-label flex justify-between">
            <span>Script Code</span>
            <span className="text-[9px] text-gray-500 normal-case">Context in $NEURALFLOW_INPUT</span>
          </label>
          <textarea
            className="nf-input min-h-[120px] resize-y text-xs leading-relaxed"
            value={data.subprocess_code as string || ''}
            onChange={(e) => updateField('subprocess_code', e.target.value)}
            placeholder={
              data.subprocess_runtime === 'python3' 
                ? "import os\nprint(f'Received: {os.environ.get(\"NEURALFLOW_INPUT\")}')" 
                : "echo \"Processing $NEURALFLOW_INPUT\""
            }
            spellCheck={false}
          />
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-red-400 border-2 border-[#040914]"
      />
    </BaseNode>
  );
}
