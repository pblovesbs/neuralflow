"""
Pydantic v2 models — extended for NeuralFlow v3.
Covers all node types: original Trigger/Agent/Action + 8 new types.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, model_validator, field_validator


class NodeType(str, Enum):
    """All supported node types in the DAG."""

    # ── Original ──────────────────────────────────────
    TRIGGER = "trigger"
    AGENT = "agent"
    ACTION = "action"
    # ── New Trigger Types ──────────────────────────────
    EMAIL_TRIGGER = "email_trigger"
    WEBHOOK_TRIGGER = "webhook_trigger"
    CRON_TRIGGER = "cron_trigger"
    CLIPBOARD_TRIGGER = "clipboard_trigger"
    # ── New Action Types ───────────────────────────────
    BROWSER_ACTION = "browser_action"
    SUBPROCESS_ACTION = "subprocess_action"
    # ── Memory / AI Utility ────────────────────────────
    MEMORY_STORE = "memory_store"
    MEMORY_QUERY = "memory_query"


class NodeData(BaseModel):
    """
    Data payload for any DAG node. Fields are optional; only relevant ones
    are set per node type.
    """

    # ── Core ──────────────────────────────────────────
    model: Optional[str] = Field(None, description="Ollama model ID (agent nodes).")
    prompt_template: Optional[str] = Field(
        None, description="Prompt with {{input}} placeholder."
    )
    target_path: Optional[str] = Field(
        None, description="File system path for trigger/action."
    )
    item_count: Optional[str] = Field(
        "1", description="Number of items to read for trigger nodes."
    )
    keep_alive: Optional[int] = Field(5, description="Minutes to keep model in VRAM.")
    quantization: Optional[str] = Field("q4_K_M", description="Quantization to use.")
    num_ctx: Optional[int] = Field(4096, description="Context window size.")
    temperature: Optional[float] = Field(0.7, description="Generation temperature.")
    top_p: Optional[float] = Field(0.9, description="Generation top p.")
    max_tokens: Optional[int] = Field(None, description="Max generated tokens.")
    repeat_penalty: Optional[float] = Field(1.1, description="Repeat penalty.")
    seed: Optional[int] = Field(None, description="Random seed.")
    stop_sequences: Optional[str] = Field(
        None, description="Comma separated stop strings."
    )

    # ── Email Trigger ──────────────────────────────────
    imap_server: Optional[str] = Field(
        None, description="IMAP server host (e.g. imap.gmail.com)."
    )
    imap_port: Optional[int] = Field(
        993, description="IMAP port (default 993 for SSL)."
    )
    email_address: Optional[str] = Field(None, description="Email address to poll.")
    app_password: Optional[str] = Field(
        None, description="App-specific password (not stored server-side)."
    )
    poll_interval: Optional[int] = Field(60, description="Polling interval in seconds.")
    email_count: Optional[str] = Field(
        "1", description="Number of emails to read (e.g., '1', '5', 'all')"
    )

    # ── Webhook Trigger ───────────────────────────────
    webhook_id: Optional[str] = Field(
        None, description="UUID for the /webhook/{id} endpoint."
    )

    # ── Cron Trigger ──────────────────────────────────
    cron_expression: Optional[str] = Field(
        None, description="Cron expression string (5-field)."
    )
    cron_interval_seconds: Optional[int] = Field(
        None, description="Simple interval in seconds."
    )
    cron_label: Optional[str] = Field(
        None, description="Human-readable label for the schedule."
    )

    # ── Clipboard Trigger ─────────────────────────────
    clipboard_filter: Optional[str] = Field(
        None, description="Keyword or regex filter for clipboard content."
    )
    clipboard_enabled: Optional[bool] = Field(
        False, description="Whether passive clipboard monitoring is active."
    )

    # ── Browser Action ────────────────────────────────
    browser_url: Optional[str] = Field(None, description="Target URL to navigate to.")
    browser_instruction: Optional[str] = Field(
        None, description="Extraction instruction for the scraped content."
    )
    browser_headless: Optional[bool] = Field(
        True, description="Run browser headlessly."
    )

    # ── Subprocess Action ─────────────────────────────
    subprocess_runtime: Optional[str] = Field(
        "bash", description="Runtime: bash | python3 | node"
    )
    subprocess_code: Optional[str] = Field(None, description="Code/command to execute.")
    output_format: Optional[str] = Field(
        "Plain Text", description="Format to save output file."
    )

    # ── Memory ────────────────────────────────────────
    memory_collection: Optional[str] = Field(
        "default", description="ChromaDB collection name."
    )
    memory_chunk_size: Optional[int] = Field(
        512, description="Chunk size in characters for ingestion."
    )
    memory_top_k: Optional[int] = Field(
        3, description="Number of top results to retrieve."
    )
    memory_inject_mode: Optional[str] = Field(
        "prepend", description="How to inject memories: prepend | append."
    )

    @field_validator("email_address")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and "@" not in v:
            raise ValueError("Invalid email address format.")
        return v


class DagNode(BaseModel):
    """A single node in the DAG workflow."""

    id: str = Field(..., description="Unique node identifier.")
    type: NodeType = Field(..., description="Node type.")
    data: NodeData = Field(default_factory=NodeData, description="Node configuration.")


class DagEdge(BaseModel):
    """A directed edge between two nodes."""

    source: str = Field(..., description="Source node ID.")
    target: str = Field(..., description="Target node ID.")


class DagWorkflow(BaseModel):
    """
    Complete DAG workflow payload — the frontend ↔ backend contract.
    """

    workflow_id: str = Field(..., description="Unique workflow execution ID.")
    nodes: list[DagNode] = Field(..., min_length=1, description="DAG nodes.")
    edges: list[DagEdge] = Field(default_factory=list, description="Directed edges.")
    schedule: Optional[str] = Field(None, description="Optional cron schedule for background execution.")
    notify_email: Optional[str] = Field(None, description="Optional email to notify on completion.")
    bypass_ram_check: Optional[bool] = Field(False, description="Bypass the VRAM memory guardrail.")

    @model_validator(mode="after")
    def validate_edge_references(self) -> "DagWorkflow":
        """Ensure all edge source/target IDs reference existing nodes."""
        node_ids = {node.id for node in self.nodes}
        for edge in self.edges:
            if edge.source not in node_ids:
                raise ValueError(
                    f"Edge source '{edge.source}' does not reference an existing node."
                )
            if edge.target not in node_ids:
                raise ValueError(
                    f"Edge target '{edge.target}' does not reference an existing node."
                )
        return self


# ─── Response Models ───────────────────────────────────────────────────────────


class ExecutionStatus(str, Enum):
    STARTED = "started"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ExecutionResponse(BaseModel):
    status: ExecutionStatus
    workflow_id: str
    message: str = ""


class LogEntry(BaseModel):
    timestamp: str
    node_id: str
    level: str = "INFO"
    message: str
    raw_traceback: Optional[str] = None
    free_ram: Optional[int] = None
    allocated_vram: Optional[int] = None


class OllamaModel(BaseModel):
    name: str
    size: Optional[str] = None
    modified_at: Optional[str] = None
