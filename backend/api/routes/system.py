"""
System API routes — hardware native utilities.
"""

from __future__ import annotations

import subprocess
from fastapi import APIRouter

router = APIRouter()

@router.get("/api/system/file-picker")
async def pick_file():
    """Opens macOS native file picker dialog and returns absolute path."""
    try:
        cmd = ["osascript", "-e", 'POSIX path of (choose file)']
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return {"path": result.stdout.strip()}
    except subprocess.CalledProcessError:
        return {"path": ""}

@router.get("/api/system/folder-picker")
async def pick_folder():
    """Opens macOS native folder picker dialog and returns absolute path."""
    try:
        cmd = ["osascript", "-e", 'POSIX path of (choose folder)']
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return {"path": result.stdout.strip()}
    except subprocess.CalledProcessError:
        return {"path": ""}

@router.get("/api/system/save-file-picker")
async def pick_save_file():
    """Opens macOS native save file dialog and returns absolute path."""
    try:
        cmd = ["osascript", "-e", 'POSIX path of (choose file name)']
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return {"path": result.stdout.strip()}
    except subprocess.CalledProcessError:
        return {"path": ""}


# ─── Clipboard Monitor Control ───────────────────────────────────────────────
from pydantic import BaseModel
from typing import Optional

class ClipboardFilterRequest(BaseModel):
    workflow_id: str
    filter_text: Optional[str] = ""
    regex: Optional[bool] = False

@router.post("/api/clipboard/register")
async def register_clipboard_filter(req: ClipboardFilterRequest):
    """Register a workflow to be triggered by clipboard changes."""
    from core.clipboard_monitor import register_filter
    register_filter(req.workflow_id, req.filter_text, req.regex)
    return {"status": "success", "message": f"Registered clipboard monitor for {req.workflow_id}"}

@router.post("/api/clipboard/unregister/{workflow_id}")
async def unregister_clipboard_filter(workflow_id: str):
    """Remove a workflow from clipboard monitoring."""
    from core.clipboard_monitor import unregister_filter
    unregister_filter(workflow_id)
    return {"status": "success"}


# ─── Email Listener Control ──────────────────────────────────────────────────
class EmailTestRequest(BaseModel):
    imap_server: str
    imap_port: int
    email_address: str
    app_password: str

@router.post("/api/email/test-connection")
async def test_email_connection(req: EmailTestRequest):
    """Test IMAP connectivity."""
    from core.email_listener import EmailConfig, test_imap_connection
    config = EmailConfig(
        imap_server=req.imap_server,
        imap_port=req.imap_port,
        email_address=req.email_address,
        app_password=req.app_password,
    )
    result = await test_imap_connection(config)
    return result


# ─── Cron Scheduler Control ──────────────────────────────────────────────────
class ScheduleRequest(BaseModel):
    workflow_id: str
    cron_expression: Optional[str] = None
    interval_seconds: Optional[int] = None

@router.post("/api/schedule/add")
async def add_schedule(req: ScheduleRequest):
    from core.cron_scheduler import add_job
    try:
        add_job(req.workflow_id, req.cron_expression, req.interval_seconds)
        return {"status": "success", "message": f"Scheduled {req.workflow_id}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/schedule/remove/{workflow_id}")
async def remove_schedule(workflow_id: str):
    from core.cron_scheduler import remove_job
    remove_job(workflow_id)
    return {"status": "success"}
