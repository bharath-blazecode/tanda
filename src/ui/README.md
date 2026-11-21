# src/ui

Card 2 owns this folder. `tokens.css` holds the design tokens; everything else here is a shared
component. Read [`docs/design/DESIGN.md`](../../docs/design/DESIGN.md) first. It is the authority
and this folder is its implementation.

**See it all at once:** `/lab/kit`. If something looks wrong there it is wrong everywhere, so fix it
here and never in a screen.

Screens import from this folder and never style themselves (D28).

## Parts

| Export | What it is |
|---|---|
| `Housing` | The dark instrument frame every screen sits in |
| `Plate` | Nameplate row: mark and name left, serial right, rule under. `small` variant |
| `ChartWindow` | Chart paper, two-level grid, thick frame. Holds a canvas. `bottom` pushes printed content to the foot |
| `Legend` `Axis` `Printed` | Overlays for a chart window |
| `Sheet` | Paper inside the housing, for screens that are words |
| `Key` `Keys` | The main button and a row of them. `quiet` variant |
| `Ticket` | Thermal paper, zigzag edge, 1.2 s print animation |
| `TicketVerdict` | Mascot beside the stamp, as on a Result ticket |
| `Quote` `Stub` `Rows` | Ticket innards: the bird's line, the tear-off, dotted-leader rows |
| `Stamp` | The verdict. The only red in the app |
| `SafetyLine` | The boxed, fixed-wording line |
| `Ibis` `Badge` | The mascot, four moods, and the paper square he needs on the housing |
| `Logo` | The mark. Works down to 24px |
| `Label` | The 11px engraved label. `paper` variant |
| `InkFilter` | The worn-ink SVG filter the Stamp needs. Render once near the app root |

Ported from `docs/design/prototype.html`, not rewritten: the ticket mask, the stamp filter, the chart
grid and the mascot's mood animations are the prototype's own. `Ibis` and `Logo` are ports of its
`ibis(mood)` function and `MARK` constant, as DESIGN.md asks.

## Not in this card

`Trace` and `Gauge` are listed in DESIGN.md but belong to Stand Still (card 3). They need real
signal to be worth anything. `ChartWindow` holds the canvas they will draw into.

## Using it

```tsx
import { Housing, Plate, Sheet, Key, InkFilter } from '../../ui'

<>
  <InkFilter />            {/* once, near the app root */}
  <Housing>
    <Plate small serial={'Setup\n1 of 2'} />
    <Sheet grow>…</Sheet>
    <Key onClick={next}>Allow motion</Key>
  </Housing>
</>
```

`Plate` takes the product name from `APP_NAME` in `Plate.tsx`. One constant renames the app (D47).

## Notes

- The board calls one card "Window"; it is exported as `ChartWindow`, the name DESIGN.md uses, which
  also avoids shadowing the DOM `Window` type.
- Class names are prefixed `k-` so a screen's own markup cannot collide with them.
- Fonts are loaded in `src/main.tsx` from `@fontsource`, per DESIGN.md. Nothing here loads a face.
- `tokens.css` is a shared file. Say so out loud before changing it.
