"""
demo_resilience_loop.py — Interactive demo showing Phase 1 Resilience & Structured Feedback.
"""

import json
from core.resilience_tracker import track, get_events, reset_events
from api.models import ResilienceEventType
from core.state_db import save_feedback, get_feedback_summary


def run_demo():
    print("\n" + "=" * 70)
    print(" ⚡ NEURALFLOW RESILIENCE & STRUCTURED FEEDBACK DEMO ⚡")
    print("=" * 70 + "\n")

    # 1. Simulate Workflow Execution with Silent Resilience Interventions
    print("▶ Step 1: Workflow Execution & Silent Interventions")
    print("--------------------------------------------------")
    reset_events()

    print("  [EXEC] Starting Workflow 'wf_marketing_auto_402'...")
    
    # Intervention 1: VRAM Gate
    print("  [RESCUE] Concurrency Gate: VRAM contention detected → Auto-serializing node 'agent_summarizer'")
    track(
        ResilienceEventType.VRAM_SERIALIZED,
        node_id="agent_summarizer",
        message="Node 'agent_summarizer' queued sequentially due to insufficient VRAM"
    )

    # Intervention 2: Context Pruning
    print("  [RESCUE] Smart Context Pruning: 18,400 chars input → Pruned 6,400 chars to fit context window")
    track(
        ResilienceEventType.CONTEXT_PRUNED,
        node_id="agent_writer",
        message="Pruned 6,400 chars (from 18,400 to 12,000)"
    )

    # Intervention 3: Cache Resume
    print("  [RESCUE] State DB: Cache hit on node 'trigger_files' → Resuming from cache")
    track(
        ResilienceEventType.RESUMED_FROM_CACHE,
        node_id="trigger_files",
        message="Resumed from cached state"
    )

    events = get_events()
    print(f"\n  ✓ Execution Completed! Collected {len(events)} resilience events during execution.\n")

    # 2. Show WebSocket Event Payload sent to Frontend
    print("▶ Step 2: WebSocket 'feedback_prompt' Event Emitted to Frontend")
    print("--------------------------------------------------------------")
    ws_payload = {
        "type": "feedback_prompt",
        "workflow_id": "wf_marketing_auto_402",
        "status": "completed",
        "resilience_events": [e.model_dump() for e in events]
    }
    print(json.dumps(ws_payload, indent=2))
    print()

    # 3. Simulate Frontend Tiered Prompt
    print("▶ Step 3: Frontend UI Renders Tiered Feedback Slot")
    print("--------------------------------------------------")
    print("  +-------------------------------------------------------------------------+")
  # Output the formatted UI card
    print("  | ⚡ NeuralFlow adjusted resources mid-run (Serialized VRAM,              |")
    print("  |    Pruned Context, Resumed from Cache). How is the output quality?      |")
    print("  |                                                                         |")
    print("  |   [✅ Recovery Worked (5★)]   [⚠️ Lost Some Details (3★)]   [❌ Missed (1★)] |")
    print("  +-------------------------------------------------------------------------+\n")

    # 4. Simulate User Feedback Submission
    print("▶ Step 4: User Submits Feedback via POST /api/feedback")
    print("-----------------------------------------------------")
    save_feedback(
        workflow_id="wf_marketing_auto_402",
        rating=5,
        category="recovery_worked",
        resilience_events_json=json.dumps([e.model_dump() for e in events]),
        comment="Output remained coherent despite aggressive context pruning!"
    )
    print("  ✓ Feedback recorded to SQLite state.db\n")

    # 5. Query Analytics Summary API
    print("▶ Step 5: Telemetry Analytics via GET /api/feedback/summary")
    print("----------------------------------------------------------")
    summary = get_feedback_summary()
    print(json.dumps(summary, indent=2))
    print("\n" + "=" * 70)
    print(" 🎉 DEMO COMPLETE: Full resilience telemetry loop verified!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    run_demo()
