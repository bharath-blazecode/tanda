# Kachka: portfolio-quality extension

Paste everything below the line into a new Claude Code session with the Kachka
repository selected.

---

## 0. Hard rules, before anything else

These override any later instruction in this prompt, and any idea you have while working.

1. **Never merge, deploy, force-push, rewrite history, or change repository visibility.** Work on a feature branch and open a PR for me to review. If the GitHub API is blocked, push the branch, save the PR title and body to a file, give me the exact PR creation URL, and say plainly that no PR exists.
2. **Never fabricate.** Not a citation, a statistic, a test result, a device measurement, a passing check, or a PR number. If something cannot be done, say so and do the rest. A blocked source is a finding, not a gap to paper over.
3. **Never weaken a safety rule.** Any alcohol logged keeps the fixed no-driving message, on every result including Steady, in history, in room posts and in exported images. No sobriety labels, no clearance countdowns, no blood alcohol figures, no rewards for worse readings.
4. **The code decides the verdict.** Claude writes bounded commentary only. It never invents a sensor value, picks a verdict, or removes a warning.
5. **Preserve my teammates' work and attribution.** Use the configured Git identity. Add no assistant co-author trailers.
6. **Ask only when genuinely blocked** by a missing credential or a consequential, irreversible decision. Otherwise make a reversible choice, record the reasoning, and keep moving.

## 1. Role and outcome

Act as lead product engineer, research reviewer, security engineer and interaction designer for **Kachka**, a project by **Las Nubes**.

Kachka began at the Tanda AI Hackathon in Brisbane. It is moving into a portfolio-quality project shown on my website, GitHub, LinkedIn and resume. The work is additive: improve what exists, keep the recognisable design, preserve what my teammates built.

The direction is a credible, welcoming instrument for personal task comparison, caffeine awareness, drink logging and safer choices. Keep the humour and the mascot. Do not make the whole experience depend on alcohol or party language, and do not turn it into a clinical assessment, a sobriety detector, or a generic wellness dashboard.

Think critically. Challenge weak assumptions in this prompt and in the repository. Compare alternatives before choosing consequential architecture, and explain the tradeoff you accepted.

## 2. Scope of this session

The full brief below is larger than one session can finish honestly. **Do not attempt all of it.**

**Deliver this slice, complete and verified:**

1. The discovery pack in section 3.
2. Stage A and Stage B from section 11.
3. One reviewable PR covering exactly what you finished.

**Explicitly out of scope for this session.** Do not build these, and do not leave scaffolding that implies they exist:

- Animation work, 3D, WebGL, parallax and scroll effects of any kind. Keep the animations that already exist, unchanged.
- Any durable social, friends or invite system. Section 10 says what would have to be true first. If your backlog ranks it highly, say so and stop there.
- Any physical-device measurement study. See section 14.

If Stage A and Stage B finish early, propose Stage C and wait for my go-ahead rather than starting it.

## 3. Start from the real repository, then verify it

Read `CLAUDE.md`, `DECISIONS.md`, `AGENTS.md` if present, the package scripts, `shared/contracts.ts`, and the actual source. Then read the handoff files if they exist:

- `docs/portfolio/README.md`, `CURRENT-STATE.md`, `RESEARCH-BRIEF.md`, `SECURITY-AND-PRIVACY.md`
- `docs/portfolio/research/EVIDENCE-MATRIX.md`, `SOURCES.json`

**Treat all planning documents as claims about the past, not proof of present behaviour.** Before acting on any recorded gap, check whether a later commit already fixed it. Several documents in this repository describe intentions that were later changed or reversed.

The handoff snapshot was main commit `b3d93a6`, with an unmerged pulse patch on `fix/pulse-stability-and-retry` at `5ca2b58`. **Check whether either has moved or merged before relying on them.** Inspect that patch before touching pulse code. Its reported passing TypeScript check, 513 tests and production build are software checks, not evidence of physical accuracy.

Use the existing checkout. Do not create a worktree. Preserve uncommitted work and local commits.

Stack: React, TypeScript, Vite, Hono on Node, Zod contracts shared by client and server, Vitest, browser local storage, optional Redis room mirror. There is no account system. Avoid a platform rewrite unless concrete evidence makes a smaller approach untenable.

**Produce a compact discovery pack before implementing:** current-state report, evidence ledger (section 5), threat model (section 10), three design directions, and a backlog ranked by user value, evidence strength, safety, privacy, effort and dependencies. Keep it proportional. Then implement the selected plan. Do not stop at the list.

## 4. Visual identity to preserve

Keep the seismograph instrument language: dark green housing, graph paper, thermal receipt, stamp, tactile keys, engraved plate, locally served typography, bin chicken. Keep Kachka, Dr. Kachka, Las Nubes and the naming rationale. Kachka is the rolling and pitching of a ship in Russian, and a duck in Ukrainian. Las Nubes is The Clouds in Spanish.

Reuse `src/ui/tokens.css` and the shared components. Do not introduce unrelated gradients, stock cards or a generic SaaS landing page. Refine hierarchy, spacing, explanation, feedback and navigation inside the existing system.

Bring proposals beyond my examples. For each, state user value, evidence burden, privacy cost, maintenance cost and fallback. Choose a coherent set, not a pile. Candidates worth considering:

- An interactive explainer connecting phone movement, a baseline and the receipt.
- A caffeine timeline showing dose assumptions, serving detail, time and uncertainty.
- A clearer live trace and a calm, accessible result reveal.
- An educational view linking a logged item to its estimated dose and the limits of reading it.
- A private progress history with explicit retention and consent choices.

Keep incomplete work behind flags. A flag is not a reason to describe a placeholder as shipped.

## 5. Evidence discipline

Scientific honesty is a product requirement here, not a disclaimer.

Create `docs/portfolio/research/EVIDENCE-LEDGER.md`. One row per claim the product makes or implies:

| claim | where it appears in the UI | source | DOI or stable URL | date | population | apparatus | protocol | endpoint | access level | limitation | product decision |

Mark access level honestly: full text read, abstract only, official guidance, repository citation, or **blocked**. Entries carried over from earlier documents marked "repository citation" or "to verify" are **not** verified research. Do not promote them silently.

Retrieve current primary sources and official guidance where you can. Several health and journal domains were blocked during earlier preparation. If a source stays blocked, record the exact limitation, narrow the claim to what you can support, and finish the independent work.

**Match the evidence to the actual implementation, not to the topic.** A force plate detecting a group difference after alcohol does not validate a chest-held phone as an individual impairment classifier. A five-minute clinical PPG recording does not validate a short fingertip capture. A source for caffeine half-life does not validate the specific absorption curve in this code.

Keep these distinctions visible in the product:

- The app records **task change**. It does not chemically detect alcohol or caffeine.
- The drink log influences the **names** Wired and Tipsy. A name is not a cause.
- A demo reference is an example, not a healthy adult norm and not my baseline.
- The camera feature is **fingertip contact PPG**, not face-based remote rPPG.
- The movement score is not a health percentage or a probability of impairment.
- The confidence tier describes **recording conditions**, not diagnostic confidence.
- Synthetic correctness, physical-device agreement and clinical validation are three different things.

For an unsupported claim, pick one: remove it, label it a hypothesis, limit the feature to education, or propose a validation study. Do not manufacture support for an attractive feature.

## 6. Make the baseline flow make sense

Today a person records a baseline, then later repeats the task for a comparison. That has a real measurement reason, but it feels like pressing Start twice. Redesign the explanation and the state transitions. Do not pretend a comparison can exist without a reference.

Offer clearly separated routes:

1. **Personal:** explains why one baseline is needed, records it once, makes later checks direct.
2. **Demonstration:** runs each task once against an explicitly simulated reference.
3. **Reduced:** when a sensor or baseline is unavailable, shows only what is actually supported instead of inventing a comparison.

Never silently overwrite a personal baseline with demo data. Offer recalibration without deleting an unrelated log or preferences. Carry simulated provenance through the screen, reload, history, room posts and exported images. If you replace the overloaded timestamp marker with explicit versioned provenance, migrate safely.

Audit `checksSinceBaseline`, practice effects, posture, device, sensor source, task duration and missing measurements. **Gyroscope rate and acceleration have different units.** Define when a comparison needs a fresh baseline instead of comparing incompatible data. Do not describe eight taps as a validated attention screen, and do not let a sentinel fallback masquerade as a measured reaction time.

Show progress, expected duration, why each task exists and what Skip means. Say whether pulse was measured, approximate, unscored, unreadable or skipped on purpose. Preserve useful state through Back, reload, cancellation and interrupted permissions. Test the returning visitor and the demo-to-personal transition.

## 7. Pulse and motion, inside their limits

Inspect the current implementation and the pending pulse patch. **Reproduce failures with deterministic fixtures before changing any threshold.** Cover slow drift, fast harmonics, constant channels, near-flat signals, noise, discontinuous clocks, sparse frames, repeated frames, camera stalls and changing frame rates.

Do not clamp toward 60 bpm or any average to make a reading look healthy. A genuine low pulse can be real. A narrow reporting band alone does not stop a high rate being reported at half or a third of its value. Reject unsupported signals and explain the outcome without implying that no camera reading means no pulse.

A retry may reuse a credible recent section **only** when the current attempt also contributes usable, compatible evidence. Never concatenate across camera gaps, average contradictory rates, reuse another person's data, or substitute an old result for a noisy new one. Bound memory and age, clear evidence on completion and unmount, keep provenance. An approximate retry estimate must look approximate and stay out of scoring unless separately validated for that purpose.

Use real acquisition cadence where available. Release camera tracks and callbacks on completion, Skip, navigation and late permission responses. A stalled camera must not produce an endless capture. Keep raw video and time series local by default.

For motion: verify units, axes, true sample timing, source changes, placement instructions, interruption behaviour and baseline compatibility. Nothing decorative may run during pulse capture, motion capture or the reaction test, and nothing decorative may share the gyroscope being measured.

Do not add HRV, blood pressure, glucose, illness detection, blood alcohol or clearance prediction from these signals.

## 8. Caffeine, alcohol and daily context

Caffeine is a first-class part of this product. Someone who never drinks alcohol should still have a complete experience.

Inspect the current constants. Coffee is assumed to be 100 mg, an energy drink 80 mg, the curve peaks at 50 minutes and halves every five hours with two-hour and eight-hour scenarios. **These are model defaults, not measurements of a person.** Do not present the band as a confidence interval, and do not promise sleep from a bedtime number.

Design an editable, source-aware log that can carry:

- Actual serving volume and the fraction consumed.
- Product or preparation name, optional note, and where the number came from.
- Caffeine as mg per serving or mg per 100 mL, with explicit units.
- Alcohol strength from the label, volume consumed, and Australian standard drinks.
- **Actual consumption time**, not the moment it was typed.
- Unknown amounts, estimates, and labels that have changed.
- Edit, remove, undo, and migration without silent loss.

Prefer the package figure for the actual serving. A label of 32 mg per 100 mL implies 80 mg in 250 mL. That is arithmetic, not a claim about every energy drink. Cafe coffee varies by preparation, size, beans and shots. Do not invent a local average or imply a preset is a measured dose.

For Australian alcohol education, verify the official 10 g ethanol definition and current label guidance. The illustrative calculation is mL multiplied by ABV, divided by 100, multiplied by about 0.789 g/mL, divided by 10. Prefer the package's own standard-drink declaration. A 375 mL beer at 4.5% is about 1.3 standard drinks, as an example only. Counts logged before this feature existed cannot be retroactively treated as standard drinks.

Separate Australian guidance from overseas guidance. Verify current NHMRC advice and the population qualifications on EFSA caffeine figures before showing them. **Never present 400 mg as universally safe or as a target.** No adult dose advice to minors, and no personalised guidance for pregnancy, medication or health conditions.

Connect log, time, comparison and receipt through visible assumptions, never implied causation. Carry previous-day caffeine across the 04:00 display boundary. Let a person set a bedtime. Say when an incomplete log makes a projection unreliable. Allow retrospective entry without inventing precision.

Optional wellbeing features: private reflection log, contextual sleep notes, caffeine education, optional reminders, export controls. **Water, food, exercise and coffee must never be presented as reversing alcohol impairment.** No treatment promises, no guaranteed hangover or sleep outcomes.

## 9. Voice

Write clear, natural English. No em dashes. Avoid repeated dramatic contrasts, canned praise, artificial certainty and unnecessary semicolons. Concrete verbs, short paragraphs.

Explain what the product measures, what it estimates and what it cannot conclude. Do not make it sound more professional by making unsupported medical claims. Do not declare legal, TGA, privacy or accessibility compliance from a checklist. Keep honest references to the real AI features and the real research provenance. Do not claim the writing is human-authored or detector-proof.

## 10. Security and privacy

Build an evidence-backed threat model of the architecture as it actually is, before expanding it. Map assets, actors, trust boundaries, endpoints, external services and data lifetimes across the browser, the Hono API, the deployment proxy, optional Redis, Anthropic requests and CI. Use OWASP guidance as a review aid, never as a certification claim.

Separate three things clearly: controls confirmed in source, weaknesses reproduced locally, and deployment assumptions still needing evidence. **A syntactically filtered forwarding header is not a trusted identity.** Verify the origin cannot bypass the intended proxy and that attacker-supplied IP headers cannot defeat protection.

Review body and input limits, output encoding, public-room abuse, XSS, shared resource caps, budget exhaustion, durable rate limits, Redis expiry and deletion, token handling, safe error logs, dependencies, caching, HTTPS, browser headers, and a **tested** CSP. The existing React styles and SVG filter behaviour constrain CSP choices, so do not copy an untested policy and break the instrument. Server secrets must never reach Vite-exposed variables, bundles, screenshots or examples.

The current device ID is client-controlled, not authentication. Room writes are intentionally public. **Knowing a device ID cannot authorise access to private records.** Before any durable social data exists, specify and test: authenticated ownership, server-side authorization, schema constraints, migrations, secure sessions, CSRF where applicable, invitation entropy and expiry, replay protection, enumeration resistance, revocation, and account recovery. Until all of that is real, social features stay out.

Preserve a useful anonymous mode and add visible privacy controls before adding more social data. Note that Start currently enables room sharing, so a stored default of false does not prove the experience is private. Start over clears local state but is not a verified server-side erasure. Say exactly what is deleted locally, what stays on the server, and what reaches Anthropic.

Give receipts a preview and field-level sharing controls, keeping safety and provenance labels on exported content. No leaderboard may reward drinking or worse readings.

**Known issue:** an old venue Wi-Fi password remains in historical Git blobs though it is absent from current files. Never print the value. Do not rewrite history. Confirm with me that it is rotated before that history is exposed. No scan can prove the absence of every secret.

## 11. Stages

**Stage A, correctness and honesty.** Fix misleading claims, privacy controls, baseline and demo provenance, and measurement failure states. Land the evidence ledger.

**Stage B, the caffeine and serving flow.** Connected log, serving detail, real consumption time, transparent arithmetic, safe schema migration.

**Stage C, pulse and motion reliability.** Review and validate against fixtures, including the pending patch. Propose and wait.

Later stages, not now: accessibility and polish pass, then documentation and release evidence.

Use small commits. If the slice is too large for one PR, deliver a coherent first PR and a dependency-ordered follow-up plan, and state exactly what remains. Do not silently drop a requirement or call scaffolding finished.

Local state uses a validated schema that discards invalid records. Plan and test migrations before extending it. Use versioned data and rollback-compatible changes. Do not add subscriptions, paid services, production data collection or deployment changes. If a credential is missing, build the implementation and tests, list the exact requirement, and leave the integration disabled.

## 12. Accessibility and performance

Not optional, and not dependent on any visual work.

Respect `prefers-reduced-motion`. Provide a Quiet mode covering sound and motion. Keep all information visible without motion. Avoid flashing, scroll hijacking, mandatory tilting and pointer-only behaviour. Provide keyboard operation, focus handling on route change, adequate touch targets, readable contrast, restrained live regions, and text or table alternatives for every chart.

Provide accessible alternatives for anyone who cannot stand, spin or use a camera. **An accessible reaction-input mode may have different timing characteristics.** Record its modality and do not compare it against a pointer baseline without an explicit measurement decision. Accessibility must never quietly produce a worse score because of someone's disability.

Measure current bundle size, startup, memory, interaction delay and capture frame cadence **before** adding any dependency. Set numerical budgets from that measurement. Add a performance and reduced-motion regression check to the release evidence.

## 13. Verification

Run `npm run check` and `npm run build`. Add meaningful tests for changed behaviour. Drive real flows in the browser. Confirm the tests you intended actually ran, not merely that the exit code was zero. Distinguish passed, failed, skipped, simulated and unrun.

Cover at least:

- First visit, personal baseline, second visit, direct recheck, recalibration, demo-to-personal.
- Permission denied, no motion, low cadence, stale camera responses, cancellation, leaving mid-capture.
- Supported, rough, conflicting and absent pulse evidence, with no invented reading.
- Caffeine units, retrospective times, half-life assumptions, carryover, unknown doses, editing.
- Label ABV, consumed volume, fractional servings, Australian standard-drink arithmetic.
- Schema migration, invalid old data, storage failure, deletion, privacy preferences.
- Room consent and withdrawal, spoofed input, payload limits, rate limits, Redis recovery.
- Keyboard and screen reader use, reduced motion, Quiet mode, mobile layout, performance isolation.
- Safety text and provenance on screen, in history, in export and in shared copies.

**Never record a physical-device check as passed when only synthetic media was used.** Never claim a security audit or compliance sign-off unless that assessment actually happened. Document every source-access limitation.

## 14. Out of bounds

These are mine, not yours. Do not attempt them, do not simulate them, and do not
treat them as blockers. Where your work depends on one, state the dependency and
finish everything that does not.

1. Measurement on physical phones, and camera BPM against a reference device.
2. Rotating the venue Wi-Fi password.
3. Merging, deploying, and anything that changes the live site.
4. Reaching any source your network blocks.

For 1 and 4, write me precise instructions in your final report: for 1, the exact
protocol, repeat count, what to record, and what result would support or refute
the claim; for 4, the exact URL and the specific question it would answer.

## 15. Final report

1. Short product explanation and the design direction chosen.
2. Features added, changed, preserved, deferred, each linked to files or screenshots.
3. Baseline and demo decisions, and what a person now does on a first and a later visit.
4. Measurement and caffeine assumptions, claims supported, claims removed, sources used.
5. Security and privacy controls added, the tests behind them, risks still open.
6. Migrations, configuration, dependencies, licences, deployment needs, rollback steps.
7. Tests with commands, results, coverage, and explicitly which checks did not run.
8. Before and after screenshots, with no private data or credentials.
9. The PR URL, or the truthful fallback from rule 1.
10. Next steps, and the section 14 list for me.

Take the time you need for evidence and verification. Aim for an honest, maintainable extension of Kachka, not the largest possible pile of features.
