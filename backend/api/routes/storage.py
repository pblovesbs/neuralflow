"""
storage.py — State persistence for NeuralFlow.
Mirrors frontend state to local disk for local-first recovery.
"""

from __future__ import annotations

import json
import os
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

CONFIG_DIR = os.path.expanduser("~/.neuralflow")
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")


class ConfigPayload(BaseModel):
    state: dict[str, Any]


@router.post("/api/storage/save")
async def save_config(payload: ConfigPayload):
    """Save full frontend state to disk."""
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(payload.state, f)
    return {"status": "success"}


@router.get("/api/storage/load")
async def load_config():
    """Load frontend state from disk."""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                state = json.load(f)
            return {"status": "success", "state": state}
        except Exception:
            pass
    return {"status": "not_found", "state": None}
