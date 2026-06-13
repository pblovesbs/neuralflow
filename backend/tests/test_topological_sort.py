import pytest
from core.graph_parser.topological_sort import topological_sort, CyclicGraphError
from api.models import DagEdge


def test_topological_sort_linear():
    nodes = ["A", "B", "C"]
    edges = [DagEdge(source="A", target="B"), DagEdge(source="B", target="C")]
    order = topological_sort(nodes, edges)
    assert order == ["A", "B", "C"]


def test_topological_sort_branching():
    nodes = ["A", "B", "C", "D"]
    edges = [
        DagEdge(source="A", target="B"),
        DagEdge(source="A", target="C"),
        DagEdge(source="B", target="D"),
        DagEdge(source="C", target="D"),
    ]
    order = topological_sort(nodes, edges)
    assert order.index("A") < order.index("B")
    assert order.index("A") < order.index("C")
    assert order.index("B") < order.index("D")
    assert order.index("C") < order.index("D")


def test_topological_sort_cycle():
    nodes = ["A", "B", "C"]
    edges = [
        DagEdge(source="A", target="B"),
        DagEdge(source="B", target="C"),
        DagEdge(source="C", target="A"),
    ]
    with pytest.raises(CyclicGraphError):
        topological_sort(nodes, edges)
