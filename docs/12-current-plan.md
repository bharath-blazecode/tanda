# 12 — Current plan

**Status as of Saturday 21 Nov, 10:42 AEST.** Link due in `#showcase` at **16:30** — **5 h 48 m left**.

---

## 1. Where we are

| | |
|---|---|
| ✅ **Building** | **Buzz Check** — Tier 1 (phone sensors) + Tier 2 (the lens). Both prototypes exist and work. |
| ⏸️ **On hold** | **Tier 3, the ring.** Team is still verifying whether the data is really there. Explicitly off the critical path. |
| ❓ **Open** | **The name.** "Buzz Check" is a working title. Domain to be bought once it's settled. |
| 🔴 **The risk** | **Neither Tier 1's motion sensors nor Tier 2's camera work inside the claude.ai artifact viewer.** Hosting is not a finishing touch. It *is* the project. See §4. |

## 2. The two artifacts

### `BUZZ CHECK — THE WHOLE FLOW` (Tier 1)
**Artifact:** `claude.ai/artifact/PxjfUo9T94tEkLCm1eNk3z` · Model BC-2 · built by the team

A walkable prototype of the entire product. Eleven screens: Start → Setup (motion permission, then
record your normal, ~50 s) → Home with a caffeine estimate and drink log → Log a drink → Check (two
tests) → printed Result → Demo mode → Specimens → Room board.

- **Scoring:** drift from your own baseline, shown as a multiplier where `1.00x` is normal.
- **Verdicts:** Steady · Wired · Tipsy · Wobbly.
- **Choice Tap** is real and timed on-device. **Body sway is currently simulated**, because the page can't reach motion sensors in that viewer.
- **Room** is a live board with per-category counts and latest readings. Demo readings are stamped simulated.
- **Design system** — this is the house style and everything else matches it: dark housing `#1E2A27` on a bench `#121A18`, chart paper `#EEF2E6` with a 40 px / 8 px grid for traces, receipt paper `#FAFAF4` for anything printed, one red stamp `#C3273B`, blue pencil `#2E5FB5` for the baseline line. Big Shoulders Display for headings, Courier Prime for everything else. A bin chicken signs the readings.
- **Voice:** deadpan, short, honest. *"A toy, not a test. For adults."* *"Not a driving test. If you're going anywhere, get a ride or a friend."*

### `BUZZ CHECK — THE LENS` (Tier 2)
**Artifact:** `claude.ai/artifact/1S1tCjbbQxQF2u7MS4BimT` · Model BC-2 · Tier 2

The camera module, in the same chassis. Six screens: Start → How → Read → printed Reading →
Magnify → Notes.

**Pulse — a real measurement**
1. 48×48 centre crop of each frame → mean R/G/B.
2. **Coverage gate** — redness ratio and darkness. An uncovered lens reads *"Cover the lens"* rather than inventing a heartbeat.
3. Resample to 30 Hz on real timestamps → detrend against a 1.5 s moving average → light smoothing → **invert**, because blood absorbs light so the beat is a *dip*.
4. **BPM by autocorrelation** across the 40–180 bpm band — not peak counting. Autocorrelation survives a noisy trace; peak counting doesn't.
5. Beats detected with a refractory period tied to the autocorrelation period, so it can't double-count → **rMSSD**.
6. **Confidence** = height of the autocorrelation peak. Below 0.35 it prints a red *Low signal* stamp instead of quietly showing a number.
7. Live trace drawn on the chart window while it reads.

**Verdict logic** uses the two-signal shape from `docs/10`: pulse up and spacing holding → **Wired**;
spacing flattened against your normal → **Tipsy**; pulse well up → **Wobbly**; otherwise **Steady**.
Every reading closes with *"One channel. The tap test and the sway test still decide."*

**Magnifier (the UNSEEN idea)** — a one-pole lowpass per pixel builds a "still" frame, then
`mean + (current − mean) × gain` with a 2–40 slider. Movement too small to see becomes visible.
Labelled honestly on the Notes screen: *"The pulse is measured. The magnifier is a picture."*

**Dual input.** Tries the live camera; when it's refused, falls back to record-a-clip-and-drop-it-in,
which works inside the viewer. Identical analysis on both paths. Hosted on our own domain, the live
button lights up by itself with no code change.

## 3. On hold — Tier 3, the ring

The team is checking whether the wearable data is genuinely there before committing. **Correct call,
and it is not on today's critical path.** Everything found so far:

- `docs/09` §Idea 3 — the idea and its risks
- `docs/10` — what actually detects alcohol and caffeine (physiology still valid)
- `docs/11` — the Kmart ring: JRing/56ff, HRV ✅, SpO₂ ✅, blood pressure ✅, **skin temperature ❌**, and the standard-BLE shortcut
- **Shareable dossier:** `claude.ai/artifact/R3XmooEsVLgv4nF1oQzKMM` — every claim with its source, confidence, and how to verify it

**If it lands, it slots in as Tier 3 with no redesign** — the tier architecture was built for exactly
this. **If it doesn't, we lose nothing**, because Tiers 1 and 2 are a complete product on their own.

## 4. 🔴 The one thing that actually matters today

Both headline features are blocked in the artifact viewer:

| Feature | In the artifact | Hosted on our own domain |
|---|---|---|
| Body sway (Tier 1) | ❌ simulated | ✅ real |
| Camera pulse (Tier 2) | ⚠️ clip only | ✅ live |
| Magnifier (Tier 2) | ⚠️ clip only | ✅ live |

The claude.ai artifact sandbox grants no camera and no motion capability. **So the artifacts are
excellent prototypes and cannot be the thing we hand the judges.** The brief is explicit — *"a link
the judges open on their own phone"*, and *"something only your team can run"* doesn't count.

**Deploy to a free host now. Do not block on the domain.**
Vercel, Netlify or Cloudflare Pages gives a public HTTPS URL in about ten minutes with nothing bought.
Buy the domain when the name is settled and point it at the same deployment later — **DNS propagation
is not a risk worth carrying at 16:00.** A working `something.vercel.app` beats a half-propagated
custom domain every time.

## 5. What's left — ordered

| # | Job | Why it's in this position |
|---|---|---|
| **1** | 🚨 **Deploy to a public HTTPS URL** | Nothing else counts until this exists. Free host, no domain. |
| **2** | **Wire real motion into Tier 1** | `DeviceMotionEvent.requestPermission()` **must be called from a tap on iOS 13+**, or it silently does nothing on every iPhone. Replace the simulated sway. |
| **3** | **Test on real phones over mobile data, wifi OFF** | iOS *and* Android. The auditorium has its own network and not everyone will be on it. |
| **4** | **Merge the two into one link** | Judges get one URL. Fold the lens in as Test 3 of 3, or at minimum one page that opens both. |
| **5** | **Seed a demo state** | A judge opening it cold must not see an empty shell. Example readings, clearly marked. |
| **6** | **Slides + two rehearsals on a stopwatch** | 2 slides, ~2 min pitch, 2 min for the room. Rehearse at 15:00 at the latest. |
| **7** | **Name + domain** | Nice to have. Only after 1–6. |

## 6. Revised gates for the rest of today

The original 10:00 feature freeze has passed. Replacement, working backwards from 16:30:

| Time | Gate |
|---|---|
| **11:30** | 🚨 **Public URL live.** Whatever is deployed at 11:30 is the deployment target for the rest of the day. |
| **12:30** | Real motion working on a real iPhone over mobile data. Lunch. |
| **13:30** | 🔒 **Hard feature freeze.** Both tiers behind one link. Nothing new after this — polish, seeding and hardening only. |
| **14:30** | Ten people, their own phones, iOS and Android. Fix only what breaks. |
| **15:00** | Slides done. First rehearsal on a stopwatch. |
| **15:45** | Second rehearsal. Someone outside the team tries to break it. |
| **16:00** | **Post the link.** Thirty minutes of buffer is the point of posting early — keep polishing behind the same URL. |
| **16:30** | Deadline. Demos 17:00. |

## 7. Two decisions to make before 13:30

1. **Does the lens merge into the flow, or stay a second link?** Merging is better for judging, and the flow already has a "Test 1 of 2" idiom that becomes "1 of 3". Costs maybe an hour.
2. **The name.** "Buzz Check" is already on every screen and in the voice. **Changing it now costs time and buys nothing today.** Recommendation: ship as Buzz Check, rename later if the domain forces it.

---

*Both artifacts are private. Share from each page's Share menu before sending links to anyone outside
the team.*
