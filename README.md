# tanda

**Team workspace for the Tanda AI Hackathon 2026 — Brisbane, 20–21 November.**
Theme: *Bring an idea to life.* Research, strategy, idea selection and the build plan live here.

**Three ideas, not yet prioritised** — [`UNSEEN`](docs/09-the-three-ideas.md#idea-1--unseen) (camera), [`BUZZ CHECK`](docs/09-the-three-ideas.md#idea-2--buzz-check-phone-sensors) (phone sensors) and [`THE WEARABLE`](docs/09-the-three-ideas.md#idea-3--the-wearable--the-one-the-team-wants) (smart ring). They share one spine: **measure how far a body has drifted from its own baseline.** Each works alone; together they're three channels on one instrument.

📋 **[Team plan page](https://claude.ai/artifact/9XfYmYj56wfpLVB24GecEj)** — the build plan with a live countdown, tickable gates, the pre-mortem and the demo script. *(Ask Bharath for access.)*

---

## 🚨 The three things that matter

| | |
|---|---|
| ⏰ **Hard deadline** | **Link in `#showcase` by 16:30 Saturday.** Demos at **17:00**, not 19:00. |
| 📱 **Pass/fail test** | A stranger opens your link **on their own phone, on mobile data,** and it works. |
| 💸 **Shared budget** | **US$150** Anthropic key per team — **your users spend it too.** Cap requests. |

## Event at a glance

- **When** Fri 20 Nov 17:30 → Sat 21 Nov ~20:00 AEST · **Where** 100 Wickham St, Fortitude Valley
- **Teams** 2–6 people · `#team-formation` on Slack · register at `hackathon-teams-vxlk.onrender.com`
- **Provided** Claude Code + Anthropic API access (key from Philip, one per team)
- **Demo** 2 slides · ~2 min pitch · 2 min for the room to try it · judges try every project
- **Judged on** Idea & imagination · Execution & craft · Interactivity · Technical ingenuity · Presentation & demo
- **Prizes** 🥇 a year of Claude for every team member · 🥈 $50 each
- **Wifi** `Tanda-Guest` / `Guest@Tanda25!` — but never ship anything that only works on it

## Saturday

| | |
|---|---|
| 08:00 | Breakfast and kickoff |
| 12:30 | Lunch |
| **16:30** | 🚨 **Link due in `#showcase`** · spectators arrive |
| **17:00** | **Demos (90 min cap)** |
| 18:30 | Dinner |
| 19:30 | Winners announced |

## Docs

Read them in order; later ones correct earlier ones where they disagree.

| | |
|---|---|
| **[`docs/01-hackathon-brief.md`](docs/01-hackathon-brief.md)** | The rules as given, rewritten against the organisers' kickoff deck — theme, rubric, prizes, full schedule, API-key rules, logistics. |
| **[`docs/02-past-hackathons.md`](docs/02-past-hackathons.md)** | 10 years of Tanda hackathons, what actually won in 2025, archetype analysis, and where that analysis could be wrong. |
| **[`docs/03-strategy-and-plan.md`](docs/03-strategy-and-plan.md)** | Architecture defaults, budget controls, the gate structure, demo script and an 11-row pre-mortem. |
| **[`docs/04-idea-selection.md`](docs/04-idea-selection.md)** | Idea pool 1 critiqued, plus the verified browser and hardware constraints that rule out whole categories of project. |
| **[`docs/05-merged-ideas.md`](docs/05-merged-ideas.md)** | Idea pool 2 audited for uniqueness, and the merge that folds four of them into one. |
| **[`docs/06-patient-zero.md`](docs/06-patient-zero.md)** | A crowd-scale merge of 8 of the 12 ideas. Superseded by `07`; kept for the hardware verdict. |
| **[`docs/07-instruments.md`](docs/07-instruments.md)** | Where the earlier docs over-read the brief, the real prizes and schedule, and five non-game instrument ideas. |
| **[`docs/08-three-ideas.md`](docs/08-three-ideas.md)** | Why the three ideas are one instrument, and the wearable feasibility verdicts. |
| **[`docs/09-the-three-ideas.md`](docs/09-the-three-ideas.md)** | 📋 **The three ideas in full detail** — what each is, how it's built, its honest risks, and how they stack. Not yet prioritised. |
| **[`docs/10-biosignals.md`](docs/10-biosignals.md)** | 🔬 **What actually detects alcohol and caffeine**, whether the ring provides it, the on-demand BLE commands, and what a local agent can honestly do. |
| **[`IDEA`](IDEA)** | The locked idea in one sentence, plus the go/no-go checklist. |

## The strategy in short

Four of the five judging criteria are about the audience, not the code — and the one engineering
criterion is explicitly fenced: *"clever answers to hard problems, not complexity for its own sake."*
In 2025 a productivity app that **electrically shocked you when you went off task** beat an AI
video-generation platform and a VR mood detector.

But the brief says *"pick up, try, experience **or use**"*, and *"a link the judges open on their own
phone"* is its own bullet. **A single-user instrument qualifies.** So: build one instrument, flawless
at the one thing it does, that a judge can use on themselves and immediately understand. Not an AI
chat wrapper — that will be the most common project in the room.

Buzz Check measures one thing through three sensors: **how far your body has drifted from its own
baseline.** Phone accelerometer is the floor and works on every device; the camera is the showpiece;
the ring is the hero instrument. Because it's all baseline-relative, a $20 ring is good enough.

Full reasoning and counter-arguments: `docs/02` §3 and §5, `docs/07` §1, `docs/08`.

## Constraints we verified, so nobody rediscovers them at 2am

- **Web Bluetooth does not exist on iOS Safari** — so on any iPhone — or in Firefox. The crowd's phones cannot read a wearable; the ring is read from laptop Chrome or Android.
- **Mi Band 8 is a dead end.** Gadgetbridge: third-party real-time heart rate is not supported on Xiaomi protobuf bands *even with the vendor app*. Auth token needs extracting from Mi Fitness logs, often from a rooted device.
- **Mi Band 10 has a "Share HR" broadcast mode** that may expose the standard BLE Heart Rate Service. One 15-minute test, then move on either way.
- **The Kmart (Anko) ring is a rebadged Colmi/Yawell QRing** — unencrypted, publicly documented protocol, HR + SpO2 + HRV, with an existing Web Bluetooth client. Kmart at 10 James St is ~500 m from the venue.
- **Cheap ring HR can be ~30 bpm off.** Fine, because we measure drift from your own baseline, not absolute values.
- **`DeviceMotionEvent.requestPermission()` must be called from a user gesture on iOS 13+**, or motion silently does nothing.
- **Torch control is unsupported on Safari everywhere**; `navigator.vibrate` is Android-only. Neither can carry a signal.
- Details and sources: `docs/04` §3 and `docs/08` §2.

## Working agreements

- **Gates, not tasks.** Miss a gate → cut scope immediately, never push the gate.
- **Feature freeze 10:00 Saturday.** Polish, hardening and rehearsal only after that.
- **Deploy publicly on Friday night, before any features.** No `localhost`, no laptop servers, no tunnels.
- **Test with wifi off** on a real phone, iOS and Android, after every deploy.
- **Never call the Anthropic API from the browser.** Server-side proxy, hard caps, kill switch, cached fallback.
- **🔒 Never commit the key.** `.env` is gitignored — keep it that way.

## Repo setup

The repo still has no description or topics, and I can't set those from this session. One of you can:

**Web:** repo home → ⚙️ next to *About* → paste the description and topics below.

**Or from your terminal:**

```bash
gh repo edit bharath-blazecode/tanda --description "Team workspace for the Tanda AI Hackathon 2026 (Brisbane, 20-21 Nov) - research, strategy and the build plan for UNSEEN."
```

```bash
gh repo edit bharath-blazecode/tanda --add-topic hackathon --add-topic tanda-hackathon --add-topic brisbane --add-topic claude-code --add-topic anthropic-api
```
