"""
webhooks.py — Universal Webhook Ingestion.
"""

from __future__ import annotations

import json
import os
import uuid
from typing import Any

from fastapi import APIRouter, Request, HTTPException

from api.models import DagWorkflow
from api.routes.execute import _run_workflow
from api.routes.websocket import manager
from core.executor import broadcast_log

router = APIRouter()

STORAGE_DIR = os.path.expanduser("~/.neuralflow/workflows")


@router.post("/api/webhook/register")
async def register_webhook(workflow: DagWorkflow):
    """Save a workflow to disk and return a UUID for the webhook."""
    os.makedirs(STORAGE_DIR, exist_ok=True)
    webhook_id = str(uuid.uuid4())
    
    # We modify the workflow_id to match the webhook_id for easy lookup
    workflow.workflow_id = webhook_id
    
    file_path = os.path.join(STORAGE_DIR, f"{webhook_id}.json")
    with open(file_path, "w") as f:
        json.dump(workflow.model_dump(), f)
        
    return {"webhook_id": webhook_id, "url": f"http://127.0.0.1:8000/webhook/{webhook_id}"}


@router.post("/webhook/{webhook_id}")
async def trigger_webhook(webhook_id: str, request: Request):
    """Trigger a saved workflow via HTTP POST."""
    file_path = os.path.join(STORAGE_DIR, f"{webhook_id}.json")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Webhook not found")
        
    with open(file_path, "r") as f:
        data = json.load(f)
        
    workflow = DagWorkflow(**data)
    
    # Read request body to inject as context
    try:
        body = await request.json()
        context_str = json.dumps(body, indent=2)
    except Exception:
        body_bytes = await request.body()
        context_str = body_bytes.decode("utf-8")
        
    await broadcast_log(manager, "system", f"🔔 Webhook triggered for workflow {webhook_id}", "INFO")
    
    # Inject context into the first trigger node (or save to a temp file that the trigger reads)
    # For now, we'll use a special target_path prefix to pass raw context
    if workflow.nodes and workflow.nodes[0].type == "webhook_trigger":
        workflow.nodes[0].data.target_path = f"RAW_CONTEXT:{context_str}"
        
    import asyncio
    asyncio.create_task(_run_workflow(workflow))
    
    return {"status": "success", "message": "Workflow triggered"}
