import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import type { FlowNode, DagNodeData } from '@/types/dag';

export default function CronTriggerNode({ id, data, selected }: FlowNode) {
  const { updateNodeData } = useReactFlow();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateField = (field: keyof DagNodeData, value: string | number | boolean | null) => {
    updateNodeData(id, { [field]: value });
  };

  const handleModeToggle = () => {
    const isCron = !!data.cron_expression;
    if (isCron) {
      updateField('cron_expression', null);
      updateField('cron_interval_seconds', 3600); // Default 1 hour
    } else {
      updateField('cron_interval_seconds', null);
      updateField('cron_expression', '0 * * * *'); // Default 1 hour
    }
  };

  const isCron = !!data.cron_expression;

  return (
    <BaseNode
      selected={selected}
      nodeType="Cron Trigger"
      label={data.label || "Schedule Timer"}
      icon={<span>⏰</span>}
      accentColor="text-purple-400"
      accentRaw="#a78bfa"
      glowRaw="rgba(167,139,250,0.3)"
      gradientVar="--nf-gradient-node-cron"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <label className="nf-label mb-0">Mode</label>
          <button 
            onClick={handleModeToggle}
            className="text-[10px] bg-white/10 px-2 py-1 rounded hover:bg-white/20 transition-colors"
          >
            {isCron ? 'Cron Expression' : 'Simple Interval'}
          </button>
        </div>

        {isCron ? (
          <div>
            <label className="nf-label flex justify-between">
              <span>Cron Expression</span>
              <a href="https://crontab.guru" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">Help</a>
            </label>
            <input
              type="text"
              className="nf-input text-center text-sm font-mono tracking-widest"
              value={data.cron_expression as string || ''}
              onChange={(e) => updateField('cron_expression', e.target.value)}
              placeholder="* * * * *"
            />
          </div>
        ) : (
          <div>
            <label className="nf-label">Interval (Seconds)</label>
            <input
              type="number"
              min="10"
              className="nf-input"
              value={data.cron_interval_seconds as number || 3600}
              onChange={(e) => updateField('cron_interval_seconds', parseInt(e.target.value))}
            />
            <div className="text-[10px] text-gray-500 mt-1">
              e.g. 60 = 1 min, 3600 = 1 hour, 86400 = 1 day
            </div>
          </div>
        )}

        <div className="text-[10px] text-gray-400 bg-white/5 p-2 rounded leading-relaxed mt-2">
          This workflow will automatically execute based on the defined schedule once deployed.
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-400 border-2 border-[#040914]"
      />
    </BaseNode>
  );
}
