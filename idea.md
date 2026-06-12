# NeuralFlow: Architecture & Ideation

NeuralFlow is an edge-agent orchestrator designed to let non-technical users build powerful AI pipelines that run entirely locally on their personal devices. It abstracts away the complexity of managing LLMs, file I/O, and graph logic into a highly polished, cinematic node-based visual interface.

This document breaks down the underlying architecture across the Frontend and Backend layers.

---

## 1. The Frontend (Client Interface)

The frontend is a strictly "dumb" UI layer. It holds no execution logic, meaning it acts entirely as a visual compositor that paints the current state and communicates directly with the backend.

### Core Technologies
- **Next.js (App Router):** Provides the fast, modern React 18 shell.
- **Zustand:** A lightweight state manager handling the global flow state (nodes, edges, logs, and execution status).
- **React Flow (`xyflow`):** The canvas engine that renders the draggable, connectable node interface.

### How It Works: Key Features

#### A. The Node Graph Canvas
The user interacts with three primary custom nodes:
- **Trigger Nodes:** Collect input data (reading absolute paths).
- **Agent Nodes:** The AI brain. Selects local models (e.g., Llama, Qwen) and accepts prompt instructions.
- **Action Nodes:** Where to output the final processed data.
These nodes snap together with visual bezier-curve edges. The `flowStore` (Zustand) tracks every movement and connection.

#### B. Frictionless Native Integration
Instead of forcing users to understand file paths or terminal commands, the frontend uses native APIs via the backend:
- Clicking **"Browse"** on a node triggers an AppleScript file-picker modal directly from the Mac operating system.
- Clicking **"✨ Hardware Setup"** triggers the Hardware Wizard, letting the user simply pick their RAM size.

#### C. The Deploy Process
When the user clicks "Deploy Workflow", the frontend serializes the visual graph into a strict JSON DAG (Directed Acyclic Graph) format. 
```json
{
  "workflow_id": "...",
  "nodes": [...],
  "edges": [{"source": "trigger-1", "target": "agent-1"}]
}
```
It fires this payload to the backend via a `POST` request and simultaneously opens a WebSocket connection to listen for real-time terminal logs, rendering the execution live in the bottom UI panel.

---

## 2. The Backend (Execution Engine)

The backend is the heavy-lifting engine. It validates the user's visual graph, determines the mathematical order of execution, manages hardware resources, and interfaces directly with the AI models.

### Core Technologies
- **FastAPI:** A lightning-fast, modern Python framework managing REST APIs and WebSockets.
- **Pydantic:** Ensures the DAG JSON sent by the frontend is structurally perfect.
- **Asyncio / HTTPX:** Allows the backend to stream real-time responses from Ollama without freezing.

### How It Works: Key Modules

#### A. DAG Parser & Topological Sorting
You can't execute an AI node if it's waiting on input from another node. The backend receives the graph payload and runs a **Topological Sort Algorithm**. 
1. It maps out dependencies.
2. It detects infinite loops (Cyclic Errors) and rejects them.
3. It determines the exact, linear order the nodes must run in (e.g., Trigger -> Agent 1 -> Agent 2 -> Action).

#### B. The Async Executor (`core/executor.py`)
Once sorted, the executor spins up an asynchronous task for the graph. It handles "Context Passing".
- **Trigger Execution:** Reads the raw file from the disk and holds the text in memory.
- **Agent Execution:** Injects the accumulated text into the user's prompt (e.g., *"Summarize this text: [Context Data]"*). 
- **Action Execution:** Writes the final output back to the disk.

#### C. Ollama Client & Hardware Management (`core/ollama_client/client.py`)
NeuralFlow bypasses the cloud entirely. 
- It uses an async HTTP client to connect to `http://127.0.0.1:11434` (Ollama's local port).
- It streams the generated AI text back in chunks, instantly broadcasting those chunks through the WebSocket so the user sees the AI "typing" in the frontend terminal.
- **Hardware setup API (`/api/models/setup`):** This unique route analyzes the user's RAM and automatically executes subprocess shell commands (`ollama pull qwen2.5:0.5b`) to install the perfectly optimized neural engine for their specific Mac.

### The Full Cycle Summary
1. User drags nodes on the **Frontend Canvas**.
2. Frontend sends a **JSON DAG** to the **FastAPI Backend**.
3. Backend mathematically **sorts** the nodes.
4. Backend triggers the local **Ollama AI**.
5. Backend writes the file to disk and streams **Live Logs** back to the UI.
