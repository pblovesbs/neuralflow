/**
 * TypeScript interfaces matching the strict DAG JSON schema.
 * These types define the contract between Frontend and Backend.
 */

// ─── Node Types ─────────────────────────────────────────────────

export type NodeType = 
  // Original
  | 'trigger' | 'agent' | 'action'
  // New Triggers
  | 'email_trigger' | 'webhook_trigger' | 'cron_trigger' | 'clipboard_trigger'
  // New Actions
  | 'browser_action' | 'subprocess_action'
  // Memory
  | 'memory_store' | 'memory_query';

export interface DagNodeData {
  // Core
  model?: string;
  prompt_template?: string;
  target_path?: string;
  label?: string;

  // AI Fine-tuning
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  repeat_penalty?: number;
  seed?: number;
  stop_sequences?: string;
  
  // Email
  imap_server?: string;
  imap_port?: number;
  email_address?: string;
  app_password?: string;
  poll_interval?: number;
  
  // Webhook
  webhook_id?: string;
  
  // Cron
  cron_expression?: string;
  cron_interval_seconds?: number;
  cron_label?: string;
  
  // Clipboard
  clipboard_filter?: string;
  clipboard_enabled?: boolean;
  
  // Browser
  browser_url?: string;
  browser_instruction?: string;
  browser_headless?: boolean;
  
  // Subprocess
  subprocess_runtime?: string;
  subprocess_code?: string;
  
  // Memory
  memory_collection?: string;
  memory_chunk_size?: number;
  memory_top_k?: number;
  memory_inject_mode?: string;
  
  [key: string]: unknown;
}

export interface DagNode {
  id: string;
  type: NodeType;
  data: DagNodeData;
}

export interface DagEdge {
  source: string;
  target: string;
}

export interface DagWorkflow {
  workflow_id: string;
  nodes: DagNode[];
  edges: DagEdge[];
}

// ─── API Response Types ─────────────────────────────────────────

export type ExecutionStatusType = 'started' | 'running' | 'completed' | 'failed';

export interface ExecutionResponse {
  status: ExecutionStatusType;
  workflow_id: string;
  message: string;
}

export interface LogEntry {
  timestamp: string;
  node_id: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
}

export interface OllamaModel {
  name: string;
  size?: string;
  modified_at?: string;
}

export interface HealthStatus {
  backend: string;
  ollama: 'connected' | 'disconnected';
  ollama_url: string;
}

// ─── React Flow Extended Types ──────────────────────────────────

import type { Node, Edge } from '@xyflow/react';

export type FlowNode = Node<DagNodeData>;
export type FlowEdge = Edge;

export interface FlowState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  isExecuting: boolean;
  executionStatus: ExecutionStatusType | 'idle';
  logs: LogEntry[];
  availableModels: OllamaModel[];
  backendConnected: boolean;
  ollamaConnected: boolean;
}

// ─── Resilience & Feedback Types ────────────────────────────────────

export type ResilienceEventType =
  | 'vram_serialized'
  | 'ram_guardrail_paused'
  | 'model_auto_pulled'
  | 'resumed_from_cache'
  | 'context_pruned';

export interface ResilienceEvent {
  event_type: ResilienceEventType;
  node_id: string;
  message: string;
  timestamp: string;
}

export interface FeedbackPrompt {
  type: 'feedback_prompt';
  workflow_id: string;
  status: string;
  resilience_events: ResilienceEvent[];
}

export type RecoveryAction = 'retry' | 'edit' | 'skip' | 'whitelist' | 'rewrite' | 'flag';

export interface RecoveryRequiredPrompt {
  type: 'recovery_required';
  workflow_id: string;
  node_id: string;
  reason: string;
  violation?: { module_name: string; message: string };
  original_output?: string;
}

