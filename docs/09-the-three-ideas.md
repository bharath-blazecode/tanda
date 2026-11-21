# 09 — The three ideas, in detail

> Status: **not yet prioritised.** All three are live. They share a spine — *measure how far a body
> has drifted from its own baseline* — so they can ship as one app with three sensor channels, or as
> three separate projects. This document describes each on its own terms so the team can choose.

---

## Idea 1 — `UNSEEN`

**A phone that shows you motion your eyes can't resolve.**

### What it is
The camera captures frames, a temporal bandpass filter runs on every pixel, the residual is amplified
and composited back over the image. Movement that is physically real but below the eye's threshold
becomes obvious on screen. The technique is **Eulerian Video Magnification** — a well-known research
result that almost nobody has ever been able to simply pick up and use.

### What you point it at
| Target | What appears |
|---|---|
| A face or neck | Their pulse, beat by beat, as a visible flush |
| A chest, across the room | Breathing rate, nothing worn, nothing touched |
| A laptop fan, aircon duct, washing machine | The wobble that means a bearing is going |
| A building, railing or pole | It's swaying, and it always was |
| A guitar string or speaker cone | The vibration, slowed and amplified |

### Second mode — flicker
The camera's **rolling shutter** is already a sampling instrument: it scans the sensor row by row, so
a 100 Hz light oscillation becomes spatial banding you can FFT. Cheap LEDs modulate at 100 Hz and a
real minority of people get eye strain and headaches from it (IEEE 1789 exists for this reason).
Every light in the building is a live test case, so it can be validated on stage in ten seconds
against a known-good source.

### Pipeline
```
capture → downscale to 160×120 → per-pixel temporal bandpass
(two one-pole IIR lowpasses, differenced) → gain → composite back
```
Colour mode (0.8–3 Hz, shows pulse) is robust and ships first. Motion mode is higher impact and
noisier — it amplifies camera shake as readily as signal.

### Claude's job
Given the dominant frequency, amplitude and spatial map plus what the user says they're pointing at,
name the likely physical cause. *"4.2 Hz localised at the mount, not the blade — loose bearing, not
imbalance."* Measurement → probable cause is what a model is good at and a classifier isn't.

### Honest risks
- Motion magnification amplifies noise and shake. Mitigate with a stillness gate, a tight frequency band, and a propped phone.
- Needs decent light. A dark auditorium is the worst case.
- Colour mode is the fallback and is far more forgiving.

### Why it scores
Pure instrument, no rules to explain. The demo instruction is four words — *"point it at yourself"* —
and a judge sees their own heartbeat in about five seconds.

---

## Idea 2 — `BUZZ CHECK` (phone sensors)

**A body drift recorder. Log a drink, hold still, find out how far you've moved from your own normal.**

### What it is
A 40-second battery of tests run entirely on the phone. Results are expressed as **drift from your own
baseline**, never as an absolute verdict, and printed as a receipt signed by a bin chicken. It calls
itself a toy, not a test — which is what keeps it clear of the safety problem that sank Drunk Check.

### The three tests
| # | Test | Duration | Sensor | Measures |
|---|---|---|---|---|
| 1 | **Steady hand** — arm out, hold still | 8 s | accelerometer / gyroscope | Splits into **sway 0.1–3 Hz** and **tremor 4–12 Hz** |
| 2 | **Reaction** — tap the dot the instant it flashes, ×8 | 15 s | touch | **Report the variance, not the mean.** Reaction-time variability is the better impairment marker and almost nobody knows that |
| 3 | **Tracking** — follow a moving target with your thumb | 15 s | touch | Fine motor control, which alcohol degrades and caffeine mostly doesn't |

### Output
Steady / Wired / Tipsy, with per-band multipliers against your personal baseline, on a printed
receipt. The two bands are the interesting part — see `10-biosignals.md` §3 for why they may point in
opposite directions for the two substances.

### Honest risks
- **iOS needs `DeviceMotionEvent.requestPermission()` called from a user gesture** (iOS 13+). Get this wrong and it silently does nothing on every iPhone.
- A baseline needs collecting before drift means anything. Design the first run as "calibrate me".
- Accelerometer sampling rates vary between devices; normalise.

### Why it scores
Zero hardware, works on every device in the room, finishes in 40 seconds, and it's funny. It is the
only one of the three that has **no dependency on anything arriving or being granted.**

---

## Idea 3 — `THE WEARABLE` ⭐ *(the one the team wants)*

**A ring or band reading the body continuously, so the drift is measured in physiology, not just movement.**

### What it is
A cheap smart ring over Bluetooth, streaming heart rate — and, on the right model, HRV and skin
temperature — while the phone tests run. Where Buzz Check measures what your body *does*, this
measures what your body *is doing internally*.

### Hardware verdict
| Device | Verdict |
|---|---|
| **Mi Band 8** | ❌ **Dead end.** Gadgetbridge: third-party real-time heart rate is unsupported on Xiaomi protobuf bands *even with the vendor app*. Auth token must be extracted from Mi Fitness logs, often needing a rooted device. |
| **Mi Band 10** | ⚠️ **One 15-minute test.** It has a **"Share HR"** broadcast mode. If that is the standard BLE Heart Rate Service, Chrome reads it with no token and no root. Test, then move on either way. |
| **Kmart / Anko ring** | ✅ **The pick.** Rebadged Colmi/Yawell **QRing** hardware. Unencrypted BLE, publicly documented Nordic-UART protocol, live HR, HRV, skin temperature. Existing Web Bluetooth client names the Anko/Kmart model. Kmart at **10 James St, ~500 m from the venue.** |

Full capability breakdown and the exact BLE commands: **`10-biosignals.md` §4.**

### Honest risks
- **Web Bluetooth does not exist on iOS.** The ring is read from laptop Chrome or Android, never from the crowd's phones. It's the stage instrument.
- **Cheap ring heart rate can read far off in absolute terms** — one tester found a Colmi ~30 bpm out. Doesn't matter here: every reading is relative to the wearer's own baseline.
- **Which app the ring ships with decides what you get.** QRing firmware gives HRV and skin temperature; SmartHealth firmware gives blood pressure and spot SpO2 but *no HRV, no temperature*. The box tells you. Check before buying.
- **Model matters for on-demand HRV.** See `10-biosignals.md` §4.

### Why it scores
It's the only one with real physiology behind it, it's the one the team is most excited about, and it
puts a physical object in a judge's hand.

---

## How they fit together

```
TIER 1  BUZZ CHECK    accelerometer sway + tremor + reaction + tracking
        every device, no hardware                    ← THE FLOOR
            |
TIER 2  UNSEEN        camera: pulse, magnified tremor, light flicker
        most devices, needs light                    ← THE SHOWPIECE
            |
TIER 3  THE RING      live HR, HRV, skin temperature over Web Bluetooth
        laptop Chrome / Android only                 ← THE HERO INSTRUMENT
```

Each tier answers the same question, so each works alone and they corroborate when present. The
moment worth building the demo around is **three independent sensors agreeing** — a much stronger
claim than any one of them makes by itself.

### If we have to choose one
- **Safest to finish:** Buzz Check alone. No hardware, no permissions beyond motion, works everywhere.
- **Best demo:** Unseen. Nothing else makes a room gasp in five seconds.
- **Most interesting, highest risk:** the ring. Needs a purchase, a protocol, and a browser that supports Web Bluetooth.

**Recommendation: build Tier 1 to done first, then add tiers upward.** Each addition is strictly
optional and strictly additive, so the project is shippable from 02:00 onward.
