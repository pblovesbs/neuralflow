"""
Ollama Auto-Manager — automatically starts Ollama if it's installed but not running.
Non-technical users never need to touch the terminal.
"""

from __future__ import annotations

import asyncio
import shutil
import subprocess
import httpx


OLLAMA_URL = "http://localhost:11434"


async def is_ollama_running() -> bool:
    """Check if Ollama is already serving."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{OLLAMA_URL}/api/tags")
            return resp.status_code == 200
    except Exception:
        return False


def is_ollama_installed() -> bool:
    """Check if the `ollama` binary exists on PATH."""
    return shutil.which("ollama") is not None


async def auto_start_ollama() -> dict:
    """
    Automatically start Ollama if it's installed but not running.

    Returns a status dict:
      - status: 'running' | 'started' | 'not_installed' | 'failed'
      - message: Human-readable explanation
    """
    # Already running? Great, nothing to do.
    if await is_ollama_running():
        return {
            "status": "running",
            "message": "Ollama is already running.",
        }

    # Not installed? Tell the user nicely.
    if not is_ollama_installed():
        return {
            "status": "not_installed",
            "message": "Ollama is not installed. Visit https://ollama.com to install it.",
        }

    # Installed but not running — start it automatically
    try:
        subprocess.Popen(
            ["ollama", "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,  # Detach from parent process
        )

        # Wait up to 10 seconds for it to come online
        for i in range(20):
            await asyncio.sleep(0.5)
            if await is_ollama_running():
                return {
                    "status": "started",
                    "message": f"Ollama started automatically (took {(i + 1) * 0.5:.1f}s).",
                }

        return {
            "status": "failed",
            "message": "Ollama was started but didn't respond within 10 seconds.",
        }

    except Exception as e:
        return {
            "status": "failed",
            "message": f"Failed to start Ollama: {str(e)}",
        }
