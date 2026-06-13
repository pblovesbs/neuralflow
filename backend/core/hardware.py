"""
Apple Silicon Hardware-Adaptive Telemetry.
Uses `sysctl` to dynamically measure physical RAM and compute Metal GPU ceilings.
"""

import subprocess
import httpx


def get_system_ram_bytes() -> int:
    """Returns total physical system RAM in bytes using macOS sysctl."""
    try:
        output = subprocess.check_output(["sysctl", "-n", "hw.memsize"])
        return int(output.strip())
    except Exception:
        # Fallback to 8GB if on non-macOS or error
        return 8 * 1024 * 1024 * 1024


def get_gpu_ceiling_bytes() -> int:
    """
    Apple Silicon Metal API caps max working set size to ~70% of total RAM.
    Exceeding this causes aggressive swapping and system freezes.
    """
    total_ram = get_system_ram_bytes()
    return int(total_ram * 0.70)


def estimate_vram_required(model_name: str, target_context_tokens: int = 4096) -> int:
    """
    Mathematical predictor for model memory footprint before execution.
    Formula: Min VRAM = Quantized Model Size + 1.0 GB (Base 2K Context KV Cache) + ((Target Context Tokens - 2048) / 2048) * 0.5 GB.
    """
    base_size_gb = 4.8  # Default to 8B parameter cost (e.g. Llama 3 8B)
    lower = model_name.lower()

    if "0.5b" in lower:
        base_size_gb = 0.4
    elif "1.5b" in lower:
        base_size_gb = 1.0
    elif "3b" in lower or "mini" in lower:
        base_size_gb = 2.3
    elif "7b" in lower or "8b" in lower or "llama3" in lower:
        base_size_gb = 4.5
    elif "14b" in lower or "coder" in lower:
        base_size_gb = 9.0

    vram_gb = base_size_gb + 1.0 + ((target_context_tokens - 2048) / 2048) * 0.5
    return int(vram_gb * 1024 * 1024 * 1024)


async def get_active_ollama_vram_usage() -> int:
    """
    Polls the local Ollama engine's /api/ps endpoint to see what is currently loaded.
    Returns the total size_vram in bytes.
    """
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get("http://127.0.0.1:11434/api/ps")
            if resp.status_code == 200:
                data = resp.json()
                models = data.get("models", [])
                return sum(m.get("size_vram", 0) for m in models)
    except Exception:
        pass
    return 0


async def get_available_vram_bytes() -> int:
    """Calculates available VRAM by subtracting active Ollama loads from the GPU ceiling."""
    ceiling = get_gpu_ceiling_bytes()
    active_usage = await get_active_ollama_vram_usage()
    return max(0, ceiling - active_usage)
