import logging
from datetime import datetime, timezone
from typing import Optional

from api.models import LogEntry


def get_logger(name: str) -> logging.Logger:
    """Get a standard logger configured for NeuralFlow."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        # Console handler
        ch = logging.StreamHandler()
        ch.setFormatter(formatter)
        logger.addHandler(ch)

        # We could also add a FileHandler here
    return logger


logger = get_logger("neuralflow.telemetry")


def get_timestamp() -> str:
    """Use standard ISO 8601 format without the double timezone identifier issue."""
    return (
        datetime.now(timezone.utc)
        .replace(tzinfo=None)
        .isoformat(timespec="milliseconds")
        + "Z"
    )


async def broadcast_log(
    ws_manager,
    node_id: str,
    message: str,
    level: str = "INFO",
    raw_traceback: Optional[str] = None,
):
    """Broadcast a log entry to all connected WebSocket clients and log to standard python logging."""

    # Log to python logger
    if level == "ERROR":
        logger.error(f"[{node_id}] {message}\n{raw_traceback or ''}")
    elif level == "WARN":
        logger.warning(f"[{node_id}] {message}")
    else:
        logger.info(f"[{node_id}] {message}")

    # Attempt to fetch telemetry safely
    free_ram = None
    allocated_vram = None
    try:
        from core.hardware import get_available_vram_bytes, get_active_ollama_vram_usage

        free_ram = await get_available_vram_bytes()
        allocated_vram = await get_active_ollama_vram_usage()
    except ImportError:
        pass

    entry = LogEntry(
        timestamp=get_timestamp(),
        node_id=node_id,
        level=level,
        message=message,
        raw_traceback=raw_traceback,
        free_ram=free_ram,
        allocated_vram=allocated_vram,
    )
    try:
        await ws_manager.broadcast(entry.model_dump_json())
    except Exception as e:
        logger.error(f"Failed to broadcast log: {e}")
