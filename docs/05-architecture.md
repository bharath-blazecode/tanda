# 05. Architecture, contracts and how the work is split

How the app is put together, so four people can build in parallel on Saturday without stepping on each other. Decisions referenced as D-numbers are in [`DECISIONS.md`](../DECISIONS.md).

## One picture

```
        PHONE (everything that matters runs here)                 SERVER (one Node process)
┌──────────────────────────────────────────────────┐        ┌──────────────────────────────┐
│ sensors ─► tests ─► engine ─► screens            │        │ Hono                         │
│ (motion)   (raw     (drift,    (React)           │  HTTPS │  POST /api/verdict ─► Claude │
│ (band)     numbers)  verdict,     │              │ ─────► │  POST /api/room/result       │
│                      nudge)       ▼              │        │  GET  /api/room              │
│                              store (localStorage)│        │  GET  /api/health            │
└──────────────────────────────────────────────────┘        │  state.ts (in-memory Maps)   │
                                                            │  serves the built SPA        │
        PROJECTOR  ── GET /api/room every 2 s ────────────► └──────────────────────────────┘
```

The verdict, the drift and the nudge are computed on the phone. The server does two small things: it turns numbers into one sentence, and it holds the room board. If the server is down, the app still runs every test and shows every result.

## Stack

| Layer | Choice |
|---|---|
| Client | React 19, Vite 8, TypeScript, react-router. Installable PWA: manifest and icons, no caching service worker (D4b) |
| Server | Hono on Node 22, `@anthropic-ai/sdk` |
| Shared | zod schemas in `shared/contracts.ts` |
| Tests | Vitest, for `engine/` and `server/verdict.ts` only |
| Hosting | One Docker image on Dokploy, behind Cloudflare |
| Storage | `localStorage` on the phone; memory on the server |

Pin exact versions when scaffolding. Verified on Friday: hono 4.13.19, vite 8.3.8, react 19.3.1, `@anthropic-ai/sdk` 1.11.0.

## Layout

```
src/
  sensors/    motion.ts     permission, sample stream, measured Hz
              band.ts       Web Bluetooth heart rate (bonus)
              camera.ts     pulse from a fingertip over the camera (stretch, D46)
  tests/      stand/  choice/
              each folder: a React component and a pure analyze() function
  engine/     metrics.ts    the types every lane shares
              signal.ts     band-pass, RMS, resampling
              drift.ts      baseline + run -> drift per metric
              classify.ts   drift -> verdict and confidence
              nudge.ts      verdict + drinks + hour -> nudge; safety rules
              canned.ts     local fallback lines
  store/      local.ts      the only file that touches localStorage
  api/        verdict.ts  room.ts
  ui/         tokens.css and shared components (see docs/design/DESIGN.md)
  screens/    one folder per screen in docs/04-screens-spec.md
  lab/        developer pages for each test, with raw numbers on screen
server/
  index.ts    routes, static file serving
  state.ts    room board, rate limits, global counter, kill switch
  verdict.ts  prompt, Claude call, output filter, canned lines
shared/
  contracts.ts
Dockerfile    multi-stage; the final stage is named `runtime`
```

## Dependency rules

1. **`engine/` is pure TypeScript.** No React, no DOM, no network, no `Date.now()` inside functions (time comes in as an argument). This is what makes it testable and what lets its owner work without a phone.
2. **`tests/*` return raw numbers and know nothing about baselines.** A test never decides whether the user did well.
3. **Only `store/local.ts` touches `localStorage`.** Everything else calls its functions.
4. **Only `server/verdict.ts` touches the API key.**
5. **Screens use `ui/` components and tokens only.** No colour, font or spacing values inside `screens/` (D28).
6. **`shared/contracts.ts` is the only thing client and server both import.**

## Contracts

Written first, at 8:00, before lanes split (D27).

### What each test returns

Changed on 21 Nov (D15): two tests instead of three.

```ts
type StandMetrics  = { swayRms: number; swayLateralRms: number; hz: number; valid: boolean }
type ChoiceMetrics = { medianMs: number; wrong: number; lapses: number; trials: number }

type RunResult = {
  stand?: StandMetrics          // absent without motion sensors, or if skipped
  choice: ChoiceMetrics         // always present
  hr?: number                   // average bpm, from the band or the camera; a small capped term in drift (D46)
  hrSource?: 'band' | 'camera'
  at: number                    // epoch ms
}
```

### What the engine produces

```ts
type MetricKey  = 'sway' | 'choiceRt' | 'choiceWrong' | 'hr'
type Verdict    = 'steady' | 'wired' | 'tipsy' | 'wobbly'   // wobbly: drift with nothing logged
type Confidence = 'low' | 'medium' | 'high'
type NudgeKind  = 'carry-on' | 'water' | 'no-more-caffeine' | 'ride-or-friend' | 'steady-not-a-driving-test'

type Assessment = {
  verdict: Verdict
  confidence: Confidence
  drift: Partial<Record<MetricKey, number>>   // normalised, clipped to -3..3; positive is worse
  score: number                               // 0..100 steadiness, for the board
  nudge: NudgeKind
  showSafetyLine: boolean
  partial: boolean
  guessedHandicap?: 'spin' | 'offhand' | 'jacks'   // demo mode only
}
```

If the team accepts D43 (tired), `Verdict` gains `'fried'` and `Stored` gains `wokeAt?: number`. If it accepts D42 (baseline twice), `baseline` gains `floors?: Partial<Record<MetricKey, number>>`. Decide both before `shared/contracts.ts` is merged.

### What is stored on the phone (`bc:v1`)

```ts
type Stored = {
  v: 1
  deviceId: string                 // random UUID; rate-limit key only
  nickname: string                 // generated; e.g. "Wobbly Quokka"
  shareToRoom: boolean
  baseline?: { run: RunResult; clean: boolean }
  drinks: { kind: 'coffee' | 'energy' | 'beer' | 'wine' | 'spirit'; at: number }[]
  lastResult?: { run: RunResult; assessment: Assessment; line: string; mode: 'real' | 'demo' }
}
```

If the stored value fails validation, wipe it. No migrations.

### Server routes

| Route | Request | Response |
|---|---|---|
| `POST /api/verdict` | `{ deviceId, mode, verdict, confidence, drift, nudge, drinks: { caffeineMg, alcohol }, localHour, handicap? }` | `200 { line, source: 'claude' \| 'canned' }` |
| `POST /api/room/result` | `{ deviceId, nickname, verdict, score, mode, handicap? }` | `204` |
| `GET /api/room` | none | `{ total, mix: { steady, wired, tipsy, wobbly }, feed: [...12], top: { real: [...5], demo: [...5] }, updatedAt }` |
| `POST /api/room/reset` | header `x-admin-token` | `204` |
| `GET /api/health` | none | `{ status, version, sha }` |

Routes for the extra AI features (D32 to D34), added only if those features are built:

| Route | Request | Response |
|---|---|---|
| `GET /api/room` | (same route) | adds `commentary: string \| null`, regenerated on a poll when older than 25 s |
| `POST /api/drink-photo` | `{ deviceId, image }` (JPEG, longest side 768 px) | `200 { kind: 'coffee' \| 'energy' \| 'beer' \| 'wine' \| 'spirit' \| 'none' }` |
| `POST /api/night` | `{ deviceId, checks: [...], drinks: [...] }` (numbers, enums and times only) | `200 { lines: string[], source }` |

The photo route is the one place the client sends something that is not a typed number. Its response is forced to the closed list above, the image is never written to disk or logged, and it has its own limit of 6 per hour per device.

Rules for the verdict route:
- Every field is validated with zod. Numbers have ranges; enums are closed. There is no free-text field anywhere (D9).
- It **always** answers 200 with a line. Over the limit, on a Claude error or with the kill switch on, `source` is `canned`. The client also has its own canned lines for when the request itself fails (D12).
- `nickname` is validated against the same fixed word lists the client uses. Anything else is rejected.

## Scoring

Rewritten on 21 Nov after the research (D15 to D18). All numbers are starting values, tuned in the calibration block.

**Signal.** From the Stand Still samples, resampled to a fixed rate, first 2 s dropped:
- `swayRms`: RMS of rotation rate on the two tilt axes, band-passed 0.2 to 3 Hz.
- `swayLateralRms`: the same for the side-to-side axis alone. Reported for calibration; scoring uses `swayRms` unless calibration shows the lateral one separates a spin better.

Rotation rate is used instead of acceleration because Chrome rounds acceleration to 0.1 m/s², which is about the size of quiet standing sway, while rotation rate is rounded to 0.1 deg/s, well below it.

**Drift per metric.** `raw = (check - baseline) / baseline` for sway and choice time. For errors, `raw = (wrong + missed now) - (wrong + missed then)` (D52). Then `d = raw / floor`, clipped to -3..3. A metric is only computed when `src/engine/compare.ts` says the two runs can be compared: same motion sensor, same capture length, a clean tap in both runs for choice time, a measured pulse in both for hr (D51).

| Metric | Noise floor | Source |
|---|---|---|
| sway | 0.30 | None at 20 s; calibrate |
| choiceRt | 0.15 | Derived from published trial-to-trial variation for 12 taps, then scaled by sqrt(12/8) for the 8-tap run; calibrate |
| choiceWrong | 1 | So one wrong square never counts and two do |
| hr | 0.15 | Derived from published retest variation of resting heart rate; calibrate with repeat camera readings |

With D42, a person's own spread between two baseline runs replaces a default whenever it is larger.

**Drift.** With `pos(x) = max(0, x)`:

```
drift = pos(d.sway) + pos(d.choiceRt) + pos(d.choiceWrong) + min(0.5, 0.5 * pos(d.hr))
```

The pulse term exists only when both the baseline and the check have a pulse. It is capped at 0.5 against a threshold of 1.5, so it can tip a borderline reading and can never decide one alone (D46).

**Verdict.** The sensors give the amount; the log gives the name.
- `drift` below 1.5: **steady**.
- Otherwise: alcohol logged today means **tipsy**; only caffeine logged means **wired**; nothing logged means **wobbly**.
- In demo mode the name comes from the handicap guess instead: a pulse 25% or more above baseline means `jacks`; otherwise `pos(d.sway)` larger means `spin`, and `pos(d.choiceRt) + pos(d.choiceWrong)` larger means `offhand`.

**Learning.** On the first three checks after a baseline, negative drift on Choice Tap is clipped to 0 and the line says the user is getting better at the test.

**Confidence.** Starts at `high`. Drops one step for each of: Stand Still missing, sample rate far from the baseline's or below 15 Hz, no gyroscope, a baseline that is not clean.

**Score.** `100 - round(100 * clamp(mean(pos(d)) / 3, 0, 1))`.

**Caffeine on board, in `engine/caffeine.ts`.** Independent of the tests. Each caffeinated drink adds its dose, rising to a peak at about 50 minutes and then halving every 5 hours; the chart shows a band from a 2 hour to an 8 hour half-life. Starting doses: coffee 100 mg, energy drink 80 mg. The `no-more-caffeine` nudge fires on a Wired verdict, and also on Steady when the day's total reaches 400 mg.

**Safety, in `nudge.ts`, covered by unit tests:**
- Tipsy always maps to `ride-or-friend`.
- Any alcohol logged today sets `showSafetyLine`, whatever the verdict.
- Steady with alcohol logged maps to `steady-not-a-driving-test`.
- With both alcohol and caffeine logged, drift is always tipsy.
- No function in the engine can return copy; copy lives in one file that a test greps for banned phrases.

## Server limits

| Limit | Value | Why |
|---|---|---|
| Per device | 12 verdict calls per hour | Normal use is 2 to 5 |
| Per IP, burst | 150 per minute | Lets a whole room on one address finish at once, and stops one person draining the hour |
| Per IP | 2,000 per hour | The auditorium shares one address; read it from `CF-Connecting-IP`, accepted only if it looks like an IP |
| Global | 200 per minute, 6,000 per day | Hard ceiling on spend |
| Request body | 4 KB | Larger requests get a 413 |
| Room posts | 600 per minute per IP | One entry per device is what really bounds the board |
| `max_tokens` | about 150 | One or two sentences |
| Client timeout | 4 s | After that the canned line stays. The server gives Claude 3 s |
| Kill switch | `VERDICT_ENABLED=false` | Everything goes canned, nothing breaks |

**Voice.** Every Claude call uses one shared system prompt that sets the mascot's voice (D36): Dr. Bin Chicken, an ibis who works as a lab tech; dry, unimpressed, one or two short sentences; teases what the person did, never who they are; never mentions driving, medicine or the law. The prompt lives in `server/prompt.ts`, next to the output filter, and is the same text for the verdict line, the room commentary and the night receipt.

Steady with alcohol logged never calls Claude: it always uses the fixed lines.

Environment variables: `ANTHROPIC_API_KEY`, `VERDICT_MODEL` (`claude-haiku-5-5` by default; only that or `claude-sonnet-5-5` is accepted), `VERDICT_ENABLED`, `ROOM_ADMIN_TOKEN`, `APP_VERSION`, `GIT_SHA`. The key goes into Dokploy's environment directly on the server. It never goes in the repo, in chat or in a screenshot.

## How the work is split

A menu, not assignments (D39). Nobody is given a lane. Each piece below is small, shows up on stage, lives in its own folder and has one owner at a time. People pick what they want, pair whenever they like, and take the next piece when theirs works on a real phone.

**Rewritten at 11:20 on Saturday, with nothing built yet and feature freeze at 15:00.** The list is now ordered by what the demo cannot live without. Sizes are rough and assume a Claude Code session doing the typing. `docs/design/prototype-flow.html` already contains working logic for Choice Tap, the scoring, the caffeine curve and the ticket: port it, do not rewrite it.

**Must work by 13:30 (the core loop)**

| # | Card | Folder | Done when | Size |
|---|---|---|---|---|
| 1 | Scaffold, contracts, deploy | repo root, `shared/contracts.ts`, `server/index.ts`, `Dockerfile` | `kachka.fun` shows a hello page on a phone with wifi off; `shared/contracts.ts` matches this doc | 45 min. Blocks everyone, so it goes first |
| 2 | UI kit from the prototype | `src/ui` | `tokens.css` plus Housing, Plate, Key, Sheet, Window, Ticket, Stamp, Ibis and Logo render on a `/lab/kit` page | 45 to 60 min |
| 3 | Stand Still | `src/sensors/motion.ts`, `src/tests/stand`, `/lab/stand` | On one iPhone and one Android: permission, 20 s capture, beeps, a sway number, the trace replaying | 90 min. The riskiest card; needs real phones from the first minute |
| 4 | Choice Tap | `src/tests/choice`, `/lab/choice` | Median, wrong squares and misses on a phone | 30 min (port) |
| 5 | Engine | `src/engine` | Drift, verdict, nudge and the safety rules pass unit tests on made-up numbers | 45 min (port) |
| 6 | Flow screens | `src/screens/{landing,setup,baseline,home,log}`, `src/store/local.ts` | Start to Home is clickable with stubbed tests; drinks persist; undo works | 60 to 75 min |
| 7 | The ticket | `src/screens/result` | Prints and stamps from a fake `Assessment`, with the safety line | 45 min |
| 8 | The bird's voice | `server/verdict.ts`, `src/engine/canned.ts` | One real line back from Claude; limits, kill switch and canned fallback work | 45 min |

**Should work by 14:15 (what the room sees)**

| # | Card | Folder | Done when | Size |
|---|---|---|---|---|
| 9 | Room board | `server/state.ts`, `src/screens/room` | Two phones show up on one projector view; QR on screen | 60 min |
| 10 | Demo mode | `src/screens/demo` | Pick a handicap, recheck, the "we think you..." line | 30 min |
| 11 | Pitch and two slides | outside the repo | Script written by 14:00; rehearsed twice on a timer at 15:15 | Part-time from noon |
| 12 | Phones and safety pass | everyone, 15:00 to 16:00 | iPhone and Android, wifi off, opened from Slack; key not in the bundle or the repo; limits trip; banned-words test green | 20 min each |

**Only if the cards above are done**

| # | Card | Folder | Size |
|---|---|---|---|
| 13 | Pulse from the camera (D46) | `src/sensors/camera.ts`, `src/tests/pulse` | 45 min |
| 14 | Caffeine on board | `src/engine/caffeine.ts`, `src/screens/home` | 30 min (port) |
| 15 | Calibration: five sober repeats each, then set the floors | `src/engine/drift.ts` | 30 min, all four |
| 16 | Snap a drink, room commentator, band on the projector | see D32 to D35 | pick one |

**Not today:** the specimen drawer, the night receipt, the tired state (D43), a double baseline (D42), the ring, the motion magnifier, a CI pipeline and a database. There is no database by design: the room board is in memory and everything personal stays on the phone (D6, D7). Instead of CI, run `npm run check` (typecheck plus unit tests) before every push.

Rules that keep four Claude Code sessions from colliding:
- One owner per piece. To change a file in someone else's piece, ask them.
- `shared/contracts.ts`, `engine/metrics.ts` and `ui/tokens.css` are shared. Change them only after saying so out loud.
- A piece that needs another piece's output stubs it: a button that returns canned numbers is enough to keep going.

### Team Stand against Team Tap (11:00 to 12:30)

Once both tests run on phones, the team splits into two pairs for the calibration block, one pair per test. (Until 21 Nov this block was Team Wired against Team Tipsy; the research showed the sensors cannot tell the two drinks apart, so the split is now by test.)

| | Team Stand | Team Tap |
|---|---|---|
| Test | Stand Still | Choice Tap |
| Handicap to fake it | Five spins | The other hand |
| Questions to answer | Is 20 s repeatable or does it need 30? Rotation rate or acceleration? Does side-to-side separate a spin better than both axes? What does Android Chrome's rounding do to the numbers? | Are 12 taps enough? How much faster is the second run than the first? Is the floor nearer 12% or 20%? |
| Owns | The sway side of `drift.ts`, its noise floor, the Tipsy and Wobbly lines, the mascot's tipsy mood | The choice side of `drift.ts`, its noise floor, the caffeine-on-board curve, the Wired lines, the mascot's wired mood |
| Wins if | A spin reads as drift more often than not, and a sober retest does not | The other hand reads as drift more often than not, and a sober retest does not |

Both pairs measure the sober noise floor first (five repeats each). The safety rules in `nudge.ts` are not part of the game: nobody edits them during this block.

## Working day

Breakfast and the organisers' kickoff take the first hour, so nothing is expected before 9:00.

| By | Gate | If missed |
|---|---|---|
| 9:00 | Everyone opens the public link on their own phone | Hosting first; nothing else matters |
| 9:30 | Deck and votes done; contracts written together on one screen; first pieces picked | |
| 11:00 | Both tests run on one iPhone and one Android; Hz and raw value steps measured | Everyone swarms the tests |
| 12:30 | Team Stand and Team Tap each have a calibrated test: the handicap reads as drift, a sober retest does not. Lunch | Keep only the test that works; say so in the pitch |
| 13:30 | Core loop end to end on the public URL | Cut the room board |
| 14:15 | Room board and projector view working | Cut it; `/room` shows the QR only |
| 15:00 | Feature freeze | |
| 16:15 | Deploy freeze; last good commit written down | |
| 16:30 | Link posted in #showcase | |

The 9:00 gate is only realistic if the scaffold is deployed on Friday night.

## Development loop

- `npm run dev` runs Vite and the server together; Vite proxies `/api`.
- To test on a phone: `cloudflared tunnel --url http://localhost:5173` and open the printed HTTPS address. Add the tunnel host to Vite's `server.allowedHosts`.
- `npm test` runs the engine and verdict-filter tests. Run it before every push.
- Trunk-based: short branches, merge to `main` often. Mike deploys.

## Deploy

- Dokploy builds the root `Dockerfile` with the build stage set to `runtime`.
- One replica, health check on `/api/health`.
- After every deploy: open the public URL on a phone with wifi off and run one full check.
- Emergency exit to Cloudflare Workers: `server/state.ts` is the only module that would not port as is. The exit drops the room board and keeps the verdict route.
