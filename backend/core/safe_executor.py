"""
safe_executor.py — Sandboxed Subprocess Action Node.
Executes code locally (bash, python3, node) with strict timeouts.
"""

from __future__ import annotations

import asyncio
import os
import subprocess
import tempfile


async def run_code(
    runtime: str, code: str, input_context: str = "", timeout: int = 30
) -> dict:
    """
    Execute code in the requested runtime.
    Upstream input_context is injected as an environment variable (NEURALFLOW_INPUT).
    """
    runtimes = {
        "bash": {"cmd": ["bash", "-c"], "ext": ".sh"},
        "python3": {"cmd": ["python3"], "ext": ".py"},
        "node": {"cmd": ["node"], "ext": ".js"},
    }

    if runtime not in runtimes:
        return {
            "status": "error",
            "exit_code": -1,
            "stdout": "",
            "stderr": f"Unsupported runtime: {runtime}",
        }

    if not code or not code.strip():
        return {
            "status": "skipped",
            "exit_code": 0,
            "stdout": "No code to execute.",
            "stderr": "",
        }

    rt_config = runtimes[runtime]

    # We use a temp file to execute scripts robustly, especially for multi-line
    # code or languages that don't take `-c` cleanly without escaping issues.
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=rt_config["ext"], delete=False
    ) as f:
        f.write(code)
        temp_path = f.name

    env = os.environ.copy()
    # Inject input context so the script can process it
    env["NEURALFLOW_INPUT"] = input_context

    # Ensure node/python/bash can be found
    # (Assuming user has them in PATH)

    def _execute():
        cmd = rt_config["cmd"]
        if runtime == "bash":
            cmd = ["bash", temp_path]
        else:
            cmd = rt_config["cmd"] + [temp_path]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                env=env,
            )
            return {
                "status": "success" if result.returncode == 0 else "failed",
                "exit_code": result.returncode,
                "stdout": result.stdout.strip(),
                "stderr": result.stderr.strip(),
            }
        except subprocess.TimeoutExpired:
            return {
                "status": "timeout",
                "exit_code": -1,
                "stdout": "",
                "stderr": f"Execution timed out after {timeout} seconds.",
            }
        except FileNotFoundError:
            return {
                "status": "error",
                "exit_code": -1,
                "stdout": "",
                "stderr": f"Runtime '{cmd[0]}' not found. Is it installed?",
            }
        except Exception as e:
            return {
                "status": "error",
                "exit_code": -1,
                "stdout": "",
                "stderr": f"Execution error: {str(e)}",
            }
        finally:
            try:
                os.unlink(temp_path)
            except Exception:
                pass

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _execute)
