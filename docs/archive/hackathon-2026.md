# Tanda AI Hackathon 2026 — event and planning archive

Kachka was built by **Las Nubes** at the Tanda AI Hackathon in Brisbane on **20–21 November 2026**. The theme was **“Bring an idea to life.”** Las Nubes is Spanish for **“The Clouds.”**

These notes preserve the event information and planning material previously on the repository home page. **They are historical plans, not the current product specification or setup instructions.** All event times below are **AEST (UTC+10)**.

The plan changed during the build. In particular, the early working agreements below mention a 10:00 feature freeze, while a later gate table says 13:30. [DECISIONS.md](../../DECISIONS.md) records later changes; neither deadline is a current development requirement. For the built app and local setup, use the [project README](../../README.md).

Venue network credentials and the team-only planning link are intentionally excluded from this public archive. Obtain event access details directly from the organisers.

## 🚨 The three things that matter

| | |
|---|---|
| ⏰ **Hard deadline** | **Link in `#showcase` by 16:30 Saturday.** Demos at **17:00**, not 19:00. |
| 📱 **Pass/fail test** | A stranger opens your link **on their own phone, on mobile data,** and it works. |
| 💸 **Shared budget** | **US$150** Anthropic key per team — **your users spend it too.** Cap requests. |

## Event at a glance

- **When** Fri 20 Nov 17:30 → Sat 21 Nov ~20:00 AEST · **Where** 100 Wickham St, Fortitude Valley
- **Teams** 2–6 people · `#team-formation` on Slack · register at `hackathon-teams-vxlk.onrender.com`
- **Provided** Claude Code + Anthropic API access (one key per team, provided by the organisers)
- **Demo** 2 slides · ~2 min pitch · 2 min for the room to try it · judges try every project
- **Judged on** Idea & imagination · Execution & craft · Interactivity · Technical ingenuity · Presentation & demo
- **Prizes** 🥇 a year of Claude for every team member · 🥈 $50 each

## Saturday 21 November 2026 — event schedule

| | |
|---|---|
| 08:00 | Breakfast and kickoff |
| 12:30 | Lunch |
| **16:30** | 🚨 **Link due in `#showcase`** · spectators arrive |
| **17:00** | **Demos (90 min cap)** |
| 18:30 | Dinner |
| 19:30 | Winners announced |

## Build-day gates — later draft

Working backwards from the **16:30** deadline. Full version in [the original plan](../12-current-plan.md) §6.

| Time | Gate |
|---|---|
| **11:30** | 🚨 Public HTTPS URL live. Free host — **don't block on the domain.** |
| **12:30** | Real motion on a real iPhone, over mobile data |
| **13:30** | 🔒 Hard feature freeze. Both tiers behind one link |
| **14:30** | Ten people, their own phones, iOS + Android |
| **15:00** | Slides done, first rehearsal on a stopwatch |
| **16:00** | **Post the link.** Keep polishing behind the same URL |

## The strategy in short

This section retains the earlier **Buzz Check** working title and the original three-sensor ambition. The current app is Kachka; the ring integration remains outside the built flow.

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

## Hardware research considered during planning

This was the research snapshot at planning time, including wearable ideas that were not shipped. It is not a guarantee of device support.

- **Web Bluetooth does not exist on iOS Safari** — so on any iPhone — or in Firefox. The crowd's phones cannot read a wearable; the ring is read from laptop Chrome or Android.
- **Mi Band 8 is a dead end.** Gadgetbridge: third-party real-time heart rate is not supported on Xiaomi protobuf bands *even with the vendor app*. Auth token needs extracting from Mi Fitness logs, often from a rooted device.
- **Mi Band 10 has a "Share HR" broadcast mode** that may expose the standard BLE Heart Rate Service. One 15-minute test, then move on either way.
- **The Kmart (Anko) ring is a JRing/56ff device**, $29, all sizes the same hardware. HRV ✅, live HR ✅, SpO₂ ✅, blood pressure ✅, **skin temperature ❌**. It advertises the **standard BLE Heart Rate Service `0x180D`**, so live BPM in the browser is ~20 lines. Kmart at 10 James St is ~500 m from the venue.
- **Cheap ring HR can be ~30 bpm off.** Fine, because we measure drift from your own baseline, not absolute values.
- **`DeviceMotionEvent.requestPermission()` must be called from a user gesture on iOS 13+**, or motion silently does nothing.
- **Torch control is unsupported on Safari everywhere**; `navigator.vibrate` is Android-only. Neither can carry a signal.
- Details and sources: `docs/04` §3 and `docs/08` §2.

## Early working agreements — superseded planning notes

- **Gates, not tasks.** Miss a gate → cut scope immediately, never push the gate.
- **Feature freeze 10:00 Saturday.** Polish, hardening and rehearsal only after that.
- **Deploy publicly on Friday night, before any features.** No `localhost`, no laptop servers, no tunnels.
- **Test with wifi off** on a real phone, iOS and Android, after every deploy.
- **Never call the Anthropic API from the browser.** Server-side proxy, hard caps, kill switch, cached fallback.
- **🔒 Never commit the key.** `.env` is gitignored — keep it that way.

## Related planning documents

- [Official brief and rules](../01-hackathon-brief.md)
- [Original strategy and gate plan](../03-strategy-and-plan.md)
- [Build-day plan](../12-current-plan.md)
- [Idea and go/no-go checklist](../../IDEA)
- [Product and implementation decisions](../../DECISIONS.md)
- [Full documentation index](../README.md)
