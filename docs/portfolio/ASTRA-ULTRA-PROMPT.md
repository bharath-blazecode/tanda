# Astra Ultra implementation prompt

Copy this entire document into Astra Ultra with the repository attached. Select the deepest available reasoning setting in the client. The request is for careful engineering, evidence and creative product work. It is not a request to invent scientific certainty or to publish unfinished features.

## 1. Your role and the outcome

Act as the lead product engineer, critical research reviewer, security engineer and interaction designer for **Kachka**, a project by **Las Nubes**. Work through discovery, evidence review, implementation, testing, documentation and a reviewable pull request. Use specialist agents where available, then reconcile their findings yourself.

The repository is `bharath-blazecode/tanda`. This began at the Tanda AI Hackathon in Brisbane and is moving into a portfolio-quality project that I can demonstrate on my website, GitHub, LinkedIn and resume. Improve the existing product through additive work. Preserve my teammates' contributions and the recognizable design. I will review and merge the final PR.

The direction is a clear, useful instrument for personal task comparisons, caffeine awareness, drink logging and safer choices. It should feel credible and welcoming. Retain the humor and mascot without making the whole experience depend on alcohol or party language. Do not turn it into a clinical assessment, a sobriety detector or a generic wellness dashboard.

Think critically. Challenge weak assumptions in this prompt and in the repository. Compare alternatives before choosing consequential architecture. Make reasonable reversible choices and keep working. Ask only for a missing requirement, credential or consequential decision that cannot be inferred. Explain the decision, evidence and tradeoffs in your deliverables.

## 2. Start from the real repository

Read `AGENTS.md` if present, `CLAUDE.md`, the package scripts, contracts and the actual source. Read these handoff files:

- `docs/portfolio/README.md`
- `docs/portfolio/CURRENT-STATE.md`
- `docs/portfolio/RESEARCH-BRIEF.md`
- `docs/portfolio/research/EVIDENCE-MATRIX.md`
- `docs/portfolio/research/SOURCES.json`
- `docs/portfolio/SECURITY-AND-PRIVACY.md`

Treat historical planning documents as context rather than proof of shipped behavior. Verify whether later commits have already resolved a recorded gap. The companion memos describe the read-only preparation of this handoff. Their preparation-only instructions do not prohibit the future implementation requested here. Use their findings as background evidence, with this prompt and my latest instructions defining your task.

The handoff snapshot is main commit `b3d93a6`. A separate, unmerged pulse patch is on `fix/pulse-stability-and-retry`, commit `5ca2b58`. Inspect that patch before replacing pulse work. It has a passing TypeScript check, 513 unit/component tests across 42 files, and a passing production build. These are software checks, not evidence of clinical accuracy. Check whether it has since been merged. Preserve and review useful work rather than assuming it is already deployed or duplicating it.

Use the existing isolated checkout. Do not create a worktree unless I request one. Preserve uncommitted work and local-only commits. Work on a feature branch. Do not merge, deploy, change repository visibility, force-push or rewrite Git history without explicit authorization. Use the configured human Git identity and do not add assistant co-author trailers. Do not remove teammates from attribution.

The stack is React, TypeScript and Vite with a Hono Node server, Zod contracts, Vitest tests, local browser storage and an optional Redis room mirror. There is no existing durable account or friendship system. Avoid a platform rewrite unless concrete evidence makes a smaller approach untenable.

## 3. Preserve the visual identity

Keep the Seismograph instrument language, dark green housing, graph paper, thermal receipt, stamp, tactile keys, engraved plate, locally served typography and bin chicken. Keep Kachka, Dr. Kachka, Las Nubes and the naming rationale. Kachka refers to rolling and pitching in Russian and a duck in Ukrainian. Las Nubes means The Clouds in Spanish.

Reuse `src/ui/tokens.css`, the shared UI components and the existing result choreography. Do not replace them with unrelated gradients, stock cards or a generic SaaS landing page. Refine hierarchy, spacing, explanations, feedback and navigation within the same system.

Bring creative proposals beyond my examples. For each major idea, explain the user value, evidence burden, privacy cost, maintenance cost, performance cost and fallback. Select a coherent set rather than adding disconnected features. Useful candidates include:

- An interactive instrument explainer that connects phone movement, a baseline and the receipt.
- A caffeine timeline with dose assumptions, serving details, time and an uncertainty explanation.
- An optional 3D view of the existing housing or paper mechanism.
- A clearer live trace and a calm, accessible result reveal.
- An educational view linking a logged item to its estimated dose and the limits of interpretation.
- A private progress history with contextual notes, subject to explicit retention and consent choices.

Keep new capabilities behind sensible flags until complete. A flag is not a reason to claim a placeholder is shipped.

## 4. Scientific claims are a product requirement

Create a source-to-claim ledger. For each proposed claim, record the exact claim, source, DOI or stable URL, date, study population, apparatus, protocol, endpoint, access level, limitations and the product decision it supports. Distinguish full text from abstracts, official guidance, reviews, repository notes, code facts and model assumptions.

Retrieve current primary studies and official guidance where possible. Several health and journal domains were blocked during preparation of this handoff. Entries marked repository citation or guidance to verify are not newly verified research. Do not silently promote them into established facts. If access remains blocked, document the exact limitation, narrow the claim and finish independent work. Do not fabricate references, statistics, experiments or a successful literature search.

Evaluate the actual implemented durations and tasks. Evidence that a force plate detects a group difference after alcohol does not validate this chest-held phone task as an individual impairment classifier. Evidence for a different camera application or a five-minute recording does not validate this short fingertip recording. A source supporting caffeine half-life does not validate the exact absorption curve used here.

Keep these distinctions explicit:

- The app records task change. It does not chemically detect alcohol or caffeine.
- The drink log currently influences the names Wired and Tipsy. Those names do not prove a cause.
- A stock demo reference is an example, not a healthy adult norm or my personal baseline.
- The camera feature uses fingertip contact PPG. Do not conflate it with remote face-based rPPG.
- The movement score is not a health percentage or a probability of impairment.
- The confidence tier describes recording conditions. It is not calibrated diagnostic confidence.
- Synthetic correctness is different from physical-device agreement and different again from clinical validation.

For unsupported claims, choose one of four actions: remove the claim, label a hypothesis, limit the feature to education, or propose an appropriate validation study. Do not force scientific support for every attractive feature.

## 5. Make the baseline flow understandable

The current personal path asks a person to record a baseline and later repeat the task for a comparison. That has a measurement reason, but it feels like doing Start twice. Redesign the explanation and state transitions without pretending a comparison can exist without a reference.

Provide clearly separated choices:

1. A personal route that explains why one initial baseline is needed, records it once, and makes later checks direct.
2. A quick demonstration that runs each task once against an explicitly simulated reference.
3. A useful route when a sensor or baseline is unavailable, showing only supported measurements rather than inventing a comparison.

Do not silently overwrite a personal baseline with demo data. Offer recalibration without deleting the person's unrelated log and preferences. Preserve simulated provenance on screen, after reload, in history, in room posts and in exported images. Replace the overloaded timestamp marker with explicit versioned provenance if justified, with a safe migration.

Audit `checksSinceBaseline`, practice effects, posture, device, sensor source, task duration and missing measurements. Gyroscope rates and acceleration have different units. Define when comparisons need a fresh baseline rather than comparing incompatible data. Do not call eight taps a validated attention screen or use a sentinel fallback as if it were a measured reaction time.

Show progress, expected duration, why each task exists and what Skip means. Explain whether pulse is measured, approximate, unscored, unreadable or intentionally skipped. Preserve useful state through Back, reload, cancellation and interrupted permissions. Test returning visitors and demo-to-personal transitions.

## 6. Make pulse and motion trustworthy within their limits

Inspect the main implementation and the pending pulse patch. Reproduce failures with deterministic fixtures before changing thresholds. Verify slow drift, fast harmonics, constant channels, nearly flat signals, noise, discontinuous clocks, sparse frames, repeated video frames, camera stalls and changing rates.

Do not clamp a value to 60 bpm or another average to make it look healthy. A genuine supported low pulse can be real. A narrow reporting range alone does not prevent a high frequency being misreported at half or a third of its rate. Reject unsupported signals and explain the result without suggesting that an absent camera reading means an absent pulse.

Retries may reuse credible recent sections only when the current attempt also contributes usable, compatible evidence. Do not concatenate waveforms across camera gaps, average contradictory rates, reuse another person's data or replace a noisy current attempt with an old result. Bound memory and age, clear evidence on completion and unmount, and retain provenance. An approximate retry estimate must be visibly approximate and excluded from scoring unless independently validated for that purpose.

Use real acquisition cadence where available. Clean up camera tracks and callbacks on completion, Skip, navigation and late asynchronous permission responses. Ensure a stalled camera cannot leave an infinite capture. Keep raw video and time series local by default.

For motion, verify units, axes, actual sample timing, source changes, placement instructions, interruption behavior and baseline compatibility. A 3D animation must not contaminate capture timing. Compare repeated task readings on supported phones, including iOS Safari and Android Chrome. Use a suitable simultaneous reference for camera BPM. Record error, bias, agreement limits, failure rate and device conditions. Do not claim that a laptop fixture validates a physical phone.

Do not introduce HRV, blood pressure, glucose, illness detection, BAC or clearance prediction from these signals without a separate evidence and intended-purpose review.

## 7. Connect caffeine, alcohol and daily context

Caffeine should be a first-class part of the product, including coffee, tea where supported, energy drinks and custom labelled servings. A person who does not drink alcohol should still have a complete experience.

Inspect the current constants. Coffee is assumed to contain 100 mg and an energy drink 80 mg. The curve peaks at 50 minutes and then uses a five-hour half-life, with two-hour and eight-hour scenarios. These are defaults and model choices, not measurements of the person. Do not present the band as a confidence interval or guarantee sleep from a bedtime number.

Design an editable, source-aware log that can represent:

- Actual serving volume and fraction consumed.
- Product or preparation name, optional notes and input source.
- Caffeine in mg per serving or mg per 100 mL, with explicit units.
- Alcohol strength from the product label, consumed volume and Australian standard drinks.
- Actual consumption time, not just the moment the item was entered.
- Unknown amounts, estimates and labels that have changed.
- Edit, remove, undo and data migration without silent loss.

Prefer package information for the actual serving. A label stating 32 mg caffeine per 100 mL would imply 80 mg in 250 mL or 160 mg in 500 mL. These are arithmetic examples, not claims about every energy drink. Cafe coffee varies by preparation, size, beans and shots. Do not invent a Brisbane caffeine average or imply that a generic coffee preset is a measured dose.

For Australian alcohol education, verify the official 10 g ethanol definition and current label guidance. An illustrative calculation is volume in mL multiplied by ABV divided by 100, multiplied by approximately 0.789 g/mL, then divided by 10. Prefer the package's standard-drink declaration for the matching amount. A 375 mL beer labelled 4.5% ABV is about 1.3 Australian standard drinks. That is an example, not a regional average. Generic beverage counts cannot be retroactively treated as standard drinks.

Separate Australian guidance from overseas guidance. Verify the current NHMRC advice and the population qualifications of EFSA caffeine figures before displaying them. Do not present 400 mg as universally safe or as a target to consume. Do not provide adult dose advice to minors or personalized guidance for pregnancy, medication or health conditions without appropriate review.

Connect the log, time, task comparison and receipt using visible assumptions rather than implying causation. Carry previous-day caffeine forward across the 04:00 display boundary. Let a person choose a bedtime. Explain when an incomplete log makes a projection unreliable. Allow retrospective entry without creating false precision about past intake.

Possible wellbeing features include a private reflection log, contextual sleep notes, caffeine education, optional reminders and export controls. Keep them optional and evidence-aware. Water, food, exercise or coffee must not be presented as reversing alcohol impairment. Avoid treatment promises and guaranteed hangover or sleep outcomes.

## 8. Safety and professional communication

Retain deterministic safety rules. Claude may write bounded commentary. It must not decide the verdict, invent sensor values, remove safety messages or prescribe a course of treatment.

Any alcohol logged must keep the fixed no-driving message, including Steady results and exported receipts. Do not introduce sober labels, clearance countdowns, BAC numbers, drinking competitions or rewards for becoming more impaired. A normal-looking task result is not evidence that someone can drive.

Do not make the product more professional by making unsupported medical claims. Explain what it measures, what it estimates and what it cannot conclude. Review intended-purpose and Australian regulatory/privacy questions before adding healthcare marketing. Do not declare legal, TGA, privacy or accessibility compliance from a checklist alone.

Write clear, natural English. Avoid em dashes, repeated dramatic contrasts, canned praise, artificial certainty and unnecessary semicolons in prose. Use concrete verbs and short paragraphs. Keep honest references to actual AI features and research provenance. Typography does not establish human authorship, so do not claim that the work is human-written or guaranteed to pass an AI detector.

## 9. Security and privacy before expanded social features

Create an evidence-backed threat model of the actual architecture before expanding it. Map assets, actors, trust boundaries, endpoints, external services and data lifetimes. Inspect the browser, Hono API, deployment proxy, optional Redis, Anthropic requests and CI. Use applicable OWASP guidance as a review aid, not as a certification claim.

Distinguish source-confirmed controls, reproduced local weaknesses and deployment assumptions that still need evidence. Do not call a syntactically filtered forwarding header a trusted identity. Verify that the origin cannot bypass the intended proxy and that attacker-supplied IP headers cannot defeat protection.

Review input/body limits, output encoding, public-room abuse, XSS, shared resource caps, budget exhaustion, durable rate limits, Redis expiry/deletion, token handling, safe error logs, dependencies, cache behavior, HTTPS, relevant browser headers and a tested CSP. The existing React styles and SVG/filter behavior constrain CSP choices. Do not break the instrument by copying an untested policy. Server-side secrets must never enter Vite-exposed variables, browser bundles, screenshots or examples.

The current device ID is client-controlled, not account authentication. Room writes are intentionally public. Private friends' records cannot be authorized by knowing a device ID. Before durable social data, specify and test authenticated ownership, server-side authorization, schema constraints, migrations, secure sessions, CSRF where applicable, invitation entropy/expiry, replay protection, enumeration resistance, revocation and account recovery.

Private-by-default friendship or invite-only circles are optional feature candidates. Compare an expiring event circle with a durable friendship graph. Require explicit sharing audiences, consent, leave, block, report and revoke controls, minimal profile data and deletion/retention behavior. Do not upload contacts automatically or reveal drink history, raw sensors, location or precise routines to friends by default. Add moderation and abuse tests before enabling messaging or user-generated free text.

Preserve a useful anonymous mode. Add visible privacy controls before more social data. Starting currently enables room sharing, so a stored default of false does not prove the actual experience is private. Start over currently clears local state but is not a verified server-side erasure request. Explain exactly what is deleted locally, what remains on the server and what reaches Anthropic.

Give receipts a preview and field-level sharing controls. Keep safety and simulated/approximate labels on exported content. No public leaderboard should reward alcohol consumption or worse measurements.

Known publication concern: an old venue Wi-Fi password remains in historical Git blobs although absent from current documents. Confirm it is retired or rotated before exposing that history. Never print the value. Do not rewrite history automatically. Recheck publication scope, artifacts, workflow logs, private links and secrets before a release. No source scan can promise the absence of every possible secret.

## 10. Motion, 3D and accessibility

Keep existing animations. Add purposeful motion that helps explain state and the instrument. Consider key depth, paper mechanics, restrained screen transitions, a trace reveal, a timeline or an optional 3D housing model. Keep the bird's current character.

Choose CSS depth before adding a large rendering stack when it provides the same benefit. True WebGL should be lazy-loaded, optional and accompanied by a static equivalent. Handle unsupported hardware, context loss, slow networks, low-memory phones and hidden tabs. Respect licensing for every model, texture, font and audio asset.

Do not run decorative scenes during pulse capture, motion capture or the reaction test. Suspend loops when hidden. Do not bind decorative parallax to the same gyroscope used for measurement. A fake animated heartbeat must not be mistaken for a live measurement.

Respect `prefers-reduced-motion` and provide a Quiet mode covering sound and motion. Keep information visible without animation. Avoid flashing, scroll hijacking, mandatory tilting, pointer-only behavior and content that appears only after a long reveal. Provide keyboard operation, route-change focus, suitable touch targets, readable contrast, live-region restraint, chart text/table alternatives and accessible alternatives for people unable to stand, spin or use the camera.

An accessible reaction-input mode may have different timing properties. Record its modality and do not compare it with a pointer baseline without a measurement decision. Accessibility must not silently produce worse scores for a person's disability.

Measure the current bundle, startup, memory, interaction delay and capture frame cadence before adding dependencies. Set explicit numerical budgets from that baseline. Demonstrate that new animation does not reduce measurement quality on representative phones. Add a performance and reduced-motion regression check to the release evidence.

## 11. Implementation sequence and ownership

First produce a compact current-state report, evidence ledger, threat model, three design directions and a ranked backlog. Rank each item by user value, scientific support, safety, privacy, effort and dependencies. Keep this discovery proportional and then implement the selected plan. Do not stop at a list of suggestions.

Use a staged sequence:

1. Correct misleading claims, privacy controls, baseline/demo provenance and measurement failure states.
2. Build a connected caffeine/serving/time flow with safe schema migration and transparent arithmetic.
3. Review and validate pulse/motion reliability, including the existing pending patch.
4. Add restrained visual polish, accessibility improvements and optional 3D only after the core flow is reliable.
5. If selected in the ranked backlog, add a coherent social feature only after identity, authorization, deletion and abuse controls are ready. Otherwise explain the deferral and complete the selected prerequisites.
6. Finish portfolio documentation, deployment checks, demonstration assets and honest release notes.

Use small commits and reviewable PRs. If the full set is too large for one PR, deliver a coherent first slice and separate draft PRs or a dependency-ordered follow-up plan. State exactly what remains. Do not silently drop requirements or call scaffolding a finished capability.

Existing local state uses a validated schema that can discard invalid records. Plan and test migrations before expanding it. Use feature flags, versioned data and rollback-compatible changes. Do not add subscriptions, paid services, production data collection or deployment changes without the necessary configured resources and authority. If credentials are missing, prepare the implementation and tests, list the exact requirement and keep that integration disabled rather than inventing success.

## 12. Verification and final delivery

Run the relevant baseline checks, add meaningful tests for changed behavior, and run `npm run check` and `npm run build`. Use the browser for actual flows. Verify the selected tasks executed, not just a zero-test exit. Preserve command status and distinguish passed, failed, skipped, simulated and unrun checks.

At minimum, cover:

- First visit, personal baseline, second visit, direct recheck, recalibration and demo-to-personal transition.
- Permission denied, no motion, low cadence, stale camera responses, cancellation and leaving a capture.
- Supported, rough, conflicting and absent pulse evidence with no invented reading.
- Caffeine dose units, retrospective times, half-life assumptions, carryover, unknown doses and editing.
- Label-specific ABV, consumed volume, fractional servings and Australian standard-drink arithmetic.
- Safe schema migration, invalid old data, storage failure, deletion and privacy preferences.
- Room consent, withdrawal, spoofed input, payload limits, rate-limit/budget behavior and Redis recovery.
- Cross-account access, invite misuse, revoked membership and blocking if social features are added.
- Keyboard/screen-reader use, reduced motion, Quiet mode, mobile layouts and performance isolation.
- Safety text and simulated/approximate provenance in screen, history, export and shared copies.

Do not label physical-device checks as passed if only synthetic media was used. Do not claim a security audit or compliance sign-off unless the defined assessment was actually performed. Document source-access limitations and outstanding evidence.

Finish with a PR or draft PR for me to review. Never merge it yourself. If GitHub API access is blocked, push the authorized branch, provide the exact PR creation link, save the title/body and state that no PR has been opened. Do not invent a PR number or ask for a new token merely because a network destination is denied.

Your final report must include:

1. A short product explanation and the design direction selected.
2. Features added, changed, preserved and deferred, each linked to files or screenshots.
3. Every new or changed animation and 3D effect, including reduced-motion and static fallbacks.
4. The baseline/demo decisions and what users now do on first and later visits.
5. Measurement and caffeine assumptions, supported claims, unsupported claims removed and sources used.
6. Security/privacy controls added, tests supporting them and risks still unresolved.
7. Data migrations, configuration, dependencies, licenses, deployment requirements and rollback steps.
8. Tests with commands, results, device/browser coverage and explicit unrun checks.
9. Before/after screenshots or short demonstrations without private data or credentials.
10. The PR URL or truthful creation fallback, a concise reviewer-ready description and a next-step list.

Take the time needed for evidence, creative judgment and verification. Aim for an integrated, honest and maintainable extension of Kachka, not the largest possible collection of features.
