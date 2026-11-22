"""Run against a local production build with Python Playwright and Chromium installed."""
import os
import re
from playwright.sync_api import sync_playwright

ORIGIN = os.environ.get("KACHKA_TEST_ORIGIN", "http://localhost:3333")
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"))
    page = browser.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.add_init_script("""navigator.mediaDevices.getUserMedia = () => {
      if (!window.pendingCamera) return Promise.reject(new DOMException('denied', 'NotAllowedError'));
      return new Promise(resolve => {
        window.grant = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const stream = canvas.captureStream(30);
          window.track = stream.getVideoTracks()[0];
          ctx.fillRect(0, 0, 32, 32);
          resolve(stream);
        };
      });
    }""")
    page.goto(ORIGIN + "/lab/pulse")
    page.get_by_role("button", name="Start").click()
    page.get_by_text("No camera access.", exact=False).wait_for()
    print("PASS permission rejection")
    page.reload()
    page.evaluate("window.pendingCamera = true")
    page.get_by_role("button", name="Start").click()
    page.get_by_text("Asking for the camera.").wait_for()
    page.get_by_role("button", name="Skip").click()
    page.evaluate("window.grant()")
    page.wait_for_function("window.track.readyState === 'ended' && !document.querySelector('video').srcObject")
    print("PASS late permission after cancellation releases Chromium video track")
    page.get_by_role("button", name="Start").click()
    page.evaluate("window.grant()")
    page.get_by_role("heading", name="Cover the lens").wait_for()
    page.evaluate("history.pushState({}, '', '/lab'); dispatchEvent(new PopStateEvent('popstate'))")
    page.wait_for_function("!document.querySelector('video') && window.track.readyState === 'ended'")
    assert not errors, errors
    print("PASS navigation during capture releases video track without page errors")
    page.goto(ORIGIN + "/lab/pulse")
    page.evaluate("""navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const stream = canvas.captureStream(30);
      window.track = stream.getVideoTracks()[0];
      const draw = () => {
        const green = Math.round(65 + 8 * Math.sin(performance.now() * 2 * Math.PI * 72 / 60000));
        ctx.fillStyle = 'rgb(180,' + green + ',40)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (window.track.readyState === 'live') requestAnimationFrame(draw);
      };
      draw();
      return stream;
    }""")
    page.get_by_role("button", name="Start").click()
    heading = page.get_by_role("heading", name=re.compile(r"^7[0-4] bpm$"))
    heading.wait_for(timeout=27000)
    page.wait_for_function("window.track.readyState === 'ended'")
    assert not errors, errors
    print("PASS 72 bpm synthetic contact video through sampling, analyzer, UI and track release")
    browser.close()
