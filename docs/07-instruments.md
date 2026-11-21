# 07 — Correction, and five non-game ideas

> **TL;DR** — I was wrong. The theme slide says *"pick up, try, experience **or use**"*, and
> *"a link the judges open on their own phone"* is its **own** bullet — a single-user tool that works
> end to end qualifies completely. I collapsed all of that into "multi-player game" and kept steering
> back to it. Your instinct was the better read. **Your six ideas are a coherent genre — instruments
> that measure something real and tell you something true — and that genre is wide open.** Five
> non-game ideas below, in that genre, plus the deck facts that change the plan.

---

## 1. What I got wrong

The kickoff deck, verbatim:

> **Bring an idea to life.** *Build something people can pick up, try, **experience or use**, not just watch.*

And the "This counts" list is three **alternatives**, not a checklist:
- A link the judges open on their own phone ← **this alone is enough**
- A multi-player game, tool or toy the crowd can play with
- Something works end to end

I read bullet 2, latched onto "multi-player game", and built four documents on top of it. A single-user
**instrument** that a judge opens on their own phone and uses is fully in scope — and it's closer to
*"use"* than any game is. Your pool was right; my filter was wrong.

**What stays true:** it must be hosted, it must work on their phone, and it must survive your absence
when judges try it later. None of that requires a game.

## 2. New facts from the deck (these change things)

| | |
|---|---|
| 🏆 **1st prize** | **A year of Claude, for every member of the team** |
| 🥈 **Runner-up** | **$50 each** |
| **Demos** | **5:00pm Saturday, 90-minute cap** — *not* 7pm |
| **Spectators arrive** | 4:30pm |
| **Winners announced** | 7:30pm (dinner 6:30, drinks at The Osborne after) |
| **Saturday** | 8:00am breakfast · "demo-ready by 5pm" · lunch 12:30 |
| **Team registration** | `hackathon-teams-vxlk.onrender.com` — one person creates, the rest join |

**Note the 90-minute cap.** At ~4 minutes a team that's roughly 22 slots. The field may be smaller
than the 223 registrations suggest, which makes each demo matter more, not less.

⚠️ **Correction to `01`:** the "$1,500 / $800 / $200" figure I flagged as unverifiable was indeed
wrong. The real prize is a year of Claude each. Good thing we didn't plan around it.

---

## 3. The genre you actually invented

Looking at your six properly: Scam Shield, Drunk Check, Caffeine Check, Body Check, Gesture Cooking,
Icebreaker Lens. They're not games and they're not stories. **They're instruments** — things that
sense the real world through a phone and tell you something true that you couldn't otherwise know.

That is a strong, coherent genre, and it maps onto the rubric cleanly:

- **Interactivity** — anyone can point their own phone at something. No lobby, no other players.
- **Technical ingenuity** — turning a commodity sensor into a measuring device *is* "a clever answer to a hard problem."
- **Presentation** — "point this at your own hand" is a better demo instruction than any set of rules.
- **Idea** — *surprising* is explicitly on the list, and a true fact nobody knew is the purest form of surprising.

The best version of this genre has one property your six were circling but never quite landed:

> **The instrument must reveal something the audience can verify with their own body, immediately.**

---

## 4. ⭐ `UNSEEN` — a phone that shows you motion your eyes can't resolve

**One line:** *Point it at anything. It amplifies movement too small for human vision and shows it to you live.*

Based on Eulerian Video Magnification — the "motion microscope" technique. The phone captures frames,
runs a temporal bandpass filter per pixel, amplifies what's left, and composites it back. Movement
that is physically real but below your eye's threshold becomes obvious.

**What you point it at:**

| Target | What appears |
|---|---|
| Someone's face or neck | **Their pulse**, as a visible flush, beat by beat |
| A chest, across the room | Breathing rate, without touching or wearing anything |
| A laptop fan, aircon duct, washing machine | The wobble that means a bearing is going |
| A tall building, a railing, a pole | It's swaying, and it always was |
| A guitar string, a speaker cone | The vibration, frozen and amplified |

**Why it's the pick.** It is a pure instrument — no rules, no players, no narrative. The demo
instruction is four words: *"point it at yourself."* A judge sees their own heartbeat on their own
phone in about five seconds, which is as literal an answer to *"bring an idea to life"* as exists.
And it's genuinely obscure — EVM is a famous research result that almost nobody has ever been able to
simply *use*.

**Claude's real job here**, not a wrapper: given the extracted frequency, amplitude and spatial map
plus what the user says they're pointing at, explain *what it means and what's causing it*. "4.2 Hz
localised at the mount, not the blade — that's a loose bearing, not imbalance." Translating a physical
measurement into a probable physical cause is exactly what a model is good at and a classifier isn't.

**Build it in two modes, and this is the risk structure:**
1. **Colour mode (pulse)** — robust, works on faces and hands, ship this first. Amplify colour change in the 0.8–3 Hz band.
2. **Motion mode** — higher wow, noisier. Amplify spatial displacement in a chosen band.

Both run on **one pipeline**: downscaled frame buffer → per-pixel temporal bandpass (two one-pole IIR
filters, differenced) → gain → composite. Low resolution (160×120) is plenty and keeps it realtime in
plain canvas/WebGL.

**🔴 Devil's advocate.** Motion magnification amplifies camera shake and sensor noise just as happily
as signal. **Mitigations:** prop the phone or hold against a surface; lock the frequency band tightly;
offer a "stillness" indicator that refuses to amplify while the phone is moving. And **ship colour
mode first** — it's far more forgiving and it's the one that shows a pulse, which is the demo moment
anyway. If motion mode is still noisy at 02:00, cut it.

---

## 5. `FLICKER` — the lights in this room are hurting some of you

**One line:** *Point your phone at any light and it tells you the invisible flicker frequency and depth — and whether it's in the range linked to headaches and eye strain.*

Cheap LED lighting modulates at 100 Hz (on 50 Hz mains) or faster under PWM dimming. You can't see
it. A meaningful minority of people get eye strain, headaches and migraine from it, and IEEE 1789
publishes recommended limits precisely because of that.

**The clever part:** a phone camera's **rolling shutter** is already a sampling instrument. Point it at
a flickering source and the shutter scans the sensor row by row, turning a temporal oscillation into
*spatial banding* you can measure. Take the column-mean brightness, FFT along the shutter axis, and
you have the flicker frequency and modulation depth — from an unmodified phone camera.

**Why it's strong.** It is the brief's *"solves a small annoyance"* lane done properly, and the
annoyance is one nobody knew they had. Every light in the building is a live test case — incandescent
vs cheap LED vs good LED all behave visibly differently, so you can **validate it on stage in ten
seconds** against a known-good source. That answers "how do you know it's real?" before it's asked.

**Same engine as `UNSEEN`** — camera frames, temporal analysis, frequency extraction. Building both is
far cheaper than it looks, and **`FLICKER` is the reliable one.** If motion magnification misbehaves,
this ships alone and is a complete product.

---

## 6. `FATIGUE` — your own idea, rescued with real science

Drunk Check's problem was never the sensing. It was that you'd be making an unvalidatable claim with
a dangerous failure mode. **There's a published anchor that fixes it completely:**

> **Dawson & Reid, *Nature* (1997), "Fatigue, alcohol and performance impairment"** — 17 hours of
> wakefulness produces cognitive/motor impairment **equivalent to 0.05% blood alcohol**; 17–24 hours
> spans roughly **0.05–0.10% BAC**. Replicated in Australian federal road-safety research, which found
> equivalence to 0.05% BAC at 17–19 hours awake. 0.05% is the Australian legal driving limit.

So you never say *"you are drunk."* You say:

> **"Your measured reaction time and tracking error are equivalent to roughly 0.05% BAC — the legal
> driving limit — which is what 17 hours awake does to a person. Here's the paper."**

That's defensible, citable, genuinely useful, and **it's Tanda's own industry** — fatigue risk
management is a regulated pre-shift practice in Australian mining, transport and healthcare, and
Tanda sells workforce management. You'd be building something the host's customers actually need.

Measured on-phone: reaction time, reaction-time *variance* (the best fatigue marker), thumb-tracking
error, typing error rate. No Mi Band required.

**🔴 Devil's advocate.** You're comparing your ad-hoc tests to a lab protocol they weren't validated
against. Say so first: *"this is the published equivalence applied to a rough proxy battery, not a
clinical instrument."* Pre-empting it turns the weakest claim into evidence of care.

---

## 7. `ROOM TONE` — is this place damaging your hearing, and why is it so loud?

**One line:** *Measure actual sound pressure against occupational exposure limits, and measure why the room is unbearable.*

Two real measurements from one microphone:
1. **dB(A) exposure** vs the 85 dB / 8-hour occupational limit, with a live "safe listening time
   remaining" countdown. At a loud venue this is immediately, viscerally useful.
2. **RT60 reverberation time** — emit a sweep or clap, measure the decay. This is *why* some
   restaurants are impossible to hold a conversation in, and nobody can normally name it.

Claude's job: turn two numbers into an explanation and a recommendation. Genuinely useful for anyone
with hearing sensitivity, auditory processing differences, or a noisy workplace. Very buildable —
Web Audio does all of it.

---

## 8. `SOUND OF SOMETHING WRONG` — acoustic diagnosis for machines

**One line:** *Hold your phone to any machine and find out what's wrong with it.*

FFT → render a spectrogram to canvas → hand the **image** to Claude's vision. Bearing wear,
imbalance, belt slip and cavitation all have characteristic spectral signatures. Demoable on the
venue's aircon, a laptop fan, a fridge, an e-scooter.

**🔴 Devil's advocate — the honest problem.** You have no ground truth, so the model can be
confidently wrong, and *"my fridge is fine actually"* is a bad moment on stage. **Fix: make it
comparative, not diagnostic.** Record a baseline of a healthy unit, then report *deviation* from it.
"This fan is 6 dB louder at 120 Hz than a healthy one" is defensible. "Your bearing is failing" is not.

---

## 9. Which to build

**`UNSEEN` + `FLICKER` as one app, one pipeline, two modes.** They share the entire camera-temporal
analysis engine, so you get two instruments for not much more than one, and they de-risk each other.

| Gate | By | Condition |
|---|---|---|
| **G1** | tonight | 🚨 Public URL live. Camera stream → downscaled canvas → per-pixel temporal filter → something visibly changes on screen. Tested on an iPhone on mobile data. |
| **G2** | 02:00 Sat | **Colour mode shows a pulse** on a real hand or face. That alone is a shippable product. |
| **G3** | 10:00 Sat | 🔒 Freeze. `FLICKER` mode in. **Go/no-go on motion mode** — if it's still noisy, cut it. |
| **G4** | 13:00 Sat | 10+ people on their own phones, iOS and Android. Claude interpretation layer in. Validate flicker against a known source. |
| **G5** | 15:00 Sat | Two rehearsals on a stopwatch. **Demos are 5:00pm, not 7pm** — the day is shorter than we thought. |
| **G6** | **16:30 Sat** | 🏁 Link in `#showcase`. |

**The pitch, first words:** *"Point your phone at your own hand."* Then stop talking for five seconds
and let 200 people watch their own heartbeat appear.

**The hard-problem line:** *"Real-time per-pixel temporal filtering on an unmodified phone camera, and
a rolling shutter used as a sampling instrument to measure something at 100 Hz with a 30 fps sensor."*

---

*Corrections and facts from the Tanda Hackathon 2026 Kickoff deck (8 slides). Dawson & Reid 1997
verified against the Nature record, PubMed 9230429, and the Australian Government road-safety
replication. Camera and sensor constraints per `04` §3.*
