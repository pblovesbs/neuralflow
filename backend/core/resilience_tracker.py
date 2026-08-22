"""
resilience_tracker.py — ContextVar-based tracker for silent resilience interventions.

Uses Python's contextvars module so that each asyncio task (workflow execution)
gets its own isolated list of resilience events. asyncio.create_task() copies
the context automatically, so events tracked in one workflow never bleed into another.

Usage:
    from core.resilience_tracker import track, get_events, reset_events

    # At the start of _run_workflow:
    reset_events()

    # Inside any intervention point:
    track(ResilienceEventType.CONTEXT_PRUNED, node_id, "Pruned 4000 chars")

    # At the end of _run_workflow:
    events = get_events()
"""

from __future__ import annotations

from contextvars import ContextVar
from typing import Optional

from api.models import ResilienceEvent, ResilienceEventType
from core.telemetry import get_timestamp


# Each asyncio task gets its own copy of this list via context propagation.
_current_events: ContextVar[list[ResilienceEvent]] = ContextVar(
    "resilience_events", default=[]
)


def reset_events() -> None:
    """Reset the resilience events list for the current execution context.

    MUST be called at the start of every workflow execution inside a finally-safe block
    to prevent memory leaks across long-running backend processes.
    """
    _current_events.set([])


def track(
    event_type: ResilienceEventType,
    node_id: str,
    message: str,
    timestamp: Optional[str] = None,
) -> None:
    """Record a resilience intervention in the current execution context.

    Args:
        event_type: The type of intervention that occurred.
        node_id: The node that triggered or benefited from the intervention.
        message: A human-readable description of what happened.
        timestamp: Optional ISO timestamp; defaults to now.
    """
    event = ResilienceEvent(
        event_type=event_type,
        node_id=node_id,
        message=message,
        timestamp=timestamp or get_timestamp(),
    )
    events = _current_events.get()
    # Since ContextVar default is shared, we need to ensure we have our own list
    if not events:
        events = []
        _current_events.set(events)
    events.append(event)


def get_events() -> list[ResilienceEvent]:
    """Retrieve all resilience events tracked in the current execution context."""
    return list(_current_events.get())
