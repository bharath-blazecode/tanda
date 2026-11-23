"""Compare Home on reviewed builds. Run with KACHKA_TEST_ORIGIN and before|after OUTPUT_DIR."""
import os
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

stage, output_dir = sys.argv[1:]
assert stage in ("before", "after")
out = Path(output_dir)
out.mkdir(parents=True, exist_ok=True)
origin = os.environ.get("KACHKA_TEST_ORIGIN", "http://localhost:3333")
assert urlparse(origin).hostname in ("localhost", "127.0.0.1")
now = datetime.fromisoformat("2026-11-23T14:00:00+10:00")
hour = 3_600_000
at = int(now.timestamp() * 1000)
record = {
    "v": 2, "deviceId": "aaaaaaaa-0000-4000-8000-00000000c0ff", "nickname": "Calm Bilby",
    "shareToRoom": False, "aiCommentary": False, "bedtimeMinutes": 22 * 60,
    "drinks": [
        {"id": "earlier", "at": at - 11 * hour, "kind": "coffee"},
        {"id": "morning", "at": at - 4 * hour, "kind": "energy", "servingMl": 250,
         "caffeine": {"basis": "per100ml", "mgPer100ml": 32, "source": "label"}},
        {"id": "lunch", "at": at - hour, "kind": "tea", "caffeine": {"basis": "unknown"}},
    ],
}

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"))
    for device, width, height in [("mobile", 390, 844), ("desktop", 1280, 900)]:
        page = browser.new_page(viewport={"width": width, "height": height}, locale="en-AU",
                                timezone_id="Australia/Brisbane", reduced_motion="reduce")
        errors, network = [], []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("request", lambda request: network.append(request.url))
        page.clock.set_fixed_time(now)
        page.goto(origin + "/")
        page.get_by_label("Your name").fill("Calm Bilby")
        page.get_by_label("Your name").blur()
        page.evaluate("document.fonts.ready")
        page.screenshot(path=out / f"{stage}-{device}-landing.png", full_page=True)
        if stage == "after":
            page.get_by_text("Just log a drink", exact=True).click()
            page.get_by_role("button", name="Tea", exact=True).click()
            page.get_by_role("button", name="Log a drink").wait_for(state="attached")
            assert not page.locator("svg.k-caffeine").count()
            stored = page.evaluate("JSON.parse(localStorage.getItem('bc:v2'))")
            assert len(stored["drinks"]) == 1 and not stored["shareToRoom"]
            assert "baseline" not in stored and "lastResult" not in stored
            page.goto(origin + "/")
            page.get_by_role("button", name="Continue", exact=True).click()
            page.wait_for_url("**/home")
            print(f"PASS {device} log-only first visit, unknown-only chart suppressed and returning visit")
        page.evaluate("r => localStorage.setItem('bc:v2', JSON.stringify(r))", record)
        page.goto(origin + "/home")
        page.get_by_role("button", name="Log a drink").wait_for(state="attached")
        page.evaluate("document.fonts.ready")
        page.screenshot(path=out / f"{stage}-{device}-home.png", full_page=True)
        if stage == "after":
            summary = page.get_by_text("How this estimate was made", exact=True)
            summary.focus()
            summary.press("Enter")
            assert summary.evaluate("s => s.closest('details').open")
            if device == "mobile":
                summary.scroll_into_view_if_needed()
                page.screenshot(path=out / "after-mobile-details.png", full_page=True)
            summary.press("Space")
            assert not summary.evaluate("s => s.closest('details').open")
            print(f"PASS {device} model detail opens and closes by keyboard")
        assert page.evaluate("document.documentElement.scrollWidth === innerWidth")
        assert page.get_by_role("button", name="Edit Tea at 13:00").count() == 1
        assert not errors, errors
        assert all(url.startswith(origin + "/") and "/api/" not in url for url in network), network
        print(f"PASS {device} Home, local-only data, no overflow; full page height",
              page.evaluate("document.documentElement.scrollHeight"))
        page.close()
    browser.close()
