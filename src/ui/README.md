# `src/ui` — the Kachka UI kit

Build-board card 2. Everything a screen is allowed to use. Read
[`docs/design/DESIGN.md`](../../docs/design/DESIGN.md) first; it is the authority and this
folder is its implementation.

**See it all at once:** `/lab/kit` (`src/lab/Kit.tsx`). If something looks wrong there it is
wrong everywhere — fix it here, never in a screen.

## Rules

1. **Screens restate nothing.** No colour, font or spacing literal in `src/screens` (D28). If you
   need a value that isn't here, add a token.
2. `tokens.css` is shared. Say so out loud before changing it.
3. The mascot is only ever drawn on paper. On the housing, wrap him in `<Badge>`.
4. Blue is the baseline and nothing else. Red is the stamp and nothing else.
5. Safety copy never changes, so `<SafetyLine />` takes no props.

## Parts

| Export | What it is |
|---|---|
| `Housing` | The dark instrument frame every screen sits in |
| `Plate` | Nameplate row: mark and name left, serial right, rule under. `small` variant |
| `ChartWindow` | Chart paper, two-level grid, thick frame. Holds a canvas |
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

### Not in this card

`Trace` and `Gauge` are listed in DESIGN.md but belong to the Stand Still card, because they need
real signal to be worth anything. `ChartWindow` holds the canvas they will draw into.

## Using it

```tsx
import { Housing, Plate, Sheet, Key, InkFilter } from '../ui';

<>
  <InkFilter />             {/* once, near the app root */}
  <Housing>
    <Plate small serial={'Setup\n1 of 2'} />
    <Sheet grow>…</Sheet>
    <Key onClick={next}>Allow motion</Key>
  </Housing>
</>
```

`Plate` takes the product name from `APP_NAME` in `Plate.tsx`. One constant renames the app (D47).

## Fonts

`tokens.css` declares the stacks; it does not load the faces. DESIGN.md requires self-hosting, so
once the scaffold has its dependencies:

```bash
npm i @fontsource/big-shoulders-display @fontsource/courier-prime
```

then add `import './ui/fonts'` to `src/main.tsx`. `fonts.ts` is deliberately kept out of
`index.ts` so this folder compiles before those packages land.

## Naming

The build board calls one card "Window"; DESIGN.md calls it `ChartWindow`, which wins — it also
avoids shadowing the DOM `Window` type. Class names are prefixed `k-` so nothing collides with a
screen's own markup.
