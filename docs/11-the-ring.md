# 11. The Kmart ring: which one, and what it actually gives you

> **TL;DR**: **Every ring on that page is the same ring.** Only size and colour differ, all $29. So
> the only real decision is **size: buy two, in different sizes.**
> It's the **JRing / 56ff** family, not Colmi. That changes the metric list, mostly in your favour:
> **HRV ✅ · live heart rate ✅ · SpO₂ ✅ · blood pressure ✅ · fatigue score ✅ · skin temperature ❌.**
> And the single best news: **it exposes the standard BLE Heart Rate Service `0x180D`**, so live heart
> rate in the browser is about twenty lines of JavaScript.

---

## 1. Which one to buy

From Kmart's own product page: **App: JRing**, IP68, 16 mAh ring + 200 mAh charging case, USB-C,
~7 days per charge. Large has an inner diameter of **21.3–21.7 mm** (roughly a US 12).

Every tile on that search page (Small/Medium/Large, Rose Gold/Silver/Black) is the same hardware at
$29. **Colour is irrelevant. Size is not.**

### Buy two, in different sizes

Buy two for **fit** rather than redundancy. Fit determines whether the data is any good:

- **A loose ring destroys the PPG signal.** The sensor has to stay pressed against skin. Too loose and you get noise, dropouts and nonsense heart rates.
- **A judge will want to put it on.** If your only ring is sized to one person's finger, your hero demo doesn't work on anyone else. Two sizes covers far more hands.
- **One ring stays on a wrist all night collecting your dataset** while the other is used for testing and the demo.

**Sizing:** measure with a strip of paper around the finger rather than guessing, and check each
product page: Kmart lists the inner diameter per size. If in doubt go **snug**, not loose. Wear it
with the **sensor on the palm side** of the finger, and try the **index finger**; it often gives a
cleaner PPG than the ring finger on these cheap units.

---

## 2. What it actually measures

The Anko ring speaks the **`56ff` protocol** (keeprapid OEM, SXR KeepFit SDK), the JRing/KeepFit
family. The protocol is fully reverse-engineered and documented.

| Metric | Available | Notes |
|---|---|---|
| **Heart rate**: spot / **live** / history | ✅ | BPM. **Also on the standard BLE `0x180D` service**: see §3 |
| **HRV** | ✅ | **In milliseconds. This is the alcohol metric.** |
| **SpO₂**: spot and history | ✅ | On-demand, unlike the Colmi family |
| **Blood pressure** | ✅ | **Direct sensor reading** via `0x23`/`0x24`, no user profile needed; see §4 |
| **Stress** | ✅ | 0–100, firmware-derived |
| **Fatigue** | ✅ | 0–100, firmware-derived |
| **Steps / distance / calories** | ✅ | |
| **Sleep** (light / deep / awake) | ✅ | No REM |
| **Skin temperature** | ❌ | **No sensor at all.** The official app shows a 0 °C placeholder. |
| **REM sleep** | ❌ | |
| **Continuous background streaming** | ❌ | Command-response only, ~20 s idle timeout. You poll; it doesn't push. |
| **Blood sugar** | ⚠️ | Listed, but it's derived from your sex/age/height/weight profile. Change the profile, change the number. **It is not a measurement. Ignore it.** |

### Against the Colmi I'd assumed in `docs/10`

| | Colmi (QRing) | **Kmart (JRing/56ff)** |
|---|---|---|
| HRV | ✅ | ✅ |
| Live HR | ✅ | ✅ **+ standard BLE service** |
| Skin temperature | ✅ | ❌ **lost** |
| Spot SpO₂ | ❌ | ✅ **gained** |
| Blood pressure | ❌ | ✅ **gained** |
| Fatigue score | ❌ | ✅ **gained** |
| Continuous sync | ✅ | ❌ lost |

**Net: a win for your project.** You lose skin temperature (one of five alcohol signals) and gain
blood pressure, which is the *most reliable caffeine marker there is*. See §4.

---

## 3. The best news: standard BLE heart rate

The ring advertises the **standard Bluetooth Heart Rate Service `0x180D`** alongside its custom
protocol. That means you don't need any reverse engineering to get live heart rate in a browser:

```js
const device = await navigator.bluetooth.requestDevice({
  filters: [{ services: ['heart_rate'] }]
});
const server = await device.gatt.connect();
const char = await (await server.getPrimaryService('heart_rate'))
  .getCharacteristic('heart_rate_measurement');
await char.startNotifications();
char.addEventListener('characteristicvaluechanged', e => {
  const v = e.target.value;
  const bpm = (v.getUint8(0) & 1) ? v.getUint16(1, true) : v.getUint8(1);
  console.log(bpm);
});
```

**That's the whole thing.** Do this first, tonight; it's the fastest possible proof the hardware
works, and it de-risks everything downstream. HRV, SpO₂ and blood pressure need the custom `56ff`
frames; heart rate does not.

### The custom protocol, for everything else

| | |
|---|---|
| Service UUID | `000056ff-0000-1000-8000-00805f9b34fb` |
| Write characteristic | `000033f3-…` |
| Notify characteristic | `000033f4-…` |
| Frame size | Fixed 20 bytes |
| Encryption | **None, cleartext** |
| Keepalive | `0x3A` ping/pong: needed, there's a ~20 s idle timeout |
| SoC | Renesas DA14531 (ARM Cortex-M0) |
| Open reference firmware | `atc1441/ATC_SR08_Ring` |

---

## 4. What this means for detecting alcohol and caffeine

Revised from `docs/10` now that we know it's a JRing:

### Alcohol: still well covered

| Signal | On this ring? |
|---|---|
| **HRV (rMSSD) ⬇️**: strongest signal | ✅ **yes, in ms** |
| **Resting HR ⬆️** | ✅ yes, live |
| **Skin temperature ⬆️** | ❌ **no sensor** |
| **Respiratory rate ⬆️** | ❌ |
| **Postural sway ⬆️** | ✅, but from the *phone*, not the ring |

You keep the two strongest signals (HRV and HR) and lose one of the weaker ones. Fine.

### Caffeine: unexpectedly better covered

In `docs/10` the conclusion was that the ring is a poor caffeine sensor, because the HRV literature
contradicts itself and **blood pressure is the reliable marker**, which no ring measures.

**This ring claims to.** The documentation is specific that BP is a *direct sensor reading* via
`0x23`/`0x24` and needs no user profile, unlike blood sugar on the same ring, which is explicitly a
profile-derived fabrication. So BP is at least a measurement rather than a guess.

**🔴 Be sceptical anyway.** A ring has no cuff, and cuffless BP from PPG is hard and poorly validated.
Treat it exactly like everything else here: **relative to the wearer's own baseline, never as an
absolute reading.** "Your BP index rose 9% after that coffee" is defensible. "Your blood pressure is
128/84" is not: don't print a number that looks clinical.

If it works even directionally, you have a caffeine channel on the ring that complements tremor on
the phone. If it's noise, you've lost nothing, because tremor was always the primary caffeine signal.

### So the full picture

| | Ring | Phone |
|---|---|---|
| **Alcohol** | HRV ⬇️, HR ⬆️ | Sway ⬆️ (accelerometer) |
| **Caffeine** | BP ⬆️ *(verify)*, HR ⬆️ | **Tremor ⬆️** (accelerometer) |
| **Fatigue** | Fatigue score *(derived, suspect)* | Reaction-time **variance** |

---

## 5. Things that will bite you

1. **Set the ring up once in the official JRing app before anything else.** First-time initialisation sends commands that haven't been fully reverse-engineered; a fresh ring may not stream properly to a custom client until the official app has set it up. **Do this in the shop car park, not at 2am.** (Android 5.0+ / iOS 10+.)
2. **No continuous streaming.** Command-response with a ~20 s idle timeout. Your client must send the `0x3A` keepalive or the connection drops mid-demo.
3. **Web Bluetooth means no iPhones.** Laptop Chrome or Android only. The ring is the stage instrument; phone sensors are what the room uses.
4. **☠️ Never send `0E 12 34 12 34 12 34 12 34`.** That's a factory reset. Avoid `0x0E` frames entirely.
5. **Charge it in the case before you need it.** 50–60 minutes to full. Do it the moment you get back.
6. **Ignore the derived scores.** Stress, fatigue and especially blood sugar are firmware-computed composites. Use HR, HRV, SpO₂ and BP, the things a sensor actually produced.
7. **Kmart's own page says it plainly:** *"This product is not a medical device. The data and information are provided for reference only."* Put that on your slide. It's their words, it's true, and quoting it is a better look than hoping nobody asks.

---

## 6. Shopping list and the first 30 minutes

**Buy:** 2 × Smart Ring @ $29, **different sizes** (e.g. Medium + Large). Colour is irrelevant.
Each comes with its own charging case and USB-C cable.

**Then, in order:**

1. Unbox, put both on charge.
2. Install **JRing** on an Android phone. Pair and complete setup for each ring. Take one full reading of each metric in the official app; **this tells you which metrics your specific unit actually reports**, which is the real answer to your question and takes five minutes.
3. On a laptop in Chrome: the `0x180D` snippet in §3. Live BPM in the browser. **If this works you have a hardware channel and the risk is gone.**
4. Only then go after HRV / SpO₂ / BP over the `56ff` frames.
5. Put one ring on someone's finger and **leave it there.** Start the labelled log: every coffee, every drink, every hour awake.

---

*App name, dimensions, battery and the "not a medical device" line from the Kmart product page for
Smart Ring: Large, Black (SKU P_43721207). Protocol, capability list, standard-service advertisement,
keepalive, factory-reset warning and the initialisation requirement from the PulseLoop hardware
documentation for the Jring/56ff family and its linked BLE teardown.*
