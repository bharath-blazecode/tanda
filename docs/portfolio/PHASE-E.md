# Phase E · Clean Kachka and tactile caffeine scenarios

## Final owner-directed visual scope (24 November 2026)

The initial Phase E candidate at `b7ac0226321b79ae72ea1a74fa53aeddb0a79dfa` added a hand-fed BC-2 miniature illustration to Landing. The first instruction on the paper included a human-like SVG outline. The owner reviewed this and preferred the original uncluttered landing screen. The entire miniature recorder, its **Feed paper** control, CSS, animation, JSX and rejected prototype screenshots have been removed from this revised feature branch.

**Landing is restored byte-for-byte to merged Phase D** (`src/screens/landing/index.tsx`, identical Git blob SHA on `main` and this branch). No substitute image or illustration was introduced. The team’s existing title, graph-paper presentation, form, privacy choice, demo and quick-log entry remain exactly as before.

The accepted improvement is the interactive caffeine chart, separate from Landing and from the protected receipt.

## Retained chart feature

- Three compact latching radio keys labelled **2 h**, **5 h** and **8 h** select the existing illustrative caffeine half-life scenarios.
- The plotted curve and the line directly beneath it display the same selected scenario and bedtime estimate. The shaded uncertainty/sensitivity envelope does not change.
- Five-hour modelling is the initial selection on each visit. Changing the selector does not modify stored drinks, real test results, baseline, personal data, server requests or paid API usage.
- The field guide and broader Home values continue to state the five-hour model explicitly; the optional chart control only changes its own chart and legend, not the baseline calculation or actual measurements.
- Accessible native radios, keyboard arrow navigation, 44 px touch targets, visible focus, forced-colour style and no dependency on animations or WebGL remain.
- No new library, font or external asset is required.

## Protected design and functionality

This revised branch introduces no source changes to the original thermal receipt components, Dr. Bin Chicken’s original fallback jokes, result animations, stamps, receipt CSS, PNG export, privacy toggles, or fixed alcohol no-driving messages. Demo, Stand Still, Choice Tap, camera pulse, room consent and all original navigation paths remain unchanged by the accepted visual work.

The original result animations remain the satisfying motion treatment. No unwanted visual clutter or additional Landing scroll is shipped.

## Evidence and verification status

The initial candidate (with the subsequently rejected feeder) reported TypeScript, **686/686** unit tests, a successful production build, **18/18** additional Chromium checks and a successful **15/15** isolated personal flow. The combined synthetic motion flow had a timeout also reproduced on the original Phase D base. These are *historical results for the initial branch tip*, not independent verification of this revised head.

The revised browser harness now:
- Captures Landing at both mobile and desktop sizes and checks the screenshots **byte-for-byte against merged Phase D**.
- Confirms the **Feed paper** button is absent.
- Exercises native keyboard, scenario selection, chart-curve switching, bedtime readout agreement, unchanged chart band, no log mutation and reset to 5 h on reload.
- Compares exported receipts, ticket text and ticket pixels with the baseline.
- Preserves independent animation-timeline comparisons for all four original ticket verdicts at three instants, without depending on the removed miniature recorder.

The revised GitHub branch must undergo checks on its exact head once a draft PR is opened. A standalone `npm run check` and `npm run build` should also be run where a development environment is available. Physical iPhone/Android sensor, low-end device, screen-reader and native share-sheet release validation remains separate.

## Review images

- [Clean Landing — desktop](screenshots/phase-e/before-desktop-landing.png) and [mobile](screenshots/phase-e/before-mobile-landing.png): captured from merged Phase D; revised source is identical.
- [Caffeine chart — 5 h mobile](screenshots/phase-e/after-mobile-chart.png) and [8 h mobile](screenshots/phase-e/after-mobile-chart-slow.png).
- [Caffeine chart — 5 h desktop](screenshots/phase-e/after-desktop-chart.png) and [8 h desktop](screenshots/phase-e/after-desktop-chart-slow.png).
- [Protected receipt — mobile](screenshots/phase-e/after-mobile-ticket.png), [desktop](screenshots/phase-e/after-desktop-ticket.png); exported PNGs are also in this screenshot directory.

Rejected images are no longer present in the active branch. Older commits retain historical evidence without force-pushing or rewriting team contributions.

## Acceptance and release

**No pull request or merge was authorised by the review request.** Ask the owner to confirm acceptance of the restored clean Landing and the retained chart controls, then create a *draft* PR under `bharath-blazecode`. A merge to `main` triggers the configured Dokploy deployment job and always requires explicit owner approval. The Phase F social and Phase G commercial readiness stages remain separate.
