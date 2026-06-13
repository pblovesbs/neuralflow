'use client';

/**
 * Canvas v2 — Expanded workspace with cross grid, glowing edges, better zoom range.
 */

import React, { useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import useFlowStore from '@/store/flowStore';
import useThemeStore from '@/store/themeStore';
import TriggerNode from '@/components/nodes/TriggerNode';
import AgentNode from '@/components/nodes/AgentNode';
import ActionNode from '@/components/nodes/ActionNode';
import EmailTriggerNode from '@/components/nodes/EmailTriggerNode';
import WebhookTriggerNode from '@/components/nodes/WebhookTriggerNode';
import BrowserActionNode from '@/components/nodes/BrowserActionNode';
import MemoryStoreNode from '@/components/nodes/MemoryStoreNode';
import MemoryQueryNode from '@/components/nodes/MemoryQueryNode';
import SubprocessActionNode from '@/components/nodes/SubprocessActionNode';
import CronTriggerNode from '@/components/nodes/CronTriggerNode';
import ClipboardTriggerNode from '@/components/nodes/ClipboardTriggerNode';
import TemplateGallery from '@/components/ui/TemplateGallery';

const nodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
  action: ActionNode,
  email_trigger: EmailTriggerNode,
  webhook_trigger: WebhookTriggerNode,
  cron_trigger: CronTriggerNode,
  clipboard_trigger: ClipboardTriggerNode,
  browser_action: BrowserActionNode,
  subprocess_action: SubprocessActionNode,
  memory_store: MemoryStoreNode,
  memory_query: MemoryQueryNode,
};

export default function Canvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const mode = useThemeStore((s) => s.mode);
  const isDark = mode === 'dark';

  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const addNode = useFlowStore((s) => s.addNode);
  const loadState = useFlowStore((s) => s.loadState);
  
  // Only show gallery if not loading state (will adjust dynamically)
  const showGallery = nodes.length === 0;

  React.useEffect(() => {
    loadState();
  }, [loadState]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/neuralflow-node');
      if (!type || !reactFlowWrapper.current) return;
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      addNode(type as "trigger" | "agent" | "action", {
        x: event.clientX - bounds.left - 170,
        y: event.clientY - bounds.top - 40,
      });
    },
    [addNode]
  );

  const defaultEdgeOptions = useMemo(() => ({
    type: 'smoothstep',
    animated: true,
    style: {
      stroke: isDark ? 'rgba(34,211,238,0.3)' : 'rgba(8,145,178,0.3)',
      strokeWidth: 2,
    },
  }), [isDark]);

  const bgColor   = isDark ? '#030712' : '#f8fafc';
  const lineColor = isDark ? 'rgba(34,211,238,0.04)' : 'rgba(14,165,233,0.06)';
  const dotColor  = isDark ? 'rgba(255,255,255,0.035)' : 'rgba(15,23,42,0.06)';

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative" style={{ background: bgColor }}>
      {showGallery && <TemplateGallery />}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes as Record<string, React.ComponentType<unknown>>}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
        minZoom={0.15}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        className="neuralflow-canvas"
        snapToGrid={true}
        snapGrid={[24, 24]}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        {/* Grid background — subtle cross lines */}
        <Background
          variant={BackgroundVariant.Lines}
          gap={48}
          size={0.5}
          color={lineColor}
        />

        {/* Secondary dot overlay for depth */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={0.8}
          color={dotColor}
        />

        {/* Controls */}
        <Controls
          className="!rounded-xl !overflow-hidden !border !border-white/5"
          style={{
            background: isDark ? 'rgba(4,9,20,0.97)' : 'rgba(241,245,249,0.98)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            bottom: 24,
            left: 20,
          }}
        />

        {/* MiniMap */}
        <MiniMap
          style={{
            background: isDark ? 'rgba(4,9,20,0.97)' : 'rgba(241,245,249,0.97)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.1)'}`,
            borderRadius: 12,
          }}
          nodeColor={(node) => {
            switch (node.type) {
              case 'trigger': return isDark ? '#fbbf24' : '#d97706';
              case 'agent':   return isDark ? '#22d3ee' : '#0891b2';
              case 'action':  return isDark ? '#c084fc' : '#7c3aed';
              case 'email_trigger': return '#f97316';
              case 'webhook_trigger': return '#22c55e';
              case 'cron_trigger': return '#a78bfa';
              case 'clipboard_trigger': return '#f472b6';
              case 'browser_action': return '#38bdf8';
              case 'subprocess_action': return '#f87171';
              case 'memory_store': return '#2dd4bf';
              case 'memory_query': return '#818cf8';
              default:        return '#475569';
            }
          }}
          maskColor={isDark ? 'rgba(3,7,18,0.75)' : 'rgba(248,250,252,0.65)'}
        />
      </ReactFlow>
    </div>
  );
}
