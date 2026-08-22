"""
Feedback API routes — structured user feedback on resilience interventions.

POST /api/feedback       — Submit feedback after a workflow run.
GET  /api/feedback/summary — Aggregate feedback analytics.
"""

from __future__ import annotations

from fastapi import APIRouter

from api.models import WorkflowFeedback
from core.state_db import save_feedback, get_feedback_summary

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])


@router.post("")
async def submit_feedback(feedback: WorkflowFeedback):
    """
    Accept structured user feedback after a workflow completes.
    Persists the feedback along with any resilience events that occurred.
    """
    import json
    import os
    from datetime import datetime

    events_json = json.dumps(
        [event.model_dump() for event in feedback.resilience_events]
    )

    # Database save (if applicable)
    try:
        save_feedback(
            workflow_id=feedback.workflow_id,
            rating=feedback.rating,
            category=feedback.category.value,
            resilience_events_json=events_json,
            comment=feedback.comment,
        )
    except Exception as e:
        print(f"Warning: Database save failed: {e}")

    # Write to complain.txt at the top level
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    feedback_dir = os.path.join(project_root, "feedback")
    os.makedirs(feedback_dir, exist_ok=True)
    complain_file = os.path.join(feedback_dir, "complain.txt")

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(complain_file, "a") as f:
        f.write(f"[{timestamp}] Workflow ID: {feedback.workflow_id}\n")
        f.write(f"Rating: {feedback.rating}/5 Stars\n")
        f.write(f"Comment: {feedback.comment or 'No comment provided'}\n")
        f.write("-" * 50 + "\n")

    return {"status": "ok", "message": "Feedback recorded successfully."}


@router.get("/summary")
async def feedback_summary():
    """
    Return aggregated feedback analytics.

    Includes:
    - Total feedback count and average rating.
    - Breakdown by feedback category.
    - Per-intervention-type analysis (e.g., does context pruning hurt output quality?).
    """
    summary = get_feedback_summary()
    return {"status": "ok", **summary}
