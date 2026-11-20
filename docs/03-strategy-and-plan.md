# 03 — Strategy & Plan: how we win this room

> **TL;DR** — The rubric is 4/5 about the audience, and the one engineering criterion is explicitly
> fenced against complexity. So: **build a multiplayer toy that 200 strangers can join from a QR
> code in 10 seconds, that does something visible and slightly humiliating to them, and that is
> flawless at the one thing it does.** Lock the idea by 19:00 Friday, have a public URL live by
> 21:00 Friday, freeze features at 10:00 Saturday. The link is due **16:30 Saturday**.

---

## 1. The thesis, in one paragraph

This is not a product competition and it is not an engineering competition. It is a **2-minute
live-performance competition with a 23-hour build phase**, judged by people who will then try your
link on their own phone afterwards. The brief says "make something we can try." The slide says a
multi-player thing the crowd can play with counts and something only your team can run doesn't. Last
year a timer that shocked you beat an AI video platform. **Every hour you spend on something the
audience cannot feel in 2 minutes is an hour spent on the wrong axis.**

## 2. The scoring function we are optimising

Treat the five criteria as weights and be honest about where points actually come from:

| Criterion | What wins it | What we'll do |
|---|---|---|
| **Interactivity** (the differentiator) | 200 people using it *at once*, on *their* phones | Multiplayer by construction. QR → playing in <10 s. No login, no install. |
| **Presentation & demo** | The room makes noise | QR up at second 0; a round completes inside the 2-min window; the projector shows the room doing it to itself |
| **Idea & imagination** | Surprising, playful, *local* | Make the room itself the raw material. Generic = invisible. |
| **Execution & craft** | Zero visible defects on one tight loop | One loop. Feature freeze 10:00 Sat. Seeded state so it's never empty. |
| **Technical ingenuity** | One genuinely hard problem, named out loud in the pitch | "200 concurrent phones / sub-second shared state / US$150 budget" — all real, all nameable |

**The hardest thing at this event is not the AI. It is making something that does not fall over when
200 strangers on four different carriers hit it simultaneously in the one 2-minute window you get.**
Solve that visibly and you score Interactivity, Demo *and* Technical ingenuity with the same work.

## 3. The two constraints that decide the outcome

### 🚨 Constraint 1 — the network (the most dangerous line on the slide)

> *"the auditorium has its own network, not everyone in the crowd will be on it. Test that before demos."*

This sentence quietly kills projects every year. It means:

- **`localhost` is a losing architecture.** So is a laptop server, so is anything on venue wifi, so is
  a tunnel bound to your machine (if your laptop sleeps, your project is gone when the judges try it
  later — and they *will* try it later).
- **Deploy to the public internet on Friday night, before writing features.** Vercel / Cloudflare
  Pages+Workers / Netlify / Render / Fly — any of them, free tier, 10 minutes.
- **Test procedure, non-negotiable:** take a phone, **turn wifi OFF**, open the link over mobile data,
  play a full round. Do this at 21:00 Friday and again after every deploy. Have a teammate on a
  *different* carrier do the same.
- **QR code must point at a short, typo-proof, HTTPS URL.** Print it on the slide big enough to scan
  from the back row. Have a second QR on a phone screen you can hold up.

### 🚨 Constraint 2 — the US$150 key is also your users' budget

> *"Your app's users spend it too: cap requests."*

200 people × a few calls each, live, is a real bill arriving during your demo. A 2025 team burned
**US$55 in one night just testing.** Engineering controls, in priority order:

1. **Never call Anthropic from the browser.** Server-side proxy only. The key never reaches a client.
   (Also satisfies "keep it secret, never commit it" — use an env var, and add `.env` to
   `.gitignore` before the first commit, not after.)
2. **Hard caps:** per-session request limit, global requests-per-minute ceiling, and a **global kill
   switch** that flips the app to pre-generated content without crashing.
3. **Pre-generate at build time.** Anything that doesn't *have* to be live should be generated on
   Friday night, cached, and served as static JSON. Live generation is for the moments the audience
   can tell the difference.
4. **Right-size the model.** Organisers' guidance: *plan with Opus, build with Sonnet.* For runtime
   calls your users trigger, start at **Haiku** and only move up where the quality is visibly
   better. Most party-game text does not need a frontier model.
5. **Short max_tokens, batch where possible, cache aggressively** (identical prompt → cached response).
6. **Measure before you ship:** instrument cost per round in testing, multiply by 200, and if that
   number is over ~US$40 you cannot afford your own demo. Redesign then, not at 17:00 Saturday.
7. **Degrade, never die.** Budget exhausted / API 429 / network flaky → the app keeps running on
   cached content and nobody in the room can tell. **An app that visibly dies on stage fails two
   criteria at once.**

## 4. Idea shortlist

Scored 1–5 against the rubric. Chosen from the archetype analysis in `02-past-hackathons.md` §4.

### ⭐ A — "Is it you, or is it the machine?" *(recommended)*

**The mechanic.** Everyone joins from a QR. Round 1: each person answers 2–3 throwaway prompts
("worst thing about your degree", "describe your project in 6 words") — this takes 30 seconds and
*is* the onboarding. Then the game starts: the projector shows four answers to a new prompt. Three
are from real people in the room. One is **Claude impersonating a specific named person in the
room**, few-shot-primed on that person's own earlier answers. Everyone votes on their phone. The
reveal goes up on the big screen with a leaderboard. Repeat.

**Why it wins.** It is multiplayer by construction (✅ the exact thing the slide asks for). The
material is *the room itself*, so it cannot be generic. The consequence is social and public —
being fooled, or having the machine out-write you in your own voice, in front of everyone — which is
the 2025 winner's "visible consequence" property with no hardware. A round is ~60–75 seconds, so a
**full round fits inside the 2-minute play window.** And the hard technical problem is real and
20-seconds-pitchable: *"few-shot voice cloning from three sentences, with latency matched to human
typing speed, for 200 concurrent players on US$150."*

**The hard part.** Making the fake convincing. Naive prompting produces an LLM that is far too
articulate and too long. You need: aggressive style extraction from the person's real answers,
enforced length matching, deliberate lowercase/typo/abbreviation injection, and a latency delay so
the AI answer doesn't arrive suspiciously first.

**Risk & mitigation.** "Human or AI" is a known genre — the novelty is strictly in *impersonating a
named person in this room*. Do not drop that twist to save time; it *is* the idea. Keep it good-natured
(opt-in nickname, nothing cruel, easy opt-out) — a roast that lands badly costs you the room.

**Scores:** Idea 5 · Craft 4 · Interactivity 5 · Tech 4 · Demo 5

### B — "The Hive": 200 people share one agent

The crowd collectively steers a single Claude agent doing a real task (navigating a site, playing a
game, writing a document) — votes every 10 seconds decide the next action, Twitch-Plays-Pokémon style.
**Upside:** spectacular, genuinely novel, the projector does all the work. **Downside:** the single
hardest to make *legible* in 2 minutes, and the chaos can read as "broken" rather than "emergent."
Budget risk is high (continuous agent loop). Take this only if the team is strong and fast.
**Scores:** Idea 5 · Craft 2 · Interactivity 4 · Tech 5 · Demo 3

### C — "Swarm": 200 phones as one instrument

No AI in the product at all. Every phone's accelerometer/mic/touch becomes one voice in a single
real-time visual or sound on the projector — the room physically moves and the screen responds.
**Upside:** the safest spectacle, near-zero running cost, "it just works", unforgettable. **Downside:**
weaker on "Idea" unless the payoff is beautiful, and judges may ask where the AI went (the brief does
*not* require AI in the product — but expect the question, and have an answer).
**Scores:** Idea 3 · Craft 5 · Interactivity 5 · Tech 3 · Demo 5

### D — "Consequence engine" (direct 2025 lineage)

A commitment/focus device where failure is broadcast to a public wall everyone can see.
**Downside: this is explicitly last year's winner.** Re-running it invites comparison you will lose.
Listed only to be ruled out deliberately rather than by accident.
**Scores:** Idea 2 (derivative) · Craft 4 · Interactivity 3 · Tech 2 · Demo 4

### ❌ Explicitly do not build

- **An AI chat wrapper / "ChatGPT for X".** It will be the single most common project in the room.
- **An AI video or long-form content generator.** Slow on stage, expensive, and 2025 showed it places but doesn't win.
- **Anything needing a headset, a dongle, or one physical object** — 200 people cannot queue.
- **Anything with a signup flow.** Every field you add halves the number of people playing.
- **A startup pitch.** 2017 and 2026 both say the opposite in writing.

### How to choose tonight (don't agonise — this is a 30-minute decision)

Score your candidate honestly on five questions. **Four "no"s and you're out of the running:**
1. Can a stranger go from QR to *playing* in under 10 seconds, with no account?
2. Does it get **better** with 200 people than with 2?
3. Does a complete, satisfying round finish in **under 90 seconds**?
4. Can the room *see* something happen on the big screen without you narrating it?
5. If the API dies mid-demo, does it keep working?

## 5. Architecture defaults (pick fast, don't debate)

- **One web app, mobile-first, no native, no install.** Phones are portrait; design portrait-first.
- **Shared realtime state** — the single most important technical choice. Websockets or a hosted
  realtime DB. Pick whatever the team has *already used*; tonight is not for learning a new stack.
- **Two surfaces:** the **phone view** (one thumb, one decision, huge tap targets) and the
  **projector view** (readable from the back row — think 3× bigger than feels right).
- **Server-side API proxy** with caps + kill switch. The key lives in an env var and nowhere else.
- **Seed the room.** An empty lobby looks broken. Ship with plausible seeded players/content so it
  looks alive with one person in it.
- **Spectator-safe:** a judge opening the link alone, later, at home, must get something good —
  not an empty lobby. Build a solo/bot mode. **"Judges try every project before deciding."**
- **Ship ugly, then make it beautiful.** But do make it beautiful — "details that make it stand out"
  is in the rubric, and last year's most-praised project was praised for *polish*.

## 6. Timeline — gates, not tasks

23 hours, Fri 17:30 → Sat 16:30. **Each gate is pass/fail. Miss one and cut scope immediately;
never push the gate.**

| Gate | By | Condition | If we miss it |
|---|---|---|---|
| **G0** | **Fri 19:00** | Team of 2–6 set in `#team-formation`. Idea locked in one sentence. Roles assigned. **API key collected from Philip.** | Take the safest idea on the list and go. Deliberating past 19:00 costs more than a wrong pick. |
| **G1** | **Fri 21:00** | 🚨 **Public URL live.** Hello-world deployed, opened on a phone with **wifi off**. Repo created, `.env` gitignored. | Stop all feature work. Nothing else matters until this passes. |
| **G2** | **Sat 02:00** | Core loop playable end-to-end by 2 people on 2 phones. Ugly is fine. | Cut the idea in half. Keep the loop, drop the frills. |
| **G3** | **Sat 10:00** | 🔒 **Feature freeze.** Whatever exists is the product. From here: polish, hardening, caps, seeding only. | No exceptions. The most common hackathon death is a feature added at noon. |
| **G4** | **Sat 13:00** | Load-tested with **10+ real humans on real phones** (go borrow other teams — they'll say yes). Rate limits and kill switch live. Cost-per-round measured and extrapolated to 200. | If the projected cost exceeds budget, switch to cached/pre-generated content now. |
| **G5** | **Sat 15:00** | 2 slides done. Demo **rehearsed twice, on a timer**, by the person who will actually present. | Cut pitch words, not demo time. |
| **G6** | **Sat 16:30** | 🏁 **Link posted in `#showcase`.** | There is no "if". Post something working at 16:00 and keep polishing behind the same URL. |

**Sleep is a strategy, not a weakness.** 2025 was won by a project simple enough to be flawless.
Stagger rest; a team that is awake at 15:00 Saturday rehearsing beats a team that is wrecked and
debugging. Nobody has ever won one of these at 05:00.

## 7. The demo: 2 slides, 2 minutes, 2 minutes

You get ~2 minutes to pitch and 2 minutes for the room to play. **Design the demo as carefully as
the product** — it is 1 of 5 criteria on its own and it gates the Interactivity score too.

**Slide 1 — up at second 0, and it stays up the whole pitch.**
A huge QR code, the URL in plain text underneath, and one line of what to do. Nothing else.
**Say "scan this now" as your first words, before you explain anything.** You want 150 people already
joined by the time the play window opens — otherwise you burn half of it on onboarding.

**Your 2 minutes of talking, in order:**
1. **The hook (15 s)** — what it is, in one sentence a tired person understands. No preamble, no "so basically", no team intro.
2. **Why it's funny/surprising (20 s)** — the emotional premise.
3. **The hard part (20 s)** — *name it*: "200 phones, shared state, sub-second, on a US$150 budget."
   This is the only moment that scores Technical ingenuity, and most teams will skip it.
4. **Hand over to the room (rest).** Stop talking. Let the screen do the work. **Silence while the
   room plays is a win, not a gap** — that noise *is* your score.

**Slide 2:** the QR again, plus names and the repo link. (Remember §5 of `02`: people are hiring.)

**Rehearse with a stopwatch.** Twice. Out loud. The most common failure is a team that over-explains
for 2:45 and never shows the thing.

## 8. Pre-mortem — it's Saturday 18:00 and we lost. Why?

Written in advance so we can prevent each one. This is the most useful section in this document.

| # | Cause of death | Probability | Prevention | Owner |
|---|---|---|---|---|
| 1 | **The demo didn't work on the crowd's phones** — venue network, cellular, iOS Safari | **High** | G1 gate. Wifi-off test after every deploy. Test on iOS *and* Android. | |
| 2 | **Burned the US$150 before/during the demo** | **High** | Server-side proxy, hard caps, kill switch, cached fallback, cost measured at G4 | |
| 3 | **Over-scoped; nothing finished** | **High** | G3 feature freeze at 10:00. One loop. | |
| 4 | **Nobody joined in time** — onboarding ate the play window | Medium | QR up at second 0. No login. Seeded state. Scan-from-back-row test. | |
| 5 | **It worked but the room felt nothing** — no visible consequence, no reason to care | Medium | The "does the room see something happen?" test. Projector view is a first-class surface, not an afterthought. | |
| 6 | **Built an AI chat wrapper** — invisible in a field of them | Medium | Ruled out in §4. The AI is a component, never the pitch. | |
| 7 | **Judge opened the link afterwards and got an empty lobby** | Medium | Solo/bot mode + seeded content. "Judges try every project before deciding." | |
| 8 | **Over-explained; ran out of time before the demo** | Medium | Rehearse twice on a timer at G5. Hook in 15 s. | |
| 9 | **Laptop slept / tunnel died / someone pushed a breaking change at 16:00** | Medium | Real hosting, not a tunnel. **Freeze deploys after the final working build**; keep the last-known-good deployment pinned and never deploy during the demo window. | |
| 10 | **Key committed to a public repo** | Low but catastrophic | `.gitignore` the env file *before* the first commit. Never paste it into a message, slide, or screenshot. | |
| 11 | **Team deadlocked on the idea until midnight** | Low | G0 at 19:00 is a hard gate. Pre-committed tiebreak: the person who proposed it decides. | |

## 9. Open questions to ask the organisers tonight

Cheap to ask, expensive to guess. Walk up to Philip, Austin or Ellen in the first hour:

1. **Are there category prizes** (e.g. best no-code, most creative), or a single ranking? *(2017 had
   three categories; two different 2025 teams both publicly claim 2nd place — see `02` §5. If there
   are categories, that changes which lane to aim at.)*
2. **Who are the judges**, and what's their background? *(Engineers, product, or founders? The rubric
   says what they score; knowing who they are tells you how.)*
3. **Is the US$150 a hard cap** or can it be topped up mid-event if the demo burns it?
4. **Is there a projector/screen for our demo**, can we cast to it, and **can we test it beforehand?**
   *(If the crowd-view can't go on the big screen, half the strategy in this document changes.)*
5. **Is the venue wifi usable for ~200 simultaneous clients**, or should we assume cellular only?
6. **Any rules on pre-existing code?** (Fresh start vs. starting from a template.)
7. **Exact format of the `#showcase` post** — just a link, or link + description + repo?

## 10. What to do in the next 60 minutes

1. Post in `#team-formation`. Land a team of **3–4** (big enough to parallelise, small enough to decide).
2. Each person names **one** idea. Score all of them on the five questions in §4. **Pick by 19:00.**
3. Someone collects the API key from Philip. Someone else creates the repo and `.gitignore`s the env file.
4. **Deploy a hello-world to a public URL and open it on a phone with wifi off.** Before any features.
5. Ask the §9 questions while people are still standing around.
6. Write your locked one-sentence idea into `/IDEA` at the repo root. If you can't fit it in one
   sentence, it isn't locked yet.

---

### The one-line version

**Make 200 strangers do something slightly embarrassing to each other, from their own phones, in
90 seconds, and make sure nothing breaks while they do it.**
