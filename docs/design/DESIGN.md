# Design: Seismograph

The visual direction for the app, chosen on Friday 20 Nov. Every Claude Code session that touches UI should read this file first. The working prototype is [`prototype.html`](prototype.html); its CSS is the source for `src/ui/tokens.css`.

## The idea in one sentence

The app is a small lab instrument that records how your body is moving, prints the reading as a till receipt, and has it judged by a bin chicken.

## Tone

Dry, deadpan, a little rude, never cruel. The joke is that a ridiculous question ("am I wired or wobbly?") gets a very official answer: chart paper, serial numbers, a rubber stamp, and a bird with a lab job. The copy sounds like a lab report written by someone unimpressed.

- Funny comes from the contrast between official form and silly content. Do not add jokes to the chrome: no puns on buttons, no emoji.
- The bird teases what you did (three coffees), never who you are.
- Safety copy is never funny. It is plain, boxed and always the same words.

## Mascot: Dr. Bin Chicken

An Australian white ibis, the bird Brisbane calls a bin chicken. He is the lab tech on duty.

- **His beak is the recorder's pen.** On Landing the trace is drawn from the tip of his beak and he bobs as it moves.
- **He is the voice of every AI line.** The verdict line on the ticket, the room commentary on the projector, the night receipt summary: all are him speaking. Prompts for Claude describe this voice.
- **Three moods, matching the three verdicts:**

| Mood | Eye | Body | Motion |
|---|---|---|---|
| Steady | Half-lidded, unimpressed | Upright | None |
| Wired | Huge, pinprick pupil, three frazzled head feathers | Upright | Fast small jitter |
| Tipsy | A cross | Leaning back | Slow sway, two hiccup bubbles |

- **A fourth verdict, Wobbly** (drift with nothing logged, D18), reuses the Tipsy mood without the hiccup bubbles.
- **Drawing rules.** Black bald head, neck, tail and beak; white body with an ink outline; thin legs. Flat shapes, no shading. He is only ever drawn on paper (chart or ticket), never straight onto the dark housing. On the housing, put him on a small paper badge.
- **Where he appears.** Landing (large, drawing the trace), Stand Still (small, top right of the chart, on the replay of the trace), Result (beside the stamp; the stamp reads "Certified by a bin chicken"), Room (beside the commentary line). Not on Permissions, Log a drink or Connect band: those are quick utility screens.
- The SVG lives in the prototype as the `ibis(mood)` function. Port it as one React component, `<Ibis mood="steady" />`.

## Logo

The mark is a square of chart paper with a dark frame: the ibis's head in the top left, his beak curving down, and the trace he has just drawn running along the bottom. It is the mascot and the product in one drawing.

- **Lockup:** mark on the left, the name in the display face on the right, on one line. Used on the nameplate and the ticket header.
- **Mark alone:** app icon, favicon, the corner of the room board. It works down to about 24px; below that, drop the trace and keep head and beak.
- Always on its own paper square, in ink. Never recoloured, never on a photo, never in stamp red.
- The SVG lives in the prototype as the `MARK` constant. Port it as `<Logo />` and export it once as `favicon.svg`.

The mascot blinks (the steady mood closes its eye for a moment every few seconds). Keep it: it is the cheapest sign of life in the app.

## Signature elements

These four things are what make the app recognisable. Keep all four; do not add a fifth.

1. **The live trace.** The real motion signal, drawn as a pen on chart paper that scrolls. It decorates Landing, is the centre of the Room view, and replays after Stand Still: the phone is on the user's chest during that test, so the pen draws their 18 seconds once they look back, over the blue baseline (changed 21 Nov, see D15).
2. **Blue pencil is your baseline, black ink is right now.** Always. The two traces overlaid show drift before any number is read. Never use blue for anything else.
3. **The reading is a thermal ticket.** It prints top to bottom in about 1.2 seconds, which covers the wait for Claude's line. Serial number, timestamp, rows with dotted leaders, a zigzag torn edge and a tear-off stub that carries the nudge.
4. **The verdict is a rubber stamp.** Red, rotated about 7 degrees, double frame, worn ink, and it lands with a thud after the ticket has printed. It is the only red in the app.

## Tokens

```css
:root {
  --bench: #121A18;        /* page background behind the instrument */
  --housing: #1E2A27;      /* instrument casing: the app's own background */
  --housing-hi: #32433E;   /* casing edges and engraved rules */
  --housing-ink: #DCE6DF;  /* text on the housing */
  --housing-dim: #93A79E;  /* secondary text on the housing */
  --chart: #EEF2E6;        /* strip-chart paper */
  --grid: #C6D6C0;         /* fine chart grid, every 8px */
  --grid-strong: #9DB897;  /* heavy chart grid, every 40px */
  --receipt: #FAFAF4;      /* thermal ticket paper */
  --ink: #1C1F25;          /* pen, print, text on paper */
  --ink-soft: #5A606A;     /* secondary text on paper, dotted leaders */
  --pencil: #2E5FB5;       /* the baseline, and nothing else */
  --stamp: #C3273B;        /* the verdict stamp, and nothing else */
}
```

One theme only. There is no light and dark pair: the housing is dark, the paper is light, and that contrast is the design. This also removes a whole class of bugs on build day.

## Type

| Role | Face | Use |
|---|---|---|
| Display | Big Shoulders Display, 900 (700 for small labels) | Nameplate, headlines, the timer, the stamp, key labels. Always uppercase |
| Readout | Courier Prime, 400 and 700 | Everything else: instructions, rows, labels, the quote |

Fallbacks: `"Arial Narrow", Impact, sans-serif` and `"Courier New", Courier, monospace`.

**Serve both faces from our own origin** (the `@fontsource/big-shoulders-display` and `@fontsource/courier-prime` packages). The prototype loads them from Google Fonts only because it is a prototype; the app must not depend on a third-party host on mobile data.

Small labels are 11px, bold, uppercase, with 0.14em letter-spacing. Numbers that change use `font-variant-numeric: tabular-nums`.

## Components (all in `src/ui`)

| Component | What it is |
|---|---|
| `Housing` | The dark instrument frame every screen sits in. 6px radius, 1px lighter edge |
| `Plate` | The nameplate row: name on the left, serial text on the right, a rule under it |
| `ChartWindow` | Chart paper with the two-level grid and a thick dark frame. Holds a canvas |
| `Trace` | The canvas pen trace. Props: signal source, baseline source, time span |
| `Key` | The main button: paper-coloured, thick bottom edge, travels down when pressed. `quiet` variant: outlined, for secondary actions |
| `Gauge` | A bar against a blue baseline mark at the midpoint. Value shown as a multiple of baseline |
| `Ticket` | Thermal paper with the zigzag bottom edge and the print-in animation |
| `Rows` | Label, dotted leader, bold value |
| `Stamp` | The verdict. Takes the verdict word and an optional small second line |
| `Stub` | The tear-off part of a ticket: a dashed tear line, a small label, one large instruction |
| `SafetyLine` | The boxed, fixed-wording line. No props that change its words |
| `Ibis` | The mascot. Prop: `mood` |
| `Label` | The 11px engraved label |

## Motion

- The trace is always moving when a screen shows one.
- The ticket prints (1.2 s, stepped), then the stamp lands (0.26 s, slight overshoot).
- The mascot's mood animations.
- Nothing else animates. No page transitions, no hover effects, no fades.
- With `prefers-reduced-motion`, traces draw one still frame and nothing animates.

## Do not

- Rounded cards with drop shadows. Nothing here floats; it is paper and metal.
- Gradients as decoration, glass, blur.
- Emoji, anywhere. Icon libraries: the app has no icons, only labels and the mascot.
- Inter, system UI fonts, or a third typeface.
- Purple, or any colour not in the token list. Red outside the stamp. Blue outside the baseline.
- Centred body text. Text on paper is left-aligned, like a receipt.
- A dark-mode toggle.
- Green or red to mean good or bad. Verdicts are words on a stamp, all in the same red.

## Screens in the prototype

| Screen | What to copy from it |
|---|---|
| Landing | Housing, plate, chart window with the live trace, the mascot drawing it, one key |
| Steady Hand (now Stand Still) | The two traces, legend, time axis, the small mascot. The test changed on 21 Nov: the trace replays after the hold instead of drawing live, and there is one gauge (sway), not two |
| Result | The ticket: header, overlaid traces, rows, mascot and stamp, quote with byline, safety line, tear-off stub |
| Room | 16:9 projector layout: join ticket with QR, commentary with the mascot, the room trace, the three tallies, the feed and the top five |

Screens not in the prototype (Permissions, Baseline, Home, Log a drink, Demo, Connect band) are built from the same components. Home and Log a drink sit on chart paper inside the housing; drink tiles are `Key`s.

## Stitch mocks

Static mocks of three of those screens (Home, Log a drink, Demo challenge) are in the Stitch project "Buzz Check - Seismograph": `https://stitch.withgoogle.com/projects/1503788979815497939` (owned by Mike's Google account; he shares it).

Use them for layout ideas only. Where they differ from this file, this file wins. Known differences:

- Stitch swapped the display face for Anton and darkened the background to `#051711`. Keep Big Shoulders Display and the tokens above.
- Stitch's auto-written style guide contains a sample receipt row with a blood alcohol figure. That breaks a hard product rule (D19). Never copy it.
- The mascot in the mocks is Stitch's own drawing. The canonical one is the `ibis()` SVG in the prototype.

## Open

- The product name is Kachka (D47). The nameplate and the ticket header take it from one constant. The prototypes were made under the working title Buzz Check; `prototype-flow.html` has been renamed.
- The team's Brisbane locals should confirm the bin chicken joke lands the way we think it does.
