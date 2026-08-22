"""
Execute-graph API route.
Validates DAG payload, runs topological sort, and executes nodes sequentially.
"""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, BackgroundTasks, HTTPException

from api.models import DagWorkflow, ExecutionResponse, ExecutionStatus, NodeType, ResilienceEventType, ActionableErrorPayload, ActionType, NodeRecoveryRequest
from api.routes.websocket import manager
from core.executor import broadcast_log, execute_node
from core.graph_parser.topological_sort import CyclicGraphError, topological_sort
from core.ollama_client.client import global_ollama_client, OllamaConnectionError
from core.resilience_tracker import track, get_events, reset_events

router = APIRouter()

# Global dict to track running workflows for engine status and force stop
active_workflow_tasks: dict[str, asyncio.Task] = {}
cancel_events: dict[str, asyncio.Event] = {}

# Global dict to track paused nodes waiting for Human-in-the-Loop recovery
# Keys are (workflow_id, node_id). Values contain the asyncio.Event and resolution details.
pending_recoveries: dict[tuple[str, str], dict] = {}



async def _run_workflow(workflow: DagWorkflow):
    """
    Background task that executes the entire DAG workflow concurrently.
    Nodes run as soon as their dependencies complete.
    """
    # Initialize resilience tracker for this workflow execution context
    reset_events()

    await broadcast_log(
        manager,
        "system",
        f"═══ Workflow '{workflow.workflow_id}' started ═══",
        "INFO",
    )

    # Build node lookup
    node_map = {node.id: node for node in workflow.nodes}

    # Validate graph (though already validated in execute_graph)
    node_ids = [node.id for node in workflow.nodes]
    try:
        execution_order = topological_sort(node_ids, workflow.edges)
    except CyclicGraphError:
        await broadcast_log(
            manager,
            "system",
            "Oops! Two of your steps are pointing at each other in an infinite loop. "
            "Try reversing one of the connections to fix the flow.",
            "ERROR",
        )
        return

    await broadcast_log(
        manager,
        "system",
        f"Topological order: {' → '.join(execution_order)}",
    )

    # Build maps for predecessors
    edge_map: dict[str, list[str]] = {}
    for edge in workflow.edges:
        edge_map.setdefault(edge.target, []).append(edge.source)

    node_outputs: dict[str, str] = {}
    completed_events = {node.id: asyncio.Event() for node in workflow.nodes}
    workflow_failed = asyncio.Event()

    async def _run_node(node_id: str):
        node = node_map[node_id]

        # Wait for all predecessors to complete
        predecessors = edge_map.get(node_id, [])
        for pred in predecessors:
            await completed_events[pred].wait()

        # Stop early if the workflow has failed or was cancelled
        if workflow_failed.is_set() or cancel_events[workflow.workflow_id].is_set():
            return

        await broadcast_log(
            manager,
            node_id,
            f"──── Executing node: {node_id} ({node.type.value}) ────",
        )

        from core.state_db import get_node_output, save_node_output

        cached_output = get_node_output(workflow.workflow_id, node_id)
        if cached_output:
            await broadcast_log(
                manager,
                node_id,
                "⏭️ Resuming from cached state",
                "SUCCESS",
            )
            track(ResilienceEventType.RESUMED_FROM_CACHE, node_id, "Resumed from cached state")
            node_outputs[node_id] = cached_output
            completed_events[node_id].set()
            return

        input_context = "\n\n".join(node_outputs.get(pred, "") for pred in predecessors)

        try:
            while True:
                try:
                    output = await execute_node(
                        node=node,
                        input_context=input_context,
                        ws_manager=manager,
                        ollama=global_ollama_client,
                        bypass_ram_check=workflow.bypass_ram_check or False,
                    )
                    node_outputs[node_id] = output
                    save_node_output(workflow.workflow_id, node_id, output)
                    break  # Success, exit the retry loop
                except Exception as e:
                    from core.safe_executor import SandboxViolationError
                    from core.executor import LowConfidenceError
                    
                    if isinstance(e, (SandboxViolationError, LowConfidenceError)):
                        is_sandbox = isinstance(e, SandboxViolationError)
                        msg_type = "Sandbox Violation" if is_sandbox else "Low Confidence"
                        await broadcast_log(
                            manager,
                            node_id,
                            f"⚠️ {msg_type}: {e.message}. Pausing node for user review...",
                            "WARN",
                        )
                        import json
                        await manager.broadcast(json.dumps({
                            "type": "recovery_required",
                            "workflow_id": workflow.workflow_id,
                            "node_id": node_id,
                            "reason": e.message,
                            "violation": {"module_name": e.module_name if is_sandbox else "confidence", "message": e.message},
                            "original_output": getattr(e, "original_output", "")
                        }))
                        
                        # Pause and wait for user resolution
                        recovery_event = asyncio.Event()
                        pending_recoveries[(workflow.workflow_id, node_id)] = {
                            "event": recovery_event,
                            "action": None,
                            "edited_output": None,
                            "edited_code": None
                        }
                        
                        await recovery_event.wait()
                        
                        # Process resolution
                        resolution = pending_recoveries.pop((workflow.workflow_id, node_id))
                        action = resolution.get("action")
                        
                        if action == "skip":
                            node_outputs[node_id] = getattr(e, "original_output", "") if not is_sandbox else ""
                            save_node_output(workflow.workflow_id, node_id, node_outputs[node_id])
                            await broadcast_log(manager, node_id, "[INTERVENTION_AUDIT] User chose to SKIP node review.", "INFO")
                            break
                        elif action == "edit":
                            node_outputs[node_id] = resolution.get("edited_output", "")
                            save_node_output(workflow.workflow_id, node_id, node_outputs[node_id])
                            await broadcast_log(manager, node_id, "[INTERVENTION_AUDIT] User provided EDITED output.", "INFO")
                            break
                        elif action == "retry" or action == "rewrite":
                            await broadcast_log(manager, node_id, "[INTERVENTION_AUDIT] User chose to RETRY node execution.", "INFO")
                            continue
                        elif action == "whitelist":
                            # In a real impl, we'd add to the sandbox whitelist dynamically. 
                            # Here we'll allow it to pass by treating as skip.
                            node_outputs[node_id] = getattr(e, "original_output", "") if not is_sandbox else ""
                            save_node_output(workflow.workflow_id, node_id, node_outputs[node_id])
                            await broadcast_log(manager, node_id, "[INTERVENTION_AUDIT] User chose to WHITELIST module (bypassed execution).", "INFO")
                            break
                    elif isinstance(e, OllamaConnectionError):
                        import json
                        actionable_payload = ActionableErrorPayload(
                            error_code="ollama_offline",
                            title="Ollama Engine Offline",
                            message="NeuralFlow cannot communicate with Ollama on http://localhost:11434.",
                            action_label="▶ Start Ollama Engine",
                            action_type=ActionType.API_CALL,
                            action_endpoint="/api/system/start-ollama",
                            manual_command="ollama serve",
                            resumable=True,
                            node_id=node_id,
                            workflow_id=workflow.workflow_id
                        )
                        
                        await manager.broadcast(json.dumps({
                            "type": "actionable_error",
                            "payload": actionable_payload.model_dump()
                        }))
                        
                        # Pause workflow execution branch
                        recovery_event = asyncio.Event()
                        pending_recoveries[(workflow.workflow_id, node_id)] = {
                            "event": recovery_event,
                            "action": None
                        }
                        await recovery_event.wait()
                        
                        # Resumed! Clean up pending_recoveries and retry the loop
                        pending_recoveries.pop((workflow.workflow_id, node_id), None)
                        await broadcast_log(manager, node_id, "Attempting to reconnect and retry node execution...", "INFO")
                        continue
                    else:
                        workflow_failed.set()
                        await broadcast_log(
                            manager,
                            node_id,
                            f"✗ Fatal error: {str(e)}",
                            "ERROR",
                        )
                        await broadcast_log(
                            manager,
                            "system",
                            f"═══ Workflow FAILED at node '{node_id}' ═══",
                            "ERROR",
                        )
                        return
        finally:
            # Signal this node is done
            completed_events[node_id].set()

    # ── Hardware Adaptive Engine: Sliding Concurrency Gate ──
    ready_nodes = [n for n in node_ids if not edge_map.get(n)]
    pending_nodes = set(node_ids) - set(ready_nodes)
    from typing import Any
    running_tasks: dict[str, asyncio.Task[Any]] = {}

    from core.hardware import get_available_vram_bytes, estimate_vram_required

    async def _execute_ready_batch():
        nonlocal ready_nodes, pending_nodes
        cancel_event = cancel_events[workflow.workflow_id]
        
        while ready_nodes or running_tasks:
            # Check for failures or cancellations
            if workflow_failed.is_set() or cancel_event.is_set():
                break

            # If there are ready nodes, try to schedule them based on hardware
            scheduled_this_tick = []

            # Re-read available VRAM dynamically
            available_vram = await get_available_vram_bytes()

            # Account for nodes that are currently running
            for running_node_id in running_tasks:
                running_node = node_map[running_node_id]
                if running_node.type == NodeType.AGENT:
                    model = getattr(running_node.data, "model", "qwen2.5:0.5b")
                    available_vram -= estimate_vram_required(model)

            # Safety buffer to prevent 100% saturation
            available_vram = max(
                0, available_vram - (512 * 1024 * 1024)
            )  # 512MB buffer

            for node_id in list(ready_nodes):
                node = node_map[node_id]

                # If it's an AI model, check RAM
                if node.type == NodeType.AGENT:
                    model = getattr(node.data, "model", "qwen2.5:0.5b")
                    req_vram = estimate_vram_required(model)

                    if req_vram > available_vram:
                        if running_tasks:
                            # Serialize it: wait for current tasks to finish to free memory
                            await broadcast_log(
                                manager,
                                "system",
                                f"Hardware optimization active: Your device does not have enough free memory to run '{node_id}' simultaneously. "
                                f"To prevent a system freeze, NeuralFlow is safely queuing it sequentially.",
                                "INFO",
                            )
                            track(ResilienceEventType.VRAM_SERIALIZED, node_id, f"Node '{node_id}' queued sequentially due to insufficient VRAM")
                            continue  # Skip scheduling this node for now
                        else:
                            # TRUE DEADLOCK
                            await broadcast_log(
                                manager,
                                node_id,
                                f"⚠️ Hardware Deadlock: Node requires {req_vram} bytes VRAM, but only {available_vram} is free.",
                                "WARN"
                            )
                            import json
                            await manager.broadcast(json.dumps({
                                "type": "recovery_required",
                                "workflow_id": workflow.workflow_id,
                                "node_id": node_id,
                                "reason": f"Hardware Deadlock: Model requires {req_vram} bytes VRAM, but only {available_vram} is free. Fallback to smaller model (Edit/Retry) or Skip?",
                                "violation": {
                                    "module_name": "hardware", 
                                    "message": "Deadlock",
                                    "req_vram": req_vram,
                                    "available_vram": available_vram
                                }
                            }))
                            
                            recovery_event = asyncio.Event()
                            pending_recoveries[(workflow.workflow_id, node_id)] = {
                                "event": recovery_event,
                                "action": None,
                                "edited_output": None,
                                "edited_code": None
                            }
                            await recovery_event.wait()
                            
                            resolution = pending_recoveries.pop((workflow.workflow_id, node_id))
                            action = resolution.get("action")
                            if action == "skip":
                                node_outputs[node_id] = ""
                                completed_events[node_id].set()
                                ready_nodes.remove(node_id)
                                
                                # Unblock dependencies manually since it won't hit asyncio.wait
                                for child_id, parent_ids in edge_map.items():
                                    if child_id in pending_nodes and all(completed_events[p].is_set() for p in parent_ids):
                                        ready_nodes.append(child_id)
                                        pending_nodes.remove(child_id)
                                
                                continue
                            elif action == "force_free":
                                # Unload all loaded models to free VRAM without killing the server
                                await broadcast_log(manager, node_id, "Purging all loaded models from VRAM...", "INFO")
                                try:
                                    from core.ollama_client.client import global_ollama_client
                                    # Unload every model currently loaded in Ollama
                                    import httpx
                                    async with httpx.AsyncClient(timeout=5.0) as hc:
                                        resp = await hc.get("http://127.0.0.1:11434/api/ps")
                                        if resp.status_code == 200:
                                            loaded = resp.json().get("models", [])
                                            for m in loaded:
                                                mname = m.get("model", m.get("name", ""))
                                                if mname:
                                                    await global_ollama_client.unload_model(mname)
                                    await asyncio.sleep(2)  # wait for VRAM to clear
                                except Exception as unload_err:
                                    await broadcast_log(manager, node_id, f"VRAM cleanup encountered an issue: {unload_err}. Retrying anyway.", "WARN")
                                await broadcast_log(manager, node_id, "VRAM cleanup complete. Retrying with same model.", "INFO")
                                req_vram = estimate_vram_required(node.data.model or "qwen2.5:0.5b")
                            elif action == "fallback":
                                fallback_model = resolution.get("edited_output") or ""
                                if fallback_model:
                                    node.data.model = fallback_model
                                    await broadcast_log(manager, node_id, f"Switched to user-selected fallback model: {fallback_model}.", "INFO")
                                    req_vram = estimate_vram_required(fallback_model)
                                else:
                                    node.data.model = "qwen2.5:0.5b"
                                    req_vram = estimate_vram_required("qwen2.5:0.5b")
                            elif action == "edit" or action == "retry" or action == "rewrite":
                                # Automatically downgrade to a smaller model to avoid deadlock
                                node.data.model = "qwen2.5:0.5b" # a very small fallback
                                await broadcast_log(manager, node_id, "Downgraded model to bypass deadlock.", "INFO")
                                req_vram = estimate_vram_required("qwen2.5:0.5b")
                            else:
                                workflow_failed.set()
                                break

                    # We have enough memory or we downgraded
                    available_vram -= req_vram

                # Schedule the node
                ready_nodes.remove(node_id)
                scheduled_this_tick.append(node_id)
                running_tasks[node_id] = asyncio.create_task(_run_node(node_id))

            if not running_tasks:
                break

            # Wait for at least one task to finish, or cancellation
            cancel_task = asyncio.create_task(cancel_event.wait())
            tasks_to_wait = list(running_tasks.values()) + [cancel_task]
            
            done, pending_wait = await asyncio.wait(
                tasks_to_wait, return_when=asyncio.FIRST_COMPLETED
            )
            
            if cancel_task in done:
                # Cancelled! Break the loop
                cancel_task.cancel()
                break
            else:
                cancel_task.cancel()

            # Process completed tasks
            for task in done:
                # Find which node_id this task belonged to
                completed_node_id = next(
                    nid for nid, t in running_tasks.items() if t == task
                )
                del running_tasks[completed_node_id]

                # Check for newly unblocked nodes
                for pending in list(pending_nodes):
                    predecessors = edge_map.get(pending, [])
                    if all(completed_events[p].is_set() for p in predecessors):
                        pending_nodes.remove(pending)
                        ready_nodes.append(pending)

    try:
        # Launch the scheduler loop
        await _execute_ready_batch()

        if not workflow_failed.is_set():
            await broadcast_log(
                manager,
                "system",
                f"═══ Workflow '{workflow.workflow_id}' completed successfully ═══",
                "SUCCESS",
            )

            # ── Emit Resilience Feedback Prompt ──────────────────────────────
            import json
            resilience_events = get_events()
            feedback_payload = json.dumps({
                "type": "feedback_prompt",
                "workflow_id": workflow.workflow_id,
                "status": "completed",
                "resilience_events": [
                    event.model_dump() for event in resilience_events
                ],
            })
            try:
                await manager.broadcast(feedback_payload)
            except Exception:
                pass  # Don't fail workflow over feedback broadcast

    except asyncio.CancelledError:
        # This handles abrupt Task cancellation
        pass
    finally:
        # Graceful wait for running tasks if cancelled via event
        cancel_ev = cancel_events.get(workflow.workflow_id)
        if cancel_ev and cancel_ev.is_set() and running_tasks:
            await broadcast_log(manager, "system", "Waiting for current safe operations to finish...", "INFO")
            await asyncio.gather(*running_tasks.values(), return_exceptions=True)
            
        if cancel_ev and cancel_ev.is_set():
            await broadcast_log(
                manager,
                "system",
                f"═══ Workflow '{workflow.workflow_id}' cleanly stopped ═══",
                "WARN",
            )
            
        # Clean up resilience tracker context to prevent memory leaks
        reset_events()
        # Clean up global task tracker (use .pop() for safe access — stop_engine may have cleared these already)
        active_workflow_tasks.pop(workflow.workflow_id, None)
        cancel_events.pop(workflow.workflow_id, None)


@router.post("/execute-graph", response_model=ExecutionResponse)
async def execute_graph(
    workflow: DagWorkflow,
    background_tasks: BackgroundTasks,
):
    """
    Execute a DAG workflow.

    Validates the graph structure (no cycles, valid references),
    then launches execution as a background task.
    Real-time logs are streamed via the /ws/logs WebSocket endpoint.
    """
    # 1. Health check the AI backend server before starting
    # If bypass_ram_check is true, it means Force Start is active, so we bypass strict health requirements.
    if not workflow.bypass_ram_check:
        is_ollama_healthy = await global_ollama_client.health_check()
        if not is_ollama_healthy:
            raise HTTPException(
                status_code=503, 
                detail="The AI backend server (Ollama) is not running. Please start it before executing automations."
            )

    # 2. Validate: check for cycles before starting
    node_ids = [node.id for node in workflow.nodes]
    try:
        topological_sort(node_ids, workflow.edges)
    except CyclicGraphError:
        # Broadcast friendly message via WS instead of raw HTTP error

        async def _send_cycle_error():
            await broadcast_log(
                manager,
                "system",
                "Oops! Two of your steps are pointing at each other in a loop. "
                "Try reversing one connection to fix the flow.",
                "ERROR",
            )

        asyncio.create_task(_send_cycle_error())
        raise HTTPException(
            status_code=400, detail="Cyclic graph detected. Check your connections."
        )

    # Cancel any existing workflows before starting a new one
    for task_id, task in list(active_workflow_tasks.items()):
        task.cancel()
        del active_workflow_tasks[task_id]

    # Launch execution explicitly as asyncio Task
    cancel_events[workflow.workflow_id] = asyncio.Event()
    task = asyncio.create_task(_run_workflow(workflow))
    active_workflow_tasks[workflow.workflow_id] = task

    return ExecutionResponse(
        status=ExecutionStatus.STARTED,
        workflow_id=workflow.workflow_id,
        message=f"Workflow started with {len(workflow.nodes)} nodes.",
    )

@router.post("/stop-engine")
async def stop_engine():
    """
    Gracefully stop all currently running workflows by triggering their cancel events.
    """
    count = len(active_workflow_tasks)
    
    # Trigger structured cancellation
    for cancel_event in cancel_events.values():
        cancel_event.set()
        
    # Wait for the tasks to cleanly finish
    if active_workflow_tasks:
        await asyncio.gather(*active_workflow_tasks.values(), return_exceptions=True)
        
    active_workflow_tasks.clear()
    cancel_events.clear()
        
    async def _send_stop_msg():
        await broadcast_log(
            manager,
            "system",
            "🛑 ENGINE STOPPED: All running tasks have been terminated by the user.",
            "ERROR",
        )
    asyncio.create_task(_send_stop_msg())

    return {"status": "stopped", "stopped_tasks": count}

@router.get("/engine-status")
async def engine_status():
    """
    Check if the engine is currently running any workflows.
    """
    is_running = len(active_workflow_tasks) > 0
    return {"is_running": is_running, "active_tasks": len(active_workflow_tasks)}



@router.post("/recovery/resolve")
async def resolve_recovery(request: NodeRecoveryRequest):
    """
    Resolve a paused workflow node waiting for Human-in-the-Loop recovery.
    """
    key = (request.workflow_id, request.node_id)
    if key not in pending_recoveries:
        raise HTTPException(status_code=404, detail="No pending recovery found for this node.")
    
    recovery_data = pending_recoveries[key]
    recovery_data["action"] = request.action.value
    recovery_data["edited_output"] = request.edited_output
    recovery_data["edited_code"] = request.edited_code
    
    # Resume the waiting node
    recovery_data["event"].set()
    
    return {"status": "ok", "message": f"Recovery action '{request.action.value}' dispatched."}

@router.post("/preflight")
async def preflight_simulation(workflow: DagWorkflow):
    """
    Perform a dry-run analysis of the workflow to detect VRAM bottlenecks.
    """
    from core.hardware import get_available_vram_bytes, estimate_vram_required
    
    available_vram = await get_available_vram_bytes()
    max_required_vram = 0
    bottleneck_nodes = []
    
    for node in workflow.nodes:
        if node.type == NodeType.AGENT:
            model = getattr(node.data, "model", "qwen2.5:0.5b")
            req_vram = estimate_vram_required(model)
            if req_vram > max_required_vram:
                max_required_vram = req_vram
            
            if req_vram > available_vram:
                bottleneck_nodes.append({
                    "node_id": node.id,
                    "model": model,
                    "required_vram_mb": req_vram // (1024 * 1024),
                    "available_vram_mb": available_vram // (1024 * 1024)
                })
                
    status = "ok"
    if bottleneck_nodes:
        status = "warning"
        
    return {
        "status": status,
        "available_vram_mb": available_vram // (1024 * 1024),
        "max_required_vram_mb": max_required_vram // (1024 * 1024),
        "bottlenecks": bottleneck_nodes
    }
