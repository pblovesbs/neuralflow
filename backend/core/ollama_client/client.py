"""
Async Ollama client using httpx for streaming AI generation.
Connects to the local Ollama instance at localhost:11434.
"""

from __future__ import annotations

import json
from typing import AsyncGenerator

import httpx


class OllamaConnectionError(Exception):
    """Raised when unable to connect to the Ollama server."""

    pass


class ModelNotFoundError(Exception):
    """Raised when the requested model is not available."""

    pass


class OllamaClient:
    """
    Async client for the local Ollama REST API.

    Attributes:
        base_url: Ollama API base URL (default: http://localhost:11434).
        timeout: Request timeout in seconds.
    """

    def __init__(
        self,
        base_url: str = "http://127.0.0.1:11434",
        timeout: float = 120.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=self.timeout)

    async def close(self):
        """Close the underlying HTTP client session."""
        await self.client.aclose()

    async def health_check(self) -> bool:
        """Check if Ollama is reachable."""
        try:
            resp = await self.client.get(f"{self.base_url}/api/tags", timeout=5.0)
            return resp.status_code == 200
        except (httpx.ConnectError, httpx.TimeoutException):
            return False

    async def list_models(self) -> list[dict]:
        """
        List available Ollama models.

        Returns:
            List of model info dicts with 'name', 'size', 'modified_at'.
        """
        try:
            resp = await self.client.get(f"{self.base_url}/api/tags", timeout=10.0)
            resp.raise_for_status()
            data = resp.json()
            models = data.get("models", [])
            return [
                {
                    "name": m.get("name", "unknown"),
                    "size": self._format_size(m.get("size", 0)),
                    "modified_at": m.get("modified_at", ""),
                }
                for m in models
            ]
        except httpx.ConnectError:
            raise OllamaConnectionError(
                f"Cannot connect to Ollama at {self.base_url}. "
                "Ensure Ollama is running: `ollama serve`"
            )

    async def generate(
        self,
        model: str,
        prompt: str,
        stream: bool = True,
        num_ctx: int = 4096,
        options: dict = None,
        keep_alive: str | int | float = "5m",
    ) -> AsyncGenerator[str, None]:
        """
        Generate a response from the Ollama model, streaming chunks.

        Args:
            model: Model name (e.g., 'llama3', 'mistral').
            prompt: The prompt to send.
            stream: Whether to stream the response.
            keep_alive: How long to keep the model loaded in memory. 0 = unload immediately.

        Yields:
            Response text chunks as they arrive.
        """
        opts = options or {}
        opts["num_ctx"] = num_ctx

        payload = {
            "model": model,
            "prompt": prompt,
            "stream": stream,
            "options": opts,
            "keep_alive": keep_alive,
        }

        try:
            async with self.client.stream(
                "POST",
                f"{self.base_url}/api/generate",
                json=payload,
            ) as response:
                if response.status_code == 404:
                    raise ModelNotFoundError(
                        f"Model '{model}' not found. Pull it first: `ollama pull {model}`"
                    )
                response.raise_for_status()

                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            chunk = json.loads(line)
                            text = chunk.get("response", "")
                            if text:
                                yield text
                        except json.JSONDecodeError:
                            continue

        except httpx.ConnectError:
            raise OllamaConnectionError(
                f"Cannot connect to Ollama at {self.base_url}. "
                "Ensure Ollama is running: `ollama serve`"
            )

    async def pull_model(self, model: str) -> AsyncGenerator[dict, None]:
        """
        Pull a model from the Ollama registry, yielding status progress dicts.

        Args:
            model: The model name to pull (e.g. 'gemma3:1b').

        Yields:
            Parsed JSON dicts representing the pull progress.
        """
        try:
            async with self.client.stream(
                "POST",
                f"{self.base_url}/api/pull",
                json={"name": model, "stream": True},
                timeout=None,  # Pulling can take a very long time
            ) as response:
                response.raise_for_status()

                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            yield json.loads(line)
                        except json.JSONDecodeError:
                            continue

        except httpx.ConnectError:
            raise OllamaConnectionError(
                f"Cannot connect to Ollama at {self.base_url}. "
                "Ensure Ollama is running: `ollama serve`"
            )

    async def unload_model(self, model: str) -> None:
        """
        Explicitly unload a model from Ollama's VRAM by setting keep_alive to 0.
        Call this before loading a different model to prevent OOM crashes.

        Args:
            model: The model name to unload.
        """
        try:
            await self.client.post(
                f"{self.base_url}/api/generate",
                json={"model": model, "keep_alive": 0},
                timeout=10.0,
            )
        except Exception:
            pass  # Best-effort — don't crash if unload fails

    @staticmethod
    def _format_size(size_bytes: int) -> str:
        """Format byte size to human readable string."""
        if size_bytes == 0:
            return "0B"
        units = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        size = float(size_bytes)
        while size >= 1024 and i < len(units) - 1:
            size /= 1024
            i += 1
        return f"{size:.1f}{units[i]}"


# Global singleton instance for connection reuse across the application
global_ollama_client = OllamaClient()
