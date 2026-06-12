"""
state_db.py — SQLite-backed pipeline state machine.

Persists the output of every successfully executed node.
Allows the engine to resume a workflow from the last successful step
without re-running expensive upstream computations.

DB location: ~/.neuralflow/state.db
"""

from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path


# ─── Database Path ─────────────────────────────────────────────────────────────
DB_DIR = Path.home() / ".neuralflow"
DB_PATH = DB_DIR / "state.db"


def _get_connection() -> sqlite3.Connection:
    """Open (or create) the SQLite database and ensure schema is initialized."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS node_outputs (
            workflow_id TEXT NOT NULL,
            node_id     TEXT NOT NULL,
            output      TEXT NOT NULL,
            created_at  REAL NOT NULL DEFAULT (unixepoch('now', 'subsec')),
            PRIMARY KEY (workflow_id, node_id)
        )
    """)
    conn.commit()
    return conn


def save_node_output(workflow_id: str, node_id: str, output: str) -> None:
    """
    Persist the output of a successfully executed node.

    Args:
        workflow_id: Unique workflow run identifier.
        node_id: The node whose output is being saved.
        output: The string output produced by the node.
    """
    conn = _get_connection()
    try:
        import time
        conn.execute(
            """
            INSERT OR REPLACE INTO node_outputs (workflow_id, node_id, output, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (workflow_id, node_id, output, time.time()),
        )
        conn.commit()
    finally:
        conn.close()


def get_node_output(workflow_id: str, node_id: str) -> str | None:
    """
    Retrieve a previously saved node output from the cache.

    Args:
        workflow_id: The workflow run identifier.
        node_id: The node whose cached output to retrieve.

    Returns:
        The cached output string, or None if not found.
    """
    conn = _get_connection()
    try:
        cursor = conn.execute(
            "SELECT output FROM node_outputs WHERE workflow_id = ? AND node_id = ?",
            (workflow_id, node_id),
        )
        row = cursor.fetchone()
        return row[0] if row else None
    finally:
        conn.close()


def clear_workflow_state(workflow_id: str) -> None:
    """
    Delete all saved state for a given workflow run.
    Called when starting a fresh execution.

    Args:
        workflow_id: The workflow run to clear.
    """
    conn = _get_connection()
    try:
        conn.execute(
            "DELETE FROM node_outputs WHERE workflow_id = ?",
            (workflow_id,),
        )
        conn.commit()
    finally:
        conn.close()
