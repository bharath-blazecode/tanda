# 05. Idea Pool 2 (Scorecard), uniqueness audit, and the merge

> **TL;DR**: The six scorecard ideas are *useful*, which the previous pool wasn't. But they're all
> **single-user utility apps**, which is even further from *"a multi-player game, tool or toy the
> crowd can play with"* than the last set. Four depend on the Mi Band, which I've verified is the
> weakest link available. **Scam Shield's "fresh: 2" is, if anything, generous: Hiya and Google
> Pixel already ship exactly it.** The way out is a merge: **`COOKED`**. The room measures its own
> impairment, then gets scammed, and we show live that the tired half got conned more. It folds four
> of your six ideas into one, runs on 100% of devices, and produces a real finding, not a demo.

---

## 1. The six, and are they actually unique?

You asked specifically about uniqueness. Honest verdicts, with evidence where I could find it.

| Idea | Unique? | Verdict |
|---|---|---|
| **Icebreaker Lens** | **Low** | "AI reads a stranger and tells you what to say" is a well-worn viral genre. Your own card gives it `safe: 1` (the lowest score of anything on the board), which reflects that risk. Photographing non-consenting strangers, at a corporate-hosted event, in front of 200 people, is a risk Tanda's own staff will feel. **Don't build it as specified.** The *goal* is salvageable (see §3.3). |
| **Drunk Check** | **Medium** | Smartphone impairment sensing is an active published research area, so not new as a concept. The real problem is different: **a false negative means someone drives.** You can't validate it in 23 hours, and any judge who thinks for five seconds will ask how you validated it. Also depends on Mi Band. **Don't ship a judgment. Ship a measurement** (§3.1). |
| **Caffeine Check** | **Low–Med** | Your own risk note is the killer and it's correct: caffeine, stress, and a bad night's sleep are near-indistinguishable from heart rate alone. You'd be inferring a cause you can't separate. |
| **Scam Shield** | **Low** ⚠️ | **Verified: this already exists, shipped, at scale.** Hiya does real-time in-call scam-tactic alerts; Google's Phone app runs Scam Detection on-device with Gemini Nano on Pixel. Your `fresh: 2` is generous. Plus the blocker is real: **phones block call audio**, so the demo needs VoIP or a speakerphone hack. Best *problem* on the board, worst *novelty*. Fixable, and the fix is the best idea in this document (§3.2). |
| **Gesture Cooking** | **Low** | MediaPipe hand-tracking + a recipe is a tutorial project. The risk note (*"judges will ask why not just use voice"*) has no good answer. **Better as a component than a product** (§3.1 uses it as one). |
| **Body Check** | **Medium** | The strongest framing of the three body ideas, but it inherits every Mi Band dependency and doubles the scope. |

### The structural problem

You now have two idea pools that fail in **opposite** directions:

| | Pool 1: "Six Impossible Things" | Pool 2: Scorecard |
|---|---|---|
| Strength | Wildly imaginative, great theatre | Genuinely useful, real problems |
| Fatal flaw | **One judge, one desk** | **One user, one phone** |
| Crowd participation | 1–2 people | **1 person** |

The slide scores *"a multi-player game, tool or toy the crowd can play with"* and names *"something
only your team can run"* as a disqualifier. Pool 2 is *further* from that than Pool 1; a personal
utility app is, structurally, the single-player case.

**But Pool 2 has the thing Pool 1 completely lacks: a reason to care.** Scam Shield scores `helps: 5`
and deserves it. The merge below keeps that and fixes the rest.

### The Mi Band, again

Four of six lean on it. From `04-idea-selection.md` §3, verified: **Web Bluetooth doesn't exist on
iOS Safari (so on any iPhone) or Firefox**; **Mi Band HR is auth-key gated**; and it returns **one
averaged BPM per 15–20 s with no beat-to-beat**. It cannot be the sensor for a room, and it's too
slow to be the sensor for a 90-second demo. It is a **credibility prop** and nothing more.

---

## 2. ⭐ The merge: `COOKED`

**One line:** *It's 6pm on day two of a hackathon. Let's find out how wrecked this room is, and then prove it makes you easier to scam.*

This folds **Drunk Check + Caffeine Check + Body Check + Scam Shield** into one two-act piece, and
borrows the crowd-biometric spine from `PULSE` (`04` §4.1) with its technical risk removed.

### Act 1: "How cooked is this room?" (60 seconds)

Everyone joins by QR and runs a 40-second battery straight on their phone:

| Test | Sensor | Measures |
|---|---|---|
| Tap the dot the instant it flashes, ×8 | touch | Reaction time + variance |
| Hold the phone flat, arm out, 10 s | accelerometer | Postural tremor / steadiness |
| Trace a moving circle with your thumb | touch | Fine motor tracking error |
| Type one dictated sentence fast | keyboard | Error rate + corrections |
| *(optional)* hold a steady hand to the front camera | camera | Tremor: **this is where Gesture Cooking lives on, as a component** |

Claude takes each person's multi-signal profile and writes a short, funny, specific **diagnosis** (*"reaction time of someone 31 hours awake, with the fine motor control of a fourth espresso"*), and
the projector ranks the whole room: **MOST COOKED → LEAST COOKED.**

The Mi Band gets its one honest job: the presenter wears it, their resting HR and sleep from last
night go on the big screen as a baseline next to their score.

### Act 2: "Now get scammed" (60 seconds)

Every phone in the room is then scammed **simultaneously** by Claude. This happens **in the
browser**, as a chat (and optionally browser speech). Each person gets a *different*, personalised
social-engineering attempt that adapts to how they reply: the delivery-fee one, the "it's your boss"
one, the fake MFA code, the too-good internship offer.

The projector shows a live counter of how many people are still on the hook.

### The reveal (10 seconds): this is the whole project

A scatter plot goes up. **X-axis: Act 1 impairment. Y-axis: did you get conned.** Generated live,
from the people in that room, in the last two minutes.

> **"The most cooked third of this room got scammed at twice the rate of the sharpest third.
> We measured that just now, with you."**

### Why this is the one

- **It is an experiment, not a demo.** It produces a *result* that did not exist before you ran it. No other team will do that, and an engineering panel will feel the difference.
- **It merges four of your six ideas**, so the work you've already poured in isn't thrown away.
- **Zero browser-compat risk.** Touch and accelerometer only. No BLE, no torch, no camera required, no telephony. Works on every phone in that room, which, per `04` §3, is the thing that killed every other sensor-based plan.
- **It solves Scam Shield's novelty problem by inverting it.** Scam *detection* is commoditised (Hiya, Pixel). Scam *inoculation at crowd scale* is not a product anyone ships, and simulated-attack training is the method that actually works. You're not rebuilding Hiya; you're doing the thing Hiya can't.
- **It solves Drunk Check's safety problem.** You never claim "you are drunk." You report relative performance within a room, which is defensible and true.
- **Hyper-local and un-copyable.** It's about *this* room, at *this* hour, after *this* hackathon. The framing only works here, tonight, which is exactly why it'll land.
- **`helps: 5` is earned.** Fatigue raising fraud susceptibility is a real public-safety point, and you'll have demonstrated it rather than asserted it.
- **Budget:** trivial. One batched diagnosis call per person, short scam turns, heavy caching. Nothing like a per-user agent loop.

### The pitch's hard-problem line (20 s, and it's true)

> *"Live multi-sensor psychometrics on 200 unmodified phones, adaptive social engineering per person,
> and a real-time correlation across the room, on a US$150 budget. The hard part wasn't the model.
> It was getting a clean impairment signal out of 200 phones nobody calibrated."*

### 🔴 Devil's advocate

- **"Isn't scamming a room of strangers hostile?"** It is if done badly. Guardrails, and put them on the slide: fully opt-in, **nothing real is ever requested or stored** (no passwords, no card numbers, no real codes), every thread self-reveals within 60 seconds with a one-line explanation of the tactic used, and a visible opt-out. Done right it reads as *generous*; the room leaves knowing something useful about themselves.
- **"Your impairment score isn't validated."** Correct, and say so first, before a judge says it. It's a **within-room relative ranking over one session**, not a clinical measure. Pre-empting this converts your weakest claim into evidence that you thought carefully.
- **"n is small and it's one room."** Also correct. Frame it as a live experiment with an honest confidence caveat on screen. *"This is n=200, unblinded, one room, one night"* is a line that wins respect, not points off.
- **"Two acts in 23 hours is over-scope."** The real risk. **Mitigation: Act 1 is a complete, shippable product on its own.** Build it to done by 02:00. Act 2 is strictly additive. If Act 2 isn't working by the 10:00 freeze, cut it and ship Act 1, which is still a crowd leaderboard with AI diagnoses, and still good.
- **"What if the room's scores are all the same?"** They won't be: at hour 23 the spread between someone who slept and someone who didn't is enormous. But seed the projector with a demo distribution so it looks right with 5 people in it.

---

## 3. The other merges, if the team prefers a different flavour

### 3.1 `COOKED (Act 1 only)`: the safe cut
Just the room-wide impairment leaderboard with AI diagnoses. Loses the scatter-plot reveal, keeps
everything else. **This is the fallback, and it's pre-committed.**

### 3.2 `THE CON`: Act 2 as its own project
The scam inoculation gauntlet standing alone, with more depth: multiple scam archetypes, an
escalating difficulty ladder, a "how did you do vs the room" debrief card you can screenshot and send
to your parents, which is the actual public good. Higher ceiling on *helps*, loses the experiment.

### 3.3 `SIX DEGREES OF THIS ROOM`: Icebreaker Lens, consent repaired
**Nobody photographs anyone.** Everyone answers three questions *about themselves*. Claude finds the
non-obvious pairings and the projector draws the room's social graph live, then tells people to get
up and go find their match. The room physically rearranges.

Fixes the `safe: 1` problem completely (everyone opted in about themselves), keeps the "hilarious
live demo with a judge," and is *extremely* on-point for this event: ~75% students, employers in the
room hiring. Uniqueness is medium (event matchmaking exists), so the differentiator has to be the
**non-obvious** pairing plus the forced physical movement.

### 3.4 Ideas to drop
**Caffeine Check** (confounded signal, low novelty) and **Gesture Cooking** as a standalone product
(no answer to "why not voice?"). Gesture survives as a tremor test inside `COOKED`.

---

## 4. Revised plan

Same gate structure as `03` §6. The spike changes, and gets easier.

| Gate | By | Condition |
|---|---|---|
| **G1** | 21:00 Fri | 🚨 Public URL live + **the reaction-time test working on 3 phones including an iPhone**, result on a projector view. *(Much lower risk than the pulse spike: touch events only.)* |
| **G2** | 02:00 Sat | 10 people run the full battery at once; leaderboard + AI diagnoses live. **Act 1 is done here.** |
| **G3** | 10:00 Sat | 🔒 Freeze. **Go/no-go on Act 2**: if the scam loop isn't working, cut it and polish Act 1. |
| **G4** | 13:00 Sat | 20+ real humans. Scatter plot rendering. Mi Band timeboxed to 90 min, then dropped. |
| **G5** | 15:00 Sat | Two rehearsals on a stopwatch. Guardrail/consent copy written and on the slide. |
| **G6** | 16:30 Sat | 🏁 Link in `#showcase`. |

**Kept from Pool 1's field guide:** the model proposes a structured action, you validate it, a
deterministic engine owns the state. The model never owns the scores, the scam state or the session.

---

*Pool 2 read from the team's scoring artifact (`DEFAULT_IDEAS`, six entries, criteria weighted
demo 5 / build 5 / helps 4 / fresh 3 / safe 3 / hype 4). Scam-detection prior art verified against
Hiya and Google Phone app documentation. Mi Band and browser constraints per `04` §3.*
