# 01 — Hackathon Brief: the rules, as given

> **TL;DR** — Tanda AI Hackathon, Brisbane, **Fri 20 Nov 17:30 → Sat 21 Nov 19:00 AEST**.
> Theme: **"Bring an idea to life."** Teams of **2–6**. One **US$150** Anthropic key per team.
> **Showcase link due in `#showcase` by 16:30 Saturday.** 2 slides, ~2 min pitch, 2 min for the room to play.
> The single hardest constraint: **it must work, right now, on a stranger's own phone, on their own mobile data.**

---

## 1. The event

| | |
|---|---|
| **Name** | Tanda AI Hackathon: *Bring an idea to life* |
| **Host** | Tanda (Brisbane workforce-management SaaS). *Not officially affiliated with Anthropic/Claude.* |
| **Organisers** | Philip Fraser, Austin Wilshire (Head of Engineering), Ellen Mackenzie |
| **Venue** | 100 Wickham St, Fortitude Valley QLD 4006 (Tanda office) |
| **Starts** | Friday 20 November 2026, 17:30 AEST |
| **Ends** | Saturday 21 November 2026, 19:00 AEST |
| **Build window** | ~23 hours to the `#showcase` deadline (16:30 Sat) |
| **Cost** | Free (Participant / Spectator tickets) |
| **Scale** | 223 registered on Luma at time of writing (2025 ran ~150–156 attendees) |
| **Tooling provided** | Claude Code + Anthropic API access |
| **Prizes** | **Not publicly announced.** See §6 — do not plan around a prize figure. |

## 2. The theme, as stated officially

> "This year's invitation is simple: **bring an idea to life.** Pick an idea you're keen to build.
> It could be **a game**, **something that solves a small annoyance**, or **a ridiculous experiment that has
> no practical purpose at all**. Have some fun with it and **make something we can try**."

Three sanctioned lanes. Note that two of the three are explicitly *not* "useful product". The
operative phrase is the last one: **make something we can try.**

## 3. "What counts as brought to life" (from the briefing slides)

| ✅ This counts | ❌ This doesn't |
|---|---|
| A link the judges open on their own phone | Slides, screenshots or a recorded video |
| A multi-player game, tool or toy the crowd can play with | A form that saves to nowhere |
| Something works end to end | Something only your team can run |

> "Hosting is up to you and can be dead simple. Any working link is ideal. **Be aware that the
> auditorium has its own network, not everyone in the crowd will be on it. Test that before demos.**"

**Read this table as a scoring function, not as flavour text.** Each ❌ is a named, disqualifying
failure mode that somebody has clearly done before. See `03-strategy-and-plan.md` §3 for why the
network sentence is the most dangerous line on the slide.

## 4. Teams

- **2–6 people per team.**
- Teams form in **`#team-formation`** on Slack.
- 2025 precedent: teams of 3 placed highly. Headcount is not the constraint; coordination is.

## 5. The Anthropic API key — rules and the trap

- **One key per team, with US$150 of credit.**
- **Grab it from Philip** once your team is set.
- **"Plan with Opus, build with Sonnet."** (Organisers' explicit guidance.)
- ⚠️ **"Your app's users spend it too: cap requests."**
- Run out → **message Philip on Slack.**
- 🔒 **Keep it secret. Never commit it.**

**The trap, spelled out:** that US$150 is not only your development budget. If your demo calls the
API from the crowd's phones, ~200 people hitting it during a 2-minute play window spend it too —
and they spend it at the worst possible moment, live, in front of the judges. A 2025 team reported
burning **US$55 in a single night of testing** on an AI-video project. That is a third of the budget
on *testing alone*. Budget engineering is a first-class design constraint here, not an afterthought.
Mitigations are in `03-strategy-and-plan.md` §4.

## 6. Judging

| Criterion | What judges look for |
|---|---|
| **Idea and imagination** | A creative idea: useful, silly, surprising or playful. |
| **Execution and craft** | The core thing works, sensibly scoped, with details that make it stand out. |
| **Interactivity** | It's hosted, and people can use it themselves instead of watching a form being filled in. |
| **Technical ingenuity** | Clever answers to hard problems, **not complexity for its own sake**. |
| **Presentation and demo** | Explain it clearly, show it well, **get the room excited**. |

**How it works**
1. Post your link in **`#showcase` by 16:30 Saturday**.
2. Each team gets **2 slides**, about **2 minutes to pitch**, **2 minutes to play**.
3. Pitch it quickly, then show it and **let the room try it**.
4. **Judges try every project before deciding.**

**Four of the five criteria are about the audience experience, not the code.** "Technical ingenuity"
is the only engineering-weighted criterion and it is explicitly fenced: *clever answers to hard
problems, not complexity for its own sake*. This is the most important fact in this document and
the whole of `03-strategy-and-plan.md` is derived from it.

**"Judges try every project before deciding"** means your hosted link is judged *after* your slot,
possibly cold, possibly from a judge's own phone, possibly while your laptop is shut.
**Your project must survive your absence.**

## 7. Hard deadlines

| Time (AEST) | What |
|---|---|
| Fri 17:30 | Event opens |
| Fri evening | Team formation (`#team-formation`), pitch ideas, collect API key from Philip |
| **Sat 16:30** | **🚨 Link posted in `#showcase`. This is the real deadline.** |
| Sat evening | Demos: 2 slides / ~2 min pitch / 2 min play, per team |
| Sat 19:00 | Event ends |

Treat **16:30 Saturday** as the end of the hackathon, not 19:00. Everything after it is
presentation. Working backwards from it is the only schedule that matters — see
`03-strategy-and-plan.md` §6.

---

## Provenance of this document

| Fact | Source | Confidence |
|---|---|---|
| Theme, dates, venue, hosts, ticket types, Claude Code/API provision | Official Luma event page (`luma.com/n0sbm2px`) | **High** — primary |
| Judging rubric, "what counts", team size, API key rules, showcase deadline | Photographs of the organisers' briefing slides, taken in the room 20 Nov ~18:00 | **High** — primary, but transcribed from projected slides at an angle; re-check exact wording against the deck |
| Registration count (223) | Luma, 20 Nov 2026 | Medium — moves |
| Prize amounts | **Not found.** Public listings show the event with no prize field. A web-search snippet circulating "$1,500 / $800 / $200" could **not** be verified against any Tanda source and appears to be snippet contamination from an unrelated event. | **Do not rely on it.** |

