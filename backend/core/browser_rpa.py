"""
browser_rpa.py — Headless Browser Automation (RPA) for NeuralFlow.

Uses Playwright's async API to launch a headless Chromium instance,
navigate to a target URL, and extract structured page content.
Gracefully degrades if Playwright is not installed.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone


# ─── Playwright availability check ────────────────────────────────────────────
_PLAYWRIGHT_AVAILABLE = False
try:
    from playwright.async_api import async_playwright

    _PLAYWRIGHT_AVAILABLE = True
except ImportError:
    pass


def is_playwright_available() -> bool:
    """Check whether Playwright is installed and importable."""
    return _PLAYWRIGHT_AVAILABLE


async def scrape_url(
    url: str,
    instruction: str = "",
    headless: bool = True,
    timeout_ms: int = 30_000,
) -> dict:
    """
    Launch a Chromium browser, navigate to `url`, and extract page content.

    Args:
        url: Target URL to navigate to.
        instruction: User instruction describing what to extract (for logging only;
                     the actual extraction is the full body text — an upstream Agent
                     node then processes it per the instruction).
        headless: Run without a visible browser window.
        timeout_ms: Navigation timeout in milliseconds.

    Returns:
        Dict with keys: url, extracted_content, title, status, error.
    """
    if not _PLAYWRIGHT_AVAILABLE:
        return {
            "url": url,
            "extracted_content": "",
            "title": "",
            "status": "error",
            "error": (
                "Playwright is not installed. Run: pip install playwright && "
                "python -m playwright install chromium"
            ),
        }

    if not url or not url.startswith(("http://", "https://")):
        return {
            "url": url,
            "extracted_content": "",
            "title": "",
            "status": "error",
            "error": "Invalid URL. Must start with http:// or https://",
        }

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=headless,
                args=[
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--disable-extensions",
                    "--disable-background-networking",
                ],
            )
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1280, "height": 800},
                java_script_enabled=True,
            )
            page = await context.new_page()

            try:
                await page.goto(url, timeout=timeout_ms, wait_until="domcontentloaded")
                # Give dynamic content a moment to settle
                await asyncio.sleep(1.5)

                title = await page.title()

                # Remove common noise elements (nav, footer, ads)
                await page.evaluate("""
                    () => {
                        const selectors = [
                            'nav', 'footer', 'header', '.ad', '.advertisement',
                            '.sidebar', '#sidebar', '.cookie-banner', '.popup',
                            'script', 'style', 'noscript',
                        ];
                        selectors.forEach(s => {
                            document.querySelectorAll(s).forEach(el => el.remove());
                        });
                    }
                """)

                # Extract meaningful text from body
                body_text = await page.inner_text("body")

                # Clean up excessive whitespace
                import re

                body_text = re.sub(r"\n{3,}", "\n\n", body_text)
                body_text = re.sub(r" {2,}", " ", body_text)
                body_text = body_text.strip()[:16_000]  # Cap at 16K chars

                return {
                    "url": url,
                    "extracted_content": body_text,
                    "title": title,
                    "instruction": instruction,
                    "status": "success",
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                    "char_count": len(body_text),
                }

            finally:
                await browser.close()

    except asyncio.TimeoutError:
        return {
            "url": url,
            "extracted_content": "",
            "title": "",
            "status": "error",
            "error": f"Page load timed out after {timeout_ms // 1000}s.",
        }
    except Exception as e:
        return {
            "url": url,
            "extracted_content": "",
            "title": "",
            "status": "error",
            "error": str(e),
        }
