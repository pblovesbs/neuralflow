"""
Models API — Model catalog (25+ models in tiers) + install/list + RAM endpoint.
"""

from __future__ import annotations

import asyncio
import subprocess
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.models import OllamaModel
from core.ollama_client.client import global_ollama_client, OllamaConnectionError

router = APIRouter()


# ─── Full 25+ Model Catalog ────────────────────────────────────────────────────
CURATED_MODELS = [
    # ── Speed Tier ──────────────────────────────────────────────────────────
    {
        "tier": "Speed",
        "id": "qwen2.5:0.5b",
        "name": "Qwen 2.5 — 0.5B",
        "params": "0.5B",
        "ram": "~0.7 GB",
        "num_ctx": 2048,
        "badge": "Lightest",
        "desc": "Smallest model available. Instant responses for very simple tasks.",
    },
    {
        "tier": "Speed",
        "id": "qwen2.5:1.5b",
        "name": "Qwen 2.5 — 1.5B",
        "params": "1.5B",
        "ram": "~1.2 GB",
        "num_ctx": 4096,
        "badge": "Efficient",
        "desc": "Noticeably better than 0.5B while remaining very fast.",
    },
    {
        "tier": "Speed",
        "id": "tinyllama:1.1b",
        "name": "TinyLlama 1.1B",
        "params": "1.1B",
        "ram": "~0.8 GB",
        "num_ctx": 2048,
        "badge": "Fastest",
        "desc": "Ultra-compact Llama. Great for short documents and quick summaries.",
    },
    {
        "tier": "Speed",
        "id": "phi3:mini",
        "name": "Phi-3 Mini (Microsoft)",
        "params": "3.8B",
        "ram": "~2.4 GB",
        "num_ctx": 4096,
        "badge": "Compact",
        "desc": "Microsoft's precision-trained model. Excellent instruction following for its size.",
    },
    # ── Balanced Tier ────────────────────────────────────────────────────────
    {
        "tier": "Balanced",
        "id": "llama3.2:1b",
        "name": "Llama 3.2 — 1B (Meta)",
        "params": "1B",
        "ram": "~1.3 GB",
        "num_ctx": 4096,
        "badge": "Popular",
        "desc": "Meta's latest 1B model. Reliable and well-tested for everyday tasks.",
    },
    {
        "tier": "Balanced",
        "id": "llama3.2:3b",
        "name": "Llama 3.2 — 3B (Meta)",
        "params": "3B",
        "ram": "~2.2 GB",
        "num_ctx": 4096,
        "badge": "Recommended",
        "desc": "Best balance of speed and quality. Recommended for most users.",
    },
    {
        "tier": "Balanced",
        "id": "gemma3:1b",
        "name": "Gemma 3 — 1B (Google)",
        "params": "1B",
        "ram": "~0.8 GB",
        "num_ctx": 4096,
        "badge": "Google",
        "desc": "Google newest Gemma generation. Great instruction following.",
    },
    {
        "tier": "Balanced",
        "id": "gemma3:4b",
        "name": "Gemma 3 — 4B (Google)",
        "params": "4B",
        "ram": "~3.0 GB",
        "num_ctx": 8192,
        "badge": "Strong",
        "desc": "Handles longer documents and complex tasks with ease.",
    },
    {
        "tier": "Balanced",
        "id": "qwen2.5:3b",
        "name": "Qwen 2.5 — 3B",
        "params": "3B",
        "ram": "~2.0 GB",
        "num_ctx": 8192,
        "badge": "Long CTX",
        "desc": "Supports very long context windows. Great for large files.",
    },
    {
        "tier": "Balanced",
        "id": "mistral:7b",
        "name": "Mistral 7B",
        "params": "7B",
        "ram": "~4.5 GB",
        "num_ctx": 8192,
        "badge": "Classic",
        "desc": "The original open-source favourite. Rock-solid for all tasks.",
    },
    # ── Power Tier ───────────────────────────────────────────────────────────
    {
        "tier": "Power",
        "id": "llama3.1:8b",
        "name": "Llama 3.1 — 8B (Meta)",
        "params": "8B",
        "ram": "~5.5 GB",
        "num_ctx": 8192,
        "badge": "Smart",
        "desc": "Meta flagship 8B model. Exceptional at reasoning and writing.",
    },
    {
        "tier": "Power",
        "id": "llama3:8b",
        "name": "Llama 3 — 8B (Meta)",
        "params": "8B",
        "ram": "~5.2 GB",
        "num_ctx": 8192,
        "badge": "Proven",
        "desc": "Widely tested and reliable for professional use cases.",
    },
    {
        "tier": "Power",
        "id": "gemma2:9b",
        "name": "Gemma 2 — 9B (Google)",
        "params": "9B",
        "ram": "~6.0 GB",
        "num_ctx": 8192,
        "badge": "Capable",
        "desc": "Google Gemma 2 in 9B size. Excellent at writing and analysis.",
    },
    {
        "tier": "Power",
        "id": "qwen2.5:7b",
        "name": "Qwen 2.5 — 7B",
        "params": "7B",
        "ram": "~5.0 GB",
        "num_ctx": 32768,
        "badge": "Long CTX",
        "desc": "Up to 128K context. Best for processing very long documents.",
    },
    {
        "tier": "Power",
        "id": "mistral-nemo",
        "name": "Mistral NeMo 12B",
        "params": "12B",
        "ram": "~8.0 GB",
        "num_ctx": 16384,
        "badge": "Premium",
        "desc": "NVIDIA and Mistral collaboration. Very capable reasoning model.",
    },
    {
        "tier": "Power",
        "id": "phi4:14b",
        "name": "Phi-4 14B (Microsoft)",
        "params": "14B",
        "ram": "~9.0 GB",
        "num_ctx": 16384,
        "badge": "Research",
        "desc": "Microsoft largest Phi model. State-of-the-art reasoning quality.",
    },
    # ── Coding Tier ──────────────────────────────────────────────────────────
    {
        "tier": "Coding",
        "id": "codellama:7b",
        "name": "Code Llama 7B (Meta)",
        "params": "7B",
        "ram": "~4.5 GB",
        "num_ctx": 16384,
        "badge": "Code",
        "desc": "Meta code-specialized model. Write and explain code with ease.",
    },
    {
        "tier": "Coding",
        "id": "codegemma:2b",
        "name": "CodeGemma 2B (Google)",
        "params": "2B",
        "ram": "~1.6 GB",
        "num_ctx": 8192,
        "badge": "Lightweight",
        "desc": "Lightweight code model by Google. Fast autocomplete and bug fixes.",
    },
    {
        "tier": "Coding",
        "id": "qwen2.5-coder:7b",
        "name": "Qwen Coder 7B",
        "params": "7B",
        "ram": "~5.0 GB",
        "num_ctx": 32768,
        "badge": "Advanced",
        "desc": "Best open-source coding model. Handles complex multi-file tasks.",
    },
    {
        "tier": "Coding",
        "id": "deepseek-coder:6.7b",
        "name": "DeepSeek Coder 6.7B",
        "params": "6.7B",
        "ram": "~4.2 GB",
        "num_ctx": 16384,
        "badge": "DeepSeek",
        "desc": "Strong at algorithmic problems and code generation.",
    },
    # ── Multilingual Tier ────────────────────────────────────────────────────
    {
        "tier": "Multilingual",
        "id": "aya:8b",
        "name": "Aya 8B (Cohere)",
        "params": "8B",
        "ram": "~5.5 GB",
        "num_ctx": 8192,
        "badge": "23 langs",
        "desc": "Cohere research model trained on 23 languages including Arabic, Hindi, and more.",
    },
]


@router.get("/api/models", response_model=list[OllamaModel])
async def list_models():
    """List installed Ollama models. Proxies to Ollama /api/tags."""
    try:
        models = await global_ollama_client.list_models()
        return [OllamaModel(**m) for m in models]
    except OllamaConnectionError:
        return []


@router.get("/api/health")
async def health_check():
    """Check backend and Ollama connectivity."""
    ollama_healthy = await global_ollama_client.health_check()
    return {
        "backend": "healthy",
        "ollama": "connected" if ollama_healthy else "disconnected",
        "ollama_url": global_ollama_client.base_url,
    }


@router.get("/api/models/available")
async def list_available_models():
    """Return the full curated 25+ model catalog with tiers and specs."""
    return {"models": CURATED_MODELS}


@router.get("/api/models/installed")
async def list_installed_models():
    """Return model IDs currently installed in Ollama."""
    try:
        import httpx

        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get("http://127.0.0.1:11434/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                installed = [m["name"] for m in data.get("models", [])]
                return {"installed": installed}
    except Exception:
        pass
    return {"installed": []}


class InstallRequest(BaseModel):
    model: str


@router.post("/api/models/install")
async def install_model(request: InstallRequest):
    """Download a model via Ollama in a background thread and stream progress."""
    model = request.model.strip()
    if not model:
        raise HTTPException(status_code=400, detail="Model name is required.")

    def _pull():
        from api.routes.websocket import manager
        import asyncio

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            loop.run_until_complete(
                manager.broadcast(
                    f'{{"timestamp": "0", "node_id": "system", "level": "INFO", "message": "Starting download of {model}..."}}'
                )
            )

            process = subprocess.Popen(
                ["ollama", "pull", model],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )
            for line in process.stdout:
                line = line.strip()
                if line:
                    loop.run_until_complete(
                        manager.broadcast(
                            f'{{"timestamp": "0", "node_id": "system", "level": "INFO", "message": "{line}"}}'
                        )
                    )
            process.wait()

            msg = (
                f"Successfully installed {model}"
                if process.returncode == 0
                else f"Failed to install {model}"
            )
            level = "SUCCESS" if process.returncode == 0 else "ERROR"

            loop.run_until_complete(
                manager.broadcast(
                    f'{{"timestamp": "0", "node_id": "system", "level": "{level}", "message": "{msg}"}}'
                )
            )
        except Exception as e:
            loop.run_until_complete(
                manager.broadcast(
                    f'{{"timestamp": "0", "node_id": "system", "level": "ERROR", "message": "Failed to run ollama pull: {e}"}}'
                )
            )
        finally:
            loop.close()

    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _pull)
    return {
        "status": "installing",
        "model": model,
        "message": f"Downloading '{model}'. Check the logs panel for progress.",
    }



class SetupRequest(BaseModel):
    ram_gb: int
    manual_model: Optional[str] = None


@router.post("/api/models/setup")
async def setup_models(request: SetupRequest):
    """Hardware-aware recommended model selector."""
    target = request.manual_model
    rationale = "You selected this model manually."

    if not target:
        if request.ram_gb <= 4:
            target = "qwen2.5:0.5b"
            rationale = "Selected Qwen 2.5 0.5B — the most efficient model for 4GB RAM."
        elif request.ram_gb <= 8:
            target = "llama3.2:1b"
            rationale = "Selected Llama 3.2 1B — a great balanced choice for 8GB."
        elif request.ram_gb <= 16:
            target = "llama3.2:3b"
            rationale = "Selected Llama 3.2 3B — your 16GB can comfortably run this."
        else:
            target = "llama3.1:8b"
            rationale = "Selected Llama 3.1 8B — your system has plenty of headroom."

    def pull_model():
        subprocess.run(["ollama", "pull", target], check=False)

    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, pull_model)
    return {
        "status": "pulling",
        "model": target,
        "rationale": rationale,
        "message": f"Downloading {target} in the background.",
    }
