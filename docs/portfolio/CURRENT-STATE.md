# Kachka current-state and UX handoff for Astra Ultra

## 1. Scope, evidence and release boundary

This is a source audit of `/workspace/tanda` at checked-out commit **b3d93a6**, the main source snapshot supplied for this handoff. It is not a browser test of the production site, a clinical evaluation or user research. The application was not changed during this audit. Existing project documents include historical plans, so the current source takes priority when identifying implemented behavior.

Separate pulse fixes are committed and pushed on **`fix/pulse-stability-and-retry` at 5ca2b58**, but are **unmerged**. They modify `src/tests/pulse/analyze.ts`, `src/tests/pulse/index.tsx` and `src/tests/pulse/README.md`, with new `guardrails.test.ts` and `index.test.ts`. They must not be presented as shipped-main behavior. The pulse branch passed `npm run check` with **513 tests in 42 files** and the production build during handoff preparation. This source audit did not rerun those checks, and physical-device validation remains separate. The current planning branch is `docs/astra-ultra-portfolio-handoff`, based on b3d93a6, with application code unchanged. No new feature implementation is requested in this research-and-design pass.

The product is **Kachka**, built by **Las Nubes**, Spanish for **The Clouds**. Kachka is pronounced KATCH-ka. Its naming story connects the Russian word for rolling or pitching with the Ukrainian word for duck. Preserve the instrument, the bird and the deadpan voice.

## 2. Product contract to preserve

Kachka is a phone-based body drift toy. Its meaningful comparison is a person's current performance against their own previously recorded baseline. The standing and tapping tests measure task performance, not alcohol concentration, intoxication, a diagnosis or permission to drive. Camera pulse is optional and weaker evidence.

The current result vocabulary is **Steady, Wired, Tipsy and Wobbly**. The amount of change comes from sensor/task metrics. The drink log supplies the context used to choose a label. Logging a drink alone does not prove the drink caused the measured change.

At present `assess()` in `src/engine/classify.ts` applies the drift threshold, labels sufficient drift Tipsy if any alcohol was logged, otherwise Wired if caffeine was logged, otherwise Wobbly. Below the threshold it labels Steady. Alcohol takes precedence over caffeine. A pulse contribution is capped and cannot establish a verdict by itself. Confidence reduces when motion is missing, the baseline was taken after a drink or source sampling differs substantially.

These rules are a starting heuristic, not a validated classifier. Designs must not turn the number or the bird's confidence into a medical claim. In `src/engine/nudge.ts`, any alcohol logged today produces the fixed safety line on results, including Steady. Tipsy maps to a ride or friend. Preserve the line in the screen and in exported receipt images. Do not introduce BAC estimates, clearance countdowns, drinking competitions or rewards for becoming more impaired.

Claude writes the short joke on the ticket. It does not decide the verdict or the safety advice. Preserve that boundary even when proposing richer conversational features.

## 3. Implemented flows and their current gaps

| Flow | What exists at b3d93a6 | Key source |
|---|---|---|
| Landing | Name input with generated fallback, Start and Quick demo. Returning users see Continue and Start over. Both entry buttons turn room sharing on. | `src/screens/landing/index.tsx` |
| Motion setup | Tests whether usable motion arrives. Requests iOS permission from a tap. Gives specific no-data/browser guidance and a one-test fallback. | `src/screens/setup/index.tsx`, `src/sensors/motion.ts` |
| Personal baseline | Asks whether anything was consumed. If yes, collects drink counts before testing and marks the baseline unclean. Runs Stand Still when available, Choice Tap and optional Pulse, then saves the baseline. Choice can be skipped after a standing test exists. | `src/screens/baseline/index.tsx` |
| Quick demo | Stores a stock reference immediately, collects drink counts and then runs each test once. It bypasses personal calibration and starts Check directly. The stock reference contains standing and tapping values but no pulse. | `src/store/quick.ts`, Landing, Baseline and Check |
| Personal check | Requires a baseline. Normally shows an intro, offers pulse as an optional addition, then runs standing and tapping. Motion unavailable routes to tapping. A run needs standing or tapping, so pulse cannot be the only task. | `src/screens/check/index.tsx`, `shared/contracts.ts` |
| Home | Today's drink list, caffeine curve when relevant, care prompts, log/check actions and a challenge link. A newly logged drink can be undone for five seconds. | `src/screens/home/index.tsx` |
| Result | Thermal ticket with name, changed metrics, logged drinks, verdict, bird, commentary and next action. Can save a PNG or use browser-supported file sharing. | `src/screens/result/index.tsx`, `ResultTicket.tsx`, `receipt-image.ts`, `share.ts` |
| Demo challenge | Compares against a baseline after an optional spin or using the other hand. Spin depends on motion and a standing baseline. Results are simulated. | `src/screens/demo/index.tsx`, `guess.ts` |
| Room | Public shared board with join QR, live activity, result mix, recent results and separate real/demo ranking sections. | `src/screens/room/`, `server/room.ts`, `server/state.ts` |
| Lab and band | Lab routes expose individual instruments and UI examples. The band screen is a placeholder, not a working wearable integration. | `src/screens/lab/`, `src/screens/band/index.tsx` |

### Personal baseline versus stock demo

The stock reference uses `baseline.run.at === 0` as its marker. The source explicitly says its values were selected by judgment on build day, not derived from a study. It must be described as an illustrative reference, not a measured personal normal or a representative clinical norm.

Check forces stock-based readings into demo mode regardless of the route. Result adds **Simulated** and **Stock normal, not yours**. It suppresses the challenge guess when no handicap was selected. The stored baseline survives reload, while the quick-entry routing flag is module memory. Therefore a later visit can remain stock-based without still being in the quick routing flow.

This is a UX debt to resolve deliberately. A returning demo user needs an obvious route to record a personal baseline without losing their name and drink history. Current Start over removes the local record rather than offering a separate recalibration action. Do not silently convert the stock reference into a real personal result. Also update stale comments in a later coding task, such as Check's claim that the quick reference contains standing only. The current stock reference contains Choice Tap as well.

### Result and progress gaps

Keep mode, available measurements and confidence visible together. Distinguish a skipped pulse, an unreadable pulse, an approximate estimate and a pulse shown without scoring. Today the result row usually collapses absent pulse to **Skipped**, so a failed attempt can be indistinguishable from an intentional skip after the step ends.

`Stored` holds one baseline, a drink array and the latest result. It is not a longitudinal reading-history system. `checksSinceBaseline` is currently passed as zero from Check. A future design should not claim that the learning effect or calibration confidence improves across saved repeated checks until that state is actually recorded.

## 4. Caffeine and drink logging

The implemented drink types are coffee, energy drink, beer, wine and spirit. Coffee maps to **100 mg caffeine** and an energy drink to **80 mg**. These are fixed assumptions, not measured contents. Alcohol entries are counts without serving volume, strength or standard-drink conversion. Never turn those counts into a BAC estimate.

The main log records a drink at the present time, suppresses immediate double taps and returns Home. Initial onboarding can collect multiple drinks, but it records them all as consumed now with slight timestamp offsets. That can misrepresent the timing of earlier drinks. There is no ordinary edit-history UI, earlier-time entry, custom caffeine amount, drink-size selection, configured personal bedtime or recurring saved drink.

`src/engine/caffeine.ts` uses a descriptive uptake curve peaking at approximately 50 minutes followed by a five-hour half-life. The chart's uncertainty band uses two- and eight-hour half-lives. The estimate is independent of the sensor verdict. `src/engine/aftercare.ts` uses a default next bedtime at 23:00 local time and a 25 mg notice threshold. The daily intake guide is 400 mg for adults. These defaults need careful audience qualification and should not become personalized treatment advice.

The app groups today at **04:00 in the device's local time** through `src/store/day.ts`. Home passes only today's drinks into the caffeine calculations. An earlier dose can still be metabolizing after that rollover, so a future model should separate calendar grouping from the recent-dose window used for residual estimates.

### Additive logging roadmap

1. Keep the one-tap presets. Add an optional detail sheet for amount, size and time, with the assumed caffeine dose visible before saving.
2. Add edit and remove controls beyond the five-second undo window. Provide accessible confirmation and undo for destructive actions.
3. Let a person set a target bedtime and see **assumed dose**, **estimated amount** and **uncertainty** in plain language. A chart should not suggest it measured caffeine in the body.
4. Add a usable textual or tabular alternative to the caffeine plot, including current estimate, bedtime estimate, dose assumptions and the meaning of the band.
5. Preserve the deterministic engine and the distinction between intake logging and measured task change. Add longitudinal history only with an explicit schema migration and retention decision.

Any data-format expansion must address `src/store/local.ts`. It currently has no migration path and wipes an invalid stored record. A new schema must migrate existing data safely rather than silently discarding users' baseline, drinks and preferences.

## 5. Privacy and current social behavior

### Actual data boundaries

- The browser stores the baseline, drinks, display name, device ID, sharing flag and latest result in `localStorage` under `bc:v1`.
- Motion and camera processing are local. `src/sensors/camera.ts` reads a small center patch of video and calculates mean color channels. It does not upload camera images through the current pulse pipeline.
- `POST /api/verdict` receives the device ID as a rate-limit key, numerical drift, verdict, confidence, mode, drink totals and local hour. `server/prompt.ts` omits the device ID from the Claude message but includes selected task summaries and drink totals. Therefore a blanket statement that readings never leave the phone is inaccurate.
- The commentary request is server-side, restricted to closed fields and bounded in time. It falls back to built-in text when disabled, unauthenticated, slow or unusable. Do not add a browser-side secret or pass an unrestricted chat transcript into this endpoint.
- Room sharing sends a display name, live stage and result summary keyed by a client-generated device ID. The public board omits that ID and does not display drink logs or raw measurements.
- Starting either landing flow sets `shareToRoom: true`. The visible landing disclosure says the name appears on the screen, but no ordinary in-app off switch is currently exposed. A fresh record defaults to false, which does not mean that the implemented entry flow is opt-in private.
- Presence heartbeats occur on stage changes and every 15 seconds while visible. Presence expires after 45 seconds. Result history keeps one result per device, up to 2,000 entries and approximately 12 hours. Optional Redis mirrors results across restarts. Presence is not mirrored.
- The room is a shared, unauthenticated endpoint. There are no separate named rooms, private circles or friend relationships. Admin reset requires a token, but it is a whole-room action, not a personal withdrawal API.
- Start over deletes local data. It does not immediately remove that device's already posted result from the server. Clearing the device ID can make that old entry harder for the same person to address later.

Relevant files include `src/room-reporter.tsx`, `src/room-reporter-logic.ts`, `src/api/room.ts`, `server/room.ts`, `server/room-presence.ts`, `server/state.ts`, `server/room-mirror.ts` and `shared/contracts.ts`.

### Privacy prerequisites before friendships

Astra should treat friendship as optional future scope, not a styling task. The current device ID is client-controlled and is not authenticated account ownership. Do not use it as authorization for reading private friends' records.

Compare two models before choosing an architecture. One is expiring, invite-only event circles with minimal identity and no long-term graph. The other is durable friendships requiring authenticated ownership and account lifecycle support. The second has a substantially larger privacy, abuse and maintenance cost.

Before either ships, require clear private/public audiences, explicit consent, leave and revoke controls, retention limits, per-user deletion, block/report controls, invitation expiry, server-enforced access control and tests proving outsiders cannot read group information. Do not auto-upload contacts or make drink logs public to friends by default. Provide useful anonymous single-person behavior throughout.

Keep drink counts, raw signals and precise personal history private unless a person intentionally shares selected content. Receipt export should preview which fields, such as name or logged drinks, will be included. Preserve safety text in any shared result. Avoid rankings that reward drinking or worsen impairment. Existing real-room ranking already restricts eligibility to Steady results, which is an important constraint to retain.

## 6. Existing visual system and motion

Preserve the Seismograph identity already expressed in `src/ui/tokens.css`, `src/ui/components.css` and the shared UI components.

| Role | Existing token or treatment |
|---|---|
| Bench | `#121a18` |
| Instrument housing | `#1e2a27` with restrained lighter edges |
| Graph paper | `#eef2e6` with fine and major grid lines |
| Thermal receipt | `#fafaf4` with torn-paper edge |
| Measurement ink | `#1c1f25` |
| Baseline | Pencil blue `#2e5fb5` |
| Verdict accent | Stamp red `#c3273b` |
| Display type | Big Shoulders Display |
| Reading type | Courier Prime |
| Core objects | Housing, engraved plate, chart window, physical-looking keys, receipt, stamp and ibis |

Fonts are served locally through `src/main.tsx`. Keep that reliability advantage. The product is already recognizable without a decorative hero illustration, gradient dashboard or a different color system.

Motion already includes ticket feeding, stamp impacts, ibis blinking, wired jitter, sway and mood-specific result choreography. The room prints arriving rows. The standing test replays a short trace on canvas. `src/screens/result/result.css`, `src/ui/components.css` and `src/screens/room/room.css` contain reduced-motion rules. `src/tests/stand/Trace.tsx` also draws a still result when motion reduction is requested. Treat historical design notes that say nothing else animates as intent from an earlier stage, not a literal shipped inventory.

### Additive motion and optional 3D direction

The best next step is to refine the physical instrument's existing behavior. Use short, finite transitions for key depression, focus, chart reveal, receipt printing and stamp landing. Keep the result and all safety text available immediately. Do not require a person to wait for choreography before reading or continuing.

Try CSS perspective and transform-based depth on existing instrument surfaces before adding WebGL. A richer version could use matte green casing, a restrained embossed plate, a small paper roll or a decorative bird treatment. Preserve the same silhouette, materials, labels and key hierarchy so the static version remains the same product.

Any true 3D implementation should be a separate, lazy-loaded enhancement with a static fallback. It should not require camera or motion permissions. Avoid gyroscope-driven parallax, heavy physics, full-screen shaders or constant animation near a task where timing is measured. Rendering must not enter the scoring path.

Suspend decorative loops during motion capture, tapping and camera pulse. Suspend them while hidden. Cap pixel density, prefer render-on-demand, and define a conservative frame budget on real mid-range phones. Respect both reduced motion and an explicit local Quiet mode that covers sound as well as motion. The core application must remain functional when WebGL fails or memory/battery constraints disable the enhancement.

## 7. Accessibility and mobile performance gaps

The existing foundations include native buttons, input labels, visible focus outlines, some SVG descriptions, live status text and safety messages that are not encoded only by color. Those are useful starting points, not a completed accessibility certification.

Concrete follow-up work:

- **Choice Tap input.** The target squares in `src/tests/choice/index.tsx` use `onPointerDown` without an equivalent keyboard handler. Enter or Space activating the native button does not currently record a tap. Provide an accessible mode and record the modality if comparing timings. Do not claim a pointer and keyboard reaction test are interchangeable without a design and measurement decision.
- **Chart interpretation.** `src/ui/CaffeineChart.tsx` marks the SVG decorative. Some surrounding text describes bedtime and the band, but a fuller accessible current/bedtime/range summary is needed.
- **Page structure.** Most phone screens use a div-based Housing and h2 headings. A consistent main landmark, page heading, route-change focus and clear focus return after sheets should be planned.
- **Quiet behavior.** Reduced-motion CSS exists, but there is no obvious application-level sound/motion preference. Standing and tapping audio should have an explicit mute alternative and should never be the only timing/status cue.
- **Changing preferences.** The standing trace reads reduced-motion preference once for an effect. A future shared preference layer should respond to changes made while the page is open.
- **Canvas cost.** The trace caps DPR at two, but currently remeasures layout, reads styles and resizes its canvas on animation frames. Cache stable geometry and theme values until resize or theme change before expanding motion.
- **Capture isolation.** `src/sensors/camera.ts` already limits pixel work to a small patch. Do not erase that advantage with concurrent heavy scene rendering. The unmerged pulse work is also addressing duplicate presented frames rather than treating display refresh as camera sampling.
- **Bundles and routes.** The current app imports the screen tree directly. No Three.js or WebGL framework is in package.json. Do not add a large always-loaded rendering stack to the common mobile path without first measuring the baseline bundle and startup cost.
- **Resilience.** Room polling and heartbeats pause while hidden, and the board keeps its last successful state while reconnecting. Retain those patterns. A PWA manifest exists, but do not claim offline behavior or background synchronization without implementing and validating it.

Future performance targets should be explicitly labelled targets and validated on representative iOS Safari and Android Chrome devices. Establish a measured baseline for load, interaction delay, dropped frames, capture sampling and memory before choosing final numerical budgets. A laptop screenshot or synthetic unit test does not verify phone sensors, torch support, audio hardware behavior or thermal stability.

## 8. Unmerged pulse work, separate from the shipped inventory

At b3d93a6 the pulse analyzer tries RGB channels, drops initial settling samples, uses autocorrelation and reports within **40 to 180 bpm**. It can return rough estimates, but the main-version result UI does not distinguish rough readings and passes the returned number onward. Failed captures can be retried but do not share evidence.

The separate pulse branch adds stricter timestamp/source-frame and modulation checks, wider frequency checks to avoid plausible subharmonics, segment-level retry evidence from the latest recent attempts and an explicit approximate result state. It also adds lifecycle/generation guards, presented-frame deduplication and timeout behavior for stalled video. Rough or combined estimates are intended to remain informational and pass null onward, so they do not become baseline or verdict-scoring inputs. Retry samples are local to the mounted pulse step and are cleared on completion, skip or unmount.

Treat these as **pending changes**. They need dedicated validation, including pure-noise seeds, incompatible frequencies, stale history, time gaps, invalid clocks, delayed camera permission and mobile camera sampling. They do not validate medical accuracy and must not be presented as a clinical improvement. Do not pad missing evidence with an average-looking number, smooth different people's readings together or clamp an unsupported value into the report band.

## 9. Proposed staged roadmap and feature flags

The names below are proposed flags, not existing configuration.

| Stage | Proposed work | Gate before enabling |
|---|---|---|
| Foundation | Honest privacy copy, room sharing control, accessible task input, baseline mode clarity, keyboard/focus and chart summaries | Source behavior matches disclosures. Core flows and safety invariants pass. Physical-device task behavior is checked. |
| Logging detail | `caffeineLoggingV2` for dose/time edits, dose assumptions and bedtime preference | Backward-compatible storage migration, correct residual-dose handling and accessible edit/undo controls. |
| Motion refinement | `enhancedMotion` for finite CSS instrument transitions plus local Quiet mode | Reduced motion and sound settings are honored, with no scoring latency regression. |
| Optional 3D | `instrument3D`, initially off and lazy-loaded | Static fallback, captured-task isolation and measured acceptable cost on target phones. |
| Private circles | `privateCircles`, initially server-disabled | Audience consent, authenticated ownership or reviewed capability design, server authorization, moderation and deletion. |
| Durable friendships | A separate later decision, not implicitly included with circles | A justified user need plus account, recovery, retention and abuse-handling design. |

Default risky additions off, keep the current anonymous instrument useful, and enable one capability at a time. Client-side flags are suitable for optional visuals. Server-side flags and enforcement are mandatory for anything that changes privacy or authorization.

## 10. What Astra Ultra should produce next

Deliver a prioritized design and implementation plan, not a speculative replacement application. Begin with the preserved product contract and current release boundary. For every proposal, name the user problem, affected screen, implementation area, uncertainty, accessibility behavior, privacy effect and acceptance criteria.

The pack should include:

1. A short current-state map with personal and stock-demo flows shown separately.
2. A visual direction that extends the existing green instrument, paper, stamp and mascot system.
3. Motion specifications with static/reduced-motion alternatives and capture-state suppression.
4. A caffeine logging information model that separates assumptions, intake history and measured task performance.
5. A privacy-first decision document comparing single-player, event-room, private-circle and durable-friendship modes.
6. A phased file-level plan with explicit proposed flags and rollback paths.
7. A validation matrix covering denied permissions, missing sensors, poor camera data, stock versus personal baseline, keyboard/screen reader use, private/public audiences, small screens and slow phones.
8. An evidence ledger separating source facts, published research, product hypotheses and unresolved choices.

No new app features, dependency additions, schema changes or repository edits belong in this prompt/PDF preparation pass. Keep the separate, unmerged pulse branch isolated for its own review and merge decision.
