"""
NeuralFlow Backend — FastAPI entry point.
Mounts all API routes, configures CORS, and manages application lifecycle.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import execute, models, websocket, system, webhooks, storage, wizard
from core.ollama_manager import auto_start_ollama
from core.cron_scheduler import start_scheduler, stop_scheduler
from core.clipboard_monitor import start_monitor, stop_monitor


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle — auto-starts Ollama if needed."""
    print("⚡ NeuralFlow Backend starting...")
    print("   API:       http://localhost:8000")
    print("   WebSocket: ws://localhost:8000/ws/logs")
    print("   Docs:      http://localhost:8000/docs")
    print("")

    # Auto-start Ollama so users don't need to do anything
    print("🤖 Checking Ollama...")
    result = await auto_start_ollama()
    status_icons = {
        "running": "✅",
        "started": "🚀",
        "not_installed": "⚠️",
        "failed": "❌",
    }
    icon = status_icons.get(result["status"], "❓")
    print(f"   {icon} {result['message']}")
    print("")

    # Proactive health check — notify frontend if Ollama is unreachable
    try:
        import httpx
        from api.routes.websocket import manager as ws_manager
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get("http://127.0.0.1:11434/api/tags")
            if resp.status_code != 200:
                raise ConnectionError("Ollama not responding")
        print("   ✅ Ollama is reachable on port 11434")
    except Exception:
        print("   ⚠️  Ollama is unreachable — frontend will be notified")
        import asyncio
        async def _notify_offline():
            await asyncio.sleep(2)  # Wait for WS clients to connect
            await ws_manager.broadcast('{"type": "ollama_offline"}')
        asyncio.create_task(_notify_offline())

    # Start Background Tasks
    print("⏰ Starting Cron Scheduler...")
    try:
        start_scheduler()
    except Exception as e:
        print(f"   ⚠️ Failed to start scheduler: {e}")

    print("📋 Starting Clipboard Monitor...")
    try:
        start_monitor()
    except Exception as e:
        print(f"   ⚠️ Failed to start clipboard monitor: {e}")

    yield
    print("⚡ NeuralFlow Backend shutting down...")
    stop_scheduler()
    stop_monitor()


app = FastAPI(
    title="NeuralFlow Backend",
    description="Edge-agent orchestration engine with DAG execution and Ollama integration.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(execute.router, tags=["Execution"])
app.include_router(models.router, tags=["Models"])
app.include_router(websocket.router, tags=["WebSocket"])
app.include_router(system.router, tags=["System"])
app.include_router(webhooks.router, tags=["Webhooks"])
app.include_router(storage.router, tags=["Storage"])
app.include_router(wizard.router, prefix="/api/wizard", tags=["Wizard"])


@app.get("/")
async def root():
    """Root endpoint — API info."""
    return {
        "name": "NeuralFlow Backend",
        "version": "1.0.0",
        "endpoints": {
            "execute": "POST /execute-graph",
            "models": "GET /api/models",
            "health": "GET /api/health",
            "websocket": "WS /ws/logs",
            "docs": "GET /docs",
        },
    }
