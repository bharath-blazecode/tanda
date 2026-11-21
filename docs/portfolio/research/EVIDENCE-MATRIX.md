# Kachka scientific evidence and claim-calibration memo

Prepared on 22 November 2026 (Australia/Brisbane) for an Astra Ultra research prompt and supporting PDF. This is a research memo, not a feature implementation or clinical validation report. The repository was read only. No code, documents or Git history were changed for this memo.

**Revision scope**: the handoff checkout is `docs/astra-ultra-portfolio-handoff` based on main at `b3d93a6`. The separate pulse stability and retry patch is commit `5ca2b58` on `fix/pulse-stability-and-retry`. It is pending work, not part of that main snapshot. The inspected engine, stock-baseline, standing-task and choice-task files do not differ between those two revisions. Pulse-specific behaviour must be attributed to the correct revision.

## Evidence status and access limits

The following labels distinguish what was actually established:

- **CODE**: directly inspected implementation or arithmetic derived from it.
- **REPO**: a citation or scientific interpretation recorded in `DECISIONS.md`, primarily its research table. The source text was not independently retrieved during this task.
- **GUIDANCE TO VERIFY**: established background guidance or a proposed authoritative source that Astra must retrieve and check for its current wording, date, population and jurisdiction before publication.
- **MODEL ASSUMPTION**: a design choice or illustrative parameter, not an empirically validated individual measurement.

No health or scientific primary source text was downloaded successfully for this memo. Direct curl requests to the Jongen article on PMC, the Australian Government standard-drinks guide, FSANZ caffeine guidance and the EFSA 2015 caffeine opinion all failed at the configured proxy with CONNECT 403 and HTTP status 000. The NHMRC request was also blocked. These are network-access failures, not evidence that a paper is unavailable or that a claim is false. No proxy restrictions or TLS checks were bypassed.

Astra should preserve these provenance labels. It must not describe the repository's earlier research notes as independently verified literature, or treat an absent search result as proof that no research exists.

## What the current implementation actually measures

**CODE**: `src/tests/stand/analyze.ts` captures 10 seconds, discards two settling seconds, prefers gyroscope rotation and otherwise uses acceleration. It filters the axes and computes an RMS movement summary. Those two sensor sources have different physical units and are not interchangeable population measures.

**CODE**: `src/tests/choice/analyze.ts` summarizes eight scored four-choice taps after two warm-ups. It reports the median of correct taps, wrong squares and lapses. It substitutes 2000 ms when there are no clean taps. This sentinel is a software fallback, not an observed reaction time.

**CODE**: `src/engine/metrics.ts` sets provisional noise floors of 30% for sway, 15% for reaction time, one wrong tap and 15% for pulse. The total-drift threshold is 1.5 and the pulse term is capped at 0.5. These are engineering parameters. Their presence in code does not establish diagnostic sensitivity, specificity or a biological cutoff.

**CODE**: `src/engine/classify.ts` names an above-threshold change using the log. Any alcohol takes precedence, then caffeine, then an unlabelled Wobbly state. Below threshold is Steady. The sensors do not chemically identify alcohol or caffeine. The displayed high/medium/low confidence is based on recording conditions and baseline status, not an empirically calibrated probability that a health interpretation is correct.

**CODE**: `src/store/quick.ts` supplies a stock baseline of sway RMS 0.6, lateral RMS 0.4 and reaction time 480 ms. The comments explicitly say these were selected by judgement rather than a study. A quick-demo comparison is simulated, not that individual's normal and not a validated adult population norm.

## Claim calibration matrix

| Proposed claim | Evidence and current status | Limits | Safer user-facing wording | Validation still needed |
|---|---|---|---|---|
| The standing task records body sway or movement | CODE implements an instrument-specific motion summary. REPO cites Caccese 2022 for a chest-held phone balance protocol and Jongen 2014 for force-plate sway after alcohol. | A phone against the chest does not directly measure the force plate's centre of pressure. Device, sensor source, posture, placement, duration and filtering differ. A concussion/balance protocol does not validate alcohol inference. | “Movement during this standing task, compared with your saved recording on this phone.” | Retrieve both primary methods. Define units and outcome. Measure repeatability on each supported sensor source and test protocol. Compare against an appropriate physical reference under supervised safe conditions. |
| More sway means alcohol caused impairment | REPO records group-level alcohol effects on laboratory sway. CODE instead uses alcohol presence in the log to choose the Tipsy label. | Group averages do not establish individual classification from one short recording. Fatigue, exercise, anxiety, pain, vestibular problems, medication, posture and phone handling can also change movement. Low change does not establish absence of impairment. | “Your movement changed from your recording. You logged alcohol, but this test cannot determine its effect or whether you can drive.” | Independently verify the alcohol studies and their populations. A causal or impairment claim would require a purpose-built, ethically reviewed validation study, not a product copy change. |
| The app detects caffeine or distinguishes caffeine from alcohol | REPO D17 explicitly rejects that inference. CODE uses logged categories, with alcohol taking precedence. | The labels are bookkeeping and entertainment, not chemical detection. Caffeine effects depend on tolerance, withdrawal, dose, sleep and timing. | “The label uses what you logged. The phone does not detect caffeine or alcohol.” | Verify the primary caffeine studies before claiming any expected signal direction. Do not train or market a classifier using the log itself as proof of sensor detection. |
| Choice Tap measures reaction time and attention | CODE measures timed correct responses, mistakes and lapses. REPO cites a small four-choice alcohol study, Woods 2015 and Pronk 2020. | Eight taps provide a noisy summary. Display latency, touch latency, browser scheduling, anticipation, missed taps and task familiarity matter. The substituted 2000 ms value is not a measurement. | “Your median correct tap time in this task. Results vary with practice and the phone.” | Retrieve task details and sample populations. Measure test-retest spread for this exact eight-tap task. Report uncertainty, lapses and number of valid taps. Verify timing on supported devices. |
| A second run reveals a biological change from baseline | REPO records practice effects and within-person variability. CODE suppresses faster reaction-time credit during early checks. | A single baseline can be unusually slow or fast. Practice, regression to the mean, fatigue and inconsistent posture can exceed the change of interest. The current check caller supplies `checksSinceBaseline: 0`, so the implementation should not be described as tracking a completed learning period. | “Compared with one earlier recording. Practice and recording conditions can change the result.” | Prespecify repeated familiarisation and baseline procedures. Estimate within-person repeatability for this task instead of borrowing a percentage from a different number of trials. |
| The quick demo uses a typical healthy adult baseline | MODEL ASSUMPTION only. The stock numbers were chosen on build day. | There is no sampled population, distribution, matched sensor calibration or normative study behind the constants. | “Simulated comparison using an example baseline. Record your own baseline for a personal comparison.” | Do not call these values average, healthy or normal without a suitable normative study. Keep the simulated label on screens, saved images and shared results. |
| The camera estimates pulse rate | CODE uses average RGB values from a fingertip covering the rear lens. This is contact camera PPG, not the same task as remote face-based rPPG. REPO cites Banhalmi 2018 and Plews 2017 for camera-based validation in specific conditions. | Contact pressure, lighting, camera gain, exposure, motion, pigmentation, low perfusion, frame cadence and device hardware can distort the signal. A confident periodic signal is not proof it is cardiac. Synthetic tests verify algorithm behaviour, not physical-phone accuracy. | “Experimental camera pulse estimate. Keep still and try again if it looks wrong. It is not a medical reading.” | Retrieve the actual camera-validation protocols. Compare simultaneous measurements against an appropriate validated reference across devices and conditions. Report bias, limits of agreement, error and failure rate, not correlation alone. |
| A 40 to 180 bpm reporting band defines a normal adult pulse | CODE sets a feature reporting range. It is not health guidance. | Genuine rates can fall outside the feature's supported range. A reporting limit must not clamp or replace a measurement with a typical-looking number. | “This camera feature could not produce a supported reading.” | Validate the feature limits and out-of-band rejection. Do not publish an emergency rule or normal-range interpretation from engineering constants. |
| Camera pulse corroborates alcohol or caffeine exposure | REPO D45 and D46 describe pulse as weak and non-specific. CODE on main caps its scoring contribution. The separate pending pulse patch makes retry-derived rough figures display-only. | Heart rate changes with activity, posture, stress, temperature, illness, medication and many other factors. Two agreeing captures do not establish the cause. | “Pulse can change for many reasons. It does not confirm what you drank.” | Verify the cited studies and separate group differences from individual prediction. Preserve provenance for approximate retry estimates and prevent them from entering scored comparisons. |
| This short camera recording can measure HRV or rMSSD reliably | Not implemented. REPO cites ECG-comparison and recording-length studies, often involving longer recordings or specialised processing. | A frame at 30 fps spans about 33 ms by arithmetic. Interpolation cannot create missing acquisition timing information. However, “HRV is impossible at 30 fps” is too broad without defining the method and its validation. | Do not display HRV or an alcohol interpretation from it in this product. | Retrieve the cited methods and raw agreement results. Any future HRV feature needs its own beat-timing and artefact validation against ECG. Do not repeat the repository's derived 24 ms noise figure as a universal measured fact. |
| The caffeine curve measures caffeine remaining in this person's body | CODE implements a quarter-sine rise to 50 minutes, then exponential decay using a five-hour half-life. It also draws two-hour and eight-hour scenarios. | This is a chosen exposure illustration, not a fitted absorption/distribution/elimination model. The band is not a confidence interval and does not necessarily contain the person's value. Dose, drinking duration, food, metabolism, pregnancy, medication, smoking and other factors are uncertain. | “Illustrative estimate from your log, using the dose and half-life assumptions shown. Actual amounts and effects vary.” | Verify pharmacokinetic sources and intended population. Make assumptions explicit. A user-specific amount-in-body claim needs a validated model and reliable inputs. Never use it to guarantee sleep or symptom outcomes. |
| One coffee is 100 mg and one energy drink is 80 mg | CODE constants in `src/engine/nudge.ts`. REPO records an Australian cafe-coffee variability study. | Cup size, number of shots, brewing, brand, serving volume and label concentration vary. No defensible single Brisbane average was established in this task. | “Estimated dose. Check the product label or enter the amount for your serving.” | Use label-specific caffeine per serving or concentration times actual consumed volume. Keep any default labelled as an assumption. Retrieve Desbrow 2007 before quoting its exact range or claiming it applies to present-day Brisbane. |
| 400 mg per day is safe for every adult | CODE uses 400 mg as a prompt threshold. REPO attributes general guidance to FSANZ. GUIDANCE TO VERIFY includes EFSA's 2015 assessment for healthy adults. | General population guidance is not an individual safety threshold. Pregnancy, breastfeeding, adolescents, medication, sensitivity and health conditions require separate consideration. Sleep can be affected below a daily-intake guide. “Below the line” cannot mean symptom-free. | “General guidance for healthy adults is not a personal safe limit. Some people need less.” | Astra must retrieve current Australian guidance and the EFSA primary opinion. State exactly which population each number addresses and its issuing authority. Do not attribute an EFSA conclusion to NHMRC or FSANZ without checking. |
| A bedtime caffeine number or cutoff guarantees sleep | CODE chooses 23:00 by default and shows a notice at 25 mg. `lastCallFor` uses a caller-selected target. | Neither 23:00 nor 25 mg is a validated individual sleep boundary. Half-life variation, dose uncertainty and prior-day carryover are not captured by a simple daily log. | “Estimated caffeine contribution at the bedtime you chose. This cannot predict whether you will sleep.” | Verify sleep-related evidence separately. Explain that the chosen target is a calculator setting, not a clinical cutoff or permission to take more caffeine. |
| Water, food or coffee reverses alcohol's effect | Current aftercare copy correctly rejects quick sobering, but some statements promise a kinder tomorrow or imply a predictable sleep result. | Water is not an alcohol antidote or a guaranteed hangover remedy. Food can affect absorption but is not a way to reverse alcohol already absorbed. Salty food is not a universally indicated treatment. Caffeine can alter alertness without removing alcohol-related impairment. | “Water and food can support comfort. They do not make a person fit to drive or remove alcohol already absorbed.” | Verify each aftercare claim using current health guidance. Avoid guarantees about hangovers, dehydration or sleep. “Caffeine is a mild diuretic” needs dose and habituation context, not a blanket claim that coffee dehydrates everyone. |

## Australian standard drinks and product labels

**GUIDANCE TO VERIFY**: in Australia, one standard drink contains **10 g of ethanol**. Use the current Australian Government standard-drinks guide and packaging information. A beer, a wine glass and a shot are not automatically one standard drink each.

For an illustrative calculation from actual volume and label strength:

```text
ethanol_g = consumed_volume_mL × (ABV_percent / 100) × 0.789_g_per_mL
Australian_standard_drinks = ethanol_g / 10
```

The density value is approximate. Astra should verify the standard convention used by the authoritative guide and applicable labelling rules. Prefer the package's declared standard-drink count for the matching consumed amount, and explain any rounding.

Hypothetical examples, not brand data or Brisbane averages:

- 375 mL at a labelled 4.5% ABV calculates to about 1.3 Australian standard drinks.
- 500 mL at a labelled 5.0% ABV calculates to about 2.0 Australian standard drinks.

A proposed logging design would need serving volume, label-specific ABV, fraction consumed and source of the label information. Mixed drinks require each alcoholic ingredient. Do not silently infer ABV from a generic beer/wine/spirit category or fabricate a local average. A photograph of a label is evidence about that product, not the entire category.

**CODE**: the current `Drink` schema stores only kind and timestamp. Alcohol counts are counts of logged items. They are not standard drinks, grams of ethanol, absorption estimates or BAC. No current data supports retroactively labelling those counts as standard drinks.

**GUIDANCE TO VERIFY**: NHMRC's 2020 Australian guidelines describe risk reduction for healthy adults as no more than 10 standard drinks per week and no more than four on any one day, with less drinking meaning lower risk. Verify the current official wording and the separate advice for people under 18, pregnancy, planning pregnancy and breastfeeding before using any of it. This is not a driving rule, intoxication threshold or instruction to consume up to a limit.

## Caffeine inputs and model details requiring explicit disclosure

1. A labelled can's total caffeine equals its concentration times the consumed volume when the label uses concentration units. A multi-serving container must not be treated as one default 80 mg drink.
2. A cafe coffee is not a known 100 mg exposure without reliable serving information. A single default should carry an editable assumption rather than a claim of local average accuracy.
3. The existing baseline picker timestamps earlier drinks at the current time. Its caffeine projection can therefore have a large timing error. Label this uncertainty rather than presenting a precise body amount.
4. The aftercare caller supplies the current day's drinks. A day boundary does not eliminate caffeine from yesterday. Any fuller model must address previous-dose carryover and incomplete logs.
5. A two-hour to eight-hour half-life scenario band is not a validated 95% interval. Some populations and interactions may fall outside it.
6. The five-hour exponential and the 50-minute quarter-sine absorption shape are separate assumptions. A source supporting a broad half-life does not validate the chosen absorption curve, the exact peak or the cumulative estimate.
7. EFSA's frequently cited 200 mg single-dose and 400 mg daily figures concern defined healthy-adult conditions. Its pregnancy-related advice differs. Astra must retrieve the actual opinion and current local guidance rather than copying the numbers into a universal safe/unsafe meter.

## Safety, interpretation and data

- Preserve the no-driving message for any logged alcohol, including a Steady result and every exported image. Do not show a BAC, a predicted clearance time, a “sober” verdict or a promise of medical/legal safety.
- “Steady” should mean no above-threshold change was found by this particular task under these assumptions. It does not mean unimpaired, healthy or free of alcohol.
- Do not call the confidence tier diagnostic confidence. Do not call the 0 to 100 score a health percentage, fitness percentage, impairment percentage or probability.
- The demo stock baseline and actual personal baseline must remain distinguishable through reloads, saved results, room-board posts and receipts. Simulated needs to remain visible outside the app too.
- Phone input and log information cannot prove causality. A recorded change after a drink is not automatically caused by that drink.
- Research validation should not encourage people to drink alcohol or induce dizziness to earn a result. Use ethical supervision where required and provide seated/accessibility alternatives. A safe engineering test does not require dosing participants with alcohol.
- Raw camera frames and motion time series appear to be processed locally in the inspected paths. The check request sends numeric summaries, logged category counts and an hour to the server, with selected summaries used for optional Anthropic commentary. The room receives names, activity and results when enabled. Starting the current landing flow enables room sharing. These flows must be described accurately rather than saying that nothing leaves the phone.
- Future research data collection needs explicit consent, a minimised schema, retention rules, de-identification and a documented reference protocol. Never infer study participation merely because someone tried the public demo.

## Main snapshot versus pending pulse patch

Main at `b3d93a6` contains the older pulse analyzer. Earlier synthetic review reproduced slow periodic signals being reported at a reporting-band boundary and fast signals being reported at a subharmonic. A narrow output range therefore did not, by itself, establish that the underlying signal was a pulse in that range.

The separate pending commit `5ca2b58` adds wider fundamental-period inspection, nearly-flat and frame-quality guards, beginning/end agreement checks and limited reuse of compatible contiguous sections from the last two attempts. The retry result is visibly approximate and excluded from baseline/scoring input. These are software safeguards, not a new clinical measurement claim. The patch's full check was rerun during handoff preparation, with 513 passing tests and a passing production build. Those checks do not verify physiological accuracy.

Astra must not assume this pending patch is already on main or overwrite it while planning a portfolio refresh. Scientific validation remains needed on either revision. Technical sources such as independently fetched MDN or OWASP documentation can support browser or security claims, but do not verify the blocked physiological research.

## Minimum evidence plan for Astra to propose, not implement

1. Retrieve the primary full texts and the current official guidance. For each source, record authors, year, DOI or stable identifier, population, sample size, exact apparatus, protocol, endpoint and access status. Separate abstract-only evidence from full-text evidence.
2. Build a source-to-claim table. Distinguish a controlled group difference from test-retest reliability, individual prediction, dose estimation and causal inference. They answer different questions.
3. For each phone task, define the exact output and measurement units before assessing validity. Keep gyroscope and acceleration results separate unless a documented calibration supports combining them.
4. Estimate repeated-measure error for the actual implemented durations and trial counts. Do not convert the noise-floor constants into published confidence limits. Do not extrapolate a five-tap variance figure to eight medians using a square-root rule without checking its assumptions.
5. Validate camera BPM against a suitable time-synchronised reference. Prespecify error, limits of agreement, failed-read rate and the handling of movement, low light, source frame rate, skin tone and device differences. Retain genuine supported low or high rates instead of replacing them with an adult average.
6. Evaluate whether another attempt adds independent usable signal or repeats the same artefact. Separate camera windows in time, preserve acquisition provenance and never fabricate a continuous waveform across a retry gap. Approximate combined readings should remain visibly approximate and unscored unless separately validated.
7. Treat any alcohol/caffeine classifier or personalised caffeine pharmacokinetic feature as a separate research problem. The existing log-based labels do not provide validation data for those claims.
8. End with a ranked list of evidence gaps, honest UI wording and a small study plan. Do not begin implementation, invent empirical calibration data or promise clinical accuracy.

## Source register

All external entries below require independent retrieval by Astra. None was downloaded successfully during this task. The author/year associations for study entries come from the repository unless noted otherwise. Exact titles, metadata and any quoted statistics must be checked against the primary document.

| ID | Source and year | URL or DOI | Use and evidence status |
|---|---|---|---|
| S1 | Jongen et al., 2014 | https://pmc.ncbi.nlm.nih.gov/articles/PMC4039994/ | Alcohol, laboratory sway and psychomotor tasks. REPO citation. Direct download attempted and blocked. |
| S2 | Caccese et al., 2022 | https://pmc.ncbi.nlm.nih.gov/articles/PMC9667020/ | Chest-held smartphone balance protocol. REPO citation. Population and exact outcomes need checking. |
| S3 | Drunk User Interfaces, year not established here | https://ubicomplab.cs.washington.edu/pdfs/dui.pdf | Four-choice versus simple reaction task. REPO citation. Verify full publication metadata and whether the product task is comparable. |
| S4 | Woods et al., 2015 | https://doi.org/10.3389/fnhum.2015.00540 | Reaction-time variability. REPO citation. Do not repeat numerical trial-count extrapolations without the method. |
| S5 | Burghart et al., 2019, as recorded in repository | https://pmc.ncbi.nlm.nih.gov/articles/PMC7309344/ | Repeat/practice effects. Verify author/year and exact task. |
| S6 | Pronk et al., 2020 | https://pmc.ncbi.nlm.nih.gov/articles/PMC7280355/ | Browser timing effects. REPO citation. A stable offset cancelling does not remove timing jitter or device variation. |
| S7 | Rogers et al., 2013 | https://research-information.bris.ac.uk/ws/files/59709227/Faster_but_not_smarter_Psychopharm_final_revision.pdf | Caffeine and reaction performance. REPO citation. Verify participant habituation and withdrawal conditions. |
| S8 | Temple et al., 2017 | https://pmc.ncbi.nlm.nih.gov/articles/PMC5445139/ | Caffeine pharmacology and population caveats. REPO citation. |
| S9 | Desbrow et al., 2007 | https://pubmed.ncbi.nlm.nih.gov/17412475/ | Australian cafe-coffee variability. REPO citation. Not a validated present-day Brisbane average. |
| S10 | EFSA NDA Panel, 2015, Scientific Opinion on the safety of caffeine | https://doi.org/10.2903/j.efsa.2015.4102 and https://www.efsa.europa.eu/en/efsajournal/pub/4102 | Authoritative opinion to verify for specified populations and dose contexts. Direct page download blocked. |
| S11 | FSANZ, caffeine guidance, current page year/version to verify | https://www.foodstandards.gov.au/consumer/prevention-of-foodborne-illness/caffeine | Australian/New Zealand consumer information and label context. REPO URL. Direct download blocked. |
| S12 | Australian Government, standard-drinks guide, current page year/version to verify | https://www.health.gov.au/topics/alcohol/about-alcohol/standard-drinks-guide | Ten-gram definition and labelled serving counts. GUIDANCE TO VERIFY. Direct download blocked. |
| S13 | NHMRC, Australian Guidelines to Reduce Health Risks from Drinking Alcohol, 2020 | https://www.nhmrc.gov.au/health-advice/alcohol | Australian risk-reduction guidance and special populations. GUIDANCE TO VERIFY. Proxy denial recorded. |
| S14 | Buckman et al., 2015, as recorded in repository | https://pmc.ncbi.nlm.nih.gov/articles/PMC4971776/ | Alcohol and HR/HRV under a study-specific protocol. Verify metadata and avoid individual-detection claims. |
| S15 | Cipryan, 2016, as recorded in repository | https://pmc.ncbi.nlm.nih.gov/articles/PMC5260644/ | Short-term HRV repeatability. REPO citation. |
| S16 | Banhalmi et al., 2018 | https://pmc.ncbi.nlm.nih.gov/articles/PMC5832098/ | Camera measurement against a reference. Verify acquisition conditions and whether it concerns contact PPG. |
| S17 | Plews et al., 2017 | https://pubmed.ncbi.nlm.nih.gov/28290720/ | Smartphone-derived HRV validation under its specific protocol. REPO citation. |
| S18 | Esco and Flatt, 2014 | https://www.jssm.org/jssm-13-535.xml-abst | Ultra-short versus longer HRV recordings. REPO citation. |
| S19 | Shaffer et al., 2020 | https://doi.org/10.3389/fnins.2020.594880 | HRV recording-length/context review. REPO citation. Verify scope before using a universal minimum duration. |

## Specific claims Astra should challenge in the existing notes

- “No study shows” and “no published study detects” are descriptions of the earlier search, not universal scientific conclusions. Replace them with a documented search scope and date or a narrower claim.
- Precise alcohol-effect figures, study sample sizes, repeatability coefficients and reported detection correlations in `DECISIONS.md` are unverified REPO claims in this task. Do not reproduce them as newly checked facts in the PDF.
- “Nothing to report” on an entertaining receipt must not be interpreted as a negative medical, intoxication or safety test.
- “Typical steady adult” for stock constants, “recommended maximum” without its population, and “this much caffeine is still in you” without assumptions need qualification.
- A half-life range is not a confidence interval. A movement score is not a measure of absorbed ethanol. An intake count is not a standard-drink count.
- The existing claims that water makes tomorrow kinder, food only helps the next drink, a person should expect early waking, or caffeine necessarily requires extra water are too categorical without source-specific support.

The appropriate deliverable is a transparent evidence map with qualified copy and a validation plan. It is not a claim that an entertaining short phone task already diagnoses a physiological state.
