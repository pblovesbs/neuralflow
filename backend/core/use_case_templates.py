"""
use_case_templates.py — Generates DAGs for the Standard Mode Wizard.
"""
from typing import Dict, Any

def generate_use_case_dag(use_case_id: str, config: Dict[str, Any]) -> dict:
    """
    Generates a DagWorkflow JSON dict based on the selected use case and parameters.
    """
    import time
    
    wf_id = f"wf_{int(time.time()*1000)}"
    nodes = []
    edges = []
    
    # Common helper to generate IDs
    def mk_id(prefix):
        nonlocal count
        count += 1
        return f"{prefix}_{count}"
    count = 0

    if use_case_id == "summarize":
        t_id = mk_id("trigger")
        a_id = mk_id("agent")
        nodes.append({
            "id": t_id,
            "type": "trigger",
            "data": {"label": "Source Document", "target_path": config.get("source_path", "")}
        })
        nodes.append({
            "id": a_id,
            "type": "agent",
            "data": {
                "label": "AI Summarizer", 
                "model": config.get("model", "qwen2.5:0.5b"),
                "prompt_template": "Summarize the following content in 3-5 bullet points. Return ONLY the summary.\n\n[INPUT]:\n{{input}}"
            }
        })
        edges.append({"source": t_id, "target": a_id})
        
        if config.get("save_path"):
            act_id = mk_id("action")
            nodes.append({
                "id": act_id,
                "type": "action",
                "data": {"label": "Save Summary", "target_path": config.get("save_path")}
            })
            edges.append({"source": a_id, "target": act_id})

    elif use_case_id == "action_items":
        t_id = mk_id("trigger")
        a_id = mk_id("agent")
        nodes.append({
            "id": t_id,
            "type": "trigger",
            "data": {"label": "Meeting Notes", "target_path": config.get("source_path", "")}
        })
        nodes.append({
            "id": a_id,
            "type": "agent",
            "data": {
                "label": "Action Item Extractor", 
                "model": config.get("model", "qwen2.5:0.5b"),
                "prompt_template": "Extract all action items from the following meeting notes as a checklist. Return ONLY the checklist.\n\n[INPUT]:\n{{input}}"
            }
        })
        edges.append({"source": t_id, "target": a_id})

    elif use_case_id == "translate":
        t_id = mk_id("trigger")
        a_id = mk_id("agent")
        nodes.append({
            "id": t_id,
            "type": "trigger",
            "data": {"label": "Source Text", "target_path": config.get("source_path", "")}
        })
        nodes.append({
            "id": a_id,
            "type": "agent",
            "data": {
                "label": "Translator", 
                "model": config.get("model", "qwen2.5:0.5b"),
                "prompt_template": f"Translate the following text to {config.get('target_language', 'English')}. Return ONLY the translated text.\n\n[INPUT]:\n{{input}}"
            }
        })
        edges.append({"source": t_id, "target": a_id})

    elif use_case_id == "code_review":
        t_id = mk_id("trigger")
        a_id = mk_id("agent")
        nodes.append({
            "id": t_id,
            "type": "trigger",
            "data": {"label": "Source Code", "target_path": config.get("source_path", "")}
        })
        nodes.append({
            "id": a_id,
            "type": "agent",
            "data": {
                "label": "AI Reviewer", 
                "model": config.get("model", "qwen2.5:0.5b"),
                "prompt_template": "Review the following code for bugs, security issues, and style. Provide specific suggestions. Return ONLY the review.\n\n[INPUT]:\n{{input}}"
            }
        })
        edges.append({"source": t_id, "target": a_id})

    elif use_case_id == "receipts":
        t_id = mk_id("trigger")
        a_id = mk_id("agent")
        nodes.append({
            "id": t_id,
            "type": "trigger",
            "data": {"label": "Receipts Folder", "target_path": config.get("source_path", "")}
        })
        nodes.append({
            "id": a_id,
            "type": "agent",
            "data": {
                "label": "Data Extractor", 
                "model": config.get("model", "qwen2.5:0.5b"),
                "prompt_template": "Extract Date, Merchant, and Total Amount from the following receipt text. Format as JSON. Return ONLY JSON.\n\n[INPUT]:\n{{input}}"
            }
        })
        edges.append({"source": t_id, "target": a_id})

    elif use_case_id == "chat_local_data":
        t_id = mk_id("trigger")
        mem_id = mk_id("memory_store")
        query_id = mk_id("memory_query")
        agent_id = mk_id("agent")
        
        nodes.append({
            "id": t_id,
            "type": "trigger",
            "data": {"label": "Local Data", "target_path": config.get("source_path", "")}
        })
        nodes.append({
            "id": mem_id,
            "type": "memory_store",
            "data": {"label": "Ingest Data", "memory_collection": "chat_data"}
        })
        # The frontend wizard will use an empty trigger target_path for the user query, and query memory
        q_trigger = mk_id("trigger")
        nodes.append({
            "id": q_trigger,
            "type": "trigger",
            "data": {"label": "User Query", "target_path": "RAW_CONTEXT:" + config.get("query", "Summarize the data.")}
        })
        nodes.append({
            "id": query_id,
            "type": "memory_query",
            "data": {"label": "Search Local Data", "memory_collection": "chat_data", "memory_top_k": 3}
        })
        nodes.append({
            "id": agent_id,
            "type": "agent",
            "data": {
                "label": "AI Assistant", 
                "model": config.get("model", "qwen2.5:0.5b"),
                "prompt_template": "Answer the user query using ONLY the provided memory context.\n\n{{input}}"
            }
        })
        
        edges.append({"source": t_id, "target": mem_id})
        edges.append({"source": q_trigger, "target": query_id})
        edges.append({"source": query_id, "target": agent_id})
        
    else:
        raise ValueError(f"Unknown use case: {use_case_id}")

    return {
        "workflow_id": wf_id,
        "nodes": nodes,
        "edges": edges
    }
