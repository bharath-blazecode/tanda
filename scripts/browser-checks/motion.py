"""Drive Stand Still against a local build with Python Playwright and Chromium."""
import json
import os
import statistics
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ORIGIN = os.environ.get("KACHKA_TEST_ORIGIN", "http://localhost:3333")
assert urlsplit(ORIGIN).hostname in ("localhost", "127.0.0.1", "::1")
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
    if (window.dropSpan && now >= window.dropSpan[0] && now < window.dropSpan[1]) return;
    times.push(now);
    const event = new DeviceMotionEvent('devicemotion', {
      rotationRate: window.dropoutAt === times.length ? null : {alpha: 0, beta: x, gamma: 0.5 * x},
      acceleration: {x: 0.1 * x, y: 0.1 * x, z: 0},
      accelerationIncludingGravity: {x: 0, y: 9.81, z: 0}
    });
    if (window.syntheticClock) Object.defineProperty(event, 'timeStamp', { value: now });
    dispatchEvent(event);
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

        # Frozen-clock fixture: the UI must reject a 144 ms gap in both sources and then
        # accept a complete new capture. This never reclassifies a bad capture as a pass.
        controlled = browser.new_page()
        controlled.clock.install()
        controlled.add_init_script(INIT)
        controlled.goto(ORIGIN + "/lab/stand")
        controlled.evaluate("""() => {
            window.syntheticClock = true;
            window.AudioContext = undefined;
            const now = performance.now();
            window.dropSpan = [now + 7000, now + 7144];
            emitMotion();
        }""")
        controlled.get_by_role("button", name="Start · allow motion").click()
        controlled.clock.run_for(14_000)
        assert "Too few continuous" in controlled.get_by_role("alert").inner_text()
        assert controlled.evaluate("listenerCount() === 0")
        assert controlled.get_by_role("button", name="Skip this test").is_visible()
        controlled.get_by_role("button", name="Run again").click()
        controlled.clock.run_for(14_000)
        controlled.get_by_role("button", name="Use this reading").click()
        assert json.loads(controlled.locator("pre").inner_text())["valid"]
        controlled.close()
        print("PASS controlled gap refused, retry/skip offered, clean retry accepted")

        for sound in (True, False):
            fresh()
            if sound:
                page.evaluate("""() => {
                    window.standContexts = [];
                    window.AudioContext = class extends AudioContext {
                        constructor(...args) { super(...args); window.standContexts.push(this); }
                    };
                }""")
            else:
                # Exercise a missing gyro frame midway through the same uninterrupted attempt.
                page.evaluate("window.AudioContext = undefined; window.dropoutAt = 430")
            page.evaluate("emitMotion()")
            start()
            page.get_by_text("HOLD", exact=True).wait_for()
            begin = page.evaluate("performance.now()")
            ready = page.get_by_role("button", name="Use this reading")
            alert = page.get_by_role("alert")
            ready.or_(alert).first.wait_for(timeout=15_000)
            if alert.is_visible():
                times = page.evaluate("start => eventTimes.filter(t => t >= start)", begin)
                gaps = [b - a for a, b in zip(times, times[1:])]
                raise AssertionError(f"Stand refused wall-clock fixture: {alert.inner_text()}; "
                                     f"{len(times)} events since HOLD, max dispatch gap "
                                     f"{max(gaps, default=0):.1f} ms")
            end = page.evaluate("performance.now()")
            released()
            if sound:
                # The last cue should complete and release its native audio resources while
                # the user is still reading the replay. Navigating away would mask a leak.
                states = page.evaluate("""async () => {
                    const deadline = performance.now() + 3000;
                    while (standContexts.some(ctx => ctx.state !== 'closed') && performance.now() < deadline)
                        await new Promise(resolve => setTimeout(resolve, 40));
                    return standContexts.map(ctx => ctx.state);
                }""")
                assert states == ["closed"], states
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
