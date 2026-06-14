import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import InfoTooltip from '../ui/InfoTooltip';
import type { FlowNode, DagNodeData } from '@/types/dag';

export default function EmailTriggerNode({ id, data, selected }: FlowNode) {
  const { updateNodeData } = useReactFlow();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const updateField = (field: keyof DagNodeData, value: string | number | boolean) => {
    updateNodeData(id, { [field]: value });
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('http://localhost:8000/api/email/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imap_server: data.imap_server,
          imap_port: data.imap_port,
          email_address: data.email_address,
          app_password: data.app_password
        })
      });
      const result = await res.json();
      setTestResult(result.message);
    } catch {
      setTestResult("Failed to connect to backend");
    }
    setTesting(false);
  };

  return (
    <BaseNode
      selected={selected}
      nodeType="Email Trigger"
      label={
        <div className="flex justify-between items-center w-full">
          <span>{data.label || "IMAP Inbox Monitor"}</span>
          <InfoTooltip 
            title="How Email Triggers Work" 
            description={
              <>
                <p>This node acts as a secure listener for your email inbox.</p>
                <p className="mt-1">1. It connects directly to your email provider (like Gmail or Outlook) via <b>IMAP</b>.</p>
                <p className="mt-1">2. When a new email arrives, it automatically downloads it and passes the text to the next node in the graph (usually an AI node).</p>
                <p className="mt-1 border-t border-white/10 pt-1 text-orange-400">Security Note: Your App Password is only stored in memory while NeuralFlow runs. It is never saved to the database.</p>
              </>
            } 
          />
        </div>
      }
      icon={<span>📧</span>}
      accentColor="text-orange-500"
      accentRaw="#f97316"
      glowRaw="rgba(249,115,22,0.3)"
      gradientVar="--nf-gradient-node-email"
      badge={data.app_password ? "Configured" : "Setup Required"}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="nf-label">IMAP Server</label>
            <input
              type="text"
              className="nf-input"
              value={data.imap_server as string || ''}
              onChange={(e) => updateField('imap_server', e.target.value)}
              placeholder="imap.gmail.com"
            />
          </div>
          <div>
            <label className="nf-label">Port</label>
            <input
              type="number"
              className="nf-input"
              value={data.imap_port as number || 993}
              onChange={(e) => updateField('imap_port', parseInt(e.target.value))}
            />
          </div>
        </div>

        <div>
          <label className="nf-label">Email Address</label>
          <input
            type="email"
            className="nf-input"
            value={data.email_address as string || ''}
            onChange={(e) => updateField('email_address', e.target.value)}
            placeholder="agent@example.com"
          />
        </div>

        <div>
          <label className="nf-label">App Password</label>
          <input
            type="password"
            className="nf-input"
            value={data.app_password as string || ''}
            onChange={(e) => updateField('app_password', e.target.value)}
            placeholder="••••••••••••"
          />
        </div>

        <div>
          <label className="nf-label">Number of Emails to Read</label>
          <div className="flex gap-2">
            <select
              value={['1', '3', '5', '10', 'all'].includes((data.email_count as string || '1').toLowerCase()) ? (data.email_count as string || '1').toLowerCase() : 'custom'}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  updateField('email_count', '15');
                } else {
                  updateField('email_count', e.target.value);
                }
              }}
              className="nf-input"
            >
              <option value="1">1 (Newest)</option>
              <option value="3">3</option>
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="all">All (up to 50)</option>
              <option value="custom">Custom...</option>
            </select>
            
            {!['1', '3', '5', '10', 'all'].includes((data.email_count as string || '1').toLowerCase()) && (
              <input 
                type="number" 
                min="1"
                max="50"
                value={data.email_count as string || '1'}
                onChange={(e) => updateField('email_count', e.target.value)}
                className="nf-input w-20"
                placeholder="Count"
              />
            )}
          </div>
        </div>

        {/* Toggle Advanced */}
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-[10px] text-gray-400 hover:text-white uppercase tracking-wider font-bold w-full text-left mt-2"
        >
          {showAdvanced ? "▼ Hide Advanced" : "▶ Show Advanced"}
        </button>

        {showAdvanced && (
          <div className="pt-2 border-t border-white/5 space-y-2">
            <div>
              <label className="nf-label">Live Polling Interval (sec)</label>
              <input
                type="number"
                className="nf-input"
                value={data.poll_interval as number || 60}
                onChange={(e) => updateField('poll_interval', parseInt(e.target.value))}
                min={15}
              />
            </div>
            
            <button
              onClick={testConnection}
              disabled={testing || !data.imap_server || !data.email_address || !data.app_password}
              className="w-full py-1.5 px-3 bg-[#f97316]/20 text-[#f97316] hover:bg-[#f97316]/30 text-xs font-bold rounded border border-[#f97316]/30 disabled:opacity-50 transition-colors"
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
            
            {testResult && (
              <div className="text-[10px] p-2 bg-black/40 rounded border border-white/10 text-gray-300 break-words">
                {testResult}
              </div>
            )}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-orange-500 border-2 border-[#040914]"
      />
    </BaseNode>
  );
}
