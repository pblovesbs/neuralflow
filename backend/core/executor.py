"""
Node executor — runs each DAG node sequentially with context passing.
Streams real-time logs via the WebSocket connection manager.
"""

from __future__ import annotations

import asyncio
import traceback
import os
import aiofiles
from datetime import datetime, timezone
from typing import Optional

from api.models import DagNode, NodeType, ResilienceEventType
from core.config import settings
from core.telemetry import broadcast_log
from core.ollama_client.client import (
    OllamaClient,
    OllamaConnectionError,
    ModelNotFoundError,
)
from core.file_parser import parse_file
from core.resilience_tracker import track

class LowConfidenceError(Exception):
    def __init__(self, message: str, original_output: str):
        self.message = message
        self.original_output = original_output
        super().__init__(self.message)



class ExecutionError(Exception):
    """Raised when a node execution fails."""

    pass


# Track the last model loaded in Ollama to enable smart VRAM unloading
# (Deprecated: now dynamically checks /api/ps to unload all others)
_last_active_model: Optional[str] = None


async def execute_trigger_node(
    node: DagNode,
    ws_manager,
) -> str:
    """
    Execute a trigger node — reads content from the specified path.

    Returns:
        The file/directory content as a string context.
    """
    target_path = node.data.target_path or ""

    await broadcast_log(
        ws_manager, node.id, f"⚡ TRIGGER: Reading from path '{target_path}'..."
    )

    if not target_path:
        await broadcast_log(
            ws_manager,
            node.id,
            "No target path specified. Using empty context.",
            "WARN",
        )
        return ""

    try:
        if os.path.isfile(target_path):
            # Use Omni-Parser: auto-detects PDF, DOCX, CSV, TXT, MD
            await broadcast_log(
                ws_manager, node.id, f"⚡ TRIGGER: Reading from '{target_path}'..."
            )
            content = parse_file(target_path)
            await broadcast_log(
                ws_manager,
                node.id,
                f"✓ Read file ({len(content)} chars): {os.path.basename(target_path)}",
                "SUCCESS",
            )
            return content

        elif os.path.isdir(target_path):
            # Parse limit from item_count
            item_count_str = str(node.data.item_count or "1").lower().strip()
            if item_count_str == "all":
                limit = 50
            else:
                try:
                    limit = int(item_count_str)
                except ValueError:
                    limit = 1
            limit = max(1, min(limit, 50))

            # Read directory listing
            items = sorted(await asyncio.to_thread(os.listdir, target_path))[:limit]

            async def _read_preview(item: str) -> str:
                item_path = os.path.join(target_path, item)
                if os.path.isfile(item_path):
                    try:
                        async with aiofiles.open(
                            item_path, "r", encoding="utf-8", errors="replace"
                        ) as f:
                            preview = await f.read(500)
                        return f"--- {item} ---\n{preview}\n"
                    except Exception:
                        return f"--- {item} --- [binary/unreadable]\n"
                else:
                    return f"--- {item}/ --- [directory]\n"

            # Check files one after another sequentially
            entries = []
            for item in items:
                entries.append(await _read_preview(item))

            content = "\n".join(entries)
            await broadcast_log(
                ws_manager,
                node.id,
                f"✓ Scanned directory sequentially ({len(entries)} items): {target_path}",
                "SUCCESS",
            )
            return content

        else:
            await broadcast_log(
                ws_manager,
                node.id,
                f"✗ Path does not exist: {target_path}",
                "ERROR",
            )
            return f"[Error: Path '{target_path}' not found]"

    except PermissionError:
        await broadcast_log(
            ws_manager,
            node.id,
            f"✗ Permission denied: {target_path}",
            "ERROR",
        )
        return f"[Error: Permission denied for '{target_path}']"


async def execute_agent_node(
    node: DagNode,
    input_context: str,
    ws_manager,
    ollama: OllamaClient,
    bypass_ram_check: bool = False,
) -> str:
    """
    Execute an agent node — checks RAM, unloads prior model, injects context, calls Ollama.
    """
    global _last_active_model
    model = node.data.model or "qwen2.5:0.5b"
    template = node.data.prompt_template or "{{input}}"

    # ── RAM Guardrail ─────────────────────────────────────────────────────────
    try:
        import psutil

        available_gb = psutil.virtual_memory().available / (1024**3)
        if available_gb < settings.safe_ram_gb_limit:
            msg = (
                f"⚠️ Device memory is heavily loaded ({available_gb:.1f}GB free). "
                "Please exit some open programs to allow NeuralFlow to process safely."
            )
            if bypass_ram_check:
                await broadcast_log(ws_manager, node.id, msg + " [Bypassed by User]", "WARN")
                track(ResilienceEventType.RAM_GUARDRAIL_PAUSED, node.id, f"RAM guardrail bypassed ({available_gb:.1f}GB free)")
            else:
                await broadcast_log(ws_manager, node.id, msg, "WARN")
                await broadcast_log(ws_manager, node.id, "⏭️ Node SKIPPED due to insufficient RAM. Downstream nodes will receive an empty context.", "WARN")
                track(ResilienceEventType.RAM_GUARDRAIL_PAUSED, node.id, f"RAM guardrail skipped execution ({available_gb:.1f}GB free)")
                return "[SKIPPED: Insufficient RAM — node was not executed]"
    except ImportError:
        pass  # psutil not installed — skip check

    # ── VRAM Lifecycle Manager ────────────────────────────────────────────────
    await broadcast_log(
        ws_manager,
        node.id,
        f"♻️ Enforcing exclusivity: Unloading any models other than '{model}' from memory...",
    )
    await ollama.unload_all_other_models(model)
    _last_active_model = model

    # ── Context Window Cap (Memory Efficiency via RAG) ─────────────────────────
    if len(input_context) > settings.max_context_chars:
        from core.context_pruner import prune_context

        original_len = len(input_context)
        await broadcast_log(
            ws_manager,
            node.id,
            f"✂️ Document is very long ({len(input_context):,} chars). Running Smart Context Pruning...",
            "WARN",
        )
        input_context = await prune_context(
            input_context, query=template, max_chars=settings.max_context_chars
        )
        pruned_chars = original_len - len(input_context)
        track(ResilienceEventType.CONTEXT_PRUNED, node.id, f"Pruned {pruned_chars:,} chars (from {original_len:,} to {len(input_context):,})")

    # ── Prompt Construction ───────────────────────────────────────────────────
    if "{{input}}" in template:
        prompt = template.replace("{{input}}", input_context)
    else:
        prompt = f"{template}\n\n[Context Data to Process]:\n{input_context}"

    prompt += "\n\n[System Instruction]: Return ONLY the direct output. Do not include any conversational filler, explanations, or pleasantries."

    # Determine num_ctx based on model — inject dynamically
    from api.routes.models import CURATED_MODELS

    model_meta = next((m for m in CURATED_MODELS if m["id"] == model), None)
    num_ctx = int(str(model_meta["num_ctx"])) if model_meta else 4096
    # Scale up if content is long
    if len(prompt) > 12000 and num_ctx < 8192:
        num_ctx = 8192

    await broadcast_log(
        ws_manager,
        node.id,
        f"🤖 AGENT: Connecting to Ollama ({model}) · ctx={num_ctx:,} tokens...",
    )
    await broadcast_log(ws_manager, node.id, f"   Prompt: {len(prompt):,} chars")

    try:
        # Build options dict for fine-tuning
        from typing import Any
        options: dict[str, Any] = {}
        if hasattr(node.data, "temperature") and node.data.temperature is not None:
            options["temperature"] = node.data.temperature
        if hasattr(node.data, "max_tokens") and node.data.max_tokens is not None:
            options["num_predict"] = node.data.max_tokens
        if hasattr(node.data, "top_p") and node.data.top_p is not None:
            options["top_p"] = node.data.top_p
        if (
            hasattr(node.data, "repeat_penalty")
            and node.data.repeat_penalty is not None
        ):
            options["repeat_penalty"] = node.data.repeat_penalty
        if hasattr(node.data, "seed") and node.data.seed is not None:
            options["seed"] = node.data.seed
        if hasattr(node.data, "stop_sequences") and node.data.stop_sequences:
            options["stop"] = [
                s.strip() for s in node.data.stop_sequences.split(",") if s.strip()
            ]

        chunks = []
        chunk_count = 0

        try:
            async for chunk in ollama.generate(
                model=model,
                prompt=prompt,
                stream=True,
                num_ctx=num_ctx,
                options=options,
                keep_alive=f"{node.data.keep_alive}m"
                if hasattr(node.data, "keep_alive") and node.data.keep_alive is not None
                else "5m",
            ):
                chunks.append(chunk)
                chunk_count += 1
                if chunk_count % 10 == 0:
                    await broadcast_log(
                        ws_manager,
                        node.id,
                        f"   [Stream] Generated {len(chunks)} tokens...",
                    )
        except ModelNotFoundError:
            await broadcast_log(
                ws_manager,
                node.id,
                f"⚠️ Model '{model}' not found. Pulling it automatically... This might take a few minutes.",
                "WARN"
            )
            track(ResilienceEventType.MODEL_AUTO_PULLED, node.id, f"Auto-pulling missing model '{model}'")
            try:
                last_status = ""
                async for status in ollama.pull_model(model):
                    msg = status.get("status", "Downloading...")
                    if "completed" in status and "total" in status:
                        pct = int((status["completed"] / status["total"]) * 100)
                        msg += f" {pct}%"
                    
                    if msg != last_status:
                        await broadcast_log(ws_manager, node.id, f"📥 {msg}", "INFO")
                        last_status = msg
                
                await broadcast_log(ws_manager, node.id, f"✓ Model '{model}' pulled successfully. Retrying generation...", "SUCCESS")
                
                # Retry generation
                chunks = []
                chunk_count = 0
                async for chunk in ollama.generate(
                    model=model,
                    prompt=prompt,
                    stream=True,
                    num_ctx=num_ctx,
                    options=options,
                    keep_alive=f"{node.data.keep_alive}m"
                    if hasattr(node.data, "keep_alive") and node.data.keep_alive is not None
                    else "5m",
                ):
                    chunks.append(chunk)
                    chunk_count += 1
                    if chunk_count % 10 == 0:
                        await broadcast_log(
                            ws_manager,
                            node.id,
                            f"   [Stream] Generated {len(chunks)} tokens...",
                        )
            except Exception as pull_err:
                await broadcast_log(ws_manager, node.id, f"✗ Failed to pull model '{model}': {pull_err}", "ERROR")
                return f"[Error: Failed to pull model: {pull_err}]"

        full_response = "".join(chunks)
        
        # ── Confidence Scoring (Probabilistic Resilience) ──
        import re
        uncertainty_markers = [
            r"i('m| am) not sure", r"i don('|)t know", r"it('s| is) (unclear|ambiguous)",
            r"cannot (determine|find|answer)", r"i lack (the )?context", r"as an ai",
            r"does not provide", r"insufficient information"
        ]
        is_uncertain = any(re.search(pattern, full_response, re.IGNORECASE) for pattern in uncertainty_markers)
        is_suspiciously_short = len(full_response.strip()) < 20
        
        if is_uncertain or is_suspiciously_short:
            reason = "uncertainty detected" if is_uncertain else "suspiciously short output"
            raise LowConfidenceError(f"Low confidence ({reason})", full_response)
        
        await broadcast_log(
            ws_manager,
            node.id,
            f"✓ Generation complete ({len(full_response):,} chars)",
            "SUCCESS",
        )
        return full_response

    except OllamaConnectionError as e:
        raise e
    except LowConfidenceError:
        raise  # Let the HITL recovery loop in execute.py catch this
    except ModelNotFoundError as e:
        await broadcast_log(
            ws_manager,
            node.id,
            f"✗ {str(e)}",
            "ERROR",
            raw_traceback=traceback.format_exc(),
        )
        return f"[Error: {str(e)}]"
    except Exception as e:
        msg = str(e)
        if "RemoteProtocolError" in msg or "ConnectError" in msg:
            friendly = "The AI connection dropped mid-response. Please check Ollama is still running and try again."
            await broadcast_log(
                ws_manager,
                node.id,
                f"✗ {friendly}",
                "ERROR",
                raw_traceback=traceback.format_exc(),
            )
            return f"[Error: {friendly}]"
        await broadcast_log(
            ws_manager,
            node.id,
            f"✗ Unexpected error: {msg}",
            "ERROR",
            raw_traceback=traceback.format_exc(),
        )
        return f"[Error: {msg}]"


async def execute_action_node(
    node: DagNode,
    input_context: str,
    ws_manager,
) -> str:
    """
    Execute an action node — writes the accumulated output to a file.

    Returns:
        Confirmation message.
    """
    target_path = node.data.target_path or ""

    import os
    if target_path and not os.path.isabs(target_path):
        target_path = os.path.join(os.path.expanduser("~/Desktop"), target_path)

    await broadcast_log(
        ws_manager,
        node.id,
        f"📁 ACTION: Writing output to '{target_path}'...",
    )

    if not target_path:
        await broadcast_log(
            ws_manager,
            node.id,
            "No target path specified. Output discarded.",
            "WARN",
        )
        return input_context

    # Warn if upstream node returned an error string instead of real content
    if input_context.startswith("[Error:") or input_context.startswith("[SKIPPED:") or input_context.startswith("[Paused:"):
        await broadcast_log(
            ws_manager,
            node.id,
            f"⚠️ Upstream node produced a non-content result: {input_context[:80]}... Writing it to file anyway for audit trail.",
            "WARN",
        )

    try:
        base, ext = os.path.splitext(target_path)
        fmt = getattr(node.data, "output_format", "Plain Text")

        if not ext:
            if fmt == "Markdown":
                target_path += ".md"
            elif fmt == "JSON":
                target_path += ".json"
            elif fmt == "CSV":
                target_path += ".csv"
            elif fmt == "PDF":
                target_path += ".pdf"
            elif fmt == "Docs":
                target_path += ".docx"
            elif fmt == "HTML":
                target_path += ".html"
            else:
                target_path += ".txt"

        # Ensure parent directory exists
        os.makedirs(os.path.dirname(target_path) or ".", exist_ok=True)

        if target_path.endswith(".pdf"):
            try:
                from fpdf import FPDF
                pdf = FPDF()
                pdf.add_page()
                pdf.set_font("Helvetica", size=12)
                # Encode text to latin-1 or handle Unicode properly
                pdf.multi_cell(0, 10, text=input_context.encode('latin-1', 'replace').decode('latin-1'))
                await asyncio.to_thread(pdf.output, target_path)
            except ImportError:
                await broadcast_log(ws_manager, node.id, "fpdf2 not installed. Saving as text.", "WARN")
                target_path = target_path.replace(".pdf", ".txt")
                async with aiofiles.open(target_path, "w", encoding="utf-8") as f:
                    await f.write(input_context)

        elif target_path.endswith(".docx"):
            try:
                from docx import Document
                doc = Document()
                doc.add_paragraph(input_context)
                await asyncio.to_thread(doc.save, target_path)
            except ImportError:
                await broadcast_log(ws_manager, node.id, "python-docx not installed. Saving as text.", "WARN")
                target_path = target_path.replace(".docx", ".txt")
                async with aiofiles.open(target_path, "w", encoding="utf-8") as f:
                    await f.write(input_context)

        else:
            async with aiofiles.open(target_path, "w", encoding="utf-8") as f:
                await f.write(input_context)

        await broadcast_log(
            ws_manager,
            node.id,
            f"✓ Written {len(input_context)} chars to {target_path}",
            "SUCCESS",
        )
        return f"Output saved to {target_path}"

    except PermissionError:
        await broadcast_log(
            ws_manager,
            node.id,
            f"✗ Permission denied: {target_path}",
            "ERROR",
        )
        return f"[Error: Permission denied writing to '{target_path}']"
    except Exception as e:
        await broadcast_log(
            ws_manager,
            node.id,
            f"✗ Write failed: {str(e)}",
            "ERROR",
            raw_traceback=traceback.format_exc(),
        )
        return f"[Error: {str(e)}]"


# ─── New Execution Handlers ───────────────────────────────────────────────────


async def execute_email_trigger_node(node: DagNode, ws_manager) -> str:
    from core.email_listener import EmailConfig, poll_inbox_once

    await broadcast_log(ws_manager, node.id, "📧 TRIGGER: Checking email inbox...")
    try:
        config = EmailConfig(
            imap_server=node.data.imap_server or "",
            imap_port=node.data.imap_port or 993,
            email_address=node.data.email_address or "",
            app_password=node.data.app_password or "",
            email_count=node.data.email_count or "1"
        )
        results = await poll_inbox_once(config)
        if not results:
            await broadcast_log(ws_manager, node.id, "No unread emails found.", "WARN")
            return ""

        # Format all fetched emails
        formatted_emails = []
        for i, email in enumerate(results, 1):
            formatted_emails.append(f"Email {i}:\nFrom: {email['sender']}\nSubject: {email['subject']}\n\n{email['body']}")
        
        content = "\n\n---\n\n".join(formatted_emails)
        
        await broadcast_log(
            ws_manager, node.id, f"✓ Read {len(results)} email(s)", "SUCCESS"
        )
        return content
    except Exception as e:
        await broadcast_log(ws_manager, node.id, f"✗ Email error: {str(e)}", "ERROR")
        return ""


async def execute_webhook_trigger_node(
    node: DagNode, input_context: str, ws_manager
) -> str:
    await broadcast_log(
        ws_manager, node.id, "🌐 TRIGGER: Processing webhook payload..."
    )

    # If the webhook route injected context via target_path hack
    if node.data.target_path and node.data.target_path.startswith("RAW_CONTEXT:"):
        return node.data.target_path[len("RAW_CONTEXT:") :]

    return input_context


async def execute_cron_trigger_node(node: DagNode, ws_manager) -> str:
    await broadcast_log(ws_manager, node.id, "⏰ TRIGGER: Cron scheduler fired.")
    return f"Triggered by cron schedule at {datetime.now(timezone.utc).isoformat()}"


async def execute_clipboard_trigger_node(
    node: DagNode, input_context: str, ws_manager
) -> str:
    await broadcast_log(ws_manager, node.id, "📋 TRIGGER: Clipboard changed.")
    # Context is passed from clipboard monitor
    if node.data.target_path == "CLIPBOARD":
        import pyperclip

        return pyperclip.paste()
    return input_context


async def execute_browser_action_node(node: DagNode, ws_manager) -> str:
    from core.browser_rpa import scrape_url

    url = node.data.browser_url
    if not url:
        await broadcast_log(
            ws_manager, node.id, "✗ No URL specified for browser RPA.", "ERROR"
        )
        return ""

    await broadcast_log(ws_manager, node.id, f"🌐 ACTION: Scraping URL: {url}...")
    try:
        result = await scrape_url(
            url=url,
            instruction=node.data.browser_instruction or "",
            headless=node.data.browser_headless if hasattr(node.data, "browser_headless") and node.data.browser_headless is not None else True,
        )
        if result["status"] == "error":
            await broadcast_log(
                ws_manager, node.id, f"✗ Scraping failed: {result['error']}", "ERROR"
            )
            return f"[Error: {result['error']}]"

        await broadcast_log(
            ws_manager,
            node.id,
            f"✓ Extracted {result['char_count']} chars from {result['title']}",
            "SUCCESS",
        )
        return result["extracted_content"]
    except Exception as e:
        await broadcast_log(ws_manager, node.id, f"✗ Browser error: {str(e)}", "ERROR")
        return ""


async def execute_subprocess_action_node(
    node: DagNode, input_context: str, ws_manager
) -> str:
    from core.safe_executor import run_code

    runtime = node.data.subprocess_runtime or "bash"
    code = node.data.subprocess_code or ""

    await broadcast_log(ws_manager, node.id, f"⚙️ ACTION: Running {runtime} script...")
    result = await run_code(runtime=runtime, code=code, input_context=input_context)

    if result["status"] == "success":
        await broadcast_log(
            ws_manager, node.id, "✓ Script completed successfully", "SUCCESS"
        )
        return result["stdout"]
    elif result.get("status") == "sandbox_violation":
        from core.safe_executor import SandboxViolationError
        raise SandboxViolationError(result.get("module_name", "unknown"), result["stderr"])
    else:
        err = result["stderr"] or result["stdout"] or "Unknown error"
        await broadcast_log(
            ws_manager,
            node.id,
            f"✗ Script failed (exit code {result['exit_code']}): {err}",
            "ERROR",
        )
        return f"STDOUT:\n{result['stdout']}\n\nSTDERR:\n{result['stderr']}"


async def execute_memory_store_node(
    node: DagNode, input_context: str, ws_manager
) -> str:
    from core.memory_manager import ingest

    collection = node.data.memory_collection or "default"
    chunk_size = node.data.memory_chunk_size or 512

    await broadcast_log(
        ws_manager, node.id, f"🧠 MEMORY: Storing in collection '{collection}'..."
    )
    result = await ingest(
        text=input_context, collection_name=collection, chunk_size=chunk_size
    )

    if result["status"] == "success":
        await broadcast_log(ws_manager, node.id, f"✓ {result['message']}", "SUCCESS")
    elif result["status"] == "error":
        await broadcast_log(
            ws_manager, node.id, f"✗ Memory store error: {result['error']}", "ERROR"
        )

    return input_context  # Passthrough


async def execute_memory_query_node(
    node: DagNode, input_context: str, ws_manager
) -> str:
    from core.memory_manager import query

    collection = node.data.memory_collection or "default"
    top_k = node.data.memory_top_k or 3

    # We use input_context as the query prompt
    await broadcast_log(
        ws_manager, node.id, f"🧠 MEMORY: Querying collection '{collection}'..."
    )
    result = await query(prompt=input_context, collection_name=collection, top_k=top_k)

    if result["status"] == "success":
        await broadcast_log(
            ws_manager,
            node.id,
            f"✓ Retrieved {len(result['results'])} memory segments",
            "SUCCESS",
        )

        mode = node.data.memory_inject_mode or "prepend"
        mem_str = "[Retrieved Memory context:]\n" + result["context_string"] + "\n\n"
        
        if result.get("negative_context_string"):
            mem_str += "[IMPORTANT - PREVIOUS FAILURES TO AVOID:]\n" + result["negative_context_string"] + "\n\n"

        if mode == "prepend":
            return mem_str + input_context
        else:
            return input_context + "\n\n" + mem_str
    else:
        await broadcast_log(
            ws_manager,
            node.id,
            f"✗ Memory query error: {result.get('error', 'unknown')}",
            "ERROR",
        )
        return input_context


async def execute_node(
    node: DagNode,
    input_context: str,
    ws_manager,
    ollama: Optional[OllamaClient] = None,
    bypass_ram_check: bool = False,
) -> str:
    """
    Execute a single DAG node based on its type.

    Args:
        node: The DAG node to execute.
        input_context: Context string from upstream nodes.
        ws_manager: WebSocket connection manager for log broadcasting.
        ollama: Ollama client instance (required for agent nodes).

    Returns:
        Output context string to pass to downstream nodes.
    """
    if node.type == NodeType.TRIGGER:
        return await execute_trigger_node(node, ws_manager)
    elif node.type == NodeType.AGENT:
        if ollama is None:
            ollama = OllamaClient()
        return await execute_agent_node(node, input_context, ws_manager, ollama, bypass_ram_check)
    elif node.type == NodeType.ACTION:
        return await execute_action_node(node, input_context, ws_manager)
    elif node.type == NodeType.EMAIL_TRIGGER:
        return await execute_email_trigger_node(node, ws_manager)
    elif node.type == NodeType.WEBHOOK_TRIGGER:
        return await execute_webhook_trigger_node(node, input_context, ws_manager)
    elif node.type == NodeType.CRON_TRIGGER:
        return await execute_cron_trigger_node(node, ws_manager)
    elif node.type == NodeType.CLIPBOARD_TRIGGER:
        return await execute_clipboard_trigger_node(node, input_context, ws_manager)
    elif node.type == NodeType.BROWSER_ACTION:
        return await execute_browser_action_node(node, ws_manager)
    elif node.type == NodeType.SUBPROCESS_ACTION:
        return await execute_subprocess_action_node(node, input_context, ws_manager)
    elif node.type == NodeType.MEMORY_STORE:
        return await execute_memory_store_node(node, input_context, ws_manager)
    elif node.type == NodeType.MEMORY_QUERY:
        return await execute_memory_query_node(node, input_context, ws_manager)
    else:
        await broadcast_log(
            ws_manager,
            node.id,
            f"✗ Unknown node type: {node.type}",
            "ERROR",
        )
        return input_context
