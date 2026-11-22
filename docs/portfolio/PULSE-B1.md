# Phase B1 · Camera pulse reliability

## Review and reproduction

Branch `feat/phase-b1-pulse` starts at the verified PR #56 merge
`5b839ea13f99dfb99debf2b032c054e0ddec1ca2`. Its original suite passed 579/579.
The 34 frequency guardrail cases from `fix/pulse-stability-and-retry` were also run
against that merge before integration. Six passed and 28 failed. Nine recovery cases
were excluded from this comparison because main lacked the retry API. The older analyzer
could accept out-of-band rhythms at a harmonic, sparse samples and nearly flat channels.
Main already had three-channel sampling and Phase A's outcome and scoring distinctions.

The pulse patch at `5ca2b5866df186feb35f66e0af55d88b84143fbf` was integrated as
`f032681b1d6855176ece29513ed1258c9565ed07`, reconciling the ticket and outcome contracts.
No additional combined Stage C implementation was identified among the accessible branches.
Commit `f6583ed4fe85f4c86b3ee74824ca1297e8227ac9` adds contact, channel, acquisition
and timing checks and clears retry context when the page leaves the foreground.

## Evidence and limits

- Software fixtures cover 40–180 bpm boundary cases, half-rate errors, out-of-band
  periodic inputs, nearly flat channels, disagreement between channels and time windows,
  noise, brightness drift, irregular timestamps, frame loss and stalled streams.
- A reading needs at least 8 usable seconds, average cadence of 12 Hz, frame gaps
  of at most 250 ms, and at least 60% of frames indicating contact. Strong competing
  channel rates prevent a measured result. These thresholds can reject genuine weak
  pulses. Auto-exposure, saturation, skin appearance, ambient lighting and pressure
  may change both the acceptance rate and the error.
- A clean current reading wins. Recovery needs separate credible eight-second sections
  from each of two recent non-overlapping attempts, a matching camera signature including
  torch mode, cadence ratio at most 1.2, and agreement within the larger of 8 bpm and
  10% of the lower rate. It uses one observed rate and labels it combined and approximate.
  Both standalone approximate and combined results are display-only. Camera settings,
  per-frame samples and retry history stay in the mounted step. Browsers withholding
  the camera ID can still produce standalone readings. Recovery assumes the same person
  follows the same-finger retry instruction. Camera settings cannot establish identity.
- Tests exercise late permission, repeated frames, stalls, Skip, unmount, late playback
  and torch callbacks. Chromium also exercised denial, late permission after Skip,
  navigation with a live track, and a synthetic 72 bpm video through the production UI.
  Deterministic fixture accuracy measures the software against generated rhythms.
  Periodic finger motion or flicker resembling pulse can still pass.
- Repository decision D46 and evidence ledger L14 summarize Banhalmi (2018) and Plews
  (2017) on smartphone contact-camera pulse intervals against reference measurements.
  Longer still recordings, different acquisition rates and different processing limit
  transfer to this 15-second rate estimate. These studies do not establish Kachka's
  sensitivity, clinical accuracy or HRV validity. Direct full-text and literature-index
  requests returned HTTP 403 during B1. The source assessment relies on the existing
  repository review. [Banhalmi](https://pmc.ncbi.nlm.nih.gov/articles/PMC5832098/)
  · [Plews](https://pubmed.ncbi.nlm.nih.gov/28290720/)
- Production sanity was limited to a public health GET, which returned HTTP 403.
  Production Redis configuration and deployed consent behavior remain unverified.
  No private records were requested. This branch requires no migration or Redis change.

## Physical-phone validation before release

1. Use the reviewed build on HTTPS on one rear-camera iPhone/Safari and one
   Android/Chrome. Record build SHA, device, OS, browser, lighting, actual torch status,
   and reference model. Use simultaneous single-lead ECG or a validated ECG chest strap
   that exports timestamped RR intervals. Obtain consent and use anonymous trial IDs.
2. Seat each of at least three volunteers comfortably for five minutes. Synchronize the
   reference and capture clocks using a shared visible time marker. Support the hand,
   cover the active lens gently, and use the same finger for each retry. Test each
   participant on both devices in ordinary indoor light and dim light, three independent
   captures per device and lighting condition (36 primary trials). Include both torch
   and torchless devices/modes where available and record unavailable combinations.
3. Record every attempt, status, displayed rate, retry provenance, and reference quality.
   Compute reference bpm as 60,000 divided by mean valid RR in milliseconds over the
   matching 15-second post-settling interval. Preserve paired results before analysis.
   For recovery, save references for both source windows. If window timing cannot be
   matched, report recovery availability only. Keep unreadable, blocked, skipped,
   approximate and reference-invalid trials in separate counts.
4. On each phone run three repeats each with an uncovered lens, deliberate gentle finger
   movement, and an interrupted capture followed by a same-finger retry. Confirm Skip,
   navigation and backgrounding release the camera. Confirm the ticket labels recovered
   estimates as approximate and leaves the score unchanged. Start a new step before
   changing participants. Record failures and retries individually.
5. Provisional engineering gates per phone for still trials with valid reference:
   measured availability at least 80%, median absolute error at most 5 bpm, and at least
   90% of measured trials within 10 bpm. Require zero measured outputs for uncovered
   trials, zero scored approximate results, and zero camera leaks. Report counts,
   signed bias, absolute errors and largest error alongside each gate. Report motion
   false readings and all recovery outcomes separately. A failed gate requires investigation
   before release. This small resting sample cannot validate general accuracy, arrhythmias,
   exercise performance or behavior across skin tones and phone models.

## Reproduction and continuation

Run `npm run check`, `npm run build`, and
`npx --no-install vitest run src/tests/pulse`. Serve the build locally with
`PORT=3333 STATIC_DIR=dist VERDICT_ENABLED=false node dist-server/index.cjs`, then run
`python scripts/browser-checks/pulse.py` with Python Playwright and Chromium available.
The browser script accepts KACHKA_TEST_ORIGIN and CHROMIUM_PATH. It uses synthetic streams.

After B1 approval, first map Phase B2's motion acquisition, timing, permission and retry
boundaries. Reproduce failures with deterministic sensor fixtures before changing scoring
or the flow. Physical motion checks and the later 3D, animation, scroll and wellbeing
roadmap remain separate milestones.
