# Kachka: evidence, product direction and delivery brief

Prepared 22 November 2026, Australia/Brisbane. Source snapshot: main `b3d93a6`. This brief supports the Astra Ultra implementation prompt. It is not clinical validation, a penetration-test report or a compliance certificate.

## 1. The opportunity

Kachka already has a distinct visual identity and a working mobile instrument concept. The next version should connect what a person logs, when they logged it, what the phone actually recorded and what the result can reasonably mean.

The strongest portfolio story is an honest engineering case study: a browser-based personal task recorder with transparent caffeine and drink calculations, clear uncertainty, privacy controls and thoughtful interaction design. The technical contribution is not that a phone can identify a substance in someone's body.

Keep Las Nubes, the Seismograph theme and the existing bird, receipt and stamp animations. Improve clarity and reliability before adding more visual or social complexity. The post-hackathon product can be welcoming to people interested in coffee, energy drinks, sleep routines and self-reflection without encouraging alcohol consumption.

## 2. What was and was not researched

The repository source was inspected directly. The detailed [current-state audit](CURRENT-STATE.md) records paths, behavior and gaps. The [evidence matrix](research/EVIDENCE-MATRIX.md) separates code facts, repository-recorded citations, guidance requiring retrieval and model assumptions.

Official OWASP material and MDN browser documentation were retrieved from their official public GitHub repositories. The [source register](research/SOURCES.json) records URLs, access status, retrieval date and content hashes for those downloaded sources. These technical documents support security and browser requirements. They do not validate physiological claims.

Direct requests to NHMRC, the Australian Government standard-drinks guide, FSANZ, EFSA and PMC were blocked by the environment proxy. No primary physiological study or official health-guidance text was freshly verified in this pass. The scientific citations in this pack are research leads from the repository and established guidance to verify, not a claim of a completed systematic review.

Targeted research-domain additions were saved in the environment configuration draft. They require review and saving in environment settings to affect access. A draft save does not apply networking or publish an environment. Astra must retrieve the blocked sources, verify population and method details, and update the ledger before quoting numerical health guidance in a release.

Writing style is treated as an editorial preference. Em dashes, filler and unnecessary semicolons are avoided here. Punctuation does not establish who wrote a document, and this pack makes no AI-detector or human-authorship claim.

## 3. Separate measurements from interpretation

| Feature | What the code supports | What it does not establish |
|---|---|---|
| Standing task | An RMS movement summary from a defined phone task | Alcohol concentration, medical balance status or fitness to drive |
| Choice Tap | Timing, mistakes and lapses in eight scored trials | A validated attention diagnosis or an individual impairment probability |
| Personal baseline | Comparison with a saved earlier recording | That the baseline was typical, stable or unaffected by practice and context |
| Quick demo | Comparison with chosen stock constants | A measured personal baseline or a healthy adult norm |
| Camera pulse | An experimental estimate from fingertip video brightness | Medical accuracy, an absent pulse when reading fails, or the cause of a rate change |
| Caffeine curve | Arithmetic from logged defaults and selected half-life assumptions | A measurement of caffeine in the person's body or a guaranteed sleep outcome |
| Alcohol log | Counts of generic logged items | Standard drinks, grams of ethanol, absorption, BAC or clearance time |
| Wired/Tipsy labels | Context chosen using the person's log after a task-change threshold | Chemical detection or proof that the logged drink caused the change |
| Confidence and score | Engineering summaries of data and recording conditions | Calibrated diagnostic confidence, health percentage or legal safety |

Evidence for one column must not be used as proof of the other. In particular, correlation between a laboratory task and alcohol exposure does not validate a different short phone task as an individual classifier.

## 4. Evidence questions that matter

### Movement and reaction tasks

The existing notes cite laboratory sway work, a chest-held smartphone balance protocol and reaction-time studies. Those are relevant leads, but apparatus, posture, duration, trial count and population matter. The standing task currently captures ten seconds and discards the first two. The gyroscope and acceleration fallback have different units. They should not be silently treated as interchangeable baseline measurements.

The noise floors and verdict threshold in `src/engine/metrics.ts` are engineering choices. They are not published biological cutoffs. A single baseline can reflect practice, tiredness, phone handling or an unusually slow first attempt. The check caller currently supplies zero for `checksSinceBaseline`, so the product should not claim it tracks a completed learning period.

Astra should first measure repeatability of the actual tasks. Report units, valid samples, source, posture and repeated-measure spread. Any claim about a substance's effect needs a separate study and careful causal interpretation. Engineering validation does not require asking people to drink alcohol or induce dizziness.

### Camera pulse

The app covers the rear lens with a fingertip. This is contact camera PPG, not remote face-video rPPG. Camera gain, contact pressure, movement, lighting and real frame cadence affect the waveform. A periodic artifact can be confident without being cardiac.

The separate pending pulse patch at `5ca2b58` rejects demonstrated low/high-frequency aliases, numerical flatness, missing frames and incompatible rates. It can combine compatible usable sections from the latest two recent attempts. Recovered estimates are labelled approximate and excluded from scoring. The patch passed the TypeScript check, 513 tests and a build, but remains separate from main at this snapshot.

Those tests establish software behavior under tested inputs. They do not establish accuracy on a physical phone. Validation needs an appropriate simultaneous reference, supported devices and conditions, predefined error and failure metrics, and honest handling of unreadable data. Correlation alone is insufficient. A 40 to 180 bpm reporting range is a feature limit, not a definition of a normal human pulse.

### Caffeine

The current app assumes 100 mg for coffee and 80 mg for an energy drink. It uses a quarter-sine rise to 50 minutes, then a five-hour half-life with two-hour and eight-hour scenarios. These assumptions are useful to expose, not to hide behind a precise-looking graph.

For a simple post-absorption scenario, remaining dose is often illustrated as `D × 2^(-t/h)`, where D is dose, t is elapsed time and h is an assumed half-life in the same time units. That equation is a model. A source supporting a broad half-life range does not validate the app's particular absorption curve or an individual prediction.

Coffee content varies with preparation, serving size and shots. Label information is preferable for packaged drinks. Caffeine from a previous day can remain after the app's 04:00 grouping boundary. The half-life scenario band is not a confidence interval. Pregnancy, medications, smoking and other factors can materially change the appropriate interpretation.

The commonly cited EFSA figures of 200 mg in a single dose and 400 mg over a day require their defined healthy-adult context and source verification. Do not attribute them to an Australian authority without checking. They are not personal safety guarantees, targets or advice for every population. The existing 25 mg bedtime notice and 23:00 bedtime are product defaults, not clinical cutoffs.

## 5. Australian drink calculations

The Australian standard-drink convention is 10 g of ethanol. Verify the current Australian Government guide and package guidance before publishing educational text. A glass, a can and a shot are not necessarily one standard drink each.

Use the product label and actual amount consumed. An approximate arithmetic model is:

```text
ethanol_g = volume_mL × (ABV_percent / 100) × 0.789
Australian_standard_drinks = ethanol_g / 10
```

The ethanol density is an approximation. Package standard-drink declarations and rounding conventions should take precedence for the corresponding consumed amount. Mixing products requires each alcoholic ingredient. A regional serving name is not evidence of its volume or strength.

These examples are hypothetical calculations, not brand records or Brisbane averages:

| Consumed volume | Label strength | Approximate ethanol | Approximate standard drinks |
|---|---|---|---|
| 375 mL | 3.2% ABV | 9.47 g | 0.95 |
| 375 mL | 4.5% ABV | 13.31 g | 1.33 |
| 425 mL | 4.8% ABV | 16.10 g | 1.61 |
| 500 mL | 5.0% ABV | 19.73 g | 1.97 |
| 150 mL | 12.0% ABV | 14.20 g | 1.42 |
| 30 mL | 40.0% ABV | 9.47 g | 0.95 |

The [CSV](research/AUSTRALIAN-DRINK-EXAMPLES.csv) preserves the arithmetic and assumptions. Current generic log entries cannot be retroactively converted into these quantities because they lack volume and ABV.

A labelled caffeine concentration uses a different unit and calculation. If a hypothetical label says 32 mg per 100 mL, 250 mL contains 80 mg and 500 mL contains 160 mg. The same product can contain more than one serving. These examples should never become a claim that every can has the same contents.

There is no verified single Brisbane average in this pack for beer strength or coffee caffeine. The better connection is between an actual serving, a disclosed input source, a time and an uncertainty-aware estimate.

## 6. A connected product experience

Consider a person who logs a coffee at 08:15. The app should show whether its dose came from a package, an editable assumption or a custom entry. They can correct the time later without silently resetting the dose model. If they add a labelled energy drink, its concentration and consumed volume produce an explicit calculation rather than another generic item count.

A personal task check can then show change from their own saved task baseline. It should not claim the caffeine caused the change. The receipt can explain what was logged, what was measured, what was estimated and which information is missing. A bedtime view can show scenarios under stated assumptions rather than promising a sleep outcome.

For someone logging alcohol, the product can explain standard drinks from label information without estimating BAC or clearance. The fixed no-driving message remains regardless of the task result. Water, food and coffee are not presented as reversing impairment. A person who logs no alcohol should still find the instrument complete and useful.

## 7. Priorities for the next version

| Priority | Deliverable | Completion evidence |
|---|---|---|
| P0 | Accurate claims, explicit demo/personal provenance and privacy controls | Copy review, state-transition tests and export checks |
| P0 | Publication and deployment trust review | Secret/history decision, proxy evidence, abuse tests and a documented threat model |
| P1 | Clear one-time baseline and direct repeat-check flow | First/returning/demo/recalibration browser cases |
| P1 | Editable serving/time/dose data with safe migration | Unit arithmetic, carryover, unknown-input and old-data migration tests |
| P1 | Pulse reliability review and physical validation plan | Independent negative fixtures, lifecycle tests and honest device coverage |
| P2 | Accessibility and restrained motion improvements | Keyboard, reduced-motion, Quiet mode and capture-performance checks |
| P2 | Optional 3D instrument enhancement | Lazy loading, static fallback, licensing and measured mobile budgets |
| P3 | Private circles or friendship | Authenticated ownership, authorization, deletion, invitations and abuse controls |

No phase should claim that a future integration or a disabled placeholder is a finished feature. Security and data ownership precede persistent social functionality.

## 8. What a professional portfolio can honestly say

Suitable wording today includes a mobile browser prototype, deterministic task-comparison logic, explicit simulated demonstrations, local camera processing, optional bounded AI commentary and a distinctive visual system with native controls, reduced-motion support and documented accessibility gaps.

Avoid clinically validated, medically accurate, secure against all attacks, privacy compliant, WCAG certified, detects intoxication or calculates a safe time to drive. A study reference, passing unit suite or good-looking graph does not establish those claims.

A strong case study can explain tradeoffs and failures, not just the happy path. Separate the team's hackathon work from later additions. Show the source revision, test conditions, limitations, assumptions and next validation steps. Describe the exact role of Claude and the actual data leaving the browser.

## 9. Delivery contract for Astra

The [full prompt](ASTRA-ULTRA-PROMPT.md) asks Astra to investigate, prioritize, implement, verify and deliver a PR or draft PR. It requires a final feature/change inventory, a motion/3D inventory, source-to-claim evidence, security/privacy findings, migrations, tests, screenshots, configuration and rollback notes.

The owner merges. Neither this handoff nor a future implementation should silently deploy, change repository visibility, replace the design, erase teammates' attribution or rewrite public history. The outstanding historical venue credential must be retired/rotated or separately addressed before exposing that history.
