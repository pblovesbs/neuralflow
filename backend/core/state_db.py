"""
state_db.py — SQLite-backed pipeline state machine.

Persists the output of every successfully executed node.
Allows the engine to resume a workflow from the last successful step
without re-running expensive upstream computations.

DB location: ~/.neuralflow/state.db
"""

from __future__ import annotations

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
    conn.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id       TEXT NOT NULL,
            rating            INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
            category          TEXT NOT NULL,
            resilience_events TEXT NOT NULL DEFAULT '[]',
            comment           TEXT,
            created_at        REAL NOT NULL DEFAULT (unixepoch('now', 'subsec'))
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


# ─── Feedback Persistence ──────────────────────────────────────────────────────


def save_feedback(
    workflow_id: str,
    rating: int,
    category: str,
    resilience_events_json: str = "[]",
    comment: str | None = None,
) -> None:
    """
    Persist structured user feedback for a workflow run.

    Args:
        workflow_id: The workflow this feedback relates to.
        rating: 1-5 quality rating.
        category: Feedback category (e.g., 'recovery_worked', 'output_quality').
        resilience_events_json: JSON-serialized list of resilience events.
        comment: Optional free-text comment.
    """
    conn = _get_connection()
    try:
        import time

        conn.execute(
            """
            INSERT INTO feedback (workflow_id, rating, category, resilience_events, comment, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (workflow_id, rating, category, resilience_events_json, comment, time.time()),
        )
        conn.commit()
    finally:
        conn.close()


def get_feedback_summary() -> dict:
    """
    Aggregate feedback data for the analytics API.

    Returns:
        A dict with total count, average rating, category breakdown,
        and per-intervention-type average ratings.
    """
    conn = _get_connection()
    try:
        cursor = conn.execute("SELECT COUNT(*), AVG(rating) FROM feedback")
        row = cursor.fetchone()
        total_count = row[0] or 0
        avg_rating = round(row[1], 2) if row[1] else None

        # Category breakdown
        cursor = conn.execute(
            "SELECT category, COUNT(*), AVG(rating) FROM feedback GROUP BY category"
        )
        categories = {}
        for cat_row in cursor.fetchall():
            categories[cat_row[0]] = {
                "count": cat_row[1],
                "avg_rating": round(cat_row[2], 2) if cat_row[2] else None,
            }

        # Per-intervention-type analysis: parse resilience_events JSON
        import json

        cursor = conn.execute(
            "SELECT rating, resilience_events FROM feedback WHERE resilience_events != '[]'"
        )
        intervention_ratings: dict[str, list[int]] = {}
        for fb_row in cursor.fetchall():
            rating_val = fb_row[0]
            try:
                events = json.loads(fb_row[1])
                for event in events:
                    etype = event.get("event_type", "unknown")
                    intervention_ratings.setdefault(etype, []).append(rating_val)
            except (json.JSONDecodeError, TypeError):
                pass

        intervention_summary = {}
        for etype, ratings in intervention_ratings.items():
            intervention_summary[etype] = {
                "count": len(ratings),
                "avg_rating": round(sum(ratings) / len(ratings), 2),
            }

        return {
            "total_feedback": total_count,
            "avg_rating": avg_rating,
            "categories": categories,
            "intervention_analysis": intervention_summary,
        }
    finally:
        conn.close()

