"""
Topological sort using Kahn's Algorithm (BFS-based).
Detects cycles and returns execution order for DAG nodes.
"""

from __future__ import annotations

from collections import deque
from typing import Sequence

from api.models import DagEdge


class CyclicGraphError(Exception):
    """Raised when the DAG contains a cycle."""

    def __init__(self, message: str = "Graph contains a cycle — cannot determine execution order."):
        super().__init__(message)


def topological_sort(node_ids: list[str], edges: Sequence[DagEdge]) -> list[str]:
    """
    Perform a topological sort on the DAG using Kahn's algorithm.

    Args:
        node_ids: List of all node IDs in the graph.
        edges: List of directed edges (source → target).

    Returns:
        Ordered list of node IDs representing valid execution order.

    Raises:
        CyclicGraphError: If the graph contains a cycle.
    """
    # Build adjacency list and in-degree map
    adjacency: dict[str, list[str]] = {nid: [] for nid in node_ids}
    in_degree: dict[str, int] = {nid: 0 for nid in node_ids}

    for edge in edges:
        adjacency[edge.source].append(edge.target)
        in_degree[edge.target] += 1

    # Initialize queue with all nodes having in-degree 0
    queue: deque[str] = deque()
    for nid in node_ids:
        if in_degree[nid] == 0:
            queue.append(nid)

    sorted_order: list[str] = []

    while queue:
        current = queue.popleft()
        sorted_order.append(current)

        for neighbor in adjacency[current]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    # If we couldn't sort all nodes, there's a cycle
    if len(sorted_order) != len(node_ids):
        unsorted = set(node_ids) - set(sorted_order)
        raise CyclicGraphError(
            f"Cycle detected involving nodes: {', '.join(unsorted)}. "
            "Cannot execute a cyclic workflow."
        )

    return sorted_order
