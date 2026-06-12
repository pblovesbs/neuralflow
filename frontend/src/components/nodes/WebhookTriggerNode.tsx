import React, { useEffect, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import BaseNode from './BaseNode';
import InfoTooltip from '../ui/InfoTooltip';
import type { FlowNode } from '@/types/dag';

export default function WebhookTriggerNode({ data, selected }: FlowNode) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // We do NOT auto-register a webhook on mount unless it's requested,
    // because saving implies persisting the graph.
    // Instead, the webhook ID is generated when the user "Deploys" the workflow.
    // We just show a placeholder if none exists.
  }, []);

  const webhookId = data.webhook_id as string || "save-workflow-to-generate-id";
  const webhookUrl = `http://localhost:8000/webhook/${webhookId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <BaseNode
      selected={selected}
      nodeType="Webhook Trigger"
      label={
        <div className="flex justify-between items-center w-full">
          <span>{data.label || "HTTP POST Receiver"}</span>
          <InfoTooltip 
            title="How Webhook Triggers Work" 
            description={
              <>
                <p>A Webhook gives this workflow a unique URL that other apps can send data to.</p>
                <p className="mt-1">1. When you deploy, a unique URL is generated.</p>
                <p className="mt-1">2. You can use apps like Zapier, Make, or any custom script to send a POST request with JSON data to this URL.</p>
                <p className="mt-1">3. The JSON data is instantly received and passed to the next node (e.g. AI Brain) for processing.</p>
              </>
            } 
          />
        </div>
      }
      icon={<span>🌐</span>}
      accentColor="text-green-500"
      accentRaw="#22c55e"
      glowRaw="rgba(34,197,94,0.3)"
      gradientVar="--nf-gradient-node-webhook"
    >
      <div className="space-y-3">
        <div>
          <label className="nf-label flex justify-between">
            <span>Endpoint URL</span>
            {webhookId !== "save-workflow-to-generate-id" && (
              <button onClick={handleCopy} className="text-green-400 hover:text-green-300">
                {copied ? "Copied!" : "Copy"}
              </button>
            )}
          </label>
          <div className="p-2 bg-black/50 border border-green-500/20 rounded font-mono text-xs text-green-400 overflow-x-auto whitespace-nowrap">
            {webhookUrl}
          </div>
        </div>

        <div className="text-[10px] text-gray-400 leading-relaxed bg-white/5 p-2 rounded">
          Send an HTTP POST request to this URL. The JSON body will be injected into the AI&apos;s context.
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-500 border-2 border-[#040914]"
      />
    </BaseNode>
  );
}
