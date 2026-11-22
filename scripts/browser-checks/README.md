# Browser checks

Playwright scripts used to verify the portfolio slice in headless Chromium. They are not wired into
`npm run check` and add no dependency: they need a Playwright install that can launch Chromium.

```bash
npm run build
PORT=3333 STATIC_DIR=dist VERDICT_ENABLED=false node dist-server/index.cjs
node scripts/browser-checks/flows.cjs /tmp/shots            # all sections, or add a name:
node scripts/browser-checks/flows.cjs /tmp/shots privacy    # example | personal | reduced | migration | privacy | caffeine | lapses
node scripts/browser-checks/extra.cjs /tmp/shots            # routes, 320 px layout, keyboard, reduced motion
```

What they are and are not:

- Motion is **synthetic**: the scripts dispatch `DeviceMotionEvent`s at about 60 Hz. A pass says the
  flow and the stored provenance work, not that a phone's sensor is read correctly.
- The camera is Chromium's **fake device**. It is never "covered", so only the Skip path of the pulse
  step is exercised here.
- Choice Tap is played by dispatching `pointerdown` on the lit square, 150 ms after it lights.
- Room checks run against a local server with an in-memory board.

None of this is evidence about physical phones. See `docs/portfolio/VERIFICATION.md`.
