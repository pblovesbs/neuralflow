Markdown
# SYSTEM DIRECTIVE: NEURALFLOW ORCHESTRATION ENGINE

## 1. ARCHITECTURAL OVERVIEW & AESTHETIC MANDATE
**Project:** NeuralFlow - A localized, visual Directed Acyclic Graph (DAG) editor for edge-agent orchestration.
**Role:** You are an elite principal engineer leading parallel AI subagents to build a production-grade React/FastAPI application. 
**Aesthetic Mandate:** The UI must strictly follow a cinematic, highly polished "dark aesthetic." Use Tailwind utilities for deep blacks (`bg-neutral-950`), subtle high-contrast borders (`border-white/5`), and muted glowing active states. No light mode support. The vibe is a high-end developer terminal mixed with a node-based compositor.

## 2. STRICT TECH STACK
- **Frontend Core:** Next.js (App Router), React 18, TypeScript, Tailwind CSS.
- **State & Graph Management:** `xyflow` (React Flow) for canvas rendering, `zustand` for global state.
- **Backend Core:** FastAPI (Python 3.10+), `uvicorn` for async serving.
- **Local AI execution:** Native REST calls to `localhost:11434` (Ollama).

## 3. PROJECT DIRECTORY STRUCTURE (MANDATORY)
Before writing component code, strictly adhere to this monorepo structure:
```text
/neuralflow
  /frontend                # Next.js App
    /components
      /nodes               # xyflow custom nodes (Trigger, Agent, Action)
      /ui                  # Sidebar, Toolbar, Terminal UI
    /store                 # Zustand state management
    /types                 # TypeScript interfaces for DAG schema
  /backend                 # FastAPI Server
    /api
      /routes              # /execute, /ws (WebSockets)
    /core
      /graph_parser        # Topological sort logic
      /ollama_client       # Async wrappers for local models
4. STRICT API CONTRACT (DAG JSON SCHEMA)
Frontend and Backend must communicate using this exact JSON schema. Do not alter this contract.

JSON
{
  "workflow_id": "string",
  "nodes": [
    {
      "id": "string",
      "type": "trigger|agent|action",
      "data": {
        "model": "string (optional)",
        "prompt_template": "string (optional)",
        "target_path": "string (optional)"
      }
    }
  ],
  "edges": [
    {
      "source": "node_id",
      "target": "node_id"
    }
  ]
}
5. SUBAGENT DIRECTIVES & MODULE SPECIFICATIONS
Phase 1: Frontend Canvas Subagent (React / xyflow)
State Management: Implement a Zustand store to manage nodes and edges. Include an onNodesChange and onEdgesChange handler.

Custom Nodes:

Build a BaseNode wrapper with a dark-mode glassmorphism aesthetic (backdrop-blur-md, bg-neutral-900/80).

TriggerNode: Input fields for selecting local directory paths.

AgentNode: Dropdown for selecting Ollama models (e.g., Llama3, Mistral) and a text area for the system prompt. Contains an input and output handle.

ActionNode: Input field for output file destination.

Execution Payload: Create a "Deploy" button that serializes the xyflow state into the strictly defined DAG JSON schema and sends an async POST to the backend.

Phase 2: Backend Orchestrator Subagent (FastAPI / Graph Logic)
Pydantic Validation: Create Pydantic models matching the DAG Schema to validate incoming payloads on the POST /execute-graph endpoint.

Topological Sorting: Implement a mathematical topological sort using a dictionary-based adjacency list to determine the exact execution order. Detect and reject cyclic graphs (infinite loops).

WebSocket Streaming: Create a WebSocket endpoint (/ws/logs). As the backend processes the nodes, it must yield real-time terminal logs (e.g., [AgentNode_1]: Connecting to Ollama...) and stream them back to the frontend terminal UI.

Phase 3: Edge Hardware Integration Subagent (Python / Ollama)
Async Execution: Write an execute_node(node_data, input_context) function using Python's asyncio.

Context Passing: The output string of Node A must be dynamically injected into the prompt_template of Node B wherever {{input}} is defined.

Ollama API Routing: Use httpx to make non-blocking async calls to http://localhost:11434/api/generate. Stream the chunked responses to simulate real-time thinking.

6. EXECUTION PROTOCOL
You must operate in "Plan Mode" first.

Analyze: Parse this entire document.

Artifact 1 (Implementation Plan): Generate a markdown document detailing the step-by-step order in which you will generate the code.

Artifact 2 (Data Models): Generate the TypeScript interfaces and Pydantic models first.

Halt: Await human approval before generating the Next.js or FastAPI boilerplate.


.