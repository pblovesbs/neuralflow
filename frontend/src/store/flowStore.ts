/**
 * Zustand store for managing the DAG canvas state.
 * Handles nodes, edges, execution, WebSocket logs, and serialization.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import type {
  NodeChange,
  EdgeChange,
  Connection,
} from '@xyflow/react';
import type {
  FlowNode,
  FlowEdge,
  DagWorkflow,
  LogEntry,
  OllamaModel,
  ExecutionStatusType,
  DagNodeData,
} from '@/types/dag';

const BACKEND_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws/logs';

export interface SavedBuilderAutomation {
  id: string;
  name: string;
  savedAt: number;
  state: {
    nodes: FlowNode[];
    edges: FlowEdge[];
  };
}

interface FlowStore {
  // ─── State ────────────────────────────────────────
  workflowId: string;
  automationName: string;
  savedBuilderAutomations: SavedBuilderAutomation[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  isExecuting: boolean;
  executionStatus: ExecutionStatusType | 'idle';
  logs: LogEntry[];
  availableModels: OllamaModel[];
  backendConnected: boolean;
  ollamaConnected: boolean;
  wsConnection: WebSocket | null;

  statusMessage: string;

  // ─── Node/Edge Handlers ───────────────────────────
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // ─── Node Actions ─────────────────────────────────
  addNode: (type: 'trigger' | 'agent' | 'action', position?: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<DagNodeData>) => void;
  removeNode: (nodeId: string) => void;

  // ─── Serialization & Persistence ───────────────────
  setAutomationName: (name: string) => void;
  saveCurrentAutomation: () => void;
  loadAutomation: (id: string) => void;
  deleteAutomation: (id: string) => void;
  serializeToDAG: () => DagWorkflow;
  exportJSON: () => string;
  saveState: () => Promise<void>;
  loadState: () => Promise<void>;

  // ─── Execution ────────────────────────────────────
  deployWorkflow: (options?: { bypassRam?: boolean; forceStart?: boolean }) => Promise<void>;
  stopWorkflow: () => Promise<void>;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;

  // ─── Log Management ───────────────────────────────
  appendLog: (log: LogEntry) => void;
  clearLogs: () => void;

  // ─── API Calls ────────────────────────────────────
  fetchModels: () => Promise<void>;
  checkHealth: () => Promise<void>;
}

let nodeIdCounter = 0;

const useFlowStore = create<FlowStore>()(
  persist(
    (set, get) => ({
      // ─── Initial State ──────────────────────────────────
      workflowId: `wf_${Date.now()}`,
      automationName: '',
      savedBuilderAutomations: [],
      nodes: [],
      edges: [],
      isExecuting: false,
      executionStatus: 'idle',
      logs: [],
      statusMessage: '',
      availableModels: [],
      backendConnected: false,
      ollamaConnected: false,
      wsConnection: null,

      onNodesChange: (changes: NodeChange[]) => {
        set({ nodes: applyNodeChanges(changes, get().nodes) as FlowNode[] });
        get().saveState();
      },

      onEdgesChange: (changes: EdgeChange[]) => {
        set({ edges: applyEdgeChanges(changes, get().edges) });
        get().saveState();
      },

      onConnect: (connection: Connection) => {
        set({ edges: addEdge(connection, get().edges) });
        get().saveState();
      },

      addNode: (type: string, position) => {
        nodeIdCounter += 1;
        const id = `${type}_${nodeIdCounter}`;
        const labels: Record<string, string> = {
          trigger: 'Trigger',
          agent: 'Agent',
          action: 'Action',
          email_trigger: 'Email Trigger',
          webhook_trigger: 'Webhook Trigger',
          cron_trigger: 'Cron Schedule',
          clipboard_trigger: 'Clipboard Monitor',
          browser_action: 'Web Scraper',
          subprocess_action: 'Code Runner',
          memory_store: 'Memory Store',
          memory_query: 'Memory Query',
        };

        const defaultData: Record<string, DagNodeData> = {
          trigger: { label: labels[type], target_path: '' },
          agent: { label: labels[type], model: '', prompt_template: '{{input}}' },
          action: { label: labels[type], target_path: '' },
          email_trigger: { label: labels[type], imap_port: 993, poll_interval: 60 },
          webhook_trigger: { label: labels[type], webhook_id: '' },
          cron_trigger: { label: labels[type], cron_interval_seconds: 3600 },
          clipboard_trigger: { label: labels[type], clipboard_enabled: false },
          browser_action: { label: labels[type], browser_headless: true },
          subprocess_action: { label: labels[type], subprocess_runtime: 'bash' },
          memory_store: { label: labels[type], memory_collection: 'default', memory_chunk_size: 512 },
          memory_query: { label: labels[type], memory_collection: 'default', memory_top_k: 3, memory_inject_mode: 'prepend' },
        };

        const newNode: FlowNode = {
          id,
          type,
          position: position || { x: 250, y: 100 + get().nodes.length * 180 },
          data: defaultData[type],
        };

        set({ nodes: [...get().nodes, newNode] });
        get().saveState();
      },

      updateNodeData: (nodeId, data) => {
        set({
          nodes: get().nodes.map((node) =>
            node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
          ),
        });
        get().saveState();
      },

      removeNode: (nodeId) => {
        set({
          nodes: get().nodes.filter((n) => n.id !== nodeId),
          edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
          workflowId: `wf_${Date.now()}`, // invalidate cache on node removal
        });
        get().saveState();
      },

      // ─── Persistence ──────────────────────────────────
      setAutomationName: (name: string) => set({ automationName: name }),

      saveCurrentAutomation: () => {
        const state = get();
        if (!state.automationName) return;

        const currentId = state.workflowId;
        const newSaved: SavedBuilderAutomation = {
          id: currentId,
          name: state.automationName,
          savedAt: Date.now(),
          state: {
            nodes: state.nodes,
            edges: state.edges,
          }
        };

        set(s => {
          const exists = s.savedBuilderAutomations.findIndex(a => a.id === currentId);
          let newAutomations;
          if (exists >= 0) {
            newAutomations = [...s.savedBuilderAutomations];
            newAutomations[exists] = newSaved;
          } else {
            newAutomations = [...s.savedBuilderAutomations, newSaved];
          }
          return { savedBuilderAutomations: newAutomations };
        });
      },

      loadAutomation: (id: string) => {
        const state = get();
        const saved = state.savedBuilderAutomations.find(a => a.id === id);
        if (saved && saved.state) {
          set({
            workflowId: id,
            automationName: saved.name,
            nodes: saved.state.nodes,
            edges: saved.state.edges,
            isExecuting: false,
            executionStatus: 'idle',
            logs: [],
          });
          
          // Update nodeIdCounter
          const maxId = saved.state.nodes.reduce((max: number, n: FlowNode) => {
            const parts = n.id.split('_');
            const idNum = parseInt(parts[parts.length - 1], 10);
            return !isNaN(idNum) && idNum > max ? idNum : max;
          }, 0);
          nodeIdCounter = maxId;
        }
      },

      deleteAutomation: (id: string) => {
        set(state => ({
          savedBuilderAutomations: state.savedBuilderAutomations.filter(a => a.id !== id)
        }));
      },

      // ─── Serialize to DAG JSON Schema ──────────────────
      serializeToDAG: () => {
        const { workflowId, nodes, edges } = get();
        return {
          workflow_id: workflowId,
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type as 'trigger' | 'agent' | 'action',
            data: {
              ...n.data,
            },
          })),
          edges: edges.map((e) => ({
            source: e.source,
            target: e.target,
          })),
        };
      },

      exportJSON: () => {
        return JSON.stringify(get().serializeToDAG(), null, 2);
      },

      saveState: async () => {
        const { workflowId, nodes, edges } = get();
        try {
          await fetch(`${BACKEND_URL}/api/storage/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: { workflowId, nodes, edges } }),
          });
        } catch (e) {
          console.warn("Autosave failed", e);
        }
      },

      loadState: async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/storage/load`);
          const data = await res.json();
          if (data.status === 'success' && data.state) {
            set({
              workflowId: data.state.workflowId || `wf_${Date.now()}`,
              nodes: data.state.nodes || [],
              edges: data.state.edges || [],
            });
            
            // Update nodeIdCounter to avoid collisions
            const maxId = (data.state.nodes || []).reduce((max: number, n: FlowNode) => {
              const parts = n.id.split('_');
              const idNum = parseInt(parts[parts.length - 1], 10);
              return !isNaN(idNum) && idNum > max ? idNum : max;
            }, 0);
            nodeIdCounter = maxId;
          }
        } catch (e) {
          console.warn("Failed to load initial state", e);
        }
      },

      // ─── Deploy Workflow ────────────────────────────────
      deployWorkflow: async (options) => {
        const { bypassRam = false, forceStart = false } = options || {};
        const { nodes, edges } = get();
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        
        // 1. Health check & Auto-start
        let isBackendRunning = false;
        try {
          const healthRes = await fetch(`${backendUrl}/engine-status`, { method: 'GET' });
          if (healthRes.ok) isBackendRunning = true;
        } catch (e) {
          isBackendRunning = false;
        }

        if (!isBackendRunning) {
          console.log("⚠️ Backend server not found. Attempting auto-start...");
          try {
            await fetch('/api/system/start-backend', { method: 'POST' });
            
            let retries = 10;
            while (retries > 0) {
              await new Promise(r => setTimeout(r, 1000));
              try {
                const check = await fetch(`${backendUrl}/engine-status`, { method: 'GET' });
                if (check.ok) {
                  isBackendRunning = true;
                  console.log("✅ Backend server successfully started.");
                  break;
                }
              } catch (e) {}
              retries--;
            }
          } catch (e) {
            console.error("Auto-start failed:", e);
          }
        }

        if (!isBackendRunning && !forceStart) {
          alert("The Backend Server could not be started automatically. Please run it manually from the terminal.");
          return;
        }

        // 2. Prepare Workflow Data
        const state = get();
        if (state.isExecuting) return;

        // Connect WebSocket first
        state.connectWebSocket();

        set({ isExecuting: true, executionStatus: 'running', logs: [] });

        const dag = state.serializeToDAG();
        const payload = {
          ...dag,
          bypass_ram_check: bypassRam || forceStart
        };

        // If there is a webhook node, register it to get a UUID
        const webhookNodes = state.nodes.filter(n => n.type === 'webhook_trigger');
        if (webhookNodes.length > 0) {
          try {
            const whRes = await fetch(`${BACKEND_URL}/api/webhook/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (whRes.ok) {
              const whData = await whRes.json();
              // Update the first webhook node with this ID locally
              get().updateNodeData(webhookNodes[0].id, { webhook_id: whData.webhook_id });
              payload.workflow_id = whData.webhook_id; // Match backend expectations
            }
          } catch (e) {
            console.warn("Webhook registration failed", e);
          }
        }

        try {
          const response = await fetch(`${BACKEND_URL}/execute-graph`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const error = await response.json();
            set({
              isExecuting: false,
              executionStatus: 'failed',
            });
            get().appendLog({
              timestamp: new Date().toISOString(),
              node_id: 'system',
              level: 'ERROR',
              message: `Deploy failed: ${error.detail || 'Unknown error'}`,
            });
            return;
          }

          const result = await response.json();
          get().appendLog({
            timestamp: new Date().toISOString(),
            node_id: 'system',
            level: 'INFO',
            message: `Workflow ${result.workflow_id} ${result.status}: ${result.message}`,
          });
        } catch (error) {
          set({ isExecuting: false, executionStatus: 'failed' });
          get().appendLog({
            timestamp: new Date().toISOString(),
            node_id: 'system',
            level: 'ERROR',
            message: `Connection failed: ${error instanceof Error ? error.message : 'Backend unreachable'}`,
          });
        }
      },

      stopWorkflow: async () => {
        try {
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          await fetch(`${backendUrl}/stop-engine`, { method: 'POST' });
          set({ isExecuting: false, executionStatus: 'failed' });
          get().appendLog({
            timestamp: new Date().toISOString(),
            node_id: 'system',
            level: 'WARN',
            message: '🛑 Workflow forcibly stopped by user',
          });
        } catch (error) {
          console.error("Failed to stop workflow:", error);
        }
      },

      // ─── WebSocket Connection ───────────────────────────
      connectWebSocket: () => {
        const existing = get().wsConnection;
        if (existing && existing.readyState === WebSocket.OPEN) return;

        try {
          const ws = new WebSocket(WS_URL);

          ws.onopen = () => {
            set({ wsConnection: ws });
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);

              // Handle system events
              if (data.type === 'ollama_offline') {
                get().appendLog({ timestamp: new Date().toISOString(), node_id: 'system', level: 'WARN', message: '🛌 AI Engine offline. Please open Ollama.' });
                set({ statusMessage: '🛌 AI Engine is offline. Please open Ollama on your Mac.' });
                return;
              }

              const log: LogEntry = data;
              get().appendLog(log);

              // Derive human-readable status from log message
              const msg = log.message || '';
              let status = '';
              if (msg.includes('TRIGGER') && msg.includes('Reading')) status = '📂 Reading files from your disk...';
              else if (msg.includes('AGENT') && msg.includes('Connecting')) status = '🧠 Preparing the local neural core...';
              else if (msg.includes('Streaming')) status = '✨ The AI is processing your request...';
              else if (msg.includes('Written') || msg.includes('Output saved')) status = '✅ Finished! Your results have been saved.';
              else if (msg.includes('completed successfully')) status = '✅ Workflow complete!';
              else if (msg.includes('FAILED') || msg.includes('Error')) status = '❌ Something went wrong. Check logs below.';
              if (status) set({ statusMessage: status });

              // Detect workflow completion
              if (msg.includes('completed successfully')) {
                set({ isExecuting: false, executionStatus: 'completed' });
              } else if (msg.includes('FAILED')) {
                set({ isExecuting: false, executionStatus: 'failed' });
              }
            } catch {
              get().appendLog({ timestamp: new Date().toISOString(), node_id: 'system', level: 'INFO', message: event.data });
            }
          };

          ws.onerror = () => {
            get().appendLog({
              timestamp: new Date().toISOString(),
              node_id: 'system',
              level: 'ERROR',
              message: 'WebSocket connection error',
            });
          };

          ws.onclose = () => {
            set({ wsConnection: null });
          };

          set({ wsConnection: ws });
        } catch {
          // WebSocket not available
        }
      },

      disconnectWebSocket: () => {
        const ws = get().wsConnection;
        if (ws) {
          ws.close();
          set({ wsConnection: null });
        }
      },

      // ─── Log Management ─────────────────────────────────
      appendLog: (log) => {
        set({ logs: [...get().logs, log].slice(-1000) });
      },

      clearLogs: () => {
        set({ logs: [] });
      },

      // ─── Fetch Available Models ─────────────────────────
      fetchModels: async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/api/models`);
          if (response.ok) {
            const models = await response.json();
            set({ availableModels: models });
          }
        } catch {
          set({ availableModels: [] });
        }
      },

      // ─── Health Check ───────────────────────────────────
      checkHealth: async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/api/health`);
          if (response.ok) {
            const data = await response.json();
            set({
              backendConnected: true,
              ollamaConnected: data.ollama === 'connected',
            });
          } else {
            set({ backendConnected: false, ollamaConnected: false });
          }
        } catch {
          set({ backendConnected: false, ollamaConnected: false });
        }
      },
    }),
    {
      name: 'neuralflow-builder-storage',
      partialize: (state) => ({
        automationName: state.automationName,
        savedBuilderAutomations: state.savedBuilderAutomations,
      }),
    }
  )
);

export default useFlowStore;
