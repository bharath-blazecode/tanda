# 04. Screens: states and edge cases

Screen-by-screen spec for Saturday. It expands `BRIEF.md` section 5. Decisions referenced as D-numbers are in [`DECISIONS.md`](../DECISIONS.md). Visual rules are in [`design/DESIGN.md`](design/DESIGN.md).

Copy in this file is a starting point. Whoever owns a screen owns its final words.

## Flow

```
Landing ─► Permissions ─► Baseline ─┬─► Demo ─► Check ─► Result ─► Home
                                    └─► Home ─┬─► Log a drink ─► Home
                                              ├─► Check ─► Result ─► Home
                                              └─► Connect band (Android / desktop Chrome only)

Room (projector) is a separate surface at /room. Nobody navigates to it from the app.
```

| Route | Screen | Needs a baseline |
|---|---|---|
| `/` | Landing | no |
| `/setup` | Permissions | no |
| `/baseline` | Baseline | no |
| `/home` | Home | yes |
| `/log` | Log a drink | yes |
| `/check` | Check | yes |
| `/result` | Result | yes |
| `/demo` | Demo | yes |
| `/band` | Connect band | yes |
| `/room` | Room | no |
| `/lab/stand`, `/lab/choice` | Test pages for developers | no |

Opening a route that needs a baseline without one redirects to `/`.

## Rules that apply to every screen

1. **Every Stand Still run starts with a tap that calls `motion.ensurePermission()`.** iOS only grants motion access from a tap and asks again in each new session. Never start the motion stream from a timer or a page load.
2. **Portrait only.** In landscape, show a "turn your phone upright" notice over the screen. Do not re-layout.
3. **A run is all or nothing.** If the user leaves mid-run (tab hidden, back button, phone locked), the run is discarded and restarts from the test that was interrupted. Nothing partial is saved.
4. **No error screen for the network.** Verdict and room calls fail silently into local fallbacks (D12).
5. **The safety line.** With any alcoholic drink logged today, every result shows this fixed line, set apart from the rest: *"Not a driving test. If you're going anywhere, get a ride or a friend."* (D19)
6. **Words to never ship, in any state:** "safe to drive", "fine to drive", "ok to drive", "sober", "legal limit", "BAC", "diagnosis". A unit test greps the copy file for them.

---

## The two tests

Changed on Saturday 21 Nov after the research (D15): Stand Still and Choice Tap replace Steady Hand, Reaction Tap and Stroop.

Used identically by Baseline, Check and Demo. Each test has four phases: **intro** (one line plus a Start button), **countdown** (3, 2, 1), **running**, **done**. Each returns raw numbers and knows nothing about baselines.

### T1. Stand Still, 20 seconds

Instruction: *"Stand up, feet together. Hold your phone upright against your chest with both hands. Pick a spot on the wall and stay as still as you can until the beep."*

- The user cannot see the screen during this test, so sound carries it: three countdown beeps, a start beep and an end beep. Vibration is added where the browser supports it (not iOS). The Start tap is what unlocks audio.
- The first 2 s are discarded (settling). The remaining 18 s are measured.
- Sway is taken from rotation rate on the two tilt axes, band 0.2 to 3 Hz. Side-to-side is also reported on its own, because alcohol moves it more and breathing moves it less. Acceleration is recorded too, as a fallback to compare in calibration.
- **The trace replays afterwards.** When the user looks back at the phone, the pen draws their 18 seconds in about 2 seconds, over the blue baseline. This replaces the live trace of the old Steady Hand screen.
- Why 20 seconds: the sway studies used 60, which nobody will stand for at a demo. Twenty is our compromise and is checked in calibration.

Returns `StandMetrics { swayRms, swayLateralRms, hz, valid }`.

| Edge case | Detection | Behaviour |
|---|---|---|
| No motion events arrive | Nothing within 1 s of starting | Mark motion unavailable; skip T1 for this run; show "No motion sensor here, running one test instead" |
| Phone lying on a table | Total variance below a floor (too still to be a body) | "Nice try. Pick it up." Retry |
| Dropped or shaken | Any sample above about 2 g | Invalidate, retry |
| Looked at the screen mid-run | Tilt changes by more than about 25 degrees | Invalidate: "Keep it on your chest until the beep." Retry |
| Sound is off or cannot be heard | Cannot be detected | The intro says: "No beep? Count slowly to 25, then look." The run ends on its own |
| Tab hidden or screen locked | `visibilitychange` | Abort, retry from the intro |
| Sample rate below 15 Hz | Measured over the run | Keep the run; confidence drops one step |
| No gyroscope (`rotationRate` null) | First sample | Sway is derived from low-passed acceleration; confidence drops one step |
| Cannot stand, or does not want to | A "Skip this test" link on the intro, never labelled as the lesser choice | The run continues with Choice Tap only |
| Three invalid tries in a row | Counter | Offer "Skip this test" |

### T2. Choice Tap, 2 warm-up taps plus 12 that count

Instruction: *"Four squares. Tap the one that lights up, as fast as you can. The first two don't count."*

- A 2 by 2 grid of large keys fills the lower two thirds of the screen. Each trial waits a random 0.8 to 2.0 s, then one square lights.
- Each square lights three times across the 12 scored trials, in shuffled order.
- Timing uses `pointerdown` and `performance.now()`. Only the first pointer of a trial counts.
- The lit square changes fill and shows a mark, so it does not depend on telling colours apart.
- The median is taken over correct taps only. Wrong squares and lapses are counted separately.

Returns `ChoiceMetrics { medianMs, wrong, lapses, trials }`.

| Edge case | Detection | Behaviour |
|---|---|---|
| Tap before a square lights | Tap during the wait | Show "Too soon", repeat the trial. At most 3 repeats per run |
| Wrong square | Tap on an unlit square | Count it as wrong, move on. No message, no sound |
| No tap | 2 s after the square lights | Count a lapse, move on |
| Impossibly fast | Under 100 ms | Treat as anticipation: discard and repeat |
| Every scored tap wrong or lapsed | `wrong + lapses === trials` | Likely a misunderstanding; on baseline, offer one retry with the instruction repeated |
| Tab hidden | `visibilitychange` | Restart the test |

### What a run produces

`RunResult { stand?, choice, hr?, at }`. Choice Tap is always present. A result without Stand Still is **partial** and is labelled so. Heart rate from the band is shown, never scored (D17).

---

## 1. Landing (`/`)

**Purpose.** Say what this is in five seconds and get the first tap.

**Content.** Name, tagline, a live trace as decoration, one button (Start), one disclaimer line: *"A toy, not a test. For adults."*

| State | When | What shows |
|---|---|---|
| First visit | No baseline stored | Start |
| Returning | Baseline stored | Continue (goes to Home) and a small "Start over" |
| Desktop | No touch and wide screen | A QR code to open on a phone, plus "Try it here anyway" (two-test version) |

**Edge cases**
- **In-app browser** (opened from Slack): works the same; the problem, if any, shows up on Permissions.
- **Stored data from an older version**: if the `bc:v1` key fails validation, wipe it and treat as first visit.
- **`?demo=1` in the URL**: remembered for the session; after Baseline the user lands on Demo instead of the fork.

**Exit.** Start goes to Permissions. Continue goes to Home.

## 2. Permissions (`/setup`)

**Purpose.** One tap to turn on motion sensors, with the reason.

**Content.** *"We read how your hand moves. Nothing leaves your phone."* One button: Allow motion.

| State | When | What shows |
|---|---|---|
| Idle | On arrival | Explanation and the button |
| Requesting | After the tap, iOS prompt open | Button disabled |
| Granted | Permission given and samples arriving | Auto-advance after 400 ms |
| Not needed | Android and desktop (no permission API) and samples arriving | Skip this screen entirely |
| Denied | iOS returns "denied" | How to fix it, plus "Continue with one test" |
| Unsupported | No `DeviceMotionEvent` | "Continue with one test" |
| Granted, no data | Permission given but nothing within 1 s | Treat as in-app browser: "Open in Safari / Chrome" with a copy-link button, plus "Continue with one test" |

**Edge cases**
- **iOS remembers a denial for the session.** Asking again returns "denied" with no prompt. The fix text must say: *"Close this tab, open the link again, and tap Allow."*
- **Not on HTTPS**: the API is missing. Only happens in development; the dev tunnel covers it (D5d).
- **Android asks nothing.** Do not show a fake prompt. Verify by listening for one sample.

**Exit.** Baseline, with or without motion.

## 3. Baseline (`/baseline`)

**Purpose.** Record the user's own normal, once.

| State | What shows |
|---|---|
| Clean check | One question, two buttons: *"Had anything yet today?"* "Nothing yet" / "Already had some" |
| Tests | T1, T2 with a 1/2, 2/2 indicator |
| Saving | Instant; no spinner |
| Saved, fork | *"That's your normal."* Two choices: "No drink in hand? Fake it." (Demo) and "I'll log real drinks" (Home) |

**Edge cases**
- **"Already had some"**: the baseline is saved with `clean: false`. Every result built on it adds: *"Your baseline was taken after a drink, so read this loosely."* (D21)
- **Abandoned mid-way**: nothing is saved. Coming back restarts at the clean check.
- **A test was skipped**: the baseline is partial. Checks compare only what the baseline has.
- **Re-recording**: reachable from Home. Blocked while drinks are logged today, with the reason shown. Otherwise it replaces the old baseline after a confirm.
- **Second device, same person**: no sync. Each phone has its own baseline, which is correct, because sensors differ per phone.

**Exit.** Demo or Home.

## 4. Home (`/home`)

**Purpose.** Two actions and today's log.

**Content.** Two large buttons: Log a drink, Run a check. Today's drinks. A small entry to the Demo challenge. A settings sheet with "Re-record baseline", "Connect band" (when available), "Show me on the room board" and "Erase everything".

| State | What shows |
|---|---|
| Nothing logged | *"Nothing logged yet."* No illustration, no fake data |
| Drinks logged | List with time, newest first, and a totals line: "2 coffees, about 190 mg caffeine. 1 beer." |
| Caffeine logged | A small chart-paper strip: the estimated caffeine still on board, drawn as a curve from now to 6 am, with one line under it ("About 150 mg now. Half of it is still with you at 10 pm."). Marked as a rough estimate (D41). Nothing like it is ever shown for alcohol |
| Last check today | A chip with the last verdict and time; tapping reopens that result |
| Baseline is old | Older than 7 days: a quiet suggestion to re-record |
| Baseline not clean | A quiet note: "Baseline taken after a drink" |

**Edge cases**
- **Day boundary at 4:00 am** (D20). A beer at 1:00 am belongs to the same night as the one at 11:00 pm.
- **Clock changes or travel**: use the device's local time; no correction.
- **Erase everything**: one confirm, then clear `bc:v1` and return to Landing. If the user is on the room board, their entry stays until the next reset; say so in the confirm text.
- **Run a check with nothing logged**: allowed. People want to see their drift at 3 pm with no coffee.

**Exit.** Log a drink, Check, Demo, Connect band.

## 5. Log a drink (`/log`)

**Purpose.** One tap per drink. No forms.

**Content.** Five tiles: Coffee, Energy drink, Beer, Wine, Spirit. Tapping one logs it at the current time and returns Home.

| Drink | Counts as |
|---|---|
| Coffee | about 95 mg caffeine |
| Energy drink | about 80 mg caffeine |
| Beer | 1 alcoholic drink |
| Wine | 1 alcoholic drink |
| Spirit | 1 alcoholic drink |

| State | What shows |
|---|---|
| Idle | The five tiles |
| Just logged | Back on Home with an "Undo" toast for 5 s |

**Edge cases**
- **Accidental double tap**: a tile ignores a second tap within 800 ms.
- **Wrong drink**: Undo in the toast; after that, each row on Home has a remove control.
- **Logging something from earlier**: not supported. One tap means now.
- **Totals**: caffeine is shown as an approximate mg figure; alcohol as a count of drinks. Never a blood alcohol figure, never "standard drinks" precision we cannot back (D19).
- **Lots of drinks**: no cap and no congratulation. At 4 or more alcoholic drinks, Home shows the safety line permanently for the rest of the day.

**Exit.** Home.

## 6. Check (`/check`)

**Purpose.** Run the same tests and compare.

| State | What shows |
|---|---|
| Intro | "About 50 seconds. Same two tests." Start (this is the tap that grants motion on iOS) |
| Running | T1, T2 with the progress indicator |
| Invalid test | The retry message for that test (see the test tables) |
| Done | Straight to Result; scoring is local and instant |

**Edge cases**
- **Motion was available at baseline but is not now** (permission lapsed and denied): run Choice Tap only, mark the result partial.
- **Motion is available now but the baseline has no Stand Still**: run it, but do not score it; offer to re-record the baseline afterwards.
- **Sample rate differs a lot from the baseline's** (more than 30%): keep the result, drop confidence one step. This happens with low power mode.
- **Band connected**: heart rate is sampled during T1 only and shown as a row on the ticket; it is not scored. If the band drops mid-run, the run continues without `hr`.
- **Back button mid-run**: confirm once ("Stop this check?"), then discard.

**Exit.** Result.

## 7. Result (`/result`)

**Purpose.** The verdict, the evidence, one funny line, one nudge.

**Content, top to bottom.** The verdict as a stamp (STEADY, WIRED, TIPSY, or the neutral WOBBLY for drift with nothing logged). The baseline trace and tonight's trace overlaid. Drift per test as rows. The line. The nudge. The safety line when it applies. Actions: Run again, Home.

| State | When | What shows |
|---|---|---|
| Printing | First 1.2 s | The ticket prints line by line with a locally chosen canned line |
| Final, Claude | Claude's line arrived within 4 s | It replaces the canned line in place |
| Final, canned | Timeout, 429, offline, kill switch | The canned line stays. No error, no badge |
| Partial | No Stand Still | A "Partial reading" tag and which test is missing |
| Low confidence | Degraded sensors or a baseline that is not clean | "Loose reading" tag; the verdict still shows |
| Sharper than baseline | Drift is negative overall | Verdict STEADY, line: *"Sharper than your normal."* |

**Verdict and nudge rules** (computed in `engine/`, never by Claude; full formulas in `05-architecture.md`):

| Verdict | When | Nudge |
|---|---|---|
| Tipsy | Drift, alcohol logged today | "Get a ride or ping a friend." Always. Plus water |
| Wired | Drift, only caffeine logged today | "No more coffee today." After 3 pm, mention sleep |
| Wobbly | Drift, nothing logged | "Something has you off your normal. Water, and a slow breath." |
| Steady | No drift, alcohol logged | "Tests look steady. Still not a driving test." Plus the safety line |
| Steady | No drift, caffeine at or over the recommended daily maximum | "Steady, with a lot on board. No more coffee today." |
| Steady | No drift, otherwise | "Carry on." |

The label comes from the log, not from the sensors (D17, D18). The sensors only say how far the user is from their own normal.

**Edge cases**
- **Steady with alcohol logged**: the most dangerous screen in the app. The safety line is mandatory and the Claude line is generated with the instruction that steady tests prove nothing about driving (D19).
- **Both alcohol and caffeine logged, with drift**: Tipsy. Alcohol always wins the label (D18).
- **Faster than baseline on the first two or three checks**: treated as learning, not as a change; the line says so (*"You're getting better at the test, not at life."*).
- **Sharper than baseline with no drinks today**: offer "Use this as my baseline". With drinks logged today the offer does not appear (D21).
- **Baseline not clean**: add the loose-reading sentence.
- **Claude returns something unusable** (too long, banned phrase, empty): the server swaps in a canned line; the client cannot tell the difference.
- **Reload on this screen**: the last result is restored from storage. No second Claude call; the stored line is reused.
- **Room board**: if sharing is on, the result is posted once, after the verdict is final. A failed post is dropped silently.
- **Install line** (D4b): after the first result only, one quiet line under the actions: "Keep Dr. Bin Chicken on your home screen." On Android it triggers the browser's install prompt; on iPhone it shows the two steps (Share, then Add to Home Screen). It is hidden when the app is already running installed, and after the user dismisses it once. On iPhone it adds: "You'll record your baseline again in the installed app."
- **Ping a friend**: uses the share sheet with a prewritten message ("Can you check on me?"). Where sharing is unavailable, the button is hidden.

**Exit.** Home or Check.

## 8. Demo (`/demo`)

**Purpose.** Let someone with no drinks feel the app work in under a minute.

| State | What shows |
|---|---|
| Pick a handicap | Two choices (below), plus the room board notice and opt-out |
| Do it | A 15 s countdown with the instruction, then auto-advance to Check |
| Check | The normal Check, tagged as demo |
| Result | The normal Result, with two changes: the stamp reads "TIPSY (SIMULATED)" after a spin or "WOBBLY (SIMULATED)" for the other hand, and a line says what the app guessed |

| Handicap | Instruction | Expected pattern |
|---|---|---|
| Spin | "Spin around 5 times. Hold on to something." | Body sway far above baseline in Stand Still |
| Other hand | "Use your non-dominant hand for the taps." Seated, quiet option | Choice Tap slower, more wrong squares; sway unchanged |

Jumping jacks were removed on 21 Nov: they stood in for Wired, and Wired is no longer read from sensors (D17, D24).

**Edge cases**
- **Guess is right**: *"We think you spun. Correct."* This is the technical moment of the demo.
- **Guess is wrong**: say so with humour (*"We guessed the other hand. Bodies are odd."*). Never hide it.
- **No drift detected** (someone with an iron stomach): *"Barely a wobble. Try again, with feeling."* Verdict STEADY.
- **Cannot or should not spin**: the other-hand option is always listed and is never labelled as the lesser choice.
- **No motion sensors**: Spin is hidden, because its signal lives in Stand Still. The other hand remains.
- **Board opt-out**: one tap on the notice. The choice is remembered.
- **Repeat plays**: unlimited. Each device keeps one row on the board (its latest).

**Exit.** Result, then Home.

## 9. Connect band (`/band`) (bonus)

**Purpose.** Add live heart rate from a Xiaomi Smart Band 10 on the presenter's phone.

Reachable only when `navigator.bluetooth` exists. On iPhone the entry does not render at all.

| State | What shows |
|---|---|
| Idle | "Turn on Share HR on the band (Settings, bottom of the list), then tap Connect." |
| Choosing | The browser's device picker |
| Connecting | "Connecting..." |
| Live | The pulse as a number that ticks, plus a small beat trace |
| No data | Connected, nothing for 10 s: "Is Share HR on, and is the band on your wrist?" Retry |
| Off the wrist | Readings arrive but the contact flag says no skin contact: "Put the band on." No number shown |
| Disconnected | "Band dropped." One automatic reconnect, then a Connect button |

**Edge cases**
- **Picker comes back empty**: the usual cause is that another device already holds the connection (the band serves one at a time). Say so: "Close the band on your other device first." Then retry, with the accept-all fallback.
- **User cancels the picker**: back to Idle, no message.
- **Bluetooth off or permission refused**: say which one, in plain words.
- **Band drops during a check**: the check continues without `hr`; the result is not partial for that reason alone.
- **`hr` present in the check but not in the baseline**: shown as a reading, not scored. Offer to re-record the baseline with the band on.
- **Page reload**: the connection is gone (the browser does not keep it). Home shows the band as disconnected.

**Exit.** Home.

## 10. Room (`/room`) (projector)

**Purpose.** Let the room watch itself. Runs on the presenter's laptop, full screen, landscape.

**Content.** A large QR code with the short URL in text. The room mix (how many Steady, Wired, Tipsy, Wobbly). A live feed of the latest results as small tickets. A top five.

| State | What shows |
|---|---|
| Empty | The QR, the URL and *"Waiting for the first reading."* No invented players |
| Live | Mix, feed and top five, refreshed every 2 s |
| Reconnecting | The last good data stays; a small "reconnecting" mark appears after two failed polls |
| Board cut (D14) | `/room` shows only the QR and the URL, so the slide still works |

**Edge cases**
- **Top five in real mode** is "Steadiest hands". **In demo mode** it is "Dizziest after the spin". The board never ranks real drift from high to low (D22).
- **Mixed modes in one room**: the feed shows both, tagged; each top five only counts its own mode.
- **Reset**: `/room?admin=<token>` shows a Reset button. The token is an environment variable.
- **Seeding**: only real results from the team's own test runs. Reset before the demo if they look stale.
- **A redeploy** clears the board (state is in memory). Deploys freeze at 16:15 (D29).
- **Hundreds of entries**: the server keeps one row per device and at most 500 rows.
- **Readability**: every number must be legible from the back row. Check it on the real projector before 16:15.

---

## AI features beyond the verdict line

Decisions D32 to D35. Each one is additive: with it switched off or failing, the screen above works exactly as specified.

### Room commentator (with the room board)

One line of commentary at the top of Room, rewritten about every 25 seconds from the board's aggregate numbers.

| State | What shows |
|---|---|
| No line yet | Nothing; the space collapses |
| Line | The sentence, printed in like a ticker |
| Call failed or kill switch on | The previous line stays |

Edge cases: fewer than 3 results on the board means no commentary (nothing to say, and a line about one person singles them out). The line never names a nickname next to "tipsy" in real mode. It passes the same banned-phrase filter as the verdict line.

### Snap a drink (stretch 1)

A camera button on Log a drink, beside the five tiles.

| State | What shows |
|---|---|
| Idle | The camera button with the notice: "The photo goes to Claude to name the drink. We don't keep it." |
| Capturing | The phone's own camera capture |
| Thinking | "Looking..." for at most 5 s |
| Recognised | "Looks like a beer. Log it?" Yes / Pick another |
| Not a drink | "Can't tell what that is." The five tiles |
| Failed or over the limit | Silent fallback to the five tiles |

Edge cases: camera permission denied (hide the button for the session); a photo with a person in it (still only a drink kind comes back; nothing is stored); several drinks in frame (log one, the user repeats); a drink outside the five kinds, such as tea or a cocktail (map to the nearest kind and let the user correct it); nothing is ever logged without the confirming tap.

### Band on the projector (stretch)

On Room, with the admin token present, a "Connect band" control appears. Once connected, the presenter's live pulse draws as a second trace on the board, labelled "Presenter". States and edge cases are those of Connect band (screen 9). If the band drops, the trace stops and its label says "band off"; the board is otherwise unaffected.

### Night receipt (stretch 2)

On Home, "Print my night" appears once there is at least one check today. It produces a long ticket: drinks in order, each check's verdict, and a five-line summary. States: printing, printed, failed (the ticket prints without the summary). The safety line applies as on Result.

## Optional third step: pulse from the camera (stretch, D46)

Built only after the core loop works. It counts a little and can never decide a verdict (D46).

Instruction: *"Rest a fingertip flat over the back camera. Press gently. Thirty seconds."*

- Runs after Choice Tap, in Baseline, Check and Demo alike. A "Skip" link is always visible and is never labelled as the lesser choice.
- The first tap asks for the camera. Where the browser allows it the torch is turned on; where it does not, the intro asks for good light.
- Output: one row on the ticket, "Pulse: 74 bpm". It fills `hr` in `RunResult` with `hrSource: 'camera'`.
- A raised pulse adds a small, capped amount to drift (formula in `05-architecture.md`). At 15% or more above baseline the ticket also shows the tag "Raised pulse: you may have just moved, read loosely".
- No beat-spacing or variability figure is shown with a meaning attached.
- In demo mode this step is what recognises jumping jacks, the third handicap. They stamp PUFFED (SIMULATED).

| Edge case | Detection | Behaviour |
|---|---|---|
| Camera permission denied | `getUserMedia` rejects | Skip the step silently; the result is not partial |
| Lens not covered | Frame is not dark and red | "Cover the lens and the light with your fingertip." Keep waiting |
| No clean signal | Confidence stays low for 15 s | Give up: no pulse row on the ticket, no error |
| Pressing too hard | Flat trace with the lens covered | "Ease off a little." |
| Band also connected | Both sources present | The band's reading wins; the camera step is skipped |
| Tab hidden | `visibilitychange` | Stop the camera, skip the step |
