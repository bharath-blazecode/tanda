# 13. The name: KACHKA

> **We're calling it KACHKA.** Said **KATCH-ka**. In Russian it's the rolling and pitching of a ship.
> In Ukrainian it's a duck. Our instrument measures sway, and our mascot is a bird. The word was
> already doing both jobs before we found it.

---

## 1. The word

| | |
|---|---|
| **Written** | KACHKA |
| **Said** | **KATCH-ka** (two syllables, stress on the first) |
| **Cyrillic** | ка́чка |
| **Transliteration** | káchka |

### Russian: *качка*
**The rolling, pitching and tossing of a vessel.** It is the ordinary, everyday word for a boat
moving under you.

> На корабле началась сильная качка.
> *The ship began to roll heavily.*

The phrase **морская качка** describes that motion at sea: the feeling of the ground not holding
still. That is the sensation behind the instrument's name.

### Ukrainian: *качка*
**A duck.** The bird. The same spelling carries a different meaning in Ukrainian.

## 2. Why it's the right name

**It names the measurement.** Tier 1's whole left-hand band (sway, 0.1–3 Hz) *is* качка. Not a
metaphor, the actual word for it. A naval architect measuring a hull's roll and our app measuring a
body's roll are describing the same thing with the same noun.

**It names the mascot.** Our readings are signed by a bin chicken. The name means *duck*. Nobody had
to arrange that.

**It travels.** Two syllables, hard consonants, no accents, no silent letters. It's typable, it's
sayable after a long day, and it sounds like an instrument rather than an app.

**It carries the joke.** A solemn continental name on a $29 device that gets peer-reviewed by a bird
that eats chips out of a bin. The contrast is the brand.

## 3. The naming system

```
DR. KACHKA
Body drift recorder · Model BC-2
Peer-reviewed by a bin chicken
```

**Dr. Kachka** is the instrument's maker and the voice on the receipt, with the same deadpan authority as
*Dr. Bin Chicken*, one layer deeper. A doctor named after a duck, countersigned by a bin chicken.

| Where | What it says |
|---|---|
| Plate, main screens | **KACHKA** |
| Plate, small screens | **KACHKA** · with module below (*Tier 2 · The lens*) |
| Receipt signature | **Dr. Kachka** |
| Serial line | Body drift recorder · Model BC-2 |
| Byline | Peer-reviewed by a bin chicken |
| Tagline | *"Steady is a number."* or keep *"Wired or wobbly?"* |

### Modules keep their names

- **KACHKA**: the instrument
- **The Lens**: Tier 2, the camera module
- **The Ring**: Tier 3, when it lands
- **The Room**: the live board

So: *"Kachka · The Lens"*, *"Kachka · The Room"*.

## 4. House voice, unchanged

The name changes; the writing doesn't. Short, deadpan, honest.

- *"A toy, not a test. For adults."*
- *"Not a driving test. If you're going anywhere, get a ride or a friend."*
- *"Either answer is fine. We just label the reading honestly."*
- *"One channel. The tap test and the sway test still decide."*

**A line worth having ready**, because someone will ask what it means:

> *"Kachka is what Russian sailors call it when the ship won't hold still. It's also Ukrainian for
> duck. We measure one and we're signed off by the other."*

## 5. Domain

Short and clean, so check a few lanes:

| Candidate | Note |
|---|---|
| `kachka.app` | Best fit: `.app` reads as an instrument |
| `drkachka.com` | Matches the signature. Likely wide open |
| `kachka.co` / `kachka.dev` | Clean fallbacks |
| `kachka.com.au` | Local, fits an Australian room |

There's a well-regarded Portland restaurant trading as Kachka, so `.com` may be spoken for. It is a
food business, not software. `drkachka` was another domain option considered for the project.

**Don't block the build on this.** Ship on the free host, point the domain at the same deployment
once it's bought. A name is a DNS change; a working link is the project.

## 6. Where it needs changing

- [ ] Flow artifact: plate `.name`, title, landing copy
- [ ] Lens artifact: plate `.name`, title, bench header
- [ ] Receipt signature → **Dr. Kachka**
- [ ] Slide 1: the name above the QR
- [ ] `#showcase` post
- [ ] Repo README, `IDEA`, `docs/12`

Design tokens, fonts, layout and voice all stay exactly as they are. **This is a text change, not a
redesign.**

---

*Naming references: Wiktionary (качка), OpenRussian and Reverso. Russian: "rolling, pitching,
tossing". Ukrainian: "duck".*
