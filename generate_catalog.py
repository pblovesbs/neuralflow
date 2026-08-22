import sys

content = """
## Extended Catalog: 40+ Actionable & HITL Errors and Solutions

This section details an extensive list of predictable workflow failures across different categories, how NeuralFlow's engine detects them, and the actionable solutions presented to the user via the `RecoveryModal` or `ActionableErrorModal`.

### Category 1: AI Confidence & Output Quality Issues
These occur when the LLM generates output that fails heuristic quality checks (Low Confidence).

1. **Suspiciously Short Output:** LLM responded with <10 chars (e.g., "OK", "Yes"). **Solution:** Retry with higher temperature / Edit output manually / Skip.
2. **Suspiciously Repetitive Output:** LLM got stuck in a hallucination loop (e.g., repeating the same word). **Solution:** Retry with higher frequency penalty / Edit manually.
3. **Missing JSON Markdown:** Expected ````json...```` but got raw text. **Solution:** Auto-format retry / Edit manually.
4. **Invalid JSON Format:** Output claimed to be JSON but failed `json.loads()`. **Solution:** Retry with strict JSON mode / Edit manually.
5. **Missing Required Schema Keys:** JSON is valid but missing expected fields. **Solution:** Retry with explicit prompt reminder / Edit manually.
6. **Refusal to Answer:** LLM output matches refusal patterns (e.g., "I cannot fulfill this request"). **Solution:** Rewrite prompt to bypass filters / Skip.
7. **Empty Output:** LLM returned a blank string. **Solution:** Retry / Check context window / Edit manually.
8. **Truncated Output:** Output hit the `max_tokens` limit and cut off mid-sentence. **Solution:** Retry with increased `max_tokens` / Resume generation / Edit.
9. **Off-Topic Drift:** Output fails a vector similarity check against the task objective. **Solution:** Retry with lower temperature / Edit manually.
10. **Code Block Missing:** Expected Python code but got prose. **Solution:** Retry with "Code Only" prompt flag / Edit manually.
11. **Syntax Error in Generated Code:** AI wrote Python code that fails `ast.parse()`. **Solution:** Retry / Edit code manually.
12. **Markdown Table Malformed:** Requested a table but pipes/columns are broken. **Solution:** Retry / Edit manually.
13. **Language Mismatch:** Expected English, AI responded in another language. **Solution:** Retry with language constraint / Edit manually.
14. **Overly Verbose Output:** AI ignored conciseness constraints (e.g., "Keep it under 50 words"). **Solution:** Retry with strict length prompt / Edit manually.
15. **Unresolved Placeholders:** Output contains template tags like `[Insert Name Here]`. **Solution:** Edit manually to fill blanks / Skip.

### Category 2: Sandbox Security & Execution Violations
These occur when a Python Execution Node attempts unsafe operations.

16. **Unauthorized Module Import:** Script attempts `import os` or `sys`. **Solution:** Whitelist module globally / Rewrite code / Skip.
17. **File System Write Attempt:** Script tries to open/write a file on the host. **Solution:** Whitelist path / Edit code to use sandbox storage / Skip.
18. **Network Access Attempt:** Script tries to use `requests` or `urllib` to fetch external data. **Solution:** Whitelist domain / Edit code / Skip.
19. **Subprocess Execution Blocked:** Script attempts `subprocess.Popen`. **Solution:** Deny & Rewrite code (highly dangerous) / Whitelist (if strictly necessary).
20. **Infinite Loop Detected:** Script execution exceeded the 10-second timeout. **Solution:** Edit code to fix loop / Skip node.
21. **High Memory Consumption (OOM):** Script exceeded the 512MB RAM sandbox limit. **Solution:** Optimize code (Edit) / Increase RAM limit limit for node / Skip.
22. **Environment Variable Access:** Script attempts to read `os.environ`. **Solution:** Pass via node inputs instead / Edit code / Skip.
23. **Thread/Multiprocessing Spawn:** Script attempts to spawn threads. **Solution:** Edit code to run synchronously / Skip.
24. **Eval/Exec Usage:** Script uses dangerous dynamic execution `eval()`. **Solution:** Edit code to use safer alternatives / Whitelist.
25. **Socket Binding Attempt:** Script tries to open a listening port. **Solution:** Block & Rewrite / Skip.

### Category 3: System, Hardware & Engine Errors
These occur when the underlying infrastructure (Ollama, GPU, OS) encounters issues.

26. **Ollama Engine Offline:** Cannot connect to `http://localhost:11434`. **Solution:** 1-Click `ollama serve` start / Retry connection.
27. **Model Not Installed:** Requested model (e.g., `llama3`) is missing. **Solution:** 1-Click `ollama run llama3` / Select fallback model.
28. **Insufficient VRAM:** Model requires more VRAM than currently available. **Solution:** Unload other models / Switch to smaller quantized model / Proceed anyway (CPU fallback).
29. **GPU Driver Crash:** CUDA/Metal driver lost connection. **Solution:** Restart engine / Fallback to CPU mode.
30. **Ollama Timeout:** Inference took longer than the configured timeout (e.g., 5 mins). **Solution:** Retry / Restart Ollama.
31. **Disk Space Full:** Cannot save workflow execution logs or state. **Solution:** 1-Click clear old logs / Free up disk space.
32. **Port Conflict:** Backend port 8000 is in use. **Solution:** Auto-kill conflicting process / Change port.
33. **Context Length Exceeded:** Prompt size exceeds model's context window. **Solution:** Truncate input context / Switch to a larger context model (e.g., 128k).
34. **Model Crash (Segfault):** Ollama engine crashed internally during inference. **Solution:** 1-Click restart Ollama / Retry node.
35. **Corrupted Model File:** GGUF file is broken. **Solution:** 1-Click re-download model.

### Category 4: Graph, Node & Data Flow Errors
These occur when the workflow DAG is structurally invalid or data passing fails.

36. **Missing Required Input:** Node B requires `user_name` from Node A, but Node A output was empty. **Solution:** Edit Node A output manually / Retry Node A / Skip.
37. **Circular Dependency Detected:** Graph has a cycle causing an infinite loop. **Solution:** Abort execution / Open graph editor.
38. **Unmapped Variable in Prompt:** Prompt uses `{{data}}` but no input provides `data`. **Solution:** Edit prompt template / Connect missing edge.
39. **Type Mismatch in Edge:** Expected array, got string. **Solution:** Insert Auto-Transformer node / Edit output manually.
40. **Disconnected Terminal Node:** A required final node has no incoming edges. **Solution:** Edit graph / Skip.
41. **Rate Limit Hit (External API):** If an API node is used and returns 429. **Solution:** Wait & Retry / Edit code to add backoff.
42. **API Key Missing:** External API node lacks credentials. **Solution:** Prompt user for API key in UI / Skip.
43. **Invalid Edge Condition:** A conditional router node failed to match any branch. **Solution:** Select branch manually (HITL override) / Edit condition.
44. **Data Size Exceeds Limit:** Payload passed between nodes is > 10MB. **Solution:** Edit to truncate / Skip.
45. **Node Disabled:** Workflow tried to run a node that was toggled off. **Solution:** Enable node / Skip.
"""

with open('/Users/preyasbera/.gemini/antigravity-ide/brain/103c8996-e10d-481a-8f29-f95956f2d4bc/implementation_plan.md', 'a') as f:
    f.write("\n" + content)
