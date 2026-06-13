"""
clipboard_monitor.py — Semantic Clipboard Monitor Trigger.
Async implementation using FastAPI's event loop to prevent blocking.
"""

from __future__ import annotations

import asyncio
import hashlib
import re
from typing import Optional

_PYPERCLIP_AVAILABLE = False
try:
    import pyperclip

    _PYPERCLIP_AVAILABLE = True
except ImportError:
    pass

_MONITOR_TASK: Optional[asyncio.Task] = None
_LAST_HASH: str = ""
_FILTERS: list[dict] = []  # List of {"workflow_id": str, "filter": str, "regex": bool}


def _hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


async def _monitor_loop():
    """Background asyncio task to poll clipboard."""
    global _LAST_HASH

    # Initialize hash with current clipboard to prevent instant firing
    try:
        initial_text = pyperclip.paste()
        _LAST_HASH = _hash_text(initial_text)
    except Exception:
        pass

    from api.routes.websocket import manager
    from core.executor import broadcast_log

    while True:
        try:
            current_text = pyperclip.paste()
            if not current_text:
                await asyncio.sleep(1.5)
                continue

            current_hash = _hash_text(current_text)

            if current_hash != _LAST_HASH:
                _LAST_HASH = current_hash

                # Clipboard changed! Check filters
                for f in _FILTERS:
                    match = False
                    if not f["filter"]:
                        match = True
                    else:
                        if f["regex"]:
                            try:
                                if re.search(f["filter"], current_text, re.IGNORECASE):
                                    match = True
                            except re.error:
                                pass
                        else:
                            if f["filter"].lower() in current_text.lower():
                                match = True

                    if match:
                        await broadcast_log(
                            manager,
                            "system",
                            f"📋 Clipboard matched filter for workflow {f['workflow_id']}",
                            "INFO",
                        )
                        # We would trigger the workflow here
                        import json
                        import os
                        from api.models import DagWorkflow
                        from api.routes.execute import _run_workflow

                        try:
                            wf_path = os.path.expanduser(
                                f"~/.neuralflow/workflows/{f['workflow_id']}.json"
                            )
                            if os.path.exists(wf_path):
                                with open(wf_path, "r") as wf_file:
                                    data = json.load(wf_file)
                                workflow = DagWorkflow(**data)

                                # Inject clipboard content as initial context
                                # This is a bit hacky, but works for our pipeline
                                workflow.nodes[0].data.target_path = "CLIPBOARD"

                                asyncio.create_task(_run_workflow(workflow))
                        except Exception as e:
                            print(f"Failed to trigger workflow from clipboard: {e}")

        except Exception:
            pass

        await asyncio.sleep(1.5)


def start_monitor():
    """Start the asyncio clipboard monitor task."""
    global _MONITOR_TASK
    if not _PYPERCLIP_AVAILABLE:
        print("pyperclip not installed. Clipboard monitoring disabled.")
        return

    if _MONITOR_TASK is None or _MONITOR_TASK.done():
        loop = asyncio.get_event_loop()
        _MONITOR_TASK = loop.create_task(_monitor_loop())


def stop_monitor():
    """Stop the asyncio clipboard monitor task."""
    global _MONITOR_TASK
    if _MONITOR_TASK and not _MONITOR_TASK.done():
        _MONITOR_TASK.cancel()
        _MONITOR_TASK = None


def register_filter(workflow_id: str, filter_text: str = "", regex: bool = False):
    """Register a workflow to be triggered by clipboard changes."""
    global _FILTERS
    # Remove existing
    _FILTERS = [f for f in _FILTERS if f["workflow_id"] != workflow_id]
    _FILTERS.append({"workflow_id": workflow_id, "filter": filter_text, "regex": regex})
    start_monitor()


def unregister_filter(workflow_id: str):
    """Remove a workflow from clipboard monitoring."""
    global _FILTERS
    _FILTERS = [f for f in _FILTERS if f["workflow_id"] != workflow_id]
    if not _FILTERS:
        stop_monitor()
