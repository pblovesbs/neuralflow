"""
email_listener.py — Autonomous IMAP Email Trigger for NeuralFlow.

Uses Python's built-in imaplib + email modules (zero external dependencies).
Connects to any IMAP server (Gmail, Outlook, etc.) using SSL and polls
for UNREAD emails. Marks messages as Seen and extracts text payload.
"""

from __future__ import annotations

import asyncio
import email
import imaplib
import re
from datetime import datetime, timezone


class EmailConfig:
    """Configuration for an IMAP polling session."""

    def __init__(
        self,
        imap_server: str,
        imap_port: int,
        email_address: str,
        app_password: str,
        poll_interval: int = 60,
        email_count: str = "1",
    ):
        self.imap_server = imap_server
        self.imap_port = imap_port
        self.email_address = email_address
        self.app_password = app_password
        self.poll_interval = max(15, poll_interval)  # Minimum 15s to avoid rate limits
        self.email_count = email_count.lower().strip()


def _extract_plain_text(msg: email.message.Message) -> str:
    """Extract plain-text body from an email message."""
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            disp = str(part.get("Content-Disposition", ""))
            if ct == "text/plain" and "attachment" not in disp:
                try:
                    charset = part.get_content_charset() or "utf-8"
                    payload = part.get_payload(decode=True)
                    if payload and isinstance(payload, bytes):
                        body = payload.decode(charset, errors="replace")
                    break
                except Exception:
                    continue
    else:
        try:
            charset = msg.get_content_charset() or "utf-8"
            payload = msg.get_payload(decode=True)
            if payload and isinstance(payload, bytes):
                body = payload.decode(charset, errors="replace")
        except Exception:
            body = str(msg.get_payload())

    # Clean up quoted-printable artifacts and excess whitespace
    body = re.sub(r"=\r?\n", "", body)
    body = re.sub(r"\r\n", "\n", body)
    return body.strip()[:8000]  # Cap at 8K chars for context safety


def fetch_unread_emails(config: EmailConfig) -> list[dict]:
    """
    Connect to IMAP, fetch UNREAD messages, mark them as Seen.
    Returns a list of email payloads ready for the execution engine.
    This is a SYNCHRONOUS function; call it in an executor thread.
    """
    results = []

    try:
        # Connect with SSL
        mail = imaplib.IMAP4_SSL(config.imap_server, config.imap_port, timeout=15)
        mail.login(config.email_address, config.app_password)
        mail.select("INBOX")

        # Search for UNREAD messages
        status, messages = mail.search(None, "UNSEEN")
        if status != "OK" or not messages[0]:
            mail.logout()
            return []

        msg_ids = messages[0].split()
        
        # Determine how many emails to fetch
        if config.email_count == "all":
            limit = 50  # Hard cap to avoid blowing up memory/context window
        else:
            try:
                limit = int(config.email_count)
            except ValueError:
                limit = 1

        limit = max(1, min(limit, 50)) # Clamp between 1 and 50

        # Process the first N emails sequentially (oldest unread first)
        for msg_id in msg_ids[:limit]:
            try:
                # Fetch message
                status, data = mail.fetch(msg_id, "(RFC822)")
                if status != "OK":
                    continue

                import typing
                raw_email = typing.cast(tuple, data[0])[1]
                msg = email.message_from_bytes(raw_email)

                sender = msg.get("From", "Unknown Sender")
                subject = msg.get("Subject", "(No Subject)")
                body = _extract_plain_text(msg)

                # Mark as Seen immediately
                mail.store(msg_id, "+FLAGS", "\\Seen")

                results.append(
                    {
                        "source": "email",
                        "sender": sender,
                        "subject": subject,
                        "body": body,
                        "received_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
            except Exception:
                continue

        mail.logout()
    except imaplib.IMAP4.error as e:
        raise ConnectionError(f"IMAP authentication failed: {str(e)}")
    except Exception as e:
        raise ConnectionError(f"Email connection failed: {str(e)}")

    return results


async def poll_inbox_once(config: EmailConfig) -> list[dict]:
    """
    Async wrapper — runs the blocking IMAP fetch in a thread pool executor
    with exponential backoff for network timeouts.
    """
    loop = asyncio.get_event_loop()
    max_retries = 3
    base_delay = 2

    for attempt in range(max_retries):
        try:
            return await loop.run_in_executor(None, fetch_unread_emails, config)
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            delay = base_delay * (2 ** attempt)
            print(f"IMAP fetch failed: {e}. Retrying in {delay} seconds...")
            await asyncio.sleep(delay)
    
    return []


async def test_imap_connection(config: EmailConfig) -> dict:
    """Test IMAP connectivity. Returns success/error status dict."""
    try:
        results = await asyncio.wait_for(
            poll_inbox_once(config),
            timeout=20.0,
        )
        return {
            "success": True,
            "message": f"Connected successfully. {len(results)} unread email(s) found.",
            "unread_count": len(results),
        }
    except asyncio.TimeoutError:
        return {"success": False, "message": "Connection timed out after 20 seconds."}
    except ConnectionError as e:
        return {"success": False, "message": str(e)}
    except Exception as e:
        return {"success": False, "message": f"Unexpected error: {str(e)}"}
