# Kachka discovery pack

Prepared 22 November 2026 for the post-hackathon portfolio work. It covers the current state, three
design directions, a ranked backlog, and the plan for this session. The threat model is in
[THREAT-MODEL.md](THREAT-MODEL.md), the claim-by-claim evidence is in
[research/EVIDENCE-LEDGER.md](research/EVIDENCE-LEDGER.md), and what was tested is in
[VERIFICATION.md](VERIFICATION.md). Screenshots are in [screenshots/](screenshots/).

## 1. Revision boundary

| Item | State checked on 22 Nov 2026 |
|---|---|
| `main` | `b3d93a6`, unchanged since the handoff snapshot |
| Pulse patch | `5ca2b58` on `fix/pulse-stability-and-retry`, **not merged**, still based on `b3d93a6` |
| Handoff docs | `2b62961` on `docs/astra-ultra-portfolio-handoff`, **not merged**. Read from the branch, not copied here |
| Baseline checks on `main` | `npm run check`: 40 files, 457 tests passed. `npm run build`: passed. JS 462 KB raw, about 146 KB gzip. CSS 25 KB |

The handoff documents were treated as claims. Each one used below was rechecked against source. Where
the handoff was right, this pack says "confirmed". Where source showed something else, it says so.

## 2. Current state, verified against source

### What the product does today

Kachka asks for a name, checks the motion sensor, records a personal baseline (stand still for 10 s,
then 8 scored choice taps after 2 warm-ups, then an optional fingertip pulse), and later repeats the
tasks to compare. A pure engine turns the differences into drift, the drink log names the drift
(Wired, Tipsy, Wobbly, or Steady below threshold), and Claude writes one line for the thermal ticket.
A quick demo compares against fixed example numbers. A room board shows names and verdicts.

### Confirmed handoff claims

- Landing turns room sharing on for both Start and Quick demo (`src/screens/landing/index.tsx:31,41`).
  This also contradicts locked decision D23, which says real mode is off by default.
- The stock reference is marked by `baseline.run.at === 0` (`src/store/quick.ts:12,29`), and it
  overwrites the stored baseline when a quick demo starts.
- `checksSinceBaseline` is always passed as 0 (`src/screens/check/index.tsx:67`).
- The store wipes the whole record when any field fails validation, with no migration
  (`src/store/local.ts:20-33`).
- Choice Tap squares listen only to `onPointerDown` (`src/tests/choice/index.tsx:210`). Keyboard
  activation records nothing.
- Rough pulse readings are passed on as plain numbers on `main` (`src/tests/pulse/index.tsx:257`).
- Setup says "Your readings stay on this phone" (`src/screens/setup/index.tsx:148`), which is not
  accurate: summaries go to the server for the ticket line, and name and verdict go to the room.

### New findings, reproduced with fixtures

These came out of reading the engine and were reproduced with plain inputs before any change.

| # | Finding | Reproduction | Effect |
|---|---|---|---|
| F1 | No metric in common between baseline and check returns **Steady, score 100** | Baseline with only Stand Still, check with only Choice Tap: `assess()` gives `steady 100 {}` | A comparison that never happened prints as an all-clear |
| F2 | Gyroscope (deg/s) and acceleration (m/s²) readings are compared as if they share units | Gyro baseline 0.6 vs acceleration check 0.03 gives sway drift -3 and Steady. Reverse with a beer logged gives +3 and **Tipsy** | A sensor change alone can flip the verdict. `analyze.ts:23` switches source if a single sample lacks rotation, and `StandMetrics` never stored which source was used |
| F3 | The 2000 ms "no clean taps" fallback is scored as a real time | All-lapses check vs a 480 ms baseline gives choiceRt +3, **Wobbly** | A software placeholder becomes a measured reaction time |
| F4 | The result ticket recomputes its percentages against the *current* baseline | `Result` passes `baseline.run` from storage (`result/index.tsx:44`) | After recalibration, an old ticket shows numbers the engine never compared |
| F5 | Home shows the safety line only from 4 alcoholic drinks (`home/index.tsx:22,70`) | Seeded one beer: no line on Home | Not a result screen, so not a breach of D19, but inconsistent with "any alcohol" |
| F6 | The baseline drink picker logs every drink at the current time (`baseline/index.tsx:48-51`), and a reload during the tests asks again, so the same drinks can be logged twice | Read and traced | Wrong times feed the caffeine curve, and duplicates inflate counts |
| F7 | Quick demo results carry a handicap guess although no handicap was done (`classify.ts:99`), so they can enter "Dizziest after the handicap" | Read and traced | A demo with no handicap ranks on a handicap board |
| F8 | Care copy attributes 400 mg to "the usual daily guide for adults" (`care-copy.ts:37`), and DECISIONS D41 attributes 400/200 mg maximums to FSANZ | FSANZ's caffeine page, read once on 22 Nov through a third-party fetch tool (direct access is blocked here), says there is no recognised health-based guidance value for caffeine. It needs direct confirmation by the owner | An unverified figure is presented as Australian guidance |
| F9 | The ticket says "medium confidence" | Seen in the before screenshot | The tier is about recording conditions, not diagnostic confidence |

### Data that leaves the phone today

| Destination | When | What | Kept |
|---|---|---|---|
| `/api/verdict`, then Anthropic | Every check | Device ID (server only, for limits), verdict, tier, mode, drift bands, caffeine mg total, alcohol count, local hour, demo handicap | Server logs keep `{msg, source, reason}` only. Anthropic's retention follows its API policy |
| `/api/room/presence` | Sharing on, every 15 s while visible | Device ID, name, stage | Memory, 45 s |
| `/api/room/result` | Sharing on, on the result screen | Device ID, name, verdict, score, mode, handicap guess | Memory up to 12 h and 2000 entries. Redis mirror, if configured, keyed by device ID |

No camera frames or motion samples leave the phone in the inspected code paths.

## 3. Three design directions

All three keep the seismograph housing, graph paper, thermal ticket, stamp, keys, engraved plate,
local fonts and the bin chicken, and leave existing animations untouched.

### A. An instrument with its manual printed on it (chosen)

Every screen says what it compares against and what it assumed, in the instrument's own materials. The
check intro lists which tasks will be compared. The ticket prints the reference ("vs your baseline,
Sun 22 Nov" or "Simulated, example reference") and names the label's source. The caffeine card prints
its dose, source and half-life assumptions as rows. Privacy lives on an engraved settings plate.

- **User value:** high. Every confusion found in section 2 is a missing sentence or a missing state.
- **Evidence burden:** low. It removes claims rather than adding them.
- **Privacy cost:** negative (it adds controls).
- **Maintenance:** low. It reuses Sheet, Rows, Label and Key, plus two small form controls.
- **Fallback:** plain text on paper. Nothing depends on motion or canvas.

### B. A lab notebook

History first: a timeline of readings and drinks, with trends. Valuable for repeat use, but it needs
a retention and consent design, a history schema, and evidence about repeatability before trends mean
anything. **Deferred** until A has made each single reading honest.

### C. An interactive explainer

A guided page connecting phone movement, a baseline and the receipt, driven by animation. It would
help first-time visitors, but its value is mostly motion, which is out of scope this session, and it
risks explaining a measurement more confidently than the evidence allows. **Deferred.** A static
"why one baseline" sheet, part of A, covers the core need.

## 4. Ranked backlog

Scores are 1 (low) to 3 (high). Effort is 1 (small) to 3 (large). Rank weighs user value, safety and
privacy first, then evidence strength, then effort and dependencies.

| Rank | Item | Value | Evidence | Safety | Privacy | Effort | Depends on | Stage |
|---|---|---|---|---|---|---|---|---|
| 1 | Comparability rules: F1, F2, F3, protocol and pulse provenance | 3 | 3 | 3 | 1 | 2 | Schema v2 | A |
| 2 | Versioned local schema with per-record validation and safe migration | 3 | 3 | 2 | 2 | 2 | None | A |
| 3 | Explicit personal, example and reduced routes, recalibration, ticket from its own snapshot (F4, F6, F7) | 3 | 3 | 2 | 1 | 3 | 1, 2 | A |
| 4 | Room consent off by default, privacy plate, server-side withdrawal, commentary switch, receipt field choice | 3 | 3 | 1 | 3 | 2 | 2 | A |
| 5 | Honest copy: setup, care, chart, tier wording, label source, safety on Home (F5, F8, F9) | 3 | 3 | 3 | 2 | 1 | Ledger | A |
| 6 | Evidence ledger | 2 | 3 | 2 | 1 | 2 | Source access | A |
| 7 | Serving detail, consumption time, label arithmetic, edit and undo, carryover, bedtime | 3 | 2 | 2 | 1 | 3 | 2 | B |
| 8 | Text alternative for the caffeine chart | 2 | 3 | 1 | 1 | 1 | 7 | B |
| 9 | Pulse review against fixtures, including the pending patch | 2 | 2 | 2 | 1 | 2 | Owner review of `5ca2b58` | C |
| 10 | Accessible Choice Tap input with recorded modality and a measurement decision | 3 | 2 | 2 | 1 | 2 | 1 | Later |
| 11 | Trusted proxy configuration for the rate-limit key, durable budget | 2 | 3 | 1 | 2 | 2 | Deployment facts | Later |
| 12 | Security headers and a tested CSP | 2 | 3 | 1 | 2 | 2 | Header inventory of the live site | Later |
| 13 | Quiet mode, focus on route change, landmarks, reduced-motion audit | 3 | 3 | 1 | 1 | 2 | None | Later |
| 14 | Private reading history with retention choices (direction B) | 2 | 1 | 1 | 3 | 3 | 2, 4 | Later |
| 15 | Durable friends or invites | 1 | 1 | 1 | 3 | 3 | Everything in THREAT-MODEL section 6 | Not now |

Friends and invites rank last on purpose. They would put health-like inferences behind an
identity the app does not have. The prerequisites are listed in the threat model, and none exist.

## 5. Plan for this session

Stage A and Stage B, in this order:

1. Schema v2 under a new key, leaving the v1 record untouched as a rollback copy.
2. Engine comparability rules, then the routes and ticket that depend on them.
3. Privacy controls and copy, then the evidence ledger.
4. Serving detail, time, arithmetic and carryover, with edit and undo.

Pulse changes in this session are limited to how an outcome is reported (measured, approximate,
unreadable, blocked, skipped). The analyzer and its thresholds are not touched, so the pending patch
stays reviewable on its own. Stage C is proposed in the final report and not started.
