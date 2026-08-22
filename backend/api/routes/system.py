import asyncio
import os
import signal
import shutil
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/system", tags=["System"])

OLLAMA_BASE_URL = "http://localhost:11434"

class OllamaManager:
    def __init__(self):
        self._process: asyncio.subprocess.Process | None = None
    
    async def start(self):
        if self._process and self._process.returncode is None:
            return  # Already running
            
        ollama_bin = shutil.which("ollama")
        if not ollama_bin:
            raise RuntimeError("Ollama binary not found in system PATH. Install from https://ollama.com")
            
        self._process = await asyncio.create_subprocess_exec(
            ollama_bin, "serve",
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
            start_new_session=True
        )
    
    async def stop(self):
        if self._process and self._process.returncode is None:
            # SIGTERM first — graceful
            try:
                os.killpg(os.getpgid(self._process.pid), signal.SIGTERM)
                await asyncio.wait_for(self._process.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                # Only SIGKILL if it refuses to stop
                try:
                    os.killpg(os.getpgid(self._process.pid), signal.SIGKILL)
                except ProcessLookupError:
                    pass
            except ProcessLookupError:
                pass
            finally:
                self._process = None
        else:
            # Fallback: kill any system-wide Ollama process we didn't spawn.
            # This handles the common case where the user started Ollama before NeuralFlow.
            try:
                proc = await asyncio.create_subprocess_exec(
                    "pkill", "-f", "ollama",
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.DEVNULL,
                )
                await asyncio.wait_for(proc.wait(), timeout=5.0)
            except Exception:
                pass  # Best-effort
            self._process = None

ollama_manager = OllamaManager()

@router.get("/ollama-status")
async def get_ollama_status():
    """Poll endpoint to verify if Ollama service is responsive."""
    async with httpx.AsyncClient(timeout=2.0) as client:
        try:
            res = await client.get(f"{OLLAMA_BASE_URL}/api/version")
            if res.status_code == 200:
                return {"status": "online", "version": res.json().get("version")}
        except Exception:
            pass
    return {"status": "offline"}

@router.post("/start-ollama")
async def start_ollama():
    """Spawns Ollama background service in a cross-platform detached process."""
    try:
        await ollama_manager.start()
        return {"status": "starting", "message": "Ollama service start signal sent."}
    except RuntimeError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start Ollama: {str(e)}")

async def _run_osascript(prompt_cmd: str) -> str | None:
    """Helper to run a macOS native file picker dialog."""
    cmd = [
        "osascript",
        "-e", 'tell application "System Events" to activate',
        "-e", f'try\nset thePath to POSIX path of ({prompt_cmd})\nreturn thePath\nend try'
    ]
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await process.communicate()
        if process.returncode == 0 and stdout.decode().strip():
            return stdout.decode().strip()
    except Exception as e:
        print(f"File picker error: {e}")
    return None

@router.get("/file-picker")
async def file_picker():
    path = await _run_osascript('choose file with prompt "Select a file"')
    return {"path": path}

@router.get("/folder-picker")
async def folder_picker():
    path = await _run_osascript('choose folder with prompt "Select a folder"')
    return {"path": path}

@router.get("/save-file-picker")
async def save_file_picker():
    path = await _run_osascript('choose file name with prompt "Save file as"')
    return {"path": path}

@router.post("/kill-ai")
async def kill_ai():
    """Gracefully kill the Ollama engine to free up memory."""
    try:
        await ollama_manager.stop()
        return {"status": "ok", "message": "AI engine terminated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

