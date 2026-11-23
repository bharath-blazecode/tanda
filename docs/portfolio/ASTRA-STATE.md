# Phase A integration review · 22 November 2026

Local branch `integration/phase-a`. The nine original A/B commits remain in its ancestry. Main was reviewed at `b3d93a6dcbdacc94710874b834ac29de7c263702`. The comparison build was Claude’s `d1c12483acf5891f0b1eec68840dbae2730332f0`. The Phase 0 evidence remains on `review/phase-0-discovery` at `72da7ff1d11a97949699b7bcf5eb7157571614ee`. Code and regression tests are in `51f6b9732868b0429535e945e374353fb1a499bd`.

## Findings and changes

| Area | Outcome |
|---|---|
| Room consent | An opted-in record previously survived a failed write and overrode an opt-out on the next read. The reporter now requires both explicit consent in the current document and a matching grant in storage. Opt-out drops the in-memory grant synchronously before contacting the server. Denied storage, reload and opening another document default to sharing off. Switching routes within the tab preserves consent. This deliberately requires a fresh opt-in after reload. |
| Withdrawal and erasure | Presence and result removal happen in memory immediately. A configured Redis mirror must acknowledge deletion before the route returns 204. A failed deletion returns 503, including for an unknown ID. Deletion errors in local storage now have their own feedback. Start over retains the device ID for the withdrawal request and revokes sharing before awaiting the response. |
| Personal and demo readings | Kept separate example and personal references, the captured ticket reference, explicit no-reading route, recalibration checks and simulated export labels. Sway with unknown source cannot establish matching units. The integration omits that comparison. It also omits the tapping comparison when trial counts differ, since comparing raw error counts from 8 and 12 trials can create artificial drift. A remaining eligible instrument can still produce a partial reading. |
| Migration and estimates | Retained field-level v1 migration, preserved the legacy rollback record and kept room sharing off. Verified caffeine per volume, fractions, retrospective consumption time, carryover, bedtime, unknown amounts, label-based alcohol calculations and edit/undo. Corrected the evidence ledger to acknowledge that capped pulse can tip a borderline combined score. |
| Browser timeout | Home places entries before the 04:00 day boundary in a collapsed disclosure. At 05:00, the two-hour-old energy drink is in that section and its edit button is hidden from role queries. The test now fixes its daytime fixture at noon. A separate Brisbane 05:00 check locates the disclosure, expands it and opens the same editor. The application’s day boundary and accessible button name are intact. |

## Verification

- TypeScript and **579/579 Vitest tests in 46 files** passed. The production client and bundled Hono server built. Vite reported its 500 kB chunk warning. The client JavaScript is approximately 507 kB raw and 160 kB gzip.
- The revised Chromium flow suite reported **62/62**, including the original 60 flow assertions and two stale-consent checks. It exercised personal, simulated and reduced routes, migration, recalibration, drink editing and undo, and all-lapse recovery. The **14/14 privacy subset** passed again after the last consent changes. These 14 overlap the 62.
- **14/14 additional Chromium checks** passed, including the original ten, a downloaded PNG signature, two previous-day editing assertions and denied storage getter on reload. The record on the original candidate remains 48 flow assertions before timeout plus ten extra checks. Totals above apply to the revised harness and integration.
- The privacy flow first saw both presence and a result on the board. It then forced both write and removal exceptions while the old opt-in remained readable, observed withdrawal, confirmed the board entry disappeared, waited a heartbeat interval and reopened a fresh result after reload. No new presence or result was posted. Unit tests exercised a failed write, persisted stale state, fresh document and failed erase. The failed mirror acknowledgement and successful retry used the repository’s fake Redis adapter.
- Receipt checks covered optional name and log fields, provenance and safety content, browser download, narrow-screen layout and reduced motion. A system share sheet, real camera/motion hardware, live Anthropic, screen readers and a production Redis topology were untested. Motion input in the browser harness was synthetic. Physical accuracy remains open.
- No package, lockfile, CSS, font, animation, mascot, icon, or navigation layout change was introduced on top of the candidate. At 390 × 844 and 1280 × 800 the instrument introductions and sample ticket matched the candidate pixel-for-pixel in Chromium with reduced motion. The copy adjustment in `92a74a593eb5e0a572ace48460ee08636ea3dd12` preserved Privacy page heights of 1499 and 1421 pixels at those viewports. The Privacy copy explains consent lifetime and who can update a room row. [Before](phase-a/privacy-before.png) · [After](phase-a/privacy-after.png) · [Reviewed receipt](phase-a/receipt.png).

## Release decision and continuation

The reproduced client consent regression is resolved for this revision. Recommend owner review for integration. If production uses Redis, verify deletion after restart and delayed requests with the deployed topology before a main merge. A 503 means an old mirror record may still be recoverable. A failed request or client opt-out cannot retract earlier requests already in transit, receipt copies already shared or provider logs. Existing tabs running old client code require reload. A rollback to v1 can expose old consent and drink data from the preserved v1 record. Keep the consent fix in a rollback build.

A merge to main runs CI and can invoke Dokploy if the webhook is configured. Local checks did not inspect production configuration. No remote branch, PR, main merge or deployment was created for this review. The independent pulse patch at `5ca2b58` and the later wellbeing, social, accessibility, animation, 3D and scroll work remain on the original roadmap.

Continuation: inspect the two implementation commits below the handoff commit on `integration/phase-a`. Obtain a specific owner decision before a main merge or a new major phase. Reproduce with `npm run check`, `npm run build`, and the two runners documented in `scripts/browser-checks/README.md`. For an installed system Chromium set CHROMIUM_PATH to its executable. KACHKA_TEST_ORIGIN selects the local test server.

### Phase B1 camera pulse review

The feature branch starts at the PR #56 merge, `5b839ea`. The comparison fixtures,
recovery rules, browser checks, production access limitation and physical-phone release
protocol are recorded in [PULSE-B1.md](PULSE-B1.md). Physical validation and owner review
remain open.

### Phase B2 · Stand Still

Branch `feat/phase-b2-motion` starts at PR #57 merge `d9c08e73043758ee2eb9680c63b77d2624d1b95e`.
Historical Stand branch `b6f0dad` is already an ancestor. Baseline fixtures reproduced seven
analyzer failures, four acquisition/lifecycle failures and two missing-provenance comparison
failures. One absent rotation reading could flip the units of the whole recording. At 120 Hz
a 59.5 Hz oscillation folded into apparent slow motion under the old 60 Hz resampling cap.

- `8c68de8` uses DOM event time and capture bounds, rejects stale delivery, and cleans up abandoned probes.
- `aff36f3` validates one sensor over the full timed task and filters at source cadence.
  Eligibility requires at least 10 Hz, endpoint coverage within 1.75 median intervals (cap 150 ms),
  and gaps within 2.5 median intervals (cap 200 ms). Gaps above 1.75 intervals are limited to
  about 2% and flagged as recovered. A valid linear-acceleration window can substitute for an
  unusable gyro window in its own units. Shortening to the calmest segment would bias RMS.
  Stitching attempts would alter the settling interval and filter history. Neither is used.
- `8895e8b` and `f8cd336` keep old records readable and compare new standing results only
  with the same protocol, sensor, duration, similar cadence (ratio at most 1.25), and compatible
  observed placement. A substantial detected tilt excludes the standing comparison. Missing
  gravity or isolated recovery lowers the recording-conditions tier. The browser has no reliable
  hardware IMU identity. Same-phone instructions and browser-local baselines remain essential.
  Existing personal baselines retain comparable taps. Refresh an old standing baseline to
  resume standing comparisons. The example reference remains simulated. A failed Stand can
  be repeated without restarting the session. No raw samples are saved.

The full suite reached 664 passing tests. Targeted motion, Stand and comparison suites reached
86. Production build and synthetic Chromium lifecycle checks passed. On the host, 301 ten-second
analyses after 50 warm-ups gave median/p95 times of 0.317/0.708 ms at 60 Hz and 0.563/1.046 ms
at 120 Hz, versus 0.203/0.363 and 0.263/0.397 ms on main. These are desktop processing costs.
Use the phone pilot before release. [Scientific review, browser procedure and phone protocol](MOTION-VALIDATION.md)

Next decision is owner review and physical validation. Later privacy, connected wellbeing,
caffeine, accessibility, performance, 3D, animation, scroll, social and commercial readiness
work remains on the roadmap.

### Phase C · Security, privacy and operations

Branch `feat/phase-c-security`, from `85ed2b700de91f7f4f862f1272e27fd571d5ee1f`.
Commits `f5be734` (proxy trust and AI allowance), `5928768` (headers and JSON writes),
`4dd9d79` (Redis acknowledgement and retention), `bdb02e7` (browser privacy),
`dd7958a` (CI, container and shutdown), and `c2a9fd7` (share verification and limiter naming).
The [Phase C review and owner runbook](PHASE-C.md) records independent evidence, remaining
production checks, rollback and commercial privacy questions. Next decision is owner review.
Phase D wellbeing/caffeine, Phase E creative animation/3D/scroll, Phase F social and Phase G
commercial readiness remain separate.
