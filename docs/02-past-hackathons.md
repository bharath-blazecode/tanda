# 02 — Past Tanda Hackathons: what actually won, and what that tells us

> **TL;DR** — Tanda has run hackathons for ~10 years. In 2025, against an AI-video LMS and a VR
> mood-detection app, **the winner was a productivity app that gave you an electric shock when you
> went off task.** The lesson is not "buy a shock collar." The lesson is that this event has
> consistently rewarded **the project the room reacts to**, not the project with the hardest
> architecture — and the 2026 rubric now says so in writing.

---

## 1. Timeline

| Year | What we know |
|---|---|
| **2016** | First Brisbane hackathon. Attendee Jasper Cooper, 2026: *"went in 2016 and the rest is history."* |
| **2017** | Theme: **Webhooks**. Projects had to interact with a Tanda API. Ticketed ($10 early bird → $25). Held 27–28 Oct. Separate **Manila** hackathon the same year. Three prizes: best code project, best **no-code** project, and overall "coolest thing". |
| **2018** | Ran (annual cadence). Detail not recovered. |
| **2019** | 25 Oct, Level 1/490 Adelaide St, Brisbane. ~41 attending / 188 interested on the public event page. |
| **2020–2024** | **Hiatus.** Alex Ghiculescu, 2025: *"We hadn't done a hackathon in a few years, and I hadn't participated in one this decade."* |
| **2025** | **Tanda Gen AI Hackathon**, 21–22 Nov, Fortitude Valley. ~150–156 people. Hosts: Austin Wilshire, Ben Aitcheson. **Explicitly no theme** — "no theme on what to build, only that it should be something you think is really cool." Billed as the ~10-year anniversary. |
| **2026** | **This one.** Theme reintroduced: *"Bring an idea to life."* 223 registered. Hosts: Philip Fraser, Austin Wilshire, Ellen Mackenzie. |

**Read the trend:** 2017 was API-constrained (build on *our* platform). 2025 was totally
unconstrained. 2026 adds back a constraint — but it is a **constraint on the artefact, not on the
domain**. They don't care what you build. They care that it's *alive and in the audience's hands*.
That shift is deliberate and it is almost certainly a reaction to what they saw in 2025.

---

## 2. The 2025 field — the single best evidence we have

Reconstructed from the Head of Engineering's own account plus participants' first-hand posts.

### 🏆 The winner — "the shock app"

> *"...the winning team who built a productivity app that shocked you if you went off task."*
> — **Austin Wilshire, Head of Engineering @ Tanda** (primary source, and the person who ran it)

A focus/productivity app with a **physical, involuntary, visible consequence**. In the comments on
that post, an outside observer immediately singled it out — *"The shock collar app..."* — which is
itself the proof of the point: **it was the one project a stranger remembered a year later from a
one-line description.**

### 🥈 Runner-up — contested (see §5)

**"Learning management system (LMS) + AI video-generation platform"**
- Team: William Jackson, William Qu, Yiming He (team of 3).
- Self-reported: *"our small team of 3 placed 2nd overall."*
- Burned **US$55 of tokens in one night of testing**.
- Austin lists "an AI powered LMS" among the notable projects — but **not** as the winner.

**"Cogniflow"** — *also* self-reported as 2nd place
- Team includes Ka Kin To and Wilkinson John Chan.
- Described by one member as *"a knowledge tree that allows user to learn knowledge by non-linear and highly customized [paths]"*; by the other as *"an AI-powered chat platform."*

### Other notable 2025 projects

| Project | What it was | Outcome |
|---|---|---|
| **VR mood detector** | A VR app that detected moods. | Named by the organiser as notable. Did not win. |
| **"Trump interviews the hackathon"** | A Donald Trump avatar + voice that interviewed people on camera to extract undocumented institutional knowledge; answers embedded into a vector DB, queried later via RAG. Demoed by interviewing *the other teams about their own projects*. Team: Lliam Symonds, Etao T. | Did not place, but was one of the most-shared projects of the event. |
| **The customer-success team's game** | A team from Tanda's **customer success** department — collective professional coding experience was *"making a handful of PRs in the last few weeks"* — shipped a **"very slick looking game"** in under 24h. A judge said it *"had less wrong with it than most AAA games."* | Didn't win; is the most-quoted project from the event. |

---

## 3. Critical evaluation: what the pattern actually says

### Finding 1 — Technical difficulty did not win. It didn't even place first.

Rank the 2025 field by raw engineering difficulty and you get roughly:
**VR mood detection > AI video-gen LMS > RAG/avatar interviewer > knowledge-graph learning app > a timer that shocks you.**

Rank it by result and that order is close to **inverted**. The least technically demanding project won.

This is not an accident or a fluke of taste. The 2026 rubric now states it outright:
*"Technical ingenuity: clever answers to hard problems, **not complexity for its own sake**."*
The organisers watched the 2025 field and wrote the lesson into the scoring sheet.

### Finding 2 — The winner had something nothing else had: an involuntary physical reaction.

Every other project asked the audience to *understand* something. The shock app made something
*happen to a body in the room*. In a 2-minute slot in front of 200 people, that is a categorically
different kind of attention.

**The transferable property is not electricity. It is consequence.** The winning design pattern is:
*the app does something to the user that the user did not choose and the room can see.*

That can be delivered by a phone vibrating, a klaxon, your face appearing on the projector, your
name sliding to the bottom of a public leaderboard, a photo being posted to a shared wall, or the
app locking you out. None of these need hardware. All of them land in the room.

### Finding 3 — Polish beat scope, repeatedly.

The most-quoted sentence from 2025 is a judge's: a non-engineering team's game *"had less wrong
with it than most AAA games."* The praise is **for the absence of defects**, not the presence of
features. Pair that with the rubric's *"the core thing works, sensibly scoped, with details that
make it stand out"* and the instruction is unambiguous: **one thing, flawless, with two or three
surprising details — not five things, all 80%.**

### Finding 4 — The judging panel is a product/engineering panel, not a VC panel.

2017, in Tanda's own words: *"The winner of the hackathon is whoever **builds the coolest thing**.
This is a bit different to other kinds of events which might focus on **entrepreneurship**, or on
creating **solutions to specific problems**."*

Nine years later the 2026 brief still sanctions *"a ridiculous experiment that has no practical
purpose at all."* **Do not pitch a business.** No TAM slide, no revenue model, no "this could be a
startup." Nobody in this room is scoring that, and the time it costs you is time not spent on the
only criterion that actually moves: the room's reaction.

### Finding 5 — This event is a hiring funnel, and that changes your incentives.

> *"Last year we had several people from the hackathon go on to our internship program or get hired."*
> — Austin Wilshire, Head of Engineering

~75% of 2025 participants were current uni students, and the organiser noted there were *"plenty of
people at the hackathon looking to hire, and they were very impressed with the talent they saw."*

**Implication:** the prize is the smaller half of the payoff. Even a project that doesn't place is a
24-hour work sample watched by the people who do the hiring. That argues for: put your names and
faces on the demo, say out loud which hard part *you personally* solved, and leave the repo public
and legible. It also means **don't hide behind the AI** — see Finding 6.

### Finding 6 — "AI did it" is not a differentiator here. Everyone has the same key.

Every team gets Claude Code and an Anthropic key. In 2025 the headline organiser takeaway was that
*non-coders* shipped a near-flawless game with a few PRs of lifetime experience. So:

- **"We used AI to build it" is table stakes and worth zero points.** Every single team did.
- **"We used AI *inside* the product" is also near-table-stakes.** An LLM wrapper is the default
  project at this event, which is exactly why a dumb timer with a shock beat an AI video platform.
- What is scarce is **taste, restraint, and a thing that works in a hostile room.**

---

## 4. The archetypes, scored against the 2026 rubric

| Archetype | 2025 example | Idea | Craft | Interactivity | Tech | Demo | Verdict |
|---|---|---|---|---|---|---|---|
| **Consequence engine** (does something to you) | 🏆 Shock app | High | Easy to nail | Medium | Low | **Very high** | **Won.** Weakest on interactivity — one user at a time. |
| **Crowd multiplayer** (everyone's phone is a controller) | — *(nobody did this in 2025)* | High | Hard but bounded | **Very high** | Medium-high | **Very high** | **The open lane.** Hits 5/5. See §6. |
| **AI content factory** (generate video/courses/text) | 🥈 LMS, Cogniflow | Medium | Hard | **Low** | High | Medium | Placed, didn't win. Burns budget. Slow on stage. |
| **Novel I/O** (VR, camera, sensors) | VR mood app | High | Hard | **Very low** | High | Low — one headset, 200 people | Did not place. |
| **Room-as-dataset** (RAG over the event itself) | Trump interviewer | **Very high** | Medium | Medium | Medium | High | Memorable, didn't place. **Already done — differentiate hard.** |
| **Small annoyance, solved** | — | Low ceiling | High | Medium | Low | Low | Sanctioned by the brief, but caps your "imagination" score. |

### The gap in the market

**In 2025 nobody appears to have built the thing the 2026 slide now explicitly asks for:**
*"a multi-player game, tool or toy the crowd can play with."*

The organisers put that line on the slide for a reason. They watched a year of single-player demos
and wrote the fix into the brief. A team that builds genuine crowd multiplayer is building the
reference answer to this year's question — and is scoring on **Interactivity** and **Presentation**
simultaneously, which is 2 of 5 criteria that most of the field will half-fail.

---

## 5. Devil's advocate: where this analysis could be wrong

Stated plainly, because acting on a wrong read is worse than acting on an uncertain one.

**⚠️ Conflict: two teams both publicly claim 2nd place in 2025.**
The LMS team and the Cogniflow team each state they placed 2nd. Both can't be right in a single
ranking. Most likely explanations: (a) there were multiple prize categories, as there were in 2017
(code / no-code / overall), and both are 2nd in different ones; (b) one description has drifted.
**We have not resolved this.** It does not change the headline — the organiser names the shock app
as *the* winner, and lists the LMS separately as one of several projects — but treat "2nd place
2025" as unsettled. **Action: ask the organisers tonight. It's a two-minute question and it tells
you whether there are category prizes to aim at this year.**

**⚠️ n=1 on the winner.** One year of AI-era results is thin evidence. A single quirky winner could
be one judging panel's taste.
*Counter-check:* three independent sources point the same direction — the 2017 statement of
philosophy ("coolest thing", explicitly not entrepreneurship), the 2025 outcome, and the 2026
written rubric. Agreement across nine years and three source types is much stronger than one data
point. **The conclusion stands, but hold it at ~80%, not 100%.**

**⚠️ Survivorship bias in the sources.** Everything here comes from people who chose to post about
it — winners, placers, and the organisers. The ~25 teams that built something mediocre and said
nothing are invisible. **We can see what wins. We cannot see the full distribution of what loses.**
So treat §4 as "necessary, probably not sufficient."

**⚠️ "Funny wins" is a dangerous over-read.** The rubric still demands *"the core thing works."* A
joke that breaks on stage scores worse than a dull thing that works, because it fails **two**
criteria (craft *and* demo) at once. The correct formula is **funny AND flawless**, never funny
*instead of* working. The shock app won because it was memorable *and* it actually worked.

**⚠️ Judges change.** The 2026 panel is not named. A different panel can have different taste. The
written rubric is the only thing we know binds them — which is why `03-strategy-and-plan.md`
optimises against **the rubric**, not against last year's winner.

---

## 6. The five rules this history yields

1. **Build for the crowd's phones, not for the judges' imagination.** One URL, no install, no login.
2. **Make it multi-player.** It's the explicit ask, and 2025 suggests the lane is open.
3. **Give it a consequence the room can see.** That is what beat harder projects last year.
4. **One thing, flawless, plus two surprising details.** Polish beat scope, twice, visibly.
5. **Don't pitch a business, and don't pitch the AI.** Everyone has the same key. Pitch the toy.

---

## Sources

- Austin Wilshire (Head of Engineering, Tanda), LinkedIn, 12 Oct 2026 — names the 2025 winner, the LMS and the VR app; notes hiring outcomes. **Primary.**
- Alex Ghiculescu (co-founder, Tanda), *"Things I learned at the Tanda Hackathon 2025"*, Substack, 25 Nov 2025 — 75% uni students, the customer-success team's game, the judge's "AAA games" quote, hiring. **Primary.**
- Alex Ghiculescu, *"What actually happens at a Tanda hackathon?"*, Medium, 22 Sep 2017 — "builds the coolest thing", 2017 theme and prize structure. **Primary.**
- William Jackson, LinkedIn, 24 Nov 2025 — LMS project, team of 3, 2nd place claim, US$55 token burn, "over 150 people, teams of 2–6".
- Lliam Symonds, LinkedIn, 24 Nov 2025 — the Trump/RAG interviewer project, with demo video and transcript.
- Ka Kin To & Wilkinson John Chan, LinkedIn profiles — Cogniflow, competing 2nd place claim.
- Luma event pages `rr2lgp2t` (2025) and `n0sbm2px` (2026); Hackathons Australia directory listing.
- Alex Ghiculescu, LinkedIn, 23 Oct 2025 — 100+ at the pre-event Claude Code night; "you don't need to be a Claude power user."

