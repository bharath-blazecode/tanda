# 04 — Idea Selection: the six, critiqued, and five better ones

> **TL;DR** — The six ideas in the field guide are imaginative and well-engineered, but **all six
> fail the same test**: they are *one-judge, one-desk* demos, and this event explicitly scores
> *"a multi-player game, tool or toy **the crowd** can play with"* with 200 people in the room and a
> 2-minute play window. Below: a persona-by-persona critique, then five replacement ideas that keep
> the best mechanics from the six and fix the fatal flaw. **Recommendation: `PULSE` (§4.1), with
> `EXODUS` (§4.2) as a pre-committed fallback behind a hard 21:00 go/no-go gate.**

---

## 1. What we were given

A 784-line field guide, *"Six Impossible Things"*, with six concepts, engineering plans, risk
tables and concept art. It is a genuinely good document — the architecture principle it lands on
(**the LLM proposes a structured action; a deterministic engine owns the state**) is correct and we
should keep it verbatim. Its own ranking picks **OBJECTOS** as the best hackathon bet.

**We disagree, and the reason is that the guide was written before we had the briefing slides.**
It optimises for *"can a judge interact with it?"* The slide optimises for something stricter:
*"a link the judges open on **their own phone**"* and *"a multi-player game, tool or toy **the crowd**
can play with"*, with the explicit disqualifier *"something **only your team can run**."*

That one difference re-ranks everything.

## 2. The six, scored against the real rubric

The question that matters: **in your 2-minute play window, how many of the ~200 people in that room
can actually touch it?**

| # | Idea | People who can participate | Verdict |
|---|---|---|---|
| 01 | **GOD MODE** | 1 (whoever types the law) | Crowd watches text appear. Text-heavy — nobody reads at 6pm on day two. |
| 02 | **ESCAPE.EXE** | **1** | Great theatre, but the entire payoff is a one-shot trick for exactly one phone. 199 people watch someone else have the experience. |
| 03 | **OBJECTOS** | 1–2 at your desk | ⚠️ **Worst fit of the six, despite being the guide's top pick.** Needs a camera on a desk in an auditorium: dark room, stage lighting, 200 people who can't see the table. Marker tracking in that lighting is a coin flip. And the guide itself concedes the novelty is weak ("tangible interfaces already exist"). |
| 04 | **BORROWED BODIES** | 1–2 volunteers | Slowest possible demo: vision round-trip + a human physically moving a block, repeated. That's a 10-minute piece compressed into 2. **It will not finish.** |
| 05 | **UNBORN PARLIAMENT** | 0 | This is close to the slide's named anti-pattern — *"watching a form being filled in."* Safest to build, lowest ceiling here. |
| 06 | **TOMORROW'S CRIME SCENE** | 1 | Six clue cards to read. Beautiful as a thing you play alone for 20 minutes; invisible in a 2-minute room slot. |

**Five cross-cutting problems the guide didn't know to check for:**

1. **Single-operator by design.** Every one is "a judge comes to our laptop." ✗ against the slide.
2. **Reading load.** 01, 05, 06 are text-delivery experiences. In a loud room, on a phone, at hour 23 — nobody reads.
3. **Latency is dead air.** Three 8-second model calls is 20% of your slot spent in silence. 01 and 04 are worst.
4. **Budget blindness.** The guide predates the US$150-shared-with-your-users constraint. GOD MODE with 10 agents/turn is fine for one operator and ruinous if crowd-driven.
5. **"Judges try every project before deciding."** They will open your link *later, alone, cold*. OBJECTOS and BORROWED BODIES are **unreachable** without your desk, your camera and your volunteers. They score zero on that pass.

### What's worth stealing (keep all of this)

| From | Mechanic | Why it's good |
|---|---|---|
| ESCAPE.EXE | **Cross-device transfer** — a thing leaves the projector and appears on *your* phone | The single best moment in the document, and technically honest (real shared session) |
| OBJECTOS | **The judge authors a rule live, and it then runs without the model** | A real "technical ingenuity" story |
| BORROWED BODIES | **The AI replans when a human breaks its plan** | Proves a closed loop; a script can't fake it |
| CRIME SCENE | **Causal graph recomputes downstream** | A real mechanism, not vibes |
| GOD MODE | **Two inputs combine into a consequence nobody wrote** | Emergence you can point at |
| All | **LLM proposes → validate → deterministic engine owns state** | Correct. Non-negotiable. Use it. |

## 3. Hardware reality check — verified, not assumed

You mentioned a Mi Band. I checked rather than guessed, and **the findings invert the obvious plan**:

| Finding | Source | Consequence |
|---|---|---|
| **Web Bluetooth is not supported on iOS Safari, in any version** — and since every iOS browser is WebKit, that means *every iPhone*. Also unsupported in Firefox. Supported only in Chrome/Edge/Opera desktop, Chrome Android, Samsung Internet. | caniuse, MDN | ❌ **The crowd's phones can never read a band.** A wearable can only be read from a laptop Chrome or an Android phone. |
| **Mi Band heart rate is auth-gated.** Mi Band 2+ requires an auth-key handshake; the key must be extracted from Zepp Life / Mi Fitness logs (Gadgetbridge Huami pairing). | Gadgetbridge issue tracker, StackOverflow | ⚠️ A 2–6 hour rabbit hole with real failure probability. **Never put this on the critical path.** |
| **Mi Band gives ~one averaged BPM per 15–20 s, and no beat-to-beat (RR) intervals over BLE.** | Mi Band 5 / `bleak` field report | ❌ Kills any design needing a live waveform from the band. Too slow for a 90-second demo loop. |
| **Phone camera PPG works, but the torch does not on iOS.** `getUserMedia` works on iOS Safari over HTTPS, but ImageCapture/torch control is unsupported on Safari macOS/iPadOS/iOS in every version. | caniuse, ImageCapture compat | ⚠️ Camera pulse is reliable on Android (torch on) and marginal on iPhone in a darkened auditorium. **Do not make 200 iPhones depend on it.** |

**The conclusion that falls out of this, and it's the non-obvious one:**

> **The Mi Band is a stage prop, not a data source. The crowd's physical channel must be something
> every phone has with zero permissions.**

- **On stage (1–3 people, you control the light):** real camera PPG on an Android phone + the Mi Band
  shown beside it as independent corroboration. *"Our signal says 92, the band says 91."* That one
  sentence buys you the entire technical claim in five seconds.
- **In the crowd (200 people, every device):** **tap the screen on each beat of your own pulse**
  (fingers on your own wrist or neck). Zero permissions, zero API support needed, works on every
  phone ever made, and it is *physically intimate* — 200 people simultaneously finding their own
  pulse is a striking thing to watch from the stage.

Honest caveat to say out loud in the pitch: the crowd signal is self-reported, the stage signal is
measured. **Saying that is a strength, not a weakness** — see `02-past-hackathons.md` on judges
rewarding honesty over overclaiming.

---

## 4. Five replacement ideas

Each keeps a stolen mechanic from the six, and fixes the one-person flaw.

### 4.1 ⭐ `PULSE` — The room has one heartbeat *(recommended)*

**One line:** *A closed-loop controller whose plant is a room full of human beings.*

**Mechanic.** Everyone joins by QR. The app says: *find your pulse, tap on every beat.* Within 20
seconds the projector shows 200 dots, each pulsing at its owner's real rate, and a **COHERENCE**
meter. Then the AI Director takes over. Its goal is stated on screen — *"get this room above 100 bpm"*,
then *"now bring them back into sync, within 5 bpm, in 60 seconds"* — and it has a palette of
stimuli: a sound, a countdown, an image, a dare (*"everyone stand up"*), a silence. It fires one,
**measures the room's aggregate response**, and picks the next one based on whether it worked.
Scoreboard: Director vs The Room. Someone on stage wears the Mi Band with their trace on the big
screen as ground truth.

**Why it wins.** It is multiplayer *by physics*. It is zero-reading — pure feeling. The consequence is
the most visceral available: **your own body, on a 10-foot screen, being manipulated.** And nobody
else in that room will do biometrics.

**The technical pitch (20 s, and it's real):** *"Signal processing across 200 phones, aggregated into a
single physiological state, with the model closing a control loop over a crowd. The hard part wasn't
the AI — it was getting a clean enough signal out of 200 unreliable sensors to control against."*

**Budget:** trivial. One model decision per ~10 s over an *aggregate statistic*, not per user. ~15 calls
for the whole demo.

**Devil's advocate.**
- *"Is there a game, or is it an installation?"* — Fair, and fatal if unfixed. **Fix: a stated target, a
  60-second timer, and a Director-vs-Room scoreboard.** Build the scoreboard before anything pretty.
- *"Can you actually move 200 heart rates in 90 seconds?"* — Yes. A countdown, a jump-scare, "everybody
  stand up and do ten jumping jacks." Physical and reliable.
- *"Is the data real or are you animating noise?"* — Show one raw waveform next to the Mi Band reading.
  That's the proof shot. Put it on slide 2.
- *"Biometric data from 200 strangers."* — Never store it, no identity, aggregate only, and **say so on
  the slide.** Judges at an engineering company will notice you thought about it.

**Scores:** Idea 5 · Craft 4 · Interactivity 5 · Tech 5 · Demo 5

---

### 4.2 🛡️ `EXODUS` — ESCAPE.EXE, but it escapes into 200 phones *(fallback)*

**One line:** *A creature escapes the projector into the room, and the room has to decide whether to help it or hunt it.*

**Mechanic.** Takes the best moment in the field guide and multiplies it by 200. A creature lives on
the big screen. It realises the room exists. It **jumps to one person's phone** — their phone
vibrates, the creature speaks to them, asks for help. They can **pass it on**: a swipe sends it to
another phone, drawn on the projector as a tracer arc across a map of the room. Meanwhile the room is
secretly split: **Helpers** and **Hunters**, each getting different instructions. The creature is
trying to reach an exit; it remembers who helped and who betrayed it, and it says so by name.

**Why it wins.** "It's on *my* phone" is the strongest single beat in the whole guide — and here 200
people get it instead of one. Passing it on is a *social, physical* act: you turn, you look at a
stranger, you hand it over. The projector showing the creature hopping across the crowd is genuine
spectacle. And it is instantly legible: it's hot potato.

**Why it's the fallback.** Zero exotic dependencies. Realtime websockets and a sprite. If the pulse
spike fails at 21:00 Friday, this is still fully buildable in the remaining 19 hours.

**Devil's advocate.** *"It's just hot potato with a chatbot."* — Partly, and the legibility is the point.
The AI layer must earn itself: the creature **chooses** who to jump to (hunting helpers, avoiding
hunters), and **remembers and names** people. If it's just random, cut the AI and admit it.

**Scores:** Idea 4 · Craft 4 · Interactivity 5 · Tech 4 · Demo 5

---

### 4.3 `POLYGRAPH PARTY` — the crowd vs the machine, on biology

**One line:** *Two people answer; one is lying; the room votes, the AI votes, and both are scored over five rounds.*

**Mechanic.** Two volunteers, pulse measured live on stage (camera PPG + Mi Band). One is told to lie.
Both traces go on the projector. The room votes on their phones. Then Claude — given the **text** of
the answers *and* the **physiological trace** — makes its own call and explains its reasoning out
loud. Running scoreboard: **Humans vs AI.**

**Why it's here.** Shares its entire technology stack with `PULSE`, so the Friday-night spike serves
both and you can defer the choice until 02:00 Saturday. Multimodal fusion (language + physiology) is a
real and rare technical claim.

**🔴 Devil's advocate, and this one is serious.** **Lie detection does not work. Polygraphs are
pseudoscience.** Pitch this as "we built a lie detector" and a sharp judge will — correctly — take it
apart. **The fix is to make that the thesis:** the project is a demonstration of *how confidently
wrong* physiological inference is. Keep the AI's smug over-confidence as the joke, and put one honest
line in the pitch: *"this is a party game, not a polygraph — polygraphs don't work either, and that's
the point."* That converts your biggest vulnerability into the most interesting thing you say all
night.

**Scores:** Idea 5 · Craft 3 · Interactivity 4 · Tech 5 · Demo 5

---

### 4.4 `THE SWARM BODY` — Borrowed Bodies, with 200 bodies

**One line:** *BORROWED BODIES inverted: the AI doesn't borrow one pair of hands, it borrows the whole room.*

**Mechanic.** The AI gets a physical goal it cannot perform: *"make this room produce a specific
rhythm"*, *"sort yourselves into a circle by birthday month without speaking"*, *"build the tallest
structure from what's in your pockets."* It sends **different individual instructions to each phone**,
then observes via phone accelerometers, microphones and a webcam on the room — and **replans**.

The guide's best insight is preserved and amplified: *the AI adapts when a human breaks its plan.*
With 200 people, disobedience isn't a staged surprise — it's guaranteed and emergent.

**Why it's here.** You said you want physical. This is the most physical idea on the list: it makes
200 human bodies move in a coordinated way under machine direction. For the hiring-manager persona,
it's a distributed-systems-plus-human-factors flex nothing else matches.

**Devil's advocate.** **Highest variance on the list.** If the room doesn't comply, you have two
minutes of public silence. Mitigate by making the first instruction trivially easy (hold your phone
up / wave / shout) and the payoff immediately visual. Only take this if the team is fast and the
presenter can command a room.

**Scores:** Idea 5 · Craft 2 · Interactivity 5 · Tech 4 · Demo 3 *(variance ±2)*

---

### 4.5 `IMPOSTER` — the AI impersonates someone in this room

**One line:** *Four answers on screen. Three are real people here. One is Claude wearing a named person's voice.*

**Mechanic.** Everyone answers 2–3 throwaway prompts on joining (*that is* the onboarding — 30
seconds). Then: a prompt, four answers on the projector. Three from real people in the room. One is
Claude, **few-shot primed on a specific named person's own earlier answers**. Everyone votes.
Leaderboard. Twist: **the impersonated person's phone buzzes** — they know, nobody else does, and they
have to vote too, so they can lie by voting for themselves.

**Why it's here.** Cheapest and safest of the five. Scales to 200 trivially, a round fits in 75
seconds, it's reliably funny, and the technical claim is real: *style transfer from three sentences,
with length and latency matched so the fake doesn't arrive suspiciously fast and suspiciously
articulate.*

**Devil's advocate.** "Human or AI" is a known genre. **The novelty is strictly the local
impersonation of a named person in the room** — do not drop that to save time; it *is* the idea.
Keep it good-natured: opt-in nickname, nothing cruel, one-tap opt-out.

**Scores:** Idea 4 · Craft 5 · Interactivity 5 · Tech 4 · Demo 4

---

### 4.6 `THE DRIFT` *(bonus — lowest risk on the list)*

**One line:** *Chinese whispers through 200 phones, where every hop is mutated by a model wearing that person's voice.*

A message starts at one phone. You read it, tap, and it passes to the next person — rewritten by
Claude in the style of whoever just held it. The projector draws the chain across the room and shows
the text mutating live. After 200 hops, original and final sit side by side.

Cheap, scales, funny, visual, socially physical — and it has a real intellectual payoff: you *watch*
semantic drift and model collapse happen in front of you, in 90 seconds. Take this if the team wants
something certain to finish.

---

## 5. Head to head

| Idea | Crowd scale | Physical | Wow | 23h risk | Budget | Fits 2 min |
|---|---|---|---|---|---|---|
| ⭐ **PULSE** | 200 | ●●● biological | ●●●●● | ●●● med | ●○○ tiny | ✅ |
| 🛡️ **EXODUS** | 200 | ●● social | ●●●● | ●○○ low | ●○○ tiny | ✅ |
| **POLYGRAPH** | 200 vote / 2 play | ●●● biological | ●●●●● | ●●● med | ●○○ tiny | ✅ |
| **SWARM BODY** | 200 | ●●●● embodied | ●●●●● | ●●●●● high | ●●○ med | ⚠️ risky |
| **IMPOSTER** | 200 | ○ none | ●●● | ●○○ low | ●●○ med | ✅ |
| **DRIFT** | 200 | ●● social | ●●● | ●○○ lowest | ●●○ med | ✅ |
| *(their best: OBJECTOS)* | *1–2* | *●●●* | *●●●●* | *●●●● high* | *●○○* | *⚠️* |

## 6. The recommended plan — risk-hedged, decision deferred

**Build the shared spike first. Choose the product second.** `PULSE` and `POLYGRAPH` sit on exactly
the same foundation, so the first six hours are identical either way.

| Gate | By | Do this |
|---|---|---|
| **G0** | tonight | Lock the *direction* (crowd biosignal), not the product. Assign: pulse engine · realtime+projector · phone UI · demo/pitch. |
| **G1** | **21:00 Fri** | 🚨 **Public URL live** + **the spike**: tap-to-pulse working on 3 different phones (at least one iPhone), rate shown on a projector view. **Hard go/no-go.** |
| | | **If the spike fails → switch to `EXODUS` immediately. Pre-committed, no debate.** |
| **G2** | 02:00 Sat | 10 people tapping at once, aggregate + coherence meter live. Decide: `PULSE` or `POLYGRAPH`. |
| **G3** | **10:00 Sat** | 🔒 Feature freeze. Director loop + scoreboard only. |
| **G4** | 13:00 Sat | 20+ real humans on real phones. Mi Band paired on the presenter laptop (**timebox: 90 minutes, then drop it** — it's a garnish, not the dish). |
| **G5** | 15:00 Sat | Two rehearsals on a stopwatch. Someone outside the team tries to break it. |
| **G6** | **16:30 Sat** | 🏁 Link in `#showcase`. |

**Keep from the field guide, verbatim:** the LLM proposes a structured action → you validate it → a
deterministic engine owns the state. The model never owns the heart-rate buffer, the scoreboard or
the session. It picks the next stimulus from a whitelist. That's it.

## 7. Personas, one line each

- **🧑‍💻 Judge (Tanda engineer):** *"Was the hard part real?"* → Yes: clean signal from 200 unreliable sensors. Name it in the pitch or it doesn't count.
- **😵 Exhausted spectator, hour 23, 10th demo:** *"Do I have to read?"* → No. Tap twice, watch your own heart on the wall.
- **😈 Devil's advocate:** *"It breaks when…"* → iOS torch (don't need it), Mi Band auth (timeboxed garnish), room doesn't participate (one instruction, five words).
- **👔 Hiring manager:** *"What does this say about them?"* → They checked four browser-compat facts before committing, and designed around the one that killed the obvious plan.
- **⚙️ Ops realist:** *"200 phones, venue wifi, US$150."* → ~15 model calls total, aggregate-only, cached stimuli, works offline-ish. Cheapest idea on the list.

---

*Analysis of `tanda_six_mind_blowing_ideas_with_images.zip` (784-line guide + 12 concept images),
against `01-hackathon-brief.md` and `02-past-hackathons.md`. Browser and BLE facts verified against
caniuse/MDN and the Gadgetbridge/Mi Band community record — see §3 for sources.*
