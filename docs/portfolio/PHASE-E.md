# Phase E · The hand-fed BC-2

The earliest place a visitor meets Kachka is a sheet of graph paper. On the PR #60 build that sheet explained the tests in words. The result screen already had a much richer physical vocabulary: a printing ticket, ink stamp, animated bird and tear-off stub. Phase E brings a working part of that instrument to the first visit and gives the existing caffeine plotter a physical selector.

## Direction

| Concept | Experience and fit | Cost and decision |
| --- | --- | --- |
| Hand-fed desktop recorder | A little green machine feeds three illustrated instructions. Anyone can operate it before giving a sensor permission. Latching keys on Home use the same physical vocabulary to compare real model assumptions. | Finite transforms, native controls and existing artwork work on small screens. Selected. |
| Animated sensor panel | A shutter could uncover the active channel as a sensor becomes available. It would make an otherwise technical state tangible. | The setup already checks for actual samples and can hand over quickly. Extra motion could compete with permission instructions or falsely suggest readiness. Deferred. |
| Scroll through an exploded machine | An exploded assembly could show where the chart, pen and paper come from. High visual impact with room for storytelling. | It would add length and a second navigation language to a short mobile task. It would also require a static equivalent. Better suited to an optional future exhibit. |

CSS perspective and separate folded surfaces make the deck, front plate and side wall occupy different planes. A fixed SVG drawing could show a static cutaway more cheaply but would still need separate moving parts. A WebGL scene or authored mesh would enable free rotation, at the cost of a renderer, model assets and GPU lifecycle work. The only useful degrees of freedom here are the feed and register-wheel rotation. There is no graphics context, external asset request or animation dependency.

## Delivered interactions

- **Landing.** Press **Feed paper** to move through Stand still, Tap the squares and Read your ticket. The sprocket holes travel with the strip under a fixed roller. Each press advances the wheel by 120 degrees and gives the key a recessed face. The strip settles in 260 ms. The text updates immediately and the original Start, demo and drink-log controls stay live throughout. The last illustration reuses the team's ibis mark.
- **Home.** The 2 h, 5 h and 8 h latching keys select the existing fast, middle and slow curves. The selected curve and bedtime readout change together. The shaded envelope remains fixed, while the rows below explicitly identify the five-hour model. The choice lasts for this view. A fresh visit starts on 5 h. With unknown-only caffeine amounts, the existing correction path still appears. There is no new estimate, persistence or personal-data field.
- **During measurement.** The model exists only on Landing. The selector is present on a chart with known caffeine data on Home. The baseline, Stand Still, Choice Tap, camera, audio, room, privacy, receipt and export implementations have no Phase E diff. The controls introduce no timers, animation-frame loops, sensor listeners or navigation delays.

## Accessibility and footprint

Feed paper is a native button with a separate polite status caption. The decorative 3D scene is hidden from assistive technology. The chart keys use a labelled native radio group, arrow-key navigation, visible focus and an underline plus recessed state. The readout is a polite live region. Under reduced motion, the strip and wheel immediately display the selected state. At 390 px the Landing screenshot grew from 844 to 906 px in height and Start remained visible within the first viewport. The mobile chart gained 71 px for the switch and readout. Static views and the existing navigation also worked with WebGL disabled and local font requests blocked. Physical screen readers and native mobile browsers were not exercised.

With Vite's gzip reporting, main JS grew from 163.39 to 164.15 kB and CSS from 6.60 to 8.08 kB, about **2.24 kB combined**. The build already reported a chunk above 500 kB. No new binary art, font or npm package ships in the application. The screenshot directory is review material outside the production bundle.

With Chromium's 4× CPU throttle, six feeds across 120 animation frames gave a median interval of 16.7 ms and p95 of 16.8 ms. The maximum reached 66.7 ms in the final run and 33.4 ms in the earlier run. No recorder animation remained active after settling. These are desktop/emulated compositor observations. They do not establish phone battery life, memory usage or a guaranteed frame rate.

## Visual evidence

All before/after pairs use the same Chromium binary, synthetic data, Brisbane clock, local fonts, viewports and reduced-motion setting. The two stroke frames below use normal motion. The before captures used the clean PR #60 tree at `01ee82ddf8a1552a8432e14ac89d78d36182a569`.

| View | Before | After |
| --- | --- | --- |
| Mobile landing, 390 × 844 | [Landing](screenshots/phase-e/before-mobile-landing.png) | [Resting](screenshots/phase-e/after-mobile-landing.png) · [Advanced](screenshots/phase-e/after-mobile-feed.png) |
| Desktop landing, 1280 × 900 | [Landing](screenshots/phase-e/before-desktop-landing.png) | [Resting](screenshots/phase-e/after-desktop-landing.png) · [Advanced](screenshots/phase-e/after-desktop-feed.png) |
| Mobile chart | [Original](screenshots/phase-e/before-mobile-chart.png) | [5 h](screenshots/phase-e/after-mobile-chart.png) · [8 h](screenshots/phase-e/after-mobile-chart-slow.png) |
| Desktop chart | [Original](screenshots/phase-e/before-desktop-chart.png) | [5 h](screenshots/phase-e/after-desktop-chart.png) · [8 h](screenshots/phase-e/after-desktop-chart-slow.png) |
| Normal-motion paper feed | [Midstroke at 130 ms](screenshots/phase-e/mobile-feed-midstroke.png) | [Settled](screenshots/phase-e/mobile-feed-settled.png) |
| Mobile protected ticket | [On screen](screenshots/phase-e/before-mobile-ticket.png) · [Export](screenshots/phase-e/before-mobile-export.png) | [On screen](screenshots/phase-e/after-mobile-ticket.png) · [Export](screenshots/phase-e/after-mobile-export.png) |
| Desktop protected ticket | [On screen](screenshots/phase-e/before-desktop-ticket.png) | [On screen](screenshots/phase-e/after-desktop-ticket.png) |

The same simulated, partial Tipsy ticket with an alcohol log produced byte-identical visible text, ticket screenshot and 1080 × 2094 downloaded PNG on each viewport across revisions. The ticket screenshots were 332 × 924 on mobile and 382 × 840 on desktop. The PNG used the default private export choices. The four animated preview verdicts also produced identical ticket pixels at 320, 1100 and 1800 ms on mobile. These comparisons cover those fixtures and instants. Source comparison separately covers all original joke strings, stamp content, typography, mascot animations, provenance, alcohol safety and export options.

## Repeat the comparison

Run `npm run check` and `npm run build`. Serve the original and candidate production builds on separate loopback ports with paid commentary disabled, no API key and no Redis. The following uses ports 4387 and 4386 respectively. A system install of Playwright and Chromium is required for the browser scripts.

~~~sh
export CHROMIUM_PATH=/usr/bin/chromium
export KACHKA_REFERENCE_ORIGIN=http://127.0.0.1:4387
export KACHKA_TEST_ORIGIN=http://127.0.0.1:4386
KACHKA_TEST_ORIGIN="$KACHKA_REFERENCE_ORIGIN" node scripts/browser-checks/creative.cjs before /tmp/kachka-e
node scripts/browser-checks/creative.cjs after /tmp/kachka-e
node scripts/browser-checks/creative-motion.cjs /tmp/kachka-e
node scripts/browser-checks/extra.cjs
node scripts/browser-checks/flows.cjs
python scripts/browser-checks/pulse.py
~~~

The creative runner asserts native touch and keyboard advances, wraparound, reduced motion, curve and readout changes, a fixed scenario band, default on reload and identical receipt artifacts. The motion runner exercises interrupted feeds, repeated presses, frozen/resumed lifecycle, browser back, six route re-entries, immediate Start, 280–640 px resizing and missing fonts. The 320 px extra suite covers narrow layouts, PNG saving, simulated system sharing, room consent on blocked storage, and CSP. A desktop hit-test initially found the projected scene could intercept a click meant for Feed paper. Removing the decorative stage from pointer hit testing fixed the issue, and the final two-viewport run passed.

## Verification results and release decision

| Check | Observed result |
| --- | --- |
| `npm run check` | TypeScript passed. All 686 Vitest tests in 49 files passed. |
| `npm run build` | Vite client and bundled Node server succeeded. Existing chunk-size warning remains. |
| `creative.cjs` and `creative-motion.cjs` | Both viewport comparisons, protected artifacts, 12 animated verdict frames and lifecycle cases passed. |
| `extra.cjs` | 18/18 passed, including a downloaded PNG and synthetic Web Share file handoff. |
| `flows.cjs` | The combined run passed the 11 example checks, then timed out waiting for **Use this reading** in synthetic Stand Still. The clean PR #60 build also timed out at this control. The feature branch personal section subsequently passed 15/15. |
| Remaining named flow sections | Reduced 3/3, migration 3/3, privacy 16/16, caffeine 16/16, lapses 2/2. The reduced-flow fixture initially supplied a historical standing baseline while expecting the current protocol's Start button. Specifying protocol version 2 in that fixture exercised the intended missing-sensor path. Runtime compatibility rules were preserved. |
| `pulse.py` | Permission rejection, late cancellation cleanup, navigation cleanup and synthetic 72 bpm contact video passed. |

Ready for draft review. Confirm PR CI and review both viewports before authorising a merge. There is no production configuration, data migration or new paid service. Merging to main requests Dokploy deployment after CI. Reverting the frontend or redeploying PR #60 restores the previous views against the same records.

The synthetic motion timeout remains intermittent. Retain the physical-phone Stand Still and camera pulse pilot, native share sheet, VoiceOver/TalkBack and low-end mobile frame pacing on the release checklist. A larger 3D exhibit, scroll choreography and new sound are deferred. Phase F can scope social participation, consent and deletion. Phase G covers commercial release readiness, accessibility, performance, support and operational checks.
