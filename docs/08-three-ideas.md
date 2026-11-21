# 08. The three ideas are one instrument

> **TL;DR**: UNSEEN, Buzz Check and the wearable aren't three projects. **They're three sensor
> channels measuring the same thing: how far your body has drifted from its own baseline.**
> Buzz Check is the product; the other two are its sensors.
> **Drop the Mi Band 8.** Gadgetbridge states plainly that third-party real-time heart rate is not
> supported on Xiaomi protobuf bands *even with the vendor app*. **The Kmart ring is the right call**:
> unencrypted BLE, publicly documented protocol, HR + SpO2 + **HRV**, and someone has already built a
> **Web Bluetooth** client for the Anko/Kmart model. There's a Kmart at **10 James St, ~500 m from the venue.**

---

## 1. What you actually have

| | Idea | Sensor | Measures |
|---|---|---|---|
| 1 | **UNSEEN** | Camera | Pulse (colour), tremor (motion magnification), light flicker |
| 2 | **Buzz Check** | Accelerometer / gyroscope | Postural sway (0.1–3 Hz), hand tremor (4–12 Hz) |
| 3 | **The wearable** ⭐ | Ring or band over BLE | Heart rate, HRV, SpO2 |

Three different instruments pointed at **one question**: *how far is this body from its own normal
right now?* Buzz Check already has the right framing: drift against your own baseline, Steady /
Wired / Tipsy, a printed receipt, a bin chicken for a doctor. It's local, it's funny, and calling
itself a toy rather than a test sidesteps the safety problem that sank Drunk Check.

**So: Buzz Check is the product. UNSEEN and the ring are channels inside it.** You don't have to kill
anything.

---

## 2. Wearable feasibility: the decisive bit

### ❌ Mi Band 8: don't

Gadgetbridge's documentation for Xiaomi protobuf devices (which includes Band 8) lists under
**missing features**:

> *"3rd party realtime heart rate access is not supported, **even with the vendor app**. This means
> that other apps such as OpenTracks will not be able to use these devices for heart rate measurement."*

On top of that it needs an auth token pulled out of Mi Fitness logs (`token=` / `encryptKey=` in
`XiaomiFit.device.log`), and users report needing a **rooted** Android device to get at it. Pulsoid's
guide notes Xiaomi **deprecated** the Band 8 HR-sharing route. That's a multi-hour hole with a
likely dead end at the bottom.

### ⚠️ Mi Band 10: one cheap test worth doing tonight

Band 10 is "mostly supported" in Gadgetbridge and a user reports real-time HR sync working. More
interestingly, Pulsoid's current instructions for **Band 10** are: on the band, scroll down and tap
**"Share HR"**. That is a broadcast mode, and if it broadcasts the **standard BLE Heart Rate
Service (`0x180D`)**, then Chrome's Web Bluetooth can read it with **no auth key, no root, no
Gadgetbridge**.

**Test it in 15 minutes tonight.** On a laptop in Chrome:
```js
navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] })
```
Turn on Share HR first. If the band shows up, you have a live HR feed and you're done. If it
doesn't, stop: don't spend an hour on it.

### ✅ The Kmart ring: this is the one

The Kmart house brand is **Anko**, and these cheap rings are rebadged **Colmi / Yawell QRing**
hardware. That family is the single most hacker-friendly wearable on the market:

- **No encryption and no auth key.** Hackaday's coverage notes all its BLE, firmware updates included, is unencrypted.
- **Protocol is publicly documented**: `colmi.puxtril.com`, `tahnok/colmi_r02_client`, and a merged Gadgetbridge PR (#3896) for R02/R03/R06.
- **Real-time heart rate, SpO2, HRV and steps**, over a Nordic-UART GATT service.
- **Someone has already written a Web Bluetooth client that names your exact device:** `servolok84/smart-ring-dashboard`, *"Your own app for cheap generic smart rings (**Anko / Kmart AU**, Colmi, Yawell), sleep, heart rate, steps, SpO2 and HRV over **Web Bluetooth**."* TypeScript, updated September 2026.
- **There is a Kmart at 10 James St, Fortitude Valley, about 500 m from 100 Wickham St.** Walk over and check the hours; Kmart AU stores commonly run to 9pm and some are 24 hours. Unlike the Jaycar question in `06`, this one is *tonight*, not Saturday morning.

**And HRV is scientifically the better signal anyway.** Alcohol reliably suppresses heart-rate
variability; caffeine moves HR and HRV too. The Mi Band gives you one averaged BPM every 15–20 s
with no beat-to-beat intervals: you cannot compute HRV from that. The ring can.

### 🔴 The accuracy caveat, stated up front

A Gadgetbridge tester reported Colmi R02 heart rate being *"laughably inaccurate (about 30 bpm out)"*.
Take that seriously. **It doesn't sink the project, because Buzz Check already measures drift from
your own baseline rather than absolute values**: a sensor that reads 30 bpm high but reads it
*consistently* still shows change perfectly well. Say this on stage before a judge says it: *"we
measure you against you, which is why a $20 ring is good enough."* That turns the weakest part of the
hardware into evidence you understood it.

### The constraint that applies to all of them

**Web Bluetooth does not exist on iOS: any iPhone, any browser.** It's also absent from Firefox.
So the ring is read from **laptop Chrome or an Android phone**, never from the crowd's phones. That
settles the architecture: the ring is the stage instrument; phone sensors are what everyone else uses.

---

## 3. The science that makes "Wired" vs "Tipsy" real

Your two bands are well chosen, and the literature suggests they separate the two states:

| | Low band: sway 0.1–3 Hz | High band: tremor 4–12 Hz |
|---|---|---|
| **Alcohol** | ⬆️ **Up**: posturography consistently shows marked sway with alcohol; acutely, any amount can impair postural stability | ⬇️ Can *decrease*: alcohol is known to temporarily suppress tremor |
| **Caffeine** | ↔️ Roughly unchanged: a systematic review found younger people's balance generally unaffected, though one study found sway *frequency* rose | ⬆️ **Up**: caffeine amplifies the physiologic tremor everyone already has, mostly at ~200 mg and above |

**So the two bands may move in opposite directions for the two substances.** That's exactly the
discrimination "Wired vs Tipsy" needs, and it's a far better story than one undifferentiated
"impairment" number.

**Be honest about its status:** this is a literature-supported *hypothesis* driving a toy, not a
validated classifier. Say that. Then do the thing that makes it worth testing: **collect
your own data tonight.** You have a room full of people drinking coffee and beer and losing sleep.
Measure them. Even n=20 of your own readings is real evidence, and "here's what we actually found"
beats "here's what we think" in front of any engineering panel.

---

## 4. The architecture: three tiers, each degrades gracefully

```
Tier 1  PHONE SENSORS   accelerometer sway + tremor + tap reaction time
        every device, no hardware          ← THE FLOOR. Build first.
            |
Tier 2  CAMERA          finger-on-lens pulse, or UNSEEN-style magnified tremor
        most devices, needs light          ← THE SHOWPIECE
            |
Tier 3  THE RING        continuous HR, HRV, SpO2 over Web Bluetooth
        laptop Chrome / Android only       ← THE HERO INSTRUMENT
```

Every tier answers the same question, so each one works alone and they corroborate each other when
present. A judge on an iPhone gets Tier 1 and 2. A judge who puts the ring on gets all three, and the
screen shows three independent sensors agreeing, **which is a much stronger claim than any one of
them**, and it is the moment worth building the demo around.

### The three tests Buzz Check still needs

Your prototype says "Test 1 of 3" with two undefined. Proposed:

1. **Steady hand** (8 s): arm out, phone held still. Splits into the sway and tremor bands. *(Built.)*
2. **Reaction** (15 s): tap the dot the instant it flashes, ×8. **Report the variance, not the mean**: reaction-time variability is the better fatigue and impairment marker, and almost nobody knows that.
3. **Tracking** (15 s): follow a moving target with your thumb. Measures fine motor control, which alcohol degrades and caffeine mostly doesn't.

Then the ring runs underneath all three, and the receipt prints every channel.

---

## 5. Next hour

1. 🚶 **Walk to Kmart, 10 James St**: about 500 m. Buy the ring. Buy two if they're cheap; one for the demo, one that stays on a wrist all night collecting your dataset.
2. 🔬 **Fifteen-minute Mi Band 10 test.** Enable Share HR, try `requestDevice({filters:[{services:['heart_rate']}]})` in laptop Chrome. Whether it works or not, move on after the test.
3. 💻 **Start Tier 1 regardless.** Phone accelerometer capture into the two frequency bands, deployed to a public URL, tested on an iPhone. This is the G1 gate and it doesn't depend on any hardware arriving.
4. ⚠️ **On iOS, `DeviceMotionEvent.requestPermission()` must be called from a user gesture** (iOS 13+). A tap on a button, not on page load. Get this right first or Tier 1 silently does nothing on half the room's phones.
5. 📊 **Start logging your own readings tonight.** Every coffee, every beer, every hour awake. By 4pm Saturday you'll have a dataset nobody else in that room has.

---

## 6. What this does to the earlier docs

- **`07` recommended UNSEEN alone.** It's now Tier 2 of a bigger instrument rather than the whole project. The camera work still matters; it just isn't the product by itself.
- **`04` §3 said the Mi Band is a stage prop, not a data source.** That stands, and the Band 8 evidence here makes it stronger. **The new finding is that an inexpensive ring can provide a data source.**
- **`06` said don't buy hardware.** That reasoning was about a Saturday-morning Jaycar run landing after the feature freeze. **The Kmart ring is different**: it's tonight, it's 500 m away, and there's existing code for it.

---

*Mi Band support and the third-party realtime HR limitation from gadgetbridge.org (Xiaomi devices,
Xiaomi protobuf watches). Band 10 Share HR from Pulsoid's device guide. Ring protocol and the
Anko/Kmart Web Bluetooth client from the GitHub `qring` topic, `tahnok/colmi_r02_client`, Gadgetbridge
PR #3896 and Hackaday's R02 coverage. Tremor and sway effects from posturography and caffeine-balance
literature: directions are supported, magnitudes are not, and none of it validates a classifier.*
