# Body Check: hackathon brief for Claude Code

Working title: **Body Check**. Name candidates: Brewalyzer (tagline "Wired or wasted?"), Buzz Check. Not decided yet.

Tonight (Friday) is for thinking, not coding. The goal is to arrive Saturday 8am with three things decided:

1. Is the Mi Band usable? (research and, if needed, light reverse engineering, timeboxed)
2. The stack
3. The screens and the flow

---

## 1. The event (Tanda Hackathon 2026)

- **Theme:** "Bring an idea to life". Build something people can pick up and try, not just watch.
- **Build window:** Saturday 21 Nov, 8:00am to 4:30pm. One day.
- **Deadline:** post the link in #showcase by 4:30pm Saturday. Demos at 5:00pm.
- **Demo format:** 2 slides, about 2 minutes to pitch, 2 minutes for the room to play. Judges try every project before deciding.
- **Counts as brought to life:** a link judges open on their own phone, something the crowd can play with, something that works end to end.
- **Does not count:** slides, screenshots or video, a form that saves to nowhere, something only our team can run.
- **Network:** the auditorium has its own network and not everyone will be on it. Test on mobile data too.
- **Claude API:** one key per team with US$150. Our users spend it too, so cap requests. Never commit the key.

### Judging criteria (equal weight)

| Criterion | What judges look for |
|---|---|
| Idea and imagination | A creative idea: useful, silly, surprising or playful |
| Execution and craft | The core thing works, sensibly scoped, with details that stand out |
| Interactivity | Hosted, and people can use it themselves |
| Technical ingenuity | Clever answers to hard problems, not complexity for its own sake |
| Presentation and demo | Explain it clearly, show it well, get the room excited |

---

## 2. The product

**One line:** what is in your system, and how is it hitting you? Log a coffee or a beer, run a 30 second check on your phone, and see how far you have drifted from your own baseline.

**Two modes, same engine:**
- **Wired** (caffeine): are you over-caffeinated?
- **Tipsy** (alcohol): have you had too much?

**Core loop**
1. Record a personal baseline once (about 30 seconds).
2. Log a drink in one tap (coffee, energy drink, beer, wine, spirit).
3. Run a check: the same short tests as the baseline.
4. See the result as drift from your own baseline, per test and overall.
5. Get a nudge: water, slow down, no more coffee after this, call a ride, ping a friend.

**The clever part (technical ingenuity answer):** no generic thresholds. Every result is relative to the user's own baseline, and the pattern across tests tells the two states apart.

### The tests (all run in the browser on any phone)

| Test | Sensor | Measures |
|---|---|---|
| Steady Hand | DeviceMotion (accelerometer, gyroscope) | Tremor and sway while holding the phone still for 10s |
| Reaction Tap | Touch + timer | Simple reaction time over 5 taps |
| Stroop | Touch | Attention and inhibition: errors and time |
| Pulse (optional) | Rear camera, finger on lens | Heart rate estimate from brightness changes |

### Telling wired from tipsy (working heuristic, to validate, not medical)

| Signal | Wired | Tipsy |
|---|---|---|
| Fine tremor | Up | Little change |
| Sway and wobble | Little change | Up |
| Reaction time | Same or faster | Slower |
| Stroop errors | Little change | Up |
| Heart rate | Up | Up or variable |

Start rule-based. Do not train a model.

### Where Claude fits

Send the numbers (drift per test, drinks logged, time of day) to Claude and get back a short, funny, personalised verdict and nudge. Keep it to one call per check, behind a server route, with a per-device rate limit.

### Hard rules on framing

- It is a wellness toy, not a medical or legal measurement.
- **Never** tell anyone they are fine to drive. If tipsy signals show up, the nudge is always a ride or a friend.
- No punishments that push people to drink more.
- No accounts and no personal data on the server. Baseline lives on the device.

---

## 3. Mi Band: research task for tonight

**Timebox: 60 minutes.** The band is a bonus signal for the stage demo. Judges will not have one, so it must never be required.

**Known so far**
- Dev phone is a OnePlus 12 (model CPH2581), so Chrome on Android with Web Bluetooth is available for testing.
- Web Bluetooth needs HTTPS and a user tap to start a scan. It does not work on iPhone.
- The band model is unknown. Step 1 is finding it.
- Reports say newer Xiaomi bands can share heart rate as a standard Bluetooth heart rate sensor when a setting is turned on. On Smart Band 10 it is under Settings > Share HR on the band. On Smart Band 6 it is an option in the official app. For Bands 7, 8 and 9 the method has changed over time and needs checking.

**Steps**
1. **Find the model.** Check the Mi Fitness or Zepp Life app device page, the band's Settings > About, or the engraving on the back.
2. **Look for heart rate sharing.** On the band: Settings, look for "Share HR" or "Heart rate broadcast". In the app: device settings. Some models only broadcast during a workout.
3. **Check with nRF Connect** on the OnePlus 12. Scan, find the band, and look for the Heart Rate service (UUID `0x180D`) with the measurement characteristic (`0x2A37`). Subscribe and confirm values arrive.
4. **If the service is there:** write a one-page Web Bluetooth test on HTTPS. `navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] })`, connect, subscribe to `heart_rate_measurement`, parse the flags byte (bit 0 says whether the value is 8 or 16 bit).
5. **If it is not there:** the alternative is the proprietary protocol with an auth key (the Gadgetbridge route). That is out of scope for one day. Stop.

**Go / no-go**
- **Go:** standard heart rate service visible and readable from Chrome in under an hour. Add a "Connect band" bonus screen.
- **No-go:** anything that needs auth keys, a native app or pairing hacks. Use the camera pulse test instead, which judges can also try.

**Sources**
- OnePlus 12 model number: https://deviceatlas.com/device-data/devices/oneplus/cph2581/76399593
- Web Bluetooth support and requirements: https://developer.chrome.com/docs/capabilities/bluetooth
- Heart rate sharing per Xiaomi band model: https://www.blog.pulsoid.net/post/how-to-use-xiaomi-mi-band-3-with-android-pulsoid-app
- Smart Band 6 heart rate broadcast demo: https://github.com/Tnze/miband-heart-rate
- Smart Band 8 notification issues: https://devzone.nordicsemi.com/f/nordic-q-a/113028/issues-enabling-notifications-for-heart-rate-measurement-on-xiaomi-band-8-using-gatttool

---

## 4. Stack: recommendation to confirm tonight

Constraints that drive it: must be a link, must run on iPhone and Android browsers, sensors need HTTPS, the API key must stay server side, one build day.

| Layer | Recommendation | Why |
|---|---|---|
| App | Web app (PWA), mobile first. Vite + React + TypeScript, or Angular if the team is faster in it | A link is the requirement. Pick the framework the team already knows |
| Hosting | Vercel or Cloudflare Pages | HTTPS by default, deploys from git in minutes |
| Server | One serverless function that proxies Claude | Hides the key, enforces the rate limit |
| Storage | localStorage on the device | No accounts, no database, nothing to break |
| Sensors | DeviceMotion, getUserMedia (camera), Web Bluetooth (bonus) | All browser APIs |
| Real time | None for v1 | Only add if a shared leaderboard makes the cut |

**To decide tonight**
- Framework: React or Angular (team skills decide).
- Whether a shared room and leaderboard is in scope. Default: no.
- Camera pulse test: in or out. Default: stretch goal.

**Known browser traps**
- iPhone needs `DeviceMotionEvent.requestPermission()` called from a tap, on HTTPS.
- Camera torch control is not available on every phone. The pulse test must degrade gracefully.
- Sensor sample rates differ per phone. Normalise against the user's own baseline, never across users.

---

## 5. Screens and flow

1. **Landing.** Name, tagline, one button: Start. Short disclaimer line.
2. **Permissions.** One tap to allow motion sensors. Explains why.
3. **Baseline.** Steady Hand, Reaction Tap, Stroop. About 30 seconds. Saved on device.
4. **Home.** Two big actions: Log a drink, Run a check. Shows today's drinks.
5. **Log a drink.** One tap per drink type. No forms.
6. **Check.** Same three tests, with a progress indicator.
7. **Result.** Verdict (Steady, Wired, Tipsy), drift per test against baseline, Claude's line, and the nudge.
8. **Demo mode.** For judges with no baseline history: record baseline, then do a handicap (spin 5 times, or use the non-dominant hand), then recheck and watch the score drop.
9. **Connect band (bonus).** Only if the research says go.

Flow: Landing → Permissions → Baseline → Home → (Log a drink | Check → Result) → Home.
Demo flow: Landing → Permissions → Baseline → Handicap → Check → Result.

---

## 6. Scope

**Must have by 3pm**
- Hosted link, works on iPhone and Android
- Baseline, three tests, result with drift
- Drink logging
- Demo mode
- Claude verdict with rate limit

**Stretch**
- Camera pulse
- Mi Band heart rate
- History view
- Shared leaderboard

**Out**
- Accounts, native app, any medical claim, any model training

---

## 7. Saturday plan

| Time | Goal |
|---|---|
| 8:00 | Kickoff, split work |
| 10:00 | Deployed to HTTPS, motion permission working on one iPhone and one Android |
| 12:30 | Core loop works end to end (lunch) |
| 15:00 | Feature freeze |
| 15:00 to 16:15 | Polish, test on the auditorium network and on mobile data, write the 2 slides |
| 16:30 | Link posted in #showcase |
| 17:00 | Demos |

---

## 8. Suggested first prompts for Claude Code

1. "Read BRIEF.md. Research section 3 for my band model, then give me a go or no-go."
2. "Confirm the stack in section 4 and scaffold the project with a deployed hello world."
3. "Build the three tests as isolated modules that each return raw numbers, with a test page for each."
4. "Build the baseline and drift scoring, then the result screen."
5. "Add the Claude verdict route with a per-device rate limit."

---

## Addendum (Friday 20 Nov, planning session)

Sections 3, 4 and 5 were worked through on Friday night. Where this brief and the outcome differ, the outcome wins:

- Decisions and their reasons: [`DECISIONS.md`](DECISIONS.md)
- Screen-by-screen spec: [`docs/04-screens-spec.md`](docs/04-screens-spec.md)
- Architecture, contracts and how the work is split: [`docs/05-architecture.md`](docs/05-architecture.md)
- Visual direction and prototype: [`docs/design/DESIGN.md`](docs/design/DESIGN.md)
