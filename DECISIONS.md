# Decisions

Decision log for the Body Check build. Every entry was taken on **Friday 20 Nov 2026** during the planning session unless a later date is shown. Add new decisions at the bottom of the relevant section with a date; do not rewrite old ones, supersede them.

Status key: **Locked** (do not reopen without a new fact), **Default** (stands unless the team changes it on Saturday morning), **Verify** (locked, but depends on a check listed under "To verify on Saturday").

---

## The three questions for tonight

| Question | Answer |
|---|---|
| Is the Mi Band usable? | **GO.** Xiaomi Smart Band 10, heart rate readable from Chrome on macOS and on the OnePlus 12 with no keys and no pairing hacks. Heart rate only. |
| The stack | React 19 + Vite 8 + TypeScript on the client, installable as a PWA; Hono on Node for the server; one Docker image on Mike's Dokploy server behind Cloudflare; `localStorage` on the device. |
| Screens and flow | Ten screens, specified in [`docs/04-screens-spec.md`](docs/04-screens-spec.md). |

---

## Mi Band

**D1. Go on the Smart Band 10.** Locked.
The band exposes the standard Bluetooth Heart Rate service (`0x180D`, measurement characteristic `0x2A37`) once **Share HR** is switched on (band: Settings, scroll to the bottom, Share HR). Tested tonight: readings arrive in Chrome on the Mac and in Chrome on the OnePlus 12, using the plain `services: ['heart_rate']` filter. The "Connect band" bonus screen is in.

How to repeat the test, no code needed:
1. Band on the wrist, off the charger. Turn on Share HR.
2. Open `https://googlechrome.github.io/samples/web-bluetooth/notifications.html` in Chrome.
3. Service `heart_rate`, characteristic `heart_rate_measurement`, press Start notifications, pick the band.
4. Lines like `> 0x00 0x48` appear. The second byte is the pulse (`0x48` is 72 bpm).

**D1b. The band gives heart rate and nothing else.** Locked.
About one reading per second. SpO2, stress, steps and the band's own accelerometer travel over Xiaomi's proprietary protocol, which needs an auth key and is out of scope. Heart rate is shown on the ticket and on the projector. It is not scored: the research on 21 Nov found its direction after caffeine inconsistent and its rise after alcohol small (see D17).

**D1c. Measured on the device: what the band exposes without a key.** Locked.
A read-only Bluetooth scan from the Mac listed every service on the band and subscribed to everything that can notify:

| Service | What it gives without a key |
|---|---|
| Heart Rate (`0x180D`) | Pulse as one byte, about one reading every 1.4 s (15 in 19 s). Flags byte is `0x06`: wrist-contact detection is supported and reported; **no beat-to-beat intervals**, so no heart rate variability |
| Battery (`0x180F`) | Battery percentage, readable and notifying |
| Device Information (`0x180A`) | A PnP ID only |
| Xiaomi proprietary (`0xFE95`, `0xFDAB`) | Nothing. Four notify characteristics, zero packets in 10 s without authentication |

So the complete unauthenticated signal set is pulse, "is it on the wrist", and battery. The band advertises `0x180D` and its name starts with "Xiaomi Smart Band 10", so the plain service filter works.

One practical trap, seen during the test: while one device holds the connection (the phone's browser tab), the band did not show up in a scan from another device. **Only one thing connects to the band at a time.** For the demo, decide in advance whether that is the projector laptop or the phone.

**D1d. Two other routes were checked and rejected.** Locked.

| Route | What it would add | Why not |
|---|---|---|
| Xiaomi's proprietary protocol with the band's auth key (what Gadgetbridge does) | Steps, battery, on-demand SpO2 and stress, sleep history. No evidence of a raw accelerometer stream | Needs the key pulled from Xiaomi's cloud and the encrypted handshake plus message format written from scratch in browser JavaScript. Gadgetbridge's own Band 10 support is recent and marked experimental. None of those signals separates wired from tipsy better than the phone already does |
| Xiaomi Vela quick app (a small app running on the band itself) | The band's accelerometer, at up to about 50 Hz. This is the only route to it | On the Band 10, `fetch` is not supported, so data can only leave through `interconnect`, which needs a native Android companion app signed with the same certificate. Installing your own app on a real band needs a debug build of Mi Fitness that Xiaomi hands out through staff contacts. Sensors are not on the list of things allowed to run in the background. Not a one-day job, and not a web link |

The phone in the user's hand already gives accelerometer and gyroscope at about 60 Hz. The band's accelerometer would add a second view of the same tremor, at a very high price.

**D2. The band is never required.** Locked.
The "Connect band" entry is shown only when `navigator.bluetooth` exists, so iPhone users never see it. It is for the presenter's phone on stage.

**D3. Camera pulse drops below the room board and the band.** Locked. It stays a stretch goal. Refined on 21 Nov by D46: if built, it is an optional third step that is shown and never scored.

Notes for whoever writes `band.ts`:
- The charging cable carries power only. All data is Bluetooth.
- Other Xiaomi models do not work this way: Bands 4 to 7 put heart rate in advertising packets (Web Bluetooth cannot read those), and Band 8 accepts the subscription but sends nothing. Do not promise "any Mi Band".
- Keep a fallback to `acceptAllDevices: true` with `optionalServices: ['heart_rate']` in case the service filter returns an empty list.
- Add a 10 second no-data timeout. A subscription that succeeds silently is the known failure.
- Read bits 1 and 2 of the flags byte. `11` means the band is on a wrist; anything else means show "put the band on" instead of a number.
- Expect a reading every 1.4 s or so, not every second. Do not treat a 2 second gap as a dropout.

---

## Stack

**D4. React 19 + Vite 8 + TypeScript, single-page app, mobile first.** Locked.
~~Not an installable PWA: nobody installs an app in a two-minute demo, and a service worker is a cache bug waiting for demo time.~~ The PWA part was reversed the same night; see D4b.

**D4b. The app is an installable PWA.** Locked (Mike, 20 Nov, late).
People can add it to their home screen, with the logo mark as the icon. The link always works without installing; installing is an extra, never a step in the flow.
- What it needs: a web app manifest (name, icons at 192 and 512 plus a maskable one, `display: standalone`, theme and background colour from the housing token), an Apple touch icon, and the iOS meta tags.
- **Keep the service worker out, or make it do nothing.** The cache risk named in D4 is real: a stale cached build on demo day is the classic PWA failure. Current Chrome on Android offers install from a manifest alone, and iOS "Add to Home Screen" never needed one. If a service worker turns out to be required for the install prompt on some browser, use one that always goes to the network and caches nothing. **Verify on Saturday** on one Android and one iPhone.
- When to offer it: after the first result, as a quiet line ("Keep Dr. Bin Chicken on your home screen"). Never on Landing and never during the demo flow.
- Trap on iPhone: an installed app has its own storage, separate from Safari. A baseline recorded in the browser does not exist in the installed app, so the installed app starts at Landing again. Say so in the install line.

**D5. Hosting: Mike's server with Dokploy, behind the Cloudflare proxy.** Locked.
One Docker image serves the SPA and the API from the same origin. One replica, health check on `/api/health`.
- Why: Mike ships on this setup already, the server has plenty of room (4 ARM cores, 14 GB free, 187 days up), and a single Node process makes server state trivial.
- Costs we accept: about 200 ms per uncached request (the server is in Monterrey), about 2 minutes per deploy, and one point of failure.
- Rejected: Vercel Hobby, because it blocks deploys of commits from collaborators on private repos, and we are four people on a private repo.
- Emergency exit: Cloudflare Workers serving the static build plus the verdict route, without the room board. The server is written in Hono, which runs on both, so the move costs about 30 minutes. Trigger: no working public link by 9:00 Saturday.

**D5b. Deploy source: a private mirror repo under Mike's account.** Default.
Dokploy cannot see the team repo, because its GitHub App only reaches repos Mike owns. `git push deploy main` triggers the deploy. Alternative if Bharath is available: a deploy key and a webhook on the team repo.

**D5c. Domain: Mike buys one; buy it tonight if possible.** Default.
Many networks filter newly registered domains, and the auditorium wifi may be one of them. The 9:00 hello-world goes out on a subdomain of a domain Mike already owns. The new domain is added as a second domain on the same app, and the QR code points at it only after it passes on venue wifi and on mobile data.

**D5d. Phone testing during development uses a quick tunnel.** Locked.
Sensors need HTTPS and a deploy takes two minutes, so each developer runs `cloudflared tunnel --url http://localhost:5173` and tests with hot reload. Tunnels are for development only, never for the demo.

**D6. Server: Hono on Node, state in memory.** Locked.
Room board, per-device limits, global call counter and kill switch live in `Map`s in one module. No database, no volume. A redeploy clears the board, which is harmless: it refills in seconds and deploys freeze before the demo.

**D7. User data stays in `localStorage`, under one versioned key, `bc:v1`.** Locked.
Baseline, drinks and history never leave the phone.

**D8. One Claude call per check, model set by `VERDICT_MODEL`, default `claude-haiku-5-5`.** Verify.
Uses the official SDK. At roughly 400 input and 120 output tokens a call costs about $0.0001 on Haiku 5.5, $0.002 on Sonnet 5.5 and $0.004 on Opus 5.5. If Haiku is not funny enough, change the variable. Thinking off, `max_tokens` about 150.

**D9. `/api/verdict` accepts typed numbers only.** Locked.
The client never sends free text. Nobody can use our key as a chat proxy and there is nothing to inject.

**D10. Code decides the verdict and the nudge; Claude only writes the sentence.** Locked.
The safety line is fixed copy rendered by the app. Claude's output passes a server filter that drops anything like "fine / safe / ok to drive" and falls back to a canned line.

**D11. Limits: 12 calls per hour per device, 600 per hour per IP, 5,000 per day overall.** Locked.
The IP limit is high on purpose, because the whole auditorium leaves through one address. The real client address comes from `CF-Connecting-IP`. Worst case on Haiku is about $1.50 a day.

**D12. Degrade, never die.** Locked.
The result appears at once with a canned line chosen locally. Claude's line replaces it if it arrives within 4 seconds. A 429, a timeout or an exhausted key shows no error.

**D13. No real time.** Locked. The projector polls `GET /api/room` every 2 seconds. No websockets.

**D14. The room board is in scope, with a cut gate.** Locked.
If the core loop does not work end to end at 13:30, the board is cut without discussion. Reason it is in: without it the app fails two of the team's own five questions (see the check below).

---

## Product and scoring

**D15. Two tests, about 50 seconds per run.** Changed 21 Nov (was three tests: Steady Hand, Reaction Tap, Stroop).
- **Stand Still, 20 seconds.** Standing, feet together, phone held with both hands against the chest, eyes open. It measures the sway of the whole body.
- **Choice Tap, 2 warm-up taps plus 12 that count.** A 2 by 2 grid; tap the square that lights up. Median time and wrong squares.

Why the change, from the research in "Research results" below:
- Alcohol lowers hand tremor; what rises is whole-body sway. An 8 second hand hold measured the wrong part of the body.
- Simple reaction slows by only 14 to 25 ms at 0.05 to 0.08%, too little for 5 taps. A four-choice tap tracked alcohol far better in one small study.
- Stroop interference time does not change with alcohol, and the error effect is about 0.2 errors in 8 trials.

What is still our own compromise, to say out loud: the sway studies used 60 second trials on force plates, and we use 20 seconds on a phone. Holding a phone against the chest is a published balance protocol, but it was validated for concussion testing, not for alcohol.

**D16. Drift is normalised by each metric's noise floor.** Changed 21 Nov. Verify in the calibration block.
Starting values: sway 30%, choice time 12%, wrong squares 1. None of these has a direct source at our test lengths, so all three are calibrated on Saturday with sober repeats. The old reaction floor of 10% was too tight: with 5 taps, about a third of unchanged retests would have counted as drift. If D42 is accepted, each person's own spread between two baseline runs replaces these defaults.

**D17. One drift axis. The log names the cause.** Changed 21 Nov (was: wired and tipsy separated by frequency band).
The sensors answer one question: how far are you from your own normal. They do not tell caffeine from alcohol. The label comes from what the user logged.
- Caffeine and tremor: controlled studies disagree at 200 to 325 mg, and no study shows a caffeine effect with a phone. A phone cannot plausibly detect caffeine from a short hold.
- Chrome on Android rounds acceleration to 0.1 m/s², about the size of a normal hand tremor, so a tremor band there would be mostly rounding noise.
- Heart rate after caffeine goes up, down or nowhere depending on the study. After alcohol it rises about 5 bpm at group level. Neither is usable for one person.
- So the wired side rests on "caffeine on board" (D41), which is arithmetic from the drink log and better supported than any sensor reading.

This was the fallback already written in the verification table ("one drift axis; the drink log picks the label; say so in the pitch"). The pitch line stays: "we measure how far you have drifted, and your log says why".

**D18. The drink log picks the label.** Changed 21 Nov.
Drift with alcohol logged today is Tipsy. Drift with only caffeine logged is Wired. Drift with nothing logged gets a neutral stamp (default word: WOBBLY; the team picks). No drift is Steady.

**D19. Any alcoholic drink logged today puts the fixed no-driving line on every result, Steady included.** Locked.
No blood alcohol estimate is ever shown.

**D20. "Today" ends at 4:00 am, not midnight.** Locked.

**D21. Clean baseline.** Locked.
Recording a baseline starts with one tap: "Had anything yet today?". A yes marks the baseline as not clean and the result says so. Re-recording a baseline is blocked while drinks are logged today.

**D22. The board never rewards the biggest drift in real mode.** Locked.
Real mode shows the room mix and the steadiest hands. Only demo mode shows "dizziest after the spin". This keeps the brief's rule against anything that pushes people to drink more.

**D23. What reaches the board.** Locked.
A nickname generated on the client from fixed word lists (adjective plus animal, no free text, so nothing to moderate), the verdict, the score and the mode. Never drinks. On by default in demo mode with a visible notice and a one-tap opt-out; off by default in real mode.

**D24. Demo handicaps.** Locked.
Changed 21 Nov. Spin five times (raises body sway, stands in for Tipsy) and non-dominant hand (slows Choice Tap, the seated option). The result says which one it thinks you did: sway up means spin, taps slower means other hand. Demo verdicts are labelled as simulated. Jumping jacks are dropped as a stand-in for Wired, because Wired is no longer read from sensors (D17).

**D25. Without motion sensors the app still works.** Locked.
It runs Choice Tap alone, marked as a partial reading. Covers desktop, denied permission, in-app browsers and anyone who cannot stand for Stand Still.

**D41. Caffeine is an equal mode, and its strongest part does not depend on sensors.** Default (20 Nov, late).
Mike asked whether the caffeine side is viable, since most of the planning talk had been about alcohol. It is, with one honest limit.
- **What the evidence says (updated 21 Nov).** Alcohol and whole-body sway is established from about 0.05%. Caffeine and hand tremor is contested, and no study shows it with a phone. See D17 and "Research results".
- **What that changes.** The pitch says "we measure how far you have drifted, and your log says why", not "we detect caffeine". Wired is a label from the log, not a sensor reading.
- **What makes the caffeine side strong anyway: caffeine on board.** From the drink log alone, estimate how much caffeine is still in the body (it peaks about 45 to 60 minutes after the drink, then half of it is gone about every 5 hours; people vary from about 2 to 8, so draw a band, not a line) and draw it as a curve on chart paper, now and through the night. It gives the one nudge people actually use: "Half of this coffee is still with you at 10 pm." It is arithmetic, it needs no sensor, and it suits the design. Label it as a rough estimate.
- **Doses to start from** (FSANZ figures unless noted): instant coffee 80 mg per cup, black tea 50 mg, 250 ml energy drink 80 mg, 375 ml cola 36 mg. A cafe espresso shot measured on the Gold Coast averaged 106 mg and ranged from 25 to 214 mg, so the dose is the biggest error in the estimate. FSANZ gives 400 mg a day and 200 mg in one serving as recommended maximums for adults; say "recommended maximum", not "safe limit".
- **No such curve for alcohol.** An alcohol estimate would read as a blood alcohol figure, which D19 forbids.
- **A real experiment for the pitch.** On Saturday each of us records a baseline, drinks a coffee, and rechecks 45 minutes later. Whatever comes out is a true line for the stage, including "caffeine barely moved the needle; the spin did".
- **Order in the pitch.** Lead with Wired: at 5 pm in a hackathon the whole room has caffeine in it and almost nobody has had a drink yet. Tipsy is the second act, as the drinks arrive.

**D42. Record the baseline twice and keep the second run.** Proposed 21 Nov, waiting for the team.
The spread between the two runs becomes that person's own noise floor on that phone. It removes the first-run practice effect, which the research found to be as large as the alcohol effect itself, and it replaces guessed floors with a measured one. Cost: the baseline takes about 100 seconds instead of 50, which is tight for recording it during the pitch (D30). Until this is decided, treat "better than baseline" on the first two or three checks as learning, not as drift.

**D43. A fourth cause: tired.** Proposed 21 Nov, waiting for the team.
One tap for "when did you wake up", and a verdict for long hours awake (working word: FRIED) with a sleep nudge. Published work found that after 17 to 19 hours awake, performance on some tests was equal to or worse than at 0.05% (Williamson and Feyer, 2000, 39 people). It fits the room at 5 pm and Tanda's own industry, and it moves alcohol out of the headline.
- The label comes from hours awake, never from our tests: the validated fatigue test runs 3 to 10 minutes, and 90 second versions were already judged too insensitive.
- The cited figure is shown only when no alcohol is logged today, and only as a fact about hours awake. Our own result is never converted into a blood alcohol figure (D19).

**D44. Nothing in the app makes Tipsy a prize.** Proposed 21 Nov, waiting for the team.
In real mode the Tipsy ticket is the plainest one: no share button, no celebratory line. The ticket worth showing off is Steady. Water becomes a loggable drink with a good reaction from the mascot.

**D45. The camera is not used to read alcohol.** Locked 21 Nov.
Asked on Saturday after reading another team plan built on video magnification. Camera pulse is a weak, non-specific signal for us (see D17 on heart rate) and fragile hand-held in low light. Eye-movement signs are real but are research, not something reliable in a browser in a day. And a camera reading of "how intoxicated" would be the estimate D19 forbids. D3 stands.

**D46. Pulse from the camera is an optional third step. It counts a little and can never decide a verdict.** Default 21 Nov (first written as "shown, never scored"; changed the same day at Mike's request).
A teammate built a module ("the lens") that reads pulse from a fingertip held over the rear camera, and proposed it as a second tier of evidence, with beat-to-beat variability (rMSSD) as "the number alcohol moves". We checked that claim.
- **Pulse rate holds up.** A covered lens is the robust way to read pulse with a camera, and average pulse survives a low frame rate. Unlike the band, a judge can try it on their own phone, iPhone included.
- **rMSSD does not, at 30 seconds and 30 frames a second.** The validations against ECG used 5 minutes, stillness and either 240 frames a second or purpose-built processing. A frame lasts 33 ms, which adds about 24 ms of noise to a number that is usually 20 to 60 ms (derived). One bad beat changes the result a lot.
- **A before and after comparison cannot show alcohol.** The best awake estimate is an average drop of about 30% at 0.06%, with wide spread between people. Two unchanged readings 20 to 30 minutes apart already differ by about 21%, so one pair needs roughly a 58% change to count (derived). Posture alone moves it more than alcohol does. In the same study heart rate moved more than rMSSD.
- **So:** the step prints one row, "Pulse: 74 bpm". It is skippable in one tap, and a failed reading (lens not covered, low light, permission denied) never marks the result as partial. No variability figure is shown with an interpretation. The "three tiers that corroborate" framing is not used: it would be a stronger claim about alcohol than our evidence supports (D17, D19).
- **How it counts.** A raised pulse adds a small, capped amount to drift: `min(0.5, 0.5 * pos(d.hr))`, with a noise floor of 15% for `d.hr`, and only when both the baseline and the check have a pulse. The verdict threshold is 1.5, so pulse can tip a reading that sway and taps already put at 1.0 or more, and can never produce a verdict on its own. This is weighting a weak signal by how reliable it is. The basis: heart rate did rise after alcohol at group level (about 6 bpm, effect size 0.60), but two unchanged readings already differ by about 5%, which puts the smallest change one pair can show near 14% (derived), and walking to the stage raises pulse more than a beer does. It errs toward caution: a false push goes toward Tipsy with the ride-or-friend nudge, never toward Steady. A lower pulse never reduces drift.
- **When pulse is well above baseline (15% or more)** the ticket adds a tag, "Raised pulse: you may have just moved, read loosely".
- **In demo mode it brings jumping jacks back** (this amends D24). Exercise moves pulse by tens of beats, which the camera can see, so each handicap now belongs to one test: a spin to Stand Still, the other hand to Choice Tap, jumping jacks to Pulse. Jumping jacks stamp PUFFED (working word), not Wired.
- The 15% floor and the 0.5 cap are starting values. Calibrate them with five repeat camera readings per person before trusting them.
- The motion magnifier in the same module is a separate toy and is out of scope for Saturday.
- It is built only after the core loop works. It fills the existing `hr` field, so no contract changes.

**D47. The app is called Kachka, at `kachka.fun`.** Locked 21 Nov, 11:20, by the team.
It replaces the working titles Body Check and Buzz Check. The name lives in one constant; the mascot, the logo mark and the Seismograph look do not change. The domain was registered on build day, so D5c applies in full: test it on venue wifi and on mobile data before the QR is final, and keep the fallback subdomain ready.

**D48. Deploy as built.** Locked 21 Nov, 12:30. Replaces D5b (no mirror repo) and updates D5c.
- **Where:** `https://kachka.fun`, with `https://kachka.mikepineda.work` as the fallback. Both point at the same Dokploy application on Mike's server, behind Cloudflare.
- **How Dokploy gets the code:** it clones the team repo directly with a read-only deploy key. The private half was generated on the server and never left it. There is no mirror repo and no second remote.
- **What triggers a deploy:** a push to `main`. The GitHub Actions workflow runs the checks and then calls Dokploy's deploy webhook (secret `DOKPLOY_DEPLOY_URL`), so a deploy only starts when the checks pass. For this to work, Cloudflare's Bot Fight Mode is off on the zone that serves the Dokploy panel: with it on, Cloudflare answered the runner with a 403 challenge page. On the free plan that setting cannot be excepted for one path. A deploy can always be started by hand from the Dokploy panel.
- **The gate:** CI (`npm run check` and build) runs on every pull request. Wait for it to pass before merging, because merging is what deploys.
- **Secrets:** the Anthropic key and the room admin token live only in the Dokploy environment.
- **Cost of a redeploy:** the server restarts, so the room board and the in-memory limits reset. Freeze merges at 16:15 (D29).

---

## Process

**D26. `BRIEF.md` section 7 overrides `docs/03` section 6 and the README working agreements.** Locked.
Those say "public URL Friday night" and "feature freeze 10:00 Saturday". The team chose to plan tonight and build Saturday. The older docs are left as written.

**D27. Contracts first, written together.** Locked.
`shared/contracts.ts` and `src/engine/metrics.ts` are written on one screen, by the whole team, before anyone picks work (about 9:30, after breakfast and the votes). After that four people move in parallel.

**D39. The work is a menu of pieces, not four assigned lanes.** Default (Mike, 20 Nov, late; the team can change it).
An earlier draft had four fixed lanes by layer. Mike wanted his teammates to have as much freedom as possible, and did not want to end up orchestrating everything himself. So: about a dozen small pieces, each visible on stage and owned end to end by whoever picks it; Mike takes the plumbing and whatever is left. From 11:00 to 12:30 the team splits into two pairs, Team Stand and Team Tap (one per test), for calibration. The full list is in `docs/05-architecture.md`.
- Rejected: front end / back end / infra. The app is about 90% front end, so that split leaves one person swamped and two idle by 11:00.
- Rejected as the structure for the whole day: one pair on coffee, one on beer. Both modes share the tests, the screens and the engine, so two pairs would build the same thing twice. It is kept for the one block where the work really differs by drink.

**D40. Nothing is expected before 9:00.** Locked.
Breakfast and the organisers' kickoff take the first hour. Every gate moved accordingly; see `docs/05-architecture.md`.

**D28. One owner for `src/ui` and the design tokens.** Locked.
Screens use only those components. Without this, four Claude Code sessions produce four visual styles.

**D29. Deploy freeze at 16:15.** Locked. The commit of the last good build is written down so it can be redeployed from Dokploy.

**D30. The QR code is on screen from the first second of the pitch.** Locked.
People record their baseline while we talk. The two-minute play window is for the handicap and the recheck.

**D31. Visual direction: Seismograph.** Locked. See [`docs/design/DESIGN.md`](docs/design/DESIGN.md).
The app is a lab instrument that draws your movement on chart paper and prints the result as a till receipt. Chosen over three other directions (construction signage, pub coaster, carnival strength-tester) because the live sensor trace becomes the visual identity, which no other team will have. Mike asked for a look that does not resemble his earlier apps; this one drops their shared template entirely.

**D36. Tone and mascot: deadpan lab report, judged by Dr. Bin Chicken.** Locked, pending one check.
Mike asked for a funny theme with a mascot. The mascot is an Australian white ibis (Brisbane's "bin chicken") working as the lab tech. His beak is the recorder's pen, he has one mood per verdict, and he is the voice of every line Claude writes. The humour comes from official form around a silly question; safety copy is never part of the joke. Check: the Brisbane locals on the team confirm the joke lands.

**D37. Prototype in code, mocks in Stitch.** Locked.
The four hardest screens (Landing, Steady Hand, Result, Room) are a working HTML prototype (its Steady Hand screen predates D15: the trace now replays after Stand Still instead of drawing live) at `docs/design/prototype.html`, whose CSS becomes `src/ui/tokens.css`. Stitch is used for static mocks of the simpler screens. Where a Stitch mock and `DESIGN.md` disagree, `DESIGN.md` wins.

---

## AI features

Added late on Friday, after Mike confirmed the API key is in hand and asked for more than one AI feature. All are **Default**: the team confirms or cuts them on Saturday morning. D10 still holds for every one of them: Claude never decides a verdict and never writes the safety line.

| # | Feature | Where the room sees it | Priority | Cost shape |
|---|---|---|---|---|
| D8 | Verdict line | Each phone's result ticket | Must have | One call per check |
| D32 | Room commentator | Projector | In with the room board, cut with it | One call per ~25 s, whatever the crowd size |
| D33 | Snap a drink | Each phone, Log a drink | Stretch 1 | One call per photo |
| D34 | Night receipt | Each phone, from Home | Stretch 2 | One call per request |

**D32. Room commentator.** Default.
Claude writes one line about the room for the projector, from the board's aggregate numbers only (mix, count, top scores, trend since the last line). It is generated lazily: when `/api/room` is polled and the last line is older than 25 seconds. No viewers means no calls. This is the cheapest visible AI in the app, and its cost does not grow with the audience. If a call fails, the previous line stays.

**D33. Snap a drink.** Default.
On Log a drink, a camera button sends one photo; Claude answers with a drink kind from the same five-item list, or "not a drink". The user confirms with one tap before it is logged. Rules: the photo is shrunk on the phone (longest side 768 px) and is not stored anywhere; the response is forced to a closed schema, so the route is useless as a general vision proxy; limit 6 per hour per device; the screen says in plain words that the photo goes to Claude. The five tiles stay as the main path, and this never blocks logging. **Verify on Saturday** that the chosen model accepts images.

**D34. Night receipt.** Default.
From Home, "Print my night" sends today's checks and drinks (numbers and times only) and gets back a five-line summary, rendered as a long ticket that can be shared. Depends on keeping a short history in `bc:v1`.

**D35. The band's best use is on the projector.** Default.
Heart rate alone adds little to scoring. Its value is on stage: connect the band to the projector laptop (Chrome on macOS reads it, tested) and draw the presenter's live pulse on the room board. Timebox 45 minutes, after the core loop. Scoring with `hr` on the phone (D1b) comes second and only if time remains.

Revised stretch order: room commentator (with the board), snap a drink, band on the projector, night receipt, camera pulse, history view.

---

## Check against the team's five questions (`docs/03` section 4)

| # | Question | Answer | Depends on |
|---|---|---|---|
| 1 | QR to playing in under 10 seconds, no account? | Yes. Landing, one permission tap, first test. | |
| 2 | Better with 200 people than with 2? | Yes, only with the room board. | D14 |
| 3 | A complete round in under 90 seconds? | Yes: handicap plus recheck is about 55 s once the baseline is done during the pitch. Cold, it is about 95 s. | D30 |
| 4 | Can the room see something happen without narration? | Yes, only with the room board on the projector. | D14 |
| 5 | If the API dies mid-demo, does it keep working? | Yes. | D12 |

If the board is cut at 13:30, questions 2 and 4 become "no". That is the price of the cut, and the reason the board is the first thing after the core loop.

---

## To verify on Saturday

| When | Check | Decision it supports | If it fails |
|---|---|---|---|
| 9:00 | The public link opens on every teammate's phone, wifi off | D5 | Emergency exit to Workers |
| 11:00 | DeviceMotion sample rate on one iPhone and one Android (expect about 60 Hz) | D15 | Sway needs little; below 15 Hz drop confidence one step |
| 11:00 | Raw motion values on Android Chrome: is acceleration rounded to 0.1 m/s² and rotation rate to 0.1 deg/s, as Chromium's source says | D15 | Sway is computed from rotation rate, which has finer steps relative to the signal; if both are too coarse, lengthen Stand Still |
| 11:00 | The start and end beeps of Stand Still are audible on an iPhone with the silent switch on | D15 | Tell the user to count to 20; the run ends on its own |
| 11:00 | The link opened from inside Slack on iPhone and Android still gets motion data | D25 | "Open in Safari / Chrome" button becomes the main path |
| 11:00 to 12:30 | Noise floors for sway, choice time and wrong squares from ten sober repeats | D16 | Adjust the starting values |
| 11:00 to 12:30 | A spin raises sway well past the floor, and the other hand slows Choice Tap past its floor | D24 | Keep only the spin; drop the guess line |
| 11:00 to 12:30 | Is 20 seconds of Stand Still repeatable enough, or does it need 30 | D15 | Lengthen it and shorten Choice Tap to 10 taps |
| Before building D46 | On a real iPhone: does `applyConstraints` with `torch` turn the light on, and does a covered lens give a pulse without it | D46 | On iPhone the step asks for good light; if that fails too, hide it on iPhone |
| First verdict call | Haiku 5.5 with thinking off: latency, tone, cost per call | D8 | Raise to Sonnet 5.5 or tune the prompt |
| Before building D33 | The verdict model accepts image input | D33 | Use Sonnet 5.5 for that route only, or cut the feature |
| Before the QR is final | New domain loads on venue wifi and on mobile data | D5c | QR points at the fallback subdomain |

---

## Research results (Saturday 21 Nov, morning)

Three research subagents ran in the background from 9:12. Each was told not to confirm our guesses unless the sources did. The readings below are theirs; several sources were available only as abstracts, and they marked which. Figures they derived themselves are marked "derived".

**Limits that stay:** this is a toy. Research is for choosing better signals, never for adding a medical or legal claim, a blood alcohol estimate, or anything that tells someone they can drive.

### Alcohol

| Finding | Status | Source |
|---|---|---|
| Whole-body standing sway rises from about 0.05% (effect size 0.72 to 0.77 at 0.05%, 1.34 to 1.50 at 0.08%, eyes open, 60 s trials, force plate, 24 people) | Established | [Jongen 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC4039994/) |
| Side-to-side sway is hit harder than front-to-back | One lab, abstract only | [Modig 2012](https://pubmed.ncbi.nlm.nih.gov/22197507/) |
| Below about 0.05% the effect is inconsistent, and some people sway less | Abstracts only | [Kubo 1989](https://pubmed.ncbi.nlm.nih.gov/2635513/), [Nieschalk 1999](https://pubmed.ncbi.nlm.nih.gov/10433036/) |
| Alcohol reduces physiological hand tremor | Abstract only | [Lakie 1994](https://doi.org/10.1113/expphysiol.1994.sp003763) |
| Simple reaction time slows 14 ms at 0.05% and 25 ms at 0.08%, on a 261 ms mean | Established, small | Jongen 2014 |
| A four-square choice tap tracked alcohol at r = 0.94 to 0.97, against 0.60 to 0.65 for simple reaction. With a single sober baseline, specificity fell to about 62% | One study, 14 people | [Drunk User Interfaces](https://ubicomplab.cs.washington.edu/pdfs/dui.pdf) |
| Stroop interference time is not affected by alcohol; only accuracy drops, by 1 to 3 points over 60 trials | 216 people | [Bartholow 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC5991490/) |
| Heavier drinkers show less impairment on the same dose and feel less impaired | Abstract only | [Didier 2023](https://doi.org/10.1111/acer.15080) |
| No test under 15 seconds is validated for telling sober from 0.05 to 0.08% in one person | Nothing found | |

What this means for the app: with one or two drinks, the expected reading is Steady. A tolerant drinker can read Steady while impaired. Both are reasons the Steady ticket never reads as clearance (D19).

### Caffeine

| Finding | Status | Source |
|---|---|---|
| Tremor after caffeine: no rise at 325 mg in one study, a rise at about 200 mg in another, not significant in a third (+31% against +15% on placebo) | Contested | [Koller 1987](https://pubmed.ncbi.nlm.nih.gov/3796831/), [Miller 1998](https://pubmed.ncbi.nlm.nih.gov/9493502/), [Humayun 1997](https://pubmed.ncbi.nlm.nih.gov/9076210/) |
| No study shows a caffeine effect measured with a phone | Nothing found | |
| Reaction time gets faster by about 17 ms in rested non-users (spread between people 58 ms) | Established, small | [Rogers 2013](https://research-information.bris.ac.uk/ws/files/59709227/Faster_but_not_smarter_Psychopharm_final_revision.pdf) |
| Heart rate falls, rises or does not change, depending on the study | Contested | [Whitsett 1984](https://pubmed.ncbi.nlm.nih.gov/6702647/), [Gualberto 2024](https://pubmed.ncbi.nlm.nih.gov/37695306/) |
| Peak about 45 to 60 minutes after drinking; half-life about 4 to 5 hours, range 2 to 8; shorter in smokers, about double on oral contraceptives, much longer in pregnancy | Established | [EFSA](https://www.efsa.europa.eu/sites/default/files/corporate_publications/files/efsaexplainscaffeine150527.pdf), [Temple 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5445139/) |
| Drink contents and the 400 mg a day, 200 mg a serving recommended maximums | Established | [FSANZ](https://www.foodstandards.gov.au/consumer/prevention-of-foodborne-illness/caffeine), [Desbrow 2007](https://pubmed.ncbi.nlm.nih.gov/17412475/) |

### Making short tests trustworthy

| Finding | Status | Source |
|---|---|---|
| Trial-to-trial variation in reaction time is 19 to 22%. For 5 trials that gives about 13 to 15% between two unchanged runs (derived) | Established; the last step is derived | [Woods 2015](https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2015.00540/full) |
| The first run is slower than the second from practice alone (about 7% in a 5-trial phone test) | Established in direction | [Burghart 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC7309344/), [Del Rossi 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC4080596/) |
| Phone against the chest, 10 seconds per stance, gives a repeatable balance score (ICC 0.62 to 0.83 per stance) | Validated for balance, not for alcohol | [Caccese 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9667020/) |
| Time-based scores repeat better than count-based scores in 9 to 12 trial phone tests (ICC 0.82 to 0.91 against 0.44 to 0.61) | One study | [NeuroUX 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11629032/) |
| A constant timing offset of 58 to 70 ms in phone browsers cancels against a baseline on the same phone | Established | [Pronk 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7280355/) |
| Time of day moves reaction time by 3.5 to 9% | One study | [Facer-Childs 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6200828/) |
| Chrome delivers motion at 60 Hz and rounds acceleration to 0.1 m/s² and rotation rate to 0.1 deg/s. Safari delivers 60 Hz; its rounding was not checked | From source code, not measured on a phone | [Chromium](https://github.com/chromium/chromium/blob/main/services/device/generic_sensor/platform_sensor_util.h), [WebKit](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/ios/WebCoreMotionManager.h) |
| The validated fatigue test runs 3 to 10 minutes; 90 second versions were judged too insensitive | Established | [Basner 2011](https://pmc.ncbi.nlm.nih.gov/articles/PMC3197786/) |

### Fatigue (found while reviewing D43)

| Finding | Status | Source |
|---|---|---|
| After 17 to 19 hours without sleep, performance on some tests was equal to or worse than at 0.05% (39 people, Australian transport and army staff) | Established for those tests | [Williamson and Feyer 2000](https://pmc.ncbi.nlm.nih.gov/articles/PMC1739867) |
| The original comparison of fatigue with alcohol | The paper exists; its figures were not read in full text | [Dawson and Reid 1997](https://www.nature.com/articles/40775) |

### Pulse and beat spacing from the camera (checked for D46)

| Finding | Status | Source |
|---|---|---|
| At about 0.06%, seated, 10 minutes after drinking: rMSSD fell from 59.0 to 41.5 ms (effect size 0.42) and heart rate rose from 66.9 to 72.8 bpm (effect size 0.60); 72 people, wide individual spread | Group effect is real; other studies did not replicate or found the opposite | [Buckman 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4971776), [Leganes-Fonteneau 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC7889700) |
| Two 5-minute lab readings 20 to 30 minutes apart, nothing changed: rMSSD differs by 21% (typical error) | One study, 31 people | [Cipryan 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC5260644) |
| 30 seconds against the 5-minute standard: agreement limits of about 0.62 to 1.40 times the true value (derived from the reported log limits) | Contested; 60 s is the shortest some accept | [Esco and Flatt 2014](https://www.jssm.org/jssm-13-535.xml-abst), [Shaffer 2020](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2020.594880/full) |
| Phone-camera rMSSD matches ECG at 5 minutes, still, with 240 frames a second or app-grade processing | Established for those conditions only | [Banhalmi 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC5832098), [Plews 2017](https://pubmed.ncbi.nlm.nih.gov/28290720/) |
| Caffeine and rMSSD: no change to a small rise | Contested | [Rauh 2006](https://pubmed.ncbi.nlm.nih.gov/16640511/), [Glaister 2025](https://pubmed.ncbi.nlm.nih.gov/39008947/) |
| No published study detects drinking in one person from an awake phone-camera or pulse-only reading | Nothing found | |
| Safari on iOS gained torch support in WebKit in October 2023, and a bug that reported its state wrongly was fixed in December 2024. Shipping versions were not confirmed | From the WebKit bug tracker, not tested on a phone | [Bug 262131](https://bugs.webkit.org/show_bug.cgi?id=262131), [Bug 280970](https://bugs.webkit.org/show_bug.cgi?id=280970) |

## Open questions

| Question | Default | Owner |
|---|---|---|
| Name and domain | **Decided: Kachka, `kachka.fun`** (D47) | Done |
| Which domain, bought when | Tonight, on Cloudflare Registrar | Mike |
| Mirror repo or deploy key | Mirror repo | Mike, Bharath |
| Confirm or cut the extra AI features (D32 to D35) | In, in the stretch order listed | Team, after breakfast |
| Who picks which piece | The menu in `docs/05-architecture.md` | Team, 9:30 |
| Record the baseline twice (D42) | Yes | Team |
| Add "tired" as a cause (D43) | Yes, if someone wants the piece | Team |
| Keep the Tipsy ticket plain and add water to the log (D44) | Yes | Team |
| The stamp word for drift with nothing logged (D18) | WOBBLY | Team |

---

## Facts checked on Friday

| Fact | Source |
|---|---|
| Saturday: 8:00 kickoff, 12:30 lunch, 16:30 spectators arrive, 17:00 demos (90 minute cap), 19:30 winners | Kickoff deck, slide 7 |
| Prizes: a year of Claude each for first place, $50 each for the runner-up | Kickoff deck, slide 5 |
| The team's Anthropic API key has been collected from Philip | Mike, Friday night |
| Smart Band 10 has an on-band Share HR toggle and serves `0x2A37` over a normal connection | Pulsoid guide; Tnze/miband-heart-rate code; confirmed on the device |
| A `services` filter matches only advertised services | MDN, Chrome docs |
| Vercel Hobby blocks collaborator commits on private repos | Vercel docs, "troubleshoot project collaboration" |
| The Anthropic TypeScript SDK supports Node 20+, Cloudflare Workers and Vercel Edge | SDK README |
| Haiku 5.5 $0.10 / $0.50, Sonnet 5.5 $2 / $10, Opus 5.5 $4 / $20 per million tokens | Claude API reference, cached 3 Nov 2026 |
| iOS Safari supports the camera torch, but reports its state wrongly | WebKit bugs 243075, 280970 |
| Caffeine and tremor: evidence is mixed. No tremor increase after a single 325 mg dose in one study; dose-dependent loss of hand steadiness in others, mainly after hours of abstinence | PubMed 3796831, 15696321, 8577796; Springer BF00547366 |
| Server: Oracle `mx-monterrey-1`, ARM, 4 cores, 23 GB RAM; about 207 ms per round trip from Brisbane | Read-only check over SSH, timed from Mike's laptop |
| Versions: hono 4.13.19, vite 8.3.8, react 19.3.1, `@anthropic-ai/sdk` 1.11.0, node 22 | `npm view` |
