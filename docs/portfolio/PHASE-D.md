# Phase D review

The selected experience is an instrument with a field guide. A first-time visitor can log tea or coffee directly. A returning visitor can inspect how a serving contributed to the bedtime estimate, then edit the original entry. The original Start, quick demo, compatible tests and receipt are still available.

| Direction considered | Everyday value and visual fit | Evidence, privacy, accessibility and work |
| --- | --- | --- |
| Field guide on the existing chart | Connects actual drink choices to one explainable example. Fits the chart paper and thermal text. | Existing local fields, deterministic arithmetic and native keyboard disclosure. Limited implementation and maintenance. Selected. |
| Private logbook | Could show compatible tests over weeks, but needs another view and longitudinal navigation. | Requires retention, erase, migration and accessible history design. Changes over time would still need comparability checks. Deferred. |
| Contextual coaching | Could offer more tailored timing advice. Adds repeated prompts to the instrument. | Predicting sleep or attributing a task change would require evidence and personal information Kachka lacks. Omit personalised coaching. |

## What ships

The usual one-tap defaults, detailed volume/fraction editor, log undo, 04:00 boundary and personal bedtime are retained. Home groups consumed caffeine by label, user estimate and app default. A per-100 mL entry missing its volume points back to the editable input. Unknown-only logs show a correction path. Mixed logs show a partial estimate and an omission count. The chart, numeric text and explanation use the same log window. A minute tick and a window-focus refresh keep projections current on an open Home screen.

The field guide uses no generative model. It reports the largest included bedtime contribution from a real logged entry and explains the 50-minute rise, 2/5/8-hour scenarios and limitations. It keeps drink facts separate from changes on the phone tasks. Neither a 400 mg intake nor a Wired ticket triggers a command to stop consuming caffeine. Existing stored ticket codes remain readable. The deterministic safety line covers alcohol known at assessment, subsequently recorded for the reading, or logged on the current day. The export follows the same decision even when name and drink details are hidden. Drinks consumed after an old reading are excluded from its intake description.

Anonymous use, room consent, receipt privacy toggles and the disabled-by-default paid commentary configuration carry forward. Adding the field guide introduces no new storage field, migration, network request, provider or dependency. The unit and browser results establish software behaviour. The [scientific evidence record](research/PHASE-D-EVIDENCE.md) explains the limits of the underlying physiology.

## Verification

| Check | Result |
| --- | --- |
| `npm run check` | TypeScript passed. Vitest passed 686 tests in 49 files, including source grouping, attributable bedtime contribution, unknown volume, zero dose, day boundaries, warnings and receipt preview. |
| `npm run build` | Vite and the bundled Node server built successfully. Vite reported a chunk-size warning. |
| `flows.cjs '' caffeine` | 16/16 browser assertions, including label arithmetic, inaccurate or missing inputs, edit/undo, carryover, bedtime and alcohol safety. |
| `flows.cjs '' example` and `flows.cjs '' migration` | 11/11 simulated reading assertions and 3/3 migration assertions. |
| `extra.cjs` | 18/18 assertions, including 320 px overflow, local fonts, receipt stamp, actual PNG download, simulated Web Share file handoff, previous-day editing, reduced motion and blocked storage. |
| `wellbeing.py after` | Passed at 390 × 844 and 1280 × 900. First visit logged tea without running a test, returned through Continue, omitted an unknown-only chart, opened/closed details by keyboard and made zero API or external requests. |
| Physical validation | Mobile viewport emulation only. Real phone camera, motion timing and native share sheet remain device release gates from earlier phases. |

To reproduce the browser checks, serve the production build locally with paid verdicts disabled, set `KACHKA_TEST_ORIGIN` to that loopback origin and `CHROMIUM_PATH` to system Chromium. Run the named scripts in `scripts/browser-checks/` with Node for the CJS runners. Use Python with Playwright for `wellbeing.py after <output-directory>`. The before images came from the merged base using the same synthetic inputs, fixed clock, local fonts and reduced-motion setting.

| Screen | Before | After |
| --- | --- | --- |
| First visit, mobile | [390 px](screenshots/phase-d/before-mobile-landing.png) | [390 px](screenshots/phase-d/after-mobile-landing.png) |
| First visit, desktop | [1280 px](screenshots/phase-d/before-desktop-landing.png) | [1280 px](screenshots/phase-d/after-desktop-landing.png) |
| Home, mobile | [Collapsed](screenshots/phase-d/before-mobile-home.png) | [Collapsed](screenshots/phase-d/after-mobile-home.png) · [Expanded field guide](screenshots/phase-d/after-mobile-details.png) |
| Home, desktop | [Collapsed](screenshots/phase-d/before-desktop-home.png) | [Collapsed](screenshots/phase-d/after-desktop-home.png) |

Both landing pages kept their full-page height. With the sample mixed log the collapsed Home fits the explanations into a shorter page on both viewports. The screenshots use synthetic names and entries.

## Deployment and next decision

Review this branch against the PR #59 merge at `ffbf493ba2a8eb923eb93b41a2d9e72fc7853e07`. A merge to main runs the configured check and then requests deployment via Dokploy. Feature-branch review does not require any production setting, data conversion or paid call. An owner-approved rollback can redeploy the prior main build against the same v2 records. It also restores the old threshold and the earlier receipt-warning behaviour. Verify CI and obtain explicit owner approval for release.

Phase E can prototype a 3D instrument, tactile controls, mechanical paper feed and tear, and an interactive explanation of the illustrative curve. Prototype one interaction at a time, give scroll effects a reduced-motion/static equivalent, keep keyboard and text paths, and profile on a low-end phone before committing assets. Phase F covers consent-based social features, access control and deletion. Phase G covers commercial readiness, operating costs, privacy, accessibility and real-device release evidence. A private history would require its own retention, deletion and measurement-comparability decisions.
