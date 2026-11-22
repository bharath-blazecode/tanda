"""Drive Stand Still against a local build with Python Playwright and Chromium."""
import json
import os
import statistics

from playwright.sync_api import sync_playwright

ORIGIN = os.environ.get("KACHKA_TEST_ORIGIN", "http://localhost:3333")
INIT = """
window.listenerCount = () => listeners.size;
const listeners = new Set();
for (const [name, add] of [['addEventListener', true], ['removeEventListener', false]]) {
  const original = window[name];
  window[name] = function(type, fn, ...args) {
    if (type === 'devicemotion') add ? listeners.add(fn) : listeners.delete(fn);
    return original.call(this, type, fn, ...args);
  };
}
window.emitMotion = () => {
  const times = window.eventTimes = [];
  setInterval(() => {
    const now = performance.now(), x = Math.sin(now * Math.PI / 500);
    times.push(now);
    dispatchEvent(new DeviceMotionEvent('devicemotion', {
      rotationRate: window.dropoutAt === times.length ? null : {alpha: 0, beta: x, gamma: 0.5 * x},
      acceleration: {x: 0.1 * x, y: 0.1 * x, z: 0},
      accelerationIncludingGravity: {x: 0, y: 9.81, z: 0}
    }));
  }, 16);
};
"""


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"))
        page = browser.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.add_init_script(INIT)

        def fresh():
            page.goto(ORIGIN + "/lab/stand")

        def start():
            page.get_by_role("button", name="Start · allow motion").click()

        def released():
            page.wait_for_function("listenerCount() === 0")

        fresh()
        page.evaluate("DeviceMotionEvent.requestPermission = async () => 'denied'")
        start()
        page.wait_for_function("document.querySelector('pre')?.textContent === 'null'")
        released()
        print("PASS denied motion continues without metrics")

        fresh()
        page.evaluate("() => { DeviceMotionEvent.requestPermission = () => new Promise(r => window.grant = r) }")
        start()
        page.get_by_role("button", name="Cancel capture").click()
        page.evaluate("grant('granted')")
        released()
        page.get_by_role("button", name="Start · allow motion").wait_for()
        print("PASS cancelled permission resolution cannot reopen a listener")

        fresh()
        page.evaluate("emitMotion()")
        start()
        page.wait_for_function("listenerCount() === 1")
        page.evaluate("""Object.defineProperty(document, 'hidden', {configurable:true, value:true});
                        document.dispatchEvent(new Event('visibilitychange'))""")
        page.get_by_role("alert").wait_for()
        released()
        print("PASS background interrupt releases listener and offers retry")

        fresh()
        page.evaluate("emitMotion()")
        start()
        page.get_by_text("HOLD", exact=True).wait_for()
        page.evaluate("history.pushState({}, '', '/lab'); dispatchEvent(new PopStateEvent('popstate'))")
        released()
        print("PASS navigation during capture releases listener")

        for sound in (True, False):
            fresh()
            if not sound:
                # Exercise a missing gyro frame midway through the same uninterrupted attempt.
                page.evaluate("window.AudioContext = undefined; window.dropoutAt = 430")
            page.evaluate("emitMotion()")
            start()
            page.get_by_text("HOLD", exact=True).wait_for()
            begin = page.evaluate("performance.now()")
            page.get_by_role("button", name="Use this reading").wait_for(timeout=15000)
            end = page.evaluate("performance.now()")
            released()
            page.get_by_role("button", name="Use this reading").click()
            metrics = json.loads(page.locator("pre").inner_text())
            assert metrics["valid"] and metrics["source"] == "gyroscope", metrics
            if not sound:
                assert metrics.get("recovered"), metrics
            times = page.evaluate("window.eventTimes.filter(t => t >= %f && t <= %f)" % (begin, end))
            gaps = [later - earlier for earlier, later in zip(times, times[1:])]
            print(f"PASS sound={'on' if sound else 'unavailable'}, "
                  f"UI hold-to-replay {end - begin:.0f} ms, measured {metrics['hz']:.1f} Hz, "
                  f"synthetic events {len(times)}, median gap {statistics.median(gaps):.1f} ms, "
                  f"p95 {statistics.quantiles(gaps, n=20)[18]:.1f} ms, max {max(gaps):.1f} ms")
        assert not errors, errors
        browser.close()


if __name__ == "__main__":
    main()
