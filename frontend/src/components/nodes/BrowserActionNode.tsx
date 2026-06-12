import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import type { FlowNode, DagNodeData } from '@/types/dag';

export default function BrowserActionNode({ id, data, selected }: FlowNode) {
  const { updateNodeData } = useReactFlow();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateField = (field: keyof DagNodeData, value: string | number | boolean) => {
    updateNodeData(id, { [field]: value });
  };

  return (
    <BaseNode
      selected={selected}
      nodeType="Browser Action"
      label={data.label || "Web Scraper (RPA)"}
      icon={<span>🌍</span>}
      accentColor="text-sky-400"
      accentRaw="#38bdf8"
      glowRaw="rgba(56,189,248,0.3)"
      gradientVar="--nf-gradient-node-browser"
      badge="Playwright"
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-sky-400 border-2 border-[#040914]"
      />

      <div className="space-y-3">
        <div>
          <label className="nf-label">Target URL</label>
          <input
            type="text"
            className="nf-input"
            value={data.browser_url as string || ''}
            onChange={(e) => updateField('browser_url', e.target.value)}
            placeholder="https://news.ycombinator.com"
          />
        </div>

        <div>
          <label className="nf-label">Extraction Instruction (Optional)</label>
          <input
            type="text"
            className="nf-input"
            value={data.browser_instruction as string || ''}
            onChange={(e) => updateField('browser_instruction', e.target.value)}
            placeholder="Find the top 5 articles..."
          />
        </div>

        <button 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-[10px] text-gray-400 hover:text-white uppercase tracking-wider font-bold w-full text-left mt-2"
        >
          {showAdvanced ? "▼ Hide Advanced" : "▶ Show Advanced"}
        </button>

        {showAdvanced && (
          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <span className="nf-label mb-0">Headless Mode</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={data.browser_headless !== false}
                onChange={(e) => updateField('browser_headless', e.target.checked)}
              />
              <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-sky-400 border-2 border-[#040914]"
      />
    </BaseNode>
  );
}
