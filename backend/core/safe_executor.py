"""
safe_executor.py — Sandboxed Subprocess Action Node.
Executes code locally (bash, python3, node) with strict timeouts.
"""

from __future__ import annotations

import asyncio
import os
import tempfile

class SandboxViolationError(Exception):
    def __init__(self, module_name: str, message: str):
        self.module_name = module_name
        self.message = message
        super().__init__(self.message)

PYTHON_WRAPPER = """
import sys
import resource
import signal
import json
from RestrictedPython import compile_restricted, safe_globals

def handler(signum, frame):
    print("Execution timed out", file=sys.stderr)
    sys.exit(-1)

def main():
    timeout = int(sys.argv[1])
    code_path = sys.argv[2]
    
    signal.signal(signal.SIGALRM, handler)
    signal.alarm(timeout)
    
    # Cap memory at 128MB
    try:
        resource.setrlimit(resource.RLIMIT_AS, (128 * 1024 * 1024, 128 * 1024 * 1024))
    except (ValueError, OSError):
        pass # Handle macOS limits if they are different

    with open(code_path, 'r') as f:
        code = f.read()

    try:
        byte_code = compile_restricted(code, '<string>', 'exec')
        _globals = dict(safe_globals)
        
        # Add basic print builtin which is often omitted
        if '__builtins__' not in _globals:
            _globals['__builtins__'] = {}
        _globals['__builtins__']['print'] = print
        _globals['__builtins__']['str'] = str
        _globals['__builtins__']['int'] = int
        _globals['__builtins__']['float'] = float
        _globals['__builtins__']['bool'] = bool
        _globals['__builtins__']['dict'] = dict
        _globals['__builtins__']['list'] = list
        
        exec(byte_code, _globals)
    except SyntaxError as e:
        print(f"SyntaxError: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"ExecutionError: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
"""

async def run_code(
    runtime: str, code: str, input_context: str = "", timeout: int = 30
) -> dict:
    """
    Execute code in the requested runtime using async subprocesses.
    Upstream input_context is injected as an environment variable (NEURALFLOW_INPUT).
    """
    runtimes = {
        "bash": {"cmd": ["bash"], "ext": ".sh"},
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

    # Write the user code to a temp file
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=str(rt_config["ext"]), delete=False
    ) as f:
        f.write(code)
        temp_path = f.name
        
    wrapper_path = None
    if runtime == "python3":
        # Write the python wrapper
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as wf:
            wf.write(PYTHON_WRAPPER)
            wrapper_path = wf.name

    env = os.environ.copy()
    env["NEURALFLOW_INPUT"] = input_context
    # Basic network isolation attempt via env vars (not a true sandbox for node/bash)
    env["HTTP_PROXY"] = "http://127.0.0.1:9999"
    env["HTTPS_PROXY"] = "http://127.0.0.1:9999"

    if runtime == "python3":
        cmd = ["python3", wrapper_path, str(timeout), temp_path]
    else:
        cmd = rt_config["cmd"] + [temp_path]

    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env
        )

        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                process.communicate(), timeout=timeout + 2  # Padding for graceful shutdown
            )
        except asyncio.TimeoutError:
            process.kill()
            await process.communicate()
            return {
                "status": "timeout",
                "exit_code": -1,
                "stdout": "",
                "stderr": f"Execution timed out after {timeout} seconds.",
            }

        stdout_text = stdout_bytes.decode().strip()
        stderr_text = stderr_bytes.decode().strip()

        # Detect RestrictedPython sandbox violations from stderr patterns
        _SANDBOX_MARKERS = [
            "is not allowed",
            "not safely import",
            "RestrictedPython",
            "CompileResult",
            "_getattr_",
            "_getitem_",
            "_getiter_",
            "_write_",
        ]
        if runtime == "python3" and process.returncode != 0:
            if any(marker in stderr_text for marker in _SANDBOX_MARKERS):
                # Extract the blocked module/operation name from the error
                module_name = "unknown"
                for line in stderr_text.splitlines():
                    if "import" in line.lower():
                        parts = line.split("import")
                        if len(parts) > 1:
                            module_name = parts[-1].strip().split()[0].strip("'\"")
                            break
                    if "is not allowed" in line:
                        module_name = line.split("is not allowed")[0].strip().rsplit(" ", 1)[-1].strip("'\"")
                        break
                return {
                    "status": "sandbox_violation",
                    "exit_code": process.returncode,
                    "stdout": stdout_text,
                    "stderr": stderr_text,
                    "module_name": module_name,
                }

        return {
            "status": "success" if process.returncode == 0 else "failed",
            "exit_code": process.returncode,
            "stdout": stdout_text,
            "stderr": stderr_text,
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
            if wrapper_path:
                os.unlink(wrapper_path)
        except Exception:
            pass
