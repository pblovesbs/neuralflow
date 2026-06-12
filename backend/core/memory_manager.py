"""
memory_manager.py — Local Vector Database (RAG / Long-Term Memory).

Uses ChromaDB + Ollama's nomic-embed-text for zero-cost local embeddings.
Gracefully degrades if ChromaDB is not installed.
"""

from __future__ import annotations

import os
import uuid
from typing import Optional

# ─── ChromaDB availability check ─────────────────────────────────────────────
_CHROMA_AVAILABLE = False
try:
    import chromadb
    _CHROMA_AVAILABLE = True
except ImportError:
    pass

from core.ollama_client.client import global_ollama_client


# Use a persistent path in the user's home directory
STORAGE_DIR = os.path.expanduser("~/.neuralflow/chroma")

_client = None

def get_client():
    global _client
    if not _CHROMA_AVAILABLE:
        return None
    if _client is None:
        os.makedirs(STORAGE_DIR, exist_ok=True)
        _client = chromadb.PersistentClient(path=STORAGE_DIR)
    return _client


async def _generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate embeddings using local Ollama model."""
    import httpx
    url = f"{global_ollama_client.base_url}/api/embed"
    
    # We use nomic-embed-text, assuming it is installed. 
    # If not, the backend will return an error that we can catch.
    embeddings = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Ollama /api/embed accepts a list of strings
        response = await client.post(
            url, 
            json={"model": "nomic-embed-text", "input": texts}
        )
        if response.status_code == 200:
            data = response.json()
            embeddings = data.get("embeddings", [])
        else:
            raise RuntimeError(f"Ollama embed failed: {response.text}")
            
    return embeddings


def _chunk_text(text: str, chunk_size: int = 512, overlap: int = 50) -> list[str]:
    """Basic sliding window chunker."""
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk:
            chunks.append(chunk)
        i += chunk_size - overlap
    return chunks


async def ingest(text: str, collection_name: str = "default", chunk_size: int = 512) -> dict:
    """Chunk text, generate embeddings, and store in ChromaDB."""
    if not _CHROMA_AVAILABLE:
        return {"status": "error", "error": "ChromaDB not installed (pip install chromadb)"}
    
    if not text.strip():
        return {"status": "skipped", "message": "No text to ingest"}

    client = get_client()
    try:
        collection = client.get_or_create_collection(name=collection_name)
        chunks = _chunk_text(text, chunk_size=chunk_size)
        
        # We need to run embeddings generation
        try:
            embeddings = await _generate_embeddings(chunks)
        except Exception as e:
            return {"status": "error", "error": f"Embedding failed. Make sure to run 'ollama pull nomic-embed-text'. Details: {e}"}

        ids = [str(uuid.uuid4()) for _ in chunks]
        
        # ChromaDB client is synchronous, run in executor
        import asyncio
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=chunks,
                metadatas=[{"source": "neuralflow"} for _ in chunks]
            )
        )
        
        return {
            "status": "success",
            "message": f"Ingested {len(chunks)} chunks into collection '{collection_name}'",
            "chunks_added": len(chunks)
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def query(prompt: str, collection_name: str = "default", top_k: int = 3) -> dict:
    """Retrieve top-k chunks from ChromaDB for a given prompt."""
    if not _CHROMA_AVAILABLE:
        return {"status": "error", "error": "ChromaDB not installed"}
        
    if not prompt.strip():
        return {"status": "skipped", "results": []}

    client = get_client()
    try:
        # Check if collection exists
        try:
            collection = client.get_collection(name=collection_name)
        except ValueError:
            return {"status": "error", "error": f"Collection '{collection_name}' not found. Store some data first."}

        # Generate embedding for the query
        try:
            query_embeddings = await _generate_embeddings([prompt])
        except Exception as e:
            return {"status": "error", "error": f"Embedding failed: {e}"}

        if not query_embeddings:
            return {"status": "error", "error": "Failed to generate query embedding"}

        # Query ChromaDB
        import asyncio
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            None,
            lambda: collection.query(
                query_embeddings=query_embeddings,
                n_results=top_k
            )
        )
        
        documents = results.get("documents", [[]])[0]
        distances = results.get("distances", [[]])[0]
        
        matches = [
            {"text": doc, "distance": dist} 
            for doc, dist in zip(documents, distances)
        ]
        
        return {
            "status": "success",
            "results": matches,
            "context_string": "\n\n---\n\n".join(documents)
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}
