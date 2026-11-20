# 01 — Hackathon Brief: the rules, as given

> **TL;DR** — Tanda AI Hackathon, Brisbane. Theme: **"Bring an idea to life."** Teams of **2–6**.
> One **US$150** Anthropic key per team. **Link in `#showcase` by 16:30 Saturday**, demos **17:00**
> with a 90-minute cap, winners **19:30**. First prize is **a year of Claude for every team member**.
> The pass/fail test: **it works, right now, on a stranger's own phone.**

*Every fact on this page is from the organisers' kickoff deck (8 slides) or the official Luma event
page. Nothing here is inferred.*

---

## 1. The event

| | |
|---|---|
| **Name** | Tanda AI Hackathon: *Bring an idea to life* |
| **Host** | Tanda (Brisbane workforce-management SaaS). *Not officially affiliated with Anthropic/Claude.* |
| **Organisers** | Philip Fraser, Austin Wilshire (Head of Engineering), Ellen Mackenzie |
| **Venue** | 100 Wickham St, Fortitude Valley QLD 4006 |
| **Starts** | Friday 20 November 2026, 17:30 AEST |
| **Ends** | Saturday 21 November 2026, ~20:00 AEST |
| **Build window** | ~23 hours to the `#showcase` deadline |
| **Cost** | Free (Participant / Spectator tickets) |
| **Scale** | 223 registered on Luma. *(Demos are capped at 90 minutes — at ~4 min a team that's roughly 22 slots, so the field is likely smaller than registrations suggest.)* |
| **Tooling provided** | Claude Code + Anthropic API access |
| **Venue wifi** | `Tanda-Guest` / `Guest@Tanda25!` |
| **Team registration** | `hackathon-teams-vxlk.onrender.com` — one person creates the team, the rest join |
| **Slack** | `tandahackathon2026.slack.com` · `#team-formation` · `#showcase` |

## 2. The theme, as stated

> **Bring an idea to life.**
> *Build something people can **pick up, try, experience or use**, not just watch.
> On Saturday the crowd and the judges will try your project for themselves.*

And from the event page:

> *"Pick an idea you're keen to build. It could be **a game**, **something that solves a small
> annoyance**, or **a ridiculous experiment that has no practical purpose at all**. Have some fun
> with it and **make something we can try**."*

⚠️ **Read "experience or use" literally.** It does not have to be a game, and it does not have to be
multiplayer — see the "This counts" list below, where *"a link the judges open on their own phone"*
stands on its own. An earlier version of this document over-read the brief as requiring a crowd
game; `07-instruments.md` §1 corrects that.

## 3. "What counts as brought to life"

| ✅ This counts | ❌ This doesn't |
|---|---|
| A link the judges open on their own phone | Slides, screenshots or a recorded video |
| A multi-player game, tool or toy the crowd can play with | A form that saves to nowhere |
| Something works end to end | Something only your team can run |

> *"**Hosting is up to you and can be dead simple.** Any working link is ideal. Be aware that the
> auditorium has its own network, not everyone in the crowd will be on it. **Test that before demos.**"*

The three "counts" items are **alternatives, not a checklist** — any one of them qualifies. The three
"doesn't" items are named, disqualifying failure modes. That last paragraph is the most dangerous
line in the deck: it means `localhost`, a laptop server and a tunnel bound to your machine are all
losing architectures, because judges open your link later, without you.

## 4. Teams

- **2–6 people per team.**
- Teams form in `#team-formation` on Slack.
- Register at `hackathon-teams-vxlk.onrender.com` — **one person creates the team, the others join it.**

## 5. The Anthropic API key

- **One key per team, with US$150 of credit.**
- **Grab it from Philip** once your team is registered.
- **"Plan with Opus, build with Sonnet."**
- ⚠️ **"Your app's users spend it too: cap requests."**
- Run out → **message Philip on Slack.**
- 🔒 **"Keep it secret. Never commit it."**

**The trap:** that US$150 is not only your development budget. If your demo calls the API from the
audience's phones, they spend it live, in front of the judges. A 2025 team burned **US$55 in one
night of testing**. Budget engineering is a design constraint, not an afterthought — see
`03-strategy-and-plan.md` §4 for the controls.

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

Four of the five criteria are about the audience experience, not the code. "Technical ingenuity" is
the only engineering-weighted one and it is explicitly fenced against complexity for its own sake.
Point 4 means your hosted link is judged *after* your slot, possibly cold, from a judge's own phone,
with your laptop shut — **your project must survive your absence.**

## 7. Prizes

| | |
|---|---|
| 🥇 **First place** | **A year of Claude, for every member of the team** |
| 🥈 **Runner up** | **$50, for every member of the team** |

## 8. Saturday 21 November — the official schedule

| Time (AEST) | What |
|---|---|
| 08:00 | Light breakfast and kickoff |
| All day | Build — *"aim to be demo-ready by 5pm"* |
| 12:30 | Lunch arrives |
| **16:30** | 🚨 **Link due in `#showcase`.** Spectators arrive, drinks and snacks |
| **17:00** | **Demos — 90 minute cap** |
| 18:30 | Dinner |
| **19:30** | **Winners announced** |
| 20:00 | Home, or drinks at The Osborne in Fortitude Valley |

**Treat 16:30 as the end of the hackathon.** Everything after it is presentation. Note that demos are
at **17:00, not 19:00** — the build day is shorter than the event's end time suggests.

---

## Change log

- **v2** — Rewritten against the organisers' kickoff deck. Added the real prizes, the full Saturday
  schedule, venue wifi and the team-registration URL. Corrected the demo time to 17:00.
  Flagged the "experience or use" wording that `07` acts on.
- **v1** — Built from photographs of the briefing slides plus the Luma event page. The
  "$1,500 / $800 / $200" prize figure circulating in search results was flagged as unverified;
  **the deck confirms it was wrong.** Good thing nothing was planned around it.
