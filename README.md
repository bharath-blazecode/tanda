# tanda

**Team workspace for the Tanda AI Hackathon 2026 — Brisbane, 20–21 November.**
Theme: *Bring an idea to life.* Research, strategy and build notes live here.

---

## 🚨 The three things that matter

| | |
|---|---|
| ⏰ **Hard deadline** | **Link posted in `#showcase` by 16:30 Saturday.** Not 19:00. |
| 📱 **Pass/fail test** | A stranger opens your link **on their own phone, on mobile data,** and it works. |
| 💸 **Shared budget** | **US$150** Anthropic key per team — **your users spend it too.** Cap requests. |

## Event at a glance

- **When** Fri 20 Nov 17:30 → Sat 21 Nov 19:00 AEST · **Where** 100 Wickham St, Fortitude Valley
- **Teams** 2–6 people · form up in `#team-formation` on Slack
- **Provided** Claude Code + Anthropic API access (key from Philip, one per team)
- **Demo** 2 slides · ~2 min pitch · 2 min for the room to play · judges try every project
- **Judged on** Idea & imagination · Execution & craft · Interactivity · Technical ingenuity · Presentation & demo

## Docs

| | |
|---|---|
| **[`docs/01-hackathon-brief.md`](docs/01-hackathon-brief.md)** | The rules exactly as given — theme, judging rubric, team size, API-key rules, deadlines, logistics. Every fact is sourced and confidence-rated. |
| **[`docs/02-past-hackathons.md`](docs/02-past-hackathons.md)** | 10 years of Tanda hackathons, what actually won in 2025, archetype analysis, and an explicit devil's-advocate section on where that analysis could be wrong. |
| **[`docs/03-strategy-and-plan.md`](docs/03-strategy-and-plan.md)** | The playbook: idea shortlist with scores, architecture defaults, hour-by-hour gates, demo script, an 11-row pre-mortem, and questions to ask the organisers. |
| **[`docs/04-idea-selection.md`](docs/04-idea-selection.md)** | The six submitted ideas critiqued against the real rubric, verified hardware/browser constraints, and five replacement ideas with a risk-hedged build plan. |
| **[`docs/05-merged-ideas.md`](docs/05-merged-ideas.md)** | The team's second idea pool audited for uniqueness, and the merge that folds four of them into one buildable project. |
| **[`IDEA`](IDEA)** | Our locked idea, in one sentence. If it doesn't fit in one sentence, it isn't locked. |

## The short version of the strategy

Four of the five judging criteria are about the audience, not the code — and the one engineering
criterion is explicitly fenced: *"clever answers to hard problems, not complexity for its own sake."*
In 2025, a productivity app that **electrically shocked you when you went off task** beat an AI
video-generation platform and a VR mood detector.

So: **build a multiplayer toy that 200 strangers can join from a QR code in 10 seconds, that does
something visible to them, and that is flawless at the one thing it does.** Not an AI chat wrapper —
that will be the most common project in the room.

Full reasoning, counter-arguments and where this read could be wrong: `docs/02` §3 and §5.

## Working agreements

- **Gates, not tasks.** Miss a gate → cut scope immediately, never push the gate. (`docs/03` §6)
- **Feature freeze 10:00 Saturday.** Polish and hardening only after that.
- **Deploy publicly on Friday night, before any features.** No `localhost`, no laptop servers, no tunnels.
- **Never call the Anthropic API from the browser.** Server-side proxy, hard caps, kill switch, cached fallback.
- **🔒 Never commit the key.** `.gitignore` the env file *before* the first commit.

## Repo setup

The GitHub repo has no description or topics yet — I can't set those from here. One of you can:

**Web:** repo home → ⚙️ next to *About* → paste the description and topics below.

**Or from your terminal:**

```bash
gh repo edit bharath-blazecode/tanda --description "Team workspace for the Tanda AI Hackathon 2026 (Brisbane, 20-21 Nov) - research, strategy and build notes for 'Bring an idea to life'."
```

```bash
gh repo edit bharath-blazecode/tanda --add-topic hackathon --add-topic tanda-hackathon --add-topic brisbane --add-topic claude-code --add-topic anthropic-api
```
