import pytest
from core.context_pruner import prune_context


@pytest.mark.asyncio
async def test_prune_context_under_limit():
    content = "Hello, World!"
    pruned = await prune_context(content, max_chars=100)
    assert pruned == "Hello, World!"


@pytest.mark.asyncio
async def test_prune_context_over_limit():
    content = "word " * 150
    pruned = await prune_context(content, max_chars=100)
    assert (
        len(pruned) <= 200
    )  # With the truncation message, it will be around ~100-200 chars
    assert "TRUNCATED" in pruned


@pytest.mark.asyncio
async def test_prune_context_empty():
    pruned = await prune_context("", max_chars=10)
    assert pruned == ""
