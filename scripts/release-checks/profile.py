"""Profile a cold landing on loopback with fixed Chromium network and CPU emulation."""
import argparse
from statistics import median
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("origin")
parser.add_argument("--chromium", default="/usr/bin/chromium")
args = parser.parse_args()
if urlsplit(args.origin).hostname not in {"localhost", "127.0.0.1"}:
    parser.error("Use a local production build")

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=args.chromium)
    samples = []
    for _ in range(3):
        context = browser.new_context(viewport={"width": 390, "height": 844})
        page = context.new_page()
        session = context.new_cdp_session(page)
        session.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        session.send("Network.enable")
        session.send("Network.emulateNetworkConditions", {
            "offline": False, "latency": 100,
            "downloadThroughput": 200_000, "uploadThroughput": 100_000,
        })
        page.goto(args.origin)
        page.get_by_role("button", name="Quick demo").wait_for()
        page.evaluate("document.fonts.ready")
        page.wait_for_function("performance.getEntriesByName('first-contentful-paint').length > 0")
        sample = page.evaluate("""() => {
          const resources = performance.getEntriesByType('resource')
          const size = extension => resources.filter(r => new URL(r.name).pathname.endsWith(extension))
            .reduce((total, r) => total + r.encodedBodySize, 0)
          return {fcp_ms: performance.getEntriesByName('first-contentful-paint')[0].startTime,
            load_ms: performance.getEntriesByType('navigation')[0].loadEventEnd,
            js_bytes: size('.js'), css_bytes: size('.css'), font_bytes: size('.woff2'),
            api_requests: resources.filter(r => new URL(r.name).pathname.startsWith('/api/')).length}
        }""")
        quick_demo = page.get_by_role("button", name="Quick demo")
        context.set_offline(True)
        quick_demo.click()
        page.get_by_role("button", name="Continue with one test").wait_for()
        samples.append(sample)
        context.close()
    print("Chromium", browser.version, "medians of three independent cold contexts",
          {key: median(sample[key] for sample in samples) for key in samples[0]})
    browser.close()
