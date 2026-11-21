# 06. The pick: `PATIENT ZERO`

> **TL;DR**: One idea, merged from 8 of the 12. **A real epidemic, spreading through the real room,
> along a contact graph that 200 people build with their own bodies.** Phones are the hosts, the
> projector is the epidemiologist, Claude is the pathogen and the autopsy. It is healthcare-real,
> physically embodied, impossible to do remotely, and it cannot fail to produce an outbreak.
> **Hardware verdict: don't buy any. You already own the best hardware in the building: 200 screens
> and 200 speakers that fire in unison.**

---

## 1. The idea

**One line:** *We released a disease into this room. You spread it with your own bodies. Here's the autopsy.*

### Act 0: Infection (20 s, runs during the pitch)
QR → nickname → tap your seat block on a grid of the room. Your phone is now your body. You're
issued a **4-digit contact code**.

### Act 1: Immune system (40 s)
The impairment battery from `COOKED`: tap-the-dot reaction time, hold-steady tremor via
accelerometer, thumb-trace tracking, fast typing accuracy. This produces your **susceptibility
score**, and it is grounded in actual science: sleep deprivation measurably suppresses immune
function. The projector ranks the room by immune strength.

### Act 2: Outbreak (60 s): *the product*
Claude generates a fictional pathogen with real epidemiological traits: R₀, incubation period,
a symptom, a name. **Patient zero is seeded in the most susceptible person in the room.**

Transmission is physical. You get up, you meet people, you swap 4-digit codes. Every exchange is a
real edge in a real contact graph, built by real humans moving through real space.

**The moment:** when you get infected, **your screen flashes red and your phone emits a tone.** With
200 phones in a room, infection becomes something you *hear and see sweep across the auditorium*,
a wave of red moving through the crowd while the seat map lights up on the projector in sync.

### Act 3: The autopsy (20 s): *the point*
The contact graph goes up. Patient zero is named. The superspreaders are named. And the finding,
computed live from the room:

> **"The bottom third on immune score were infected 2.4× faster than the top third. We measured that
> just now, with you, in ninety seconds."**

Then one click: **the counterfactual.** *"What if those five superspreaders had stayed home?"* Remove
those nodes, re-run the real graph, and show the alternate outbreak side by side with the one that
actually happened.

---

## 2. Why this one

| Judging criterion | How it scores |
|---|---|
| **Interactivity** | Maximum available. The room physically stands up and interacts with strangers. The data *is* the audience. |
| **Presentation & demo** | A wave of red light and sound moving across 200 people. Zero reading, zero narration needed. |
| **Idea & imagination** | Real epidemiology (R₀, contact tracing, superspreader dynamics, sleep and immunity) turned into 2 minutes of theatre. |
| **Technical ingenuity** | A live contact graph from 200 unmodified phones, synchronised multi-device output, and a counterfactual re-simulation over **real** collected data, not a script. |
| **Execution & craft** | One loop. Act 2 alone is a complete product (see §5). |

**And it's un-copyable.** It only works in a room with 200 bodies in it. Judges opening the link
later get a solo mode, but the thing they saw cannot be reproduced anywhere else. That is the
strongest possible answer to *"bring an idea to life."*

### Which of the 12 it merges

| Original | What survives |
|---|---|
| **Borrowed Bodies** | Humans as the physical substrate the system runs on, 200 of them instead of 1 |
| **Tomorrow's Crime Scene** | Causal graph + counterfactual recompute: now over data the room generated, not fiction |
| **God Mode** | Change one rule (an intervention), watch a society react |
| **Escape.exe** | "It's on *your* phone now"; the propagation beat, 200× instead of 1× |
| **Drunk / Caffeine / Body Check** | The whole sensor battery, repurposed as susceptibility. **Safe at last**: no "you're drunk" claim, just relative immune standing |
| **Icebreaker Lens** | Its actual goal (making strangers meet) delivered with full consent and no camera |
| **Unborn Parliament** | *(optional stretch)* limited vaccine doses and the room has to decide who gets them |
| **Pulse / Swarm Body** | The crowd-as-sensor spine |

**Not merged, honestly:** Scam Shield, OBJECTOS, Gesture Cooking. Scam Shield stays the best standalone
*product* idea you have: it's just not a 200-person stage piece.

### The two ideas most "enhanced"
If you'd rather frame this as upgrading two existing ideas than inventing one: it's **Body Check**
(becomes a susceptibility engine with a real use and no safety exposure) **× Tomorrow's Crime Scene**
(its causal-counterfactual engine, finally running on real data instead of invented clues).

---

## 3. Hardware: the verdict

**Jaycar Woolloongabba**: 65 Ipswich Rd, ~3.5 km away, **Saturday 08:30–17:00**. A run at opening
gets you back by ~09:15, *just* before the 10:00 freeze. **So it's logistically possible. Do it anyway? No.**

**Three reasons:**
1. **Integration lands after the freeze.** Anything bought at 08:30 gets integrated during the window
   you reserved for hardening and rehearsal. That's how projects die.
2. **In a 200-person auditorium, a small device is invisible.** A strobe or buzzer from Jaycar cannot
   be seen or heard by the back row. The venue projector and PA already can.
3. **You already own better hardware, and it's free:**

| "Hardware" you have | Works on | Effect |
|---|---|---|
| **200 phone screens at full brightness** | ✅ every device | A red wave moving across a dark auditorium. Nothing in that store beats this. |
| **200 phone speakers in unison** | ✅ every device | 200 phones toning at once is physically unsettling. Genuinely hardware-grade spectacle. |
| **The projector + venue PA** | ✅ | Your actual output device. Loud and 10 feet tall. |
| **Phone vibration** (`navigator.vibrate`) | ⚠️ Android only, **not iOS Safari** | Use as a bonus, never as the signal |
| **Phone torch** | ⚠️ Android only, **not iOS** (verified, `04` §3) | Same: bonus only |
| **Laptop webcam** | ✅ | *Stretch only:* point it at the crowd, composite infection overlays over the live image |

**Design principle worth writing on the wall:** *200 phones in as distributed input, one big physical
thing out as shared output.* That's the shape of every demo that works in a room this size, and it's
exactly why 2025's shock app won.

**If you buy anything at all**, buy one thing with zero firmware: a loud siren or strobe on a USB
relay, as the *room's* alarm when infection crosses 50%. Treat it as decoration that can be cut at
09:30 with no consequence. Never put it on the critical path.

---

## 4. Devil's advocate

**🔴 "What if nobody gets up and moves?"** The single biggest risk, and the design has to be immune
to it. **Fix: build passive spread as the floor.** Neighbours on the seat grid infect each other
automatically at a slow rate; physical contact exchanges are an *amplifier*, not the mechanism.
**The outbreak therefore cannot fail to happen**: a dead room just gets a slower, duller epidemic.
Then make round one trivial: *"infect the two people sitting next to you."* Nobody has to stand up to
play, but the room will anyway once it sees the map moving.

**🔴 "Is an epidemic game tone-deaf?"** It would be if played straight. Keep the pathogen fictional
and faintly ridiculous, no death counts, no real disease names, light tone throughout. The teaching
content stays real; the framing stays a game.

**🔴 "Three acts in 23 hours is over-scope."** Correct, so **build in reverse priority order**:
Act 2 (outbreak + graph) → Act 3 (counterfactual) → Act 1 (impairment battery, droppable; assign
random susceptibility if it doesn't make it). Act 2 alone is a complete, demo-able product. Act 1 is
the *last* thing to build despite being the first thing the audience sees.

**🔴 "The contact graph is just a game mechanic."** No: it's a real proximity/interaction graph
generated by real human movement, and the counterfactual runs over that real data. Say exactly that;
it's the technical claim and it's true.

**🔴 "Privacy: you're tracking who met whom."** Nicknames only, no identity, graph discarded at the
end, stated on the slide. The irony of a contact-tracing demo that respects privacy is worth one line
in the pitch.

**🔴 "Can you simulate 200 nodes in real time?"** Trivially. It's a graph with an infection flag and
a tick. The model is nowhere near this loop: Claude generates the pathogen once at the start and
writes the autopsy at the end. **Two model calls for the entire demo**, plus cached flavour text.
Cheapest idea on any of our lists.

---

## 5. Build plan

| Gate | By | Condition |
|---|---|---|
| **G1** | 21:00 Fri | 🚨 Public URL live. Join → nickname → seat grid → you appear as a dot on a projector view. Tested on an iPhone over mobile data. |
| **G2** | 02:00 Sat | **Act 2 works.** Code exchange infects; passive neighbour spread ticks; seat map lights up live; infected phones flash red + tone. **This is a shippable product.** |
| **G3** | 10:00 Sat | 🔒 Freeze. Act 3 counterfactual in. Go/no-go on Act 1: if the battery isn't solid, assign random susceptibility and move on. |
| **G4** | 13:00 Sat | 20+ real humans running a full outbreak. Seeded demo state so it looks alive with 5 people. Solo/bot mode for judges opening it later. |
| **G5** | 15:00 Sat | Two rehearsals on a stopwatch. Someone outside the team tries to break it. Consent/privacy copy on the slide. |
| **G6** | **16:30 Sat** | 🏁 Link in `#showcase`. |

**Slide 1:** a giant QR, the words *"scan this, you're already infected"*, nothing else.
**Slide 2:** the contact graph, your names, the repo link, and the one-line privacy statement.

**Pitch opening (say it before anything else):** *"Scan the code. Some of you are already sick; you
just don't know which."*

**The hard-problem line (20 s):** *"A live contact graph off 200 unmodified phones, synchronised
screen and audio output across every one of them, and a counterfactual re-simulation over the real
graph this room just built, on two model calls and a US$150 budget."*

---

*Merged from the "Six Impossible Things" guide (`04`) and the team's scorecard pool (`05`). Jaycar
Woolloongabba hours verified. Browser capability limits (no Web Bluetooth or torch on iOS, Android-only
vibration) per `04` §3.*
