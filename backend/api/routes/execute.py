"""
Execute-graph API route.
Validates DAG payload, runs topological sort, and executes nodes sequentially.
"""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, BackgroundTasks, HTTPException

from api.models import DagWorkflow, ExecutionResponse, ExecutionStatus, NodeType
from api.routes.websocket import manager
from core.executor import broadcast_log, execute_node
from core.graph_parser.topological_sort import CyclicGraphError, topological_sort
from core.ollama_client.client import global_ollama_client

router = APIRouter()


async def _run_workflow(workflow: DagWorkflow):
    """
    Background task that executes the entire DAG workflow concurrently.
    Nodes run as soon as their dependencies complete.
    """
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

        # Stop early if the workflow has failed in another branch
        if workflow_failed.is_set():
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
            node_outputs[node_id] = cached_output
            completed_events[node_id].set()
            return

        input_context = "\n\n".join(node_outputs.get(pred, "") for pred in predecessors)

        try:
            output = await execute_node(
                node=node,
                input_context=input_context,
                ws_manager=manager,
                ollama=global_ollama_client,
                bypass_ram_check=workflow.bypass_ram_check,
            )
            node_outputs[node_id] = output
            save_node_output(workflow.workflow_id, node_id, output)
        except Exception as e:
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
    running_tasks = {}

    from core.hardware import get_available_vram_bytes, estimate_vram_required

    async def _execute_ready_batch():
        nonlocal ready_nodes, pending_nodes
        while ready_nodes or running_tasks:
            # Check for failures
            if workflow_failed.is_set():
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

                    if req_vram > available_vram and running_tasks:
                        # Serialize it: wait for current tasks to finish to free memory
                        await broadcast_log(
                            manager,
                            "system",
                            f"Hardware optimization active: Your device does not have enough free memory to run '{node_id}' simultaneously. "
                            f"To prevent a system freeze, NeuralFlow is safely queuing it sequentially.",
                            "INFO",
                        )
                        continue  # Skip scheduling this node for now

                    # We have enough memory or there are no running tasks (force run to avoid deadlock)
                    available_vram -= req_vram

                # Schedule the node
                ready_nodes.remove(node_id)
                scheduled_this_tick.append(node_id)
                running_tasks[node_id] = asyncio.create_task(_run_node(node_id))

            if not running_tasks:
                break

            # Wait for at least one task to finish before re-evaluating the gate
            done, _ = await asyncio.wait(
                running_tasks.values(), return_when=asyncio.FIRST_COMPLETED
            )

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

    # Launch the scheduler loop
    await _execute_ready_batch()

    if not workflow_failed.is_set():
        await broadcast_log(
            manager,
            "system",
            f"═══ Workflow '{workflow.workflow_id}' completed successfully ═══",
            "SUCCESS",
        )


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
    # Validate: check for cycles before starting
    node_ids = [node.id for node in workflow.nodes]
    try:
        topological_sort(node_ids, workflow.edges)
    except CyclicGraphError:
        # Broadcast friendly message via WS instead of raw HTTP error
        import asyncio

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

    # Launch execution as background task
    background_tasks.add_task(_run_workflow, workflow)

    return ExecutionResponse(
        status=ExecutionStatus.STARTED,
        workflow_id=workflow.workflow_id,
        message=f"Workflow started with {len(workflow.nodes)} nodes.",
    )
