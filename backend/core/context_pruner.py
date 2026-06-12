"""
context_pruner.py — RAG Context Pruner for local AI workflows.

When input context exceeds the model's capacity (e.g. reading a 100-page PDF),
this module applies a Hybrid RAG strategy to reduce it to a safe size.

Primary Path: Dense Vector RAG (fast, efficient).
Fallback: Map-Reduce Summarization (slow, used only when global context is explicitly required).
"""

from __future__ import annotations

from core.memory_manager import _chunk_text, _generate_embeddings, _CHROMA_AVAILABLE

async def prune_context(context_text: str, query: str = None, max_chars: int = 24_000) -> str:
    """
    Prune long context to fit within max_chars constraint.
    If a query is provided and ChromaDB is available, uses local embeddings to rank
    the most relevant chunks (Dense Vector RAG).
    Otherwise, falls back to simple truncation (to avoid Map-Reduce VRAM fatigue).
    """
    if len(context_text) <= max_chars:
        return context_text

    if query and _CHROMA_AVAILABLE:
        try:
            # 1. Chunk the input
            chunk_size_chars = 2000
            chunks = _chunk_text(context_text, chunk_size=chunk_size_chars // 4) # approx 500 words
            
            # 2. Get embeddings for chunks
            chunk_embeddings = await _generate_embeddings(chunks)
            
            # 3. Get embedding for query
            query_embedding = (await _generate_embeddings([query]))[0]
            
            # 4. Calculate cosine similarity
            import numpy as np
            q_vec = np.array(query_embedding)
            similarities = []
            for i, emb in enumerate(chunk_embeddings):
                c_vec = np.array(emb)
                # Cosine similarity
                sim = np.dot(q_vec, c_vec) / (np.linalg.norm(q_vec) * np.linalg.norm(c_vec))
                similarities.append((sim, chunks[i]))
            
            # 5. Sort by most similar
            similarities.sort(key=lambda x: x[0], reverse=True)
            
            # 6. Reconstruct context up to max_chars
            pruned_text = ""
            for sim, chunk in similarities:
                if len(pruned_text) + len(chunk) + 10 > max_chars:
                    break
                pruned_text += f"... {chunk} ...\n\n"
                
            return "[PRUNED CONTEXT (Top Relevant Sections)]:\n" + pruned_text
        except Exception as e:
            # Fallback if embedding fails
            pass

    # Default fallback: safe truncation (first half, last half)
    half = max_chars // 2
    truncated_msg = f"\n\n... [TRUNCATED {len(context_text) - max_chars:,} chars] ...\n\n"
    return context_text[:half] + truncated_msg + context_text[-half:]
