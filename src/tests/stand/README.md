# Stand Still

The first KACHKA sensor card. Open `/lab/stand` for isolated testing. The existing lab route renders the card through its original `StandTest({ onDone })` interface.

## Run

From the repository root, use a supported Node 22.12+, 24, or 26 release and run `npm ci`, then `npm run dev`. Open the printed local URL at `/lab/stand`. Phone sensor access needs HTTPS. For development, the documented tunnel command is `cloudflared tunnel --url http://localhost:5173`. The Vite configuration permits the generated `trycloudflare.com` hostnames.

`npm run check` runs TypeScript checking and the automated tests. `npm run build` produces the frontend in `dist`.

## Integration

- `src/sensors/motion.ts` owns permission requests, event normalization, subscription cleanup, and measured sample rate.
- `src/tests/stand/Stand.tsx` renders the test. Its optional `onComplete` callback receives a `StandAnalysis`. Its `onSkip` callback lets a parent flow advance without a motion result.
- `src/tests/stand/useStand.ts` owns the countdown, capture, beeps, interruption handling, and cancellation.
- `src/tests/stand/analyze.ts` is a pure analyzer. It returns the documented `StandMetrics` contract, the filtered trace, sensor source, warnings, and a failure reason.
- `src/tests/stand/signal.ts` contains the pure filtering and RMS helpers for this card.
- `src/tests/stand/index.tsx` preserves `StandTest({ onDone })`. After replay, Use this reading returns the documented metrics. Skip returns `null`. The underlying `Stand` component also accepts an optional same-source baseline trace.

Motion permission and audio initialization start directly inside the Start button gesture. A granted permission must be followed by an actual motion event before countdown begins. Android browsers may provide events without showing a permission prompt.

## Capture and analysis

The user requested a **15-second total capture**, overriding the older 20-second screen specification. Three countdown beeps precede capture. Separate start and end beeps bracket capture. The first 2 seconds are settling time, leaving 13 seconds for metrics and the replay.

The analyzer resamples timestamped readings and applies a 0.2–3 Hz first-order high-pass/low-pass cascade to each tilt axis. It filters the settling samples too, then excludes them from RMS calculation. Gyroscope beta and gamma are preferred. Acceleration x and y form the fallback. The two source types have different units and must not be compared against each other.

The result reports combined sway RMS, lateral RMS, measured Hz and sensor source. The side-to-side trace replays in 2 seconds. Reduced-motion preferences show the completed trace immediately. Confidence warnings flag acceleration fallback and rates below 15 Hz.

Missing readings, gaps over 0.5 seconds, interrupted captures, large linear acceleration, a gravity-vector tilt change above 25 degrees after settling, and near-zero traces invalidate a run. Hiding the page, leaving it, cancelling, or unmounting stops collection. The near-zero floors are provisional and need calibration on real phones. These heuristics do not establish measurement accuracy.

## Acceptance status

- TypeScript checking and production build passed.
- 17 Stand Still tests passed; the complete integrated suite passed 115 tests, covering sensor normalization, permission handling, listener cleanup, synthetic signal analysis, the complete capture/beep lifecycle, denial, missing events, cancellation, and page hiding.
- The user reported a successful iPhone test of the standalone lab on 21 November 2026. The subsequent scaffold/UI integration still needs a phone retest. Phone model, browser, numeric readings, and silent-switch behavior have not yet been recorded.
- Android physical verification remains pending.

On each phone, confirm permission/data access, all countdown/start/end beeps, 15 seconds of capture, a finite sway value, measured Hz and trace replay. Then check retry, cancel, screen locking, and backgrounding. Record browser and OS versions, sensor source, sample rate and whether the beeps work with the silent switch enabled.

Browser API reference: https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent/rotationRate
