# 10 — What actually detects alcohol and caffeine, and what the ring gives you

> **TL;DR — the short answer to your question.**
> **Alcohol: yes, the ring is the right instrument.** HRV down, resting HR up, skin temperature up —
> that's the signature Oura and WHOOP built products on, and the QRing family exposes **HRV and skin
> temperature** with documented commands.
> **Caffeine: no, the ring is weak.** The HRV literature contradicts itself, and the reliable caffeine
> signals are blood pressure (the ring can't really measure it) and **tremor** — which the phone
> accelerometer measures better than any ring.
> **So: the ring is the alcohol sensor, the phone is the caffeine sensor.** That's not a compromise,
> it's the correct division of labour, and it's why having both beats having either.
> ⚠️ **The one thing to know before building:** the wearable alcohol signature is mostly an
> **overnight, multi-hour** signal, not a 40-second one.

---

## 1. What detects alcohol

From Oura's data on 800,000+ members and WHOOP's aggregated member data — the two companies that have
actually done this at scale:

| Signal | Direction | Strength | Why |
|---|---|---|---|
| **HRV (rMSSD)** | ⬇️ **down** | **Strongest single signal** | Alcohol suppresses parasympathetic tone. rMSSD is the time-domain measure that validates well against ECG; it's Oura's headline HRV for that reason. |
| **Resting heart rate** | ⬆️ up | Strong | Rises and stays risen through the night |
| **Skin temperature** | ⬆️ up | Good | Peripheral vasodilation. Measured as deviation from personal baseline, not absolute. |
| **Respiratory rate** | ⬆️ up | Moderate | Thinner independent validation |
| **Sleep** | ⬇️ degraded | Strong but useless to us | Oura: total sleep −7.7%, REM −14.2% on a night with alcohol |
| **Postural sway** | ⬆️ up | Strong, and *immediate* | Posturography consistently shows this. **Phone accelerometer, not the ring.** |

### 🔴 Two caveats you must state before a judge does

**1. Neither Oura nor WHOOP directly measures alcohol.** They infer it from these signals. Any claim
stronger than "these signals shifted the way alcohol shifts them" is overclaiming. Real transdermal
alcohol sensors (SCRAM, BACtrack Skyn) measure ethanol through skin — no ring does this, at any price.

**2. The signature is overnight, not instant.** HRV suppression, elevated resting HR and the
temperature rise are measured over *hours of sleep*. Acute drinking does move HR and HRV within
30–60 minutes, so a **before-and-after across an evening is realistic** — but a 40-second test cannot
produce the overnight signature. Design around the before/after, not the snapshot.

---

## 2. What detects caffeine

| Signal | Direction | Reliability |
|---|---|---|
| **Physiological tremor** | ⬆️ **up** | ✅ **Best signal.** Caffeine amplifies the small tremor everyone already has, mostly at ~200 mg and above. **Accelerometer, not the ring.** |
| **Blood pressure** | ⬆️ up | ✅ Reliable at 30–60 min — but no cheap ring genuinely measures BP |
| **Heart rate** | ⬆️ up | ⚠️ Modest and variable |
| **HRV** | ❓ **contested** | ❌ The literature genuinely disagrees. Flueck (2016): *"Most parameters of heart rate variability did not significantly change post caffeine ingestion compared to placebo."* Other studies find rMSSD significantly reduced. **Don't build on this.** |
| **Postural sway** | ↔️ roughly flat | A systematic review found younger participants' balance generally unaffected, though one study found sway *frequency* rose |

**Timing:** caffeine effects begin within 15–60 minutes and peak around 30–60 minutes.

---

## 3. Why your two frequency bands are the right idea

This is the most interesting thing in this document. The two substances appear to move the two bands
in **opposite directions**:

| | **Sway** 0.1–3 Hz | **Tremor** 4–12 Hz |
|---|---|---|
| **Alcohol** | ⬆️ **up** | ⬇️ can go **down** — alcohol temporarily suppresses tremor |
| **Caffeine** | ↔️ roughly flat | ⬆️ **up** |

That's exactly the discrimination "Wired vs Tipsy" needs, and it's a far better story than one
undifferentiated impairment number. **A two-dimensional plot with sway on one axis and tremor on the
other puts the two states in different quadrants** — that's your projector visual.

**Status, stated honestly:** the *directions* are supported in the literature. The *magnitudes*, the
thresholds and the per-person variation are not. This is a literature-motivated hypothesis driving a
toy, not a validated classifier. Say that out loud — then do the thing that makes it real: **collect
your own readings tonight.** You are in a building full of people drinking coffee and beer and losing
sleep. Even n=20 of your own measurements beats a claim you can't back.

---

## 4. Does the ring actually provide the data?

**Yes — with three conditions.** The QRing protocol is reverse-engineered and documented
(`colmi.puxtril.com`, Gadgetbridge, PulseLoop).

### Capabilities, QRing firmware

| Metric | Available? | Notes |
|---|---|---|
| **Heart rate — live** | ✅ | Confirmed on R10/R11/R12; same protocol on the R02 family |
| **Heart rate — spot + history** | ✅ | History syncs 8 days |
| **HRV** | ✅ | **The key metric for alcohol.** History syncs 7 days; on-demand on newer models (below) |
| **Skin temperature** | ✅ | Real sensor. On-demand on newer models |
| **Stress score** | ✅ | Derived by firmware — treat with suspicion |
| **Sleep incl. REM** | ✅ | ⚠️ see the firmware warning below |
| **SpO₂ — spot** | ❌ | QRing has **no on-demand SpO₂** — all-day background only |
| **Blood pressure** | ❌ | Not on QRing firmware |
| **Raw PPG waveform** | ❌ | Not exposed. This matters — see §5 |
| **Respiratory rate** | ❌ | Not exposed |

### On-demand measurement — the commands

Newer models (documented on the **Colmi Ring 2 Pro**, same QRing protocol family) support **on-demand
HRV, stress and temperature**, which is exactly what a 40-second test needs:

```
start:  69 <type> 25        type 0a = HRV, 08 = stress, 0b = temperature
stream: 69 <type> <err> <value>     value 0 = warm-up, roughly 25 s
        reading is the LAST value, settled ~1 s after the stream stops (75 s ceiling)
stop:   6a <type> <value> 00        (temperature uses a fixed 6a 0b 00 00)

temperature °C = raw / 10 + 20
```

**A ~25-second on-demand HRV reading fits inside your test battery.** That is the single most
important technical fact in this document.

### ⚠️ Condition 1 — which app the ring ships with decides what you get

The same Colmi/Anko ring is sold with **two completely different firmwares**, and the box tells you
which:

| | **QRing** (Nordic-UART `6e40fff0`) | **SmartHealth** (Yucheng YCBT `be940`) |
|---|---|---|
| HRV | ✅ | ❌ |
| Skin temperature | ✅ | ❌ |
| Stress | ✅ | ❌ |
| Spot SpO₂ | ❌ | ✅ (~40 s) |
| Blood pressure | ❌ | ✅ — but with no cuff, don't trust it |
| Continuous background sync | ✅ | ❌ read-only while connected |

**For alcohol you want QRing**, because HRV and skin temperature are the two signals that matter.
Naming convention observed in the wild: QRing rings advertise as `R02_A1B2` (**underscore**),
SmartHealth as `R99 54DC` (**space**). **Check the box in the shop.**

### ⚠️ Condition 2 — model matters for on-demand

On-demand HRV/temperature is documented on the Ring 2 Pro class. On older R02/R03/R06 units, HRV and
temperature may only come through **history sync**, which is useless for a live demo. Buy the newest
QRing model Kmart stocks, and **test on-demand HRV within the first 30 minutes of getting it.**

### ⚠️ Condition 3 — Web Bluetooth, so no iPhones

The ring is read from **laptop Chrome or Android Chrome**. Never from the crowd's phones. This settles
the architecture: the ring is the stage instrument, phone sensors are what everyone else uses.

### 🔴 The firmware finding that should change how you use it

Analysis of the ring's firmware found that **sleep light/deep/REM stages are generated with `rand()`**
— only the asleep/awake boundaries come from sensors.

Take the lesson generally: **trust what the sensor measures, distrust what the firmware derives.**
Use live HR, HRV and temperature. Ignore "stress score", "sleep quality" and any other composite the
ring hands you. And say this in the pitch — *"we read the firmware; the sleep stages are literally
random numbers, so we only use the signals the sensor actually produces"* — because it is exactly
the kind of thing that scores on technical ingenuity and costs you nothing to check.

---

## 5. The gap the phone fills

The ring **does not expose a raw PPG waveform**, so you cannot compute true beat-to-beat intervals
from it — you get whatever rMSSD the firmware calculated. (Worth noting: **Oura doesn't expose raw PPG
or beat-to-beat intervals either**, at twenty times the price.)

**The phone camera does.** Finger over the rear lens, 30 fps, and you have a full pulse waveform you
can extract real inter-beat intervals from and compute rMSSD yourself.

So the two instruments complement rather than duplicate:

| | Ring | Phone camera |
|---|---|---|
| **Continuous, unattended, overnight** | ✅ | ❌ |
| **Raw waveform → your own HRV maths** | ❌ | ✅ |
| **Skin temperature** | ✅ | ❌ |
| **Works on iPhones** | ❌ | ✅ |
| **Needs a purchase** | ✅ | ❌ |

Measuring the same person on both at once, and showing the two agree, is a stronger claim than either
alone — and it's a good demo moment.

---

## 6. On the local AI agent

You asked about an agent analysing the data. Worth being precise about what it can and can't do in
19 hours.

**What it genuinely can do:**
- **Interpret a multi-signal delta against baseline in plain language.** "Tremor up 40%, sway flat, HR +12, HRV −18% — that pattern looks more like caffeine than alcohol, and here's why." Translating a vector of measurements into a readable explanation is exactly what a model is good at.
- **Weigh disagreeing channels.** When the ring says one thing and the accelerometer says another, have it say which it trusts and why.
- **Write the receipt.** Personality, phrasing, the bin chicken's bedside manner.

**What it can't do, and shouldn't claim:**
- **Be a trained classifier.** You have no labelled data and no time to gather enough. Do not say "our model detects intoxication".
- **Replace the thresholds.** Keep the actual decision in deterministic code against the person's own baseline, and let the model explain the result. The model proposes language, the engine owns the verdict — same architecture principle as everywhere else in these docs.

**What would make it genuinely impressive:** start a labelled log tonight. Every reading tagged with
drinks, coffees and hours awake. By 16:00 Saturday you'd have a real, if small, dataset — and
"here's what we found in 40 people over 20 hours" beats any claim about a model.

---

## 7. What to do about it

1. **In the shop:** buy the **newest QRing-app** model Kmart stocks. Underscore in the advertised name, QRing on the box. Buy two.
2. **First 30 minutes:** confirm **on-demand HRV** works — `69 0a 25`, expect a ~25 s warm-up then values. If only history sync works, HRV drops out of the live test and HR + temperature carry it.
3. **Build the before/after**, not the snapshot. The honest alcohol claim needs two readings separated by an hour, not one reading.
4. **Put tremor on the phone, HRV on the ring.** Caffeine shows up in the accelerometer; alcohol shows up in the ring.
5. **Plot sway against tremor** on two axes. That's the visual, and it's the hypothesis made visible.
6. **Log everything tonight** with labels. It's free and it's the thing nobody else will have.

---

*Alcohol signatures from Oura's 800,000-member analysis and WHOOP's aggregated member data; HRV
validation and the rMSSD recommendation from Oura clinical-research documentation. Caffeine HRV
findings from Flueck et al. (2016, PLOS ONE) and contrasting studies. Ring capabilities, the
on-demand command bytes, the QRing/SmartHealth split and the `rand()` sleep-stage finding from the
PulseLoop hardware documentation, colmi.puxtril.com and Gadgetbridge. Tremor and sway directions from
posturography and caffeine-balance literature — directions supported, magnitudes not.*
