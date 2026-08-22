"""
test_resilience_feedback.py — Tests for Phase 1 Silent Resilience & Structured Feedback.
"""

import pytest
import asyncio
from fastapi.testclient import TestClient

from main import app
from core.resilience_tracker import track, get_events, reset_events
from api.models import ResilienceEventType


client = TestClient(app)


def test_resilience_tracker_context_isolation():
    """Verify that resilience events are tracked per execution context."""
    reset_events()
    assert len(get_events()) == 0

    track(
        event_type=ResilienceEventType.CONTEXT_PRUNED,
        node_id="agent_1",
        message="Pruned 1,500 characters to fit context window",
    )
    track(
        event_type=ResilienceEventType.VRAM_SERIALIZED,
        node_id="agent_2",
        message="VRAM limit exceeded, serialized node",
    )

    events = get_events()
    assert len(events) == 2
    assert events[0].event_type == ResilienceEventType.CONTEXT_PRUNED
    assert events[0].node_id == "agent_1"
    assert events[1].event_type == ResilienceEventType.VRAM_SERIALIZED

    # Cleanup
    reset_events()
    assert len(get_events()) == 0


@pytest.mark.asyncio
async def test_resilience_tracker_async_task_isolation():
    """Verify that two concurrent tasks have isolated resilience event lists."""
    async def task_a():
        reset_events()
        track(ResilienceEventType.MODEL_AUTO_PULLED, "node_a", "Pulled model")
        await asyncio.sleep(0.01)
        events = get_events()
        assert len(events) == 1
        assert events[0].node_id == "node_a"
        reset_events()

    async def task_b():
        reset_events()
        track(ResilienceEventType.RAM_GUARDRAIL_PAUSED, "node_b", "RAM paused")
        await asyncio.sleep(0.01)
        events = get_events()
        assert len(events) == 1
        assert events[0].node_id == "node_b"
        reset_events()

    await asyncio.gather(task_a(), task_b())


def test_feedback_api_submit_and_summary():
    """Test POST /api/feedback and GET /api/feedback/summary endpoints."""
    import time
    workflow_id = f"test_wf_{time.time()}"

    payload = {
        "workflow_id": workflow_id,
        "rating": 4,
        "category": "recovery_worked",
        "resilience_events": [
            {
                "event_type": "context_pruned",
                "node_id": "agent_1",
                "message": "Pruned 2,000 chars",
                "timestamp": "2026-08-22T12:00:00Z"
            }
        ],
        "comment": "Output remained coherent despite context pruning."
    }

    response = client.post("/api/feedback", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"

    # Query summary
    summary_resp = client.get("/api/feedback/summary")
    assert summary_resp.status_code == 200
    summary_data = summary_resp.json()
    assert summary_data["status"] == "ok"
    assert summary_data["total_feedback"] >= 1
    assert "recovery_worked" in summary_data["categories"]
    assert "context_pruned" in summary_data["intervention_analysis"]
