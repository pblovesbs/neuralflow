"""
file_parser.py — Unified Omni-Parser for NeuralFlow.

Auto-detects file type from extension and extracts plain text.
Supports: .txt, .md, .pdf, .docx, .csv
Falls back to a descriptive error string for unsupported formats so the workflow continues gracefully.
"""

from __future__ import annotations

import csv
import io
import os


def parse_file(path: str) -> str:
    """
    Unified file parser — auto-detects extension and returns plain text content.

    Args:
        path: Absolute path to the file.

    Returns:
        Extracted plain text string, or an error message string on failure.
    """
    if not os.path.exists(path):
        return f"[File not found: '{path}']"

    if not os.path.isfile(path):
        return f"[Path is a directory, not a file: '{path}']"

    ext = os.path.splitext(path)[1].lower()

    try:
        if ext in (".txt", ".md", ".markdown", ".rst", ".log"):
            return _read_text(path)
        elif ext == ".pdf":
            return _read_pdf(path)
        elif ext in (".docx", ".doc"):
            return _read_docx(path)
        elif ext == ".csv":
            return _read_csv(path)
        else:
            # Try reading as plain text as a best-effort fallback
            try:
                return _read_text(path)
            except Exception:
                return (
                    f"[Unsupported file type '{ext}'. "
                    f"NeuralFlow supports .txt, .md, .pdf, .docx, and .csv files. "
                    f"Please convert your file to one of these formats.]"
                )
    except ImportError as e:
        missing = str(e).split("'")[1] if "'" in str(e) else str(e)
        return f"[Parser library missing for {ext} files: '{missing}'. Ask your administrator to install it.]"
    except Exception as e:
        return f"[Failed to read '{os.path.basename(path)}': {str(e)}]"


def _read_text(path: str) -> str:
    """Read a plain text or markdown file."""
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def _read_pdf(path: str) -> str:
    """Extract text from a PDF using pypdf (zero-dependency)."""
    try:
        from pypdf import PdfReader
    except ImportError:
        raise ImportError("pypdf")

    reader = PdfReader(path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text and text.strip():
            pages.append(f"--- Page {i + 1} ---\n{text.strip()}")
    if not pages:
        return "[PDF contained no extractable text. It may be a scanned image.]"
    return "\n\n".join(pages)


def _read_docx(path: str) -> str:
    """Extract text from a .docx file using python-docx."""
    try:
        from docx import Document
    except ImportError:
        raise ImportError("python-docx")

    doc = Document(path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    if not paragraphs:
        return "[Document contained no extractable text.]"
    return "\n".join(paragraphs)


def _read_csv(path: str) -> str:
    """Read a CSV file and format as a readable plain-text table."""
    with open(path, "r", encoding="utf-8", errors="replace", newline="") as f:
        reader = csv.reader(f)
        rows = list(reader)

    if not rows:
        return "[CSV file is empty.]"

    # Limit to first 100 rows to avoid context overflow
    max_rows = 100
    truncated = len(rows) > max_rows
    sample = rows[:max_rows]

    lines = [",".join(row) for row in sample]
    result = "\n".join(lines)
    if truncated:
        result += f"\n\n[... truncated at {max_rows} rows. Full file has {len(rows)} rows.]"
    return result
