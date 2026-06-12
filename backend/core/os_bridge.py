"""
os_bridge.py — macOS Native Integration Layer for NeuralFlow.

Provides a modular, subprocess-based AppleScript execution layer
for communicating with native macOS applications.

All functions are intentionally platform-gated with graceful fallbacks
to allow easy extension to Windows/Linux later.
"""

from __future__ import annotations

import platform
import subprocess
import sys
from datetime import datetime


def _is_macos() -> bool:
    """Return True if running on macOS."""
    return sys.platform == "darwin"


def run_applescript(script: str) -> str:
    """
    Execute an AppleScript command via osascript subprocess.

    Args:
        script: The AppleScript string to execute.

    Returns:
        The stdout output of the script, stripped of whitespace.

    Raises:
        RuntimeError: If osascript fails or is not available.
        EnvironmentError: If not running on macOS.
    """
    if not _is_macos():
        raise EnvironmentError("AppleScript is only supported on macOS.")

    result = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True,
        text=True,
        timeout=15,
    )

    if result.returncode != 0:
        raise RuntimeError(f"AppleScript error: {result.stderr.strip()}")

    return result.stdout.strip()


def show_notification(title: str, body: str, subtitle: str = "NeuralFlow") -> None:
    """
    Show a macOS banner notification.

    Args:
        title: The main notification title.
        body: The notification body text.
        subtitle: Optional subtitle (shown below the title).
    """
    if not _is_macos():
        print(f"[Notification] {title}: {body}")
        return

    safe_title = title.replace('"', '\\"')
    safe_body = body.replace('"', '\\"')
    safe_subtitle = subtitle.replace('"', '\\"')

    script = (
        f'display notification "{safe_body}" '
        f'with title "{safe_title}" '
        f'subtitle "{safe_subtitle}"'
    )
    try:
        run_applescript(script)
    except Exception:
        pass  # Notifications are best-effort


def add_calendar_event(
    title: str,
    start_date: datetime,
    end_date: datetime | None = None,
    notes: str = "",
    calendar_name: str = "Calendar",
) -> str:
    """
    Add an event to the macOS Calendar app.

    Args:
        title: Event title.
        start_date: Event start datetime.
        end_date: Event end datetime (defaults to 1 hour after start).
        notes: Optional event notes/description.
        calendar_name: Target calendar name (defaults to "Calendar").

    Returns:
        Confirmation string from AppleScript.
    """
    if not _is_macos():
        raise EnvironmentError("Calendar integration is only supported on macOS.")

    if end_date is None:
        from datetime import timedelta
        end_date = start_date + timedelta(hours=1)

    def _fmt(dt: datetime) -> str:
        return dt.strftime("%B %d, %Y %H:%M:%S")

    safe_title = title.replace('"', '\\"')
    safe_notes = notes.replace('"', '\\"')
    safe_cal = calendar_name.replace('"', '\\"')
    start_str = _fmt(start_date)
    end_str = _fmt(end_date)

    script = f"""
tell application "Calendar"
    tell calendar "{safe_cal}"
        make new event with properties {{
            summary: "{safe_title}",
            start date: date "{start_str}",
            end date: date "{end_str}",
            description: "{safe_notes}"
        }}
    end tell
end tell
"""
    return run_applescript(script)


def open_file_in_finder(path: str) -> None:
    """
    Reveal a file in the macOS Finder.

    Args:
        path: Absolute path to the file to reveal.
    """
    if not _is_macos():
        return
    try:
        subprocess.run(["open", "-R", path], check=True, timeout=5)
    except Exception:
        pass
