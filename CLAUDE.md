# Kachka

A phone web app for the Tanda Hackathon (build day: Sat 21 Nov 2026). Log a drink, stand still, tap fast,
and see how far you have drifted from your own baseline. Read this before touching code.

## What to read

| For | Read |
|---|---|
| The task cards, the contracts, the scoring | `docs/05-architecture.md` |
| Every screen, its states and edge cases | `docs/04-screens-spec.md` |
| The look, tokens, components, mascot | `docs/design/DESIGN.md` and `docs/design/prototype-flow.html` |
| Why a thing is the way it is | `DECISIONS.md` |

`docs/design/prototype-flow.html` has working logic for Choice Tap, the scoring, the caffeine curve and the
ticket. Port it; do not rewrite it.

## Run it

```bash
npm install
npm run dev      # web on :5173, API on :3333 (Vite proxies /api)
npm run check    # typecheck + unit tests. Run it before every push.
npm run build    # client into dist/, server into dist-server/
```

Open `/lab` for a page that links to every piece.

## Layout

```
shared/contracts.ts   the one file client and server both import (zod schemas + types)
src/sensors           DeviceMotion, band, camera
src/tests             stand/ and choice/: a component plus a pure analyze function each
src/engine            pure TypeScript: drift, verdict, nudge. No React, no DOM, no network
src/store/local.ts    the only file that touches localStorage
src/api               clients for the server routes
src/ui                tokens.css and the shared components
src/screens           one folder per screen
server                Hono: /api/health, /api/verdict, /api/room, and the built app
```

## Working rules

- **One owner per card, one folder per card.** The board says who owns what. To change a file in someone
  else's folder, ask them.
- **Shared files change out loud:** `shared/contracts.ts`, `src/engine/metrics.ts`, `src/ui/tokens.css`,
  `package.json`.
- **Stub what you do not own.** Files marked `CARD n ... Stub` return fixed numbers with the final
  signature. Build against them; replace only your own.
- **Screens never style themselves.** Colours, fonts and spacing come from `src/ui`.
- **`src/engine` stays pure:** time comes in as an argument, never `Date.now()` inside a function.
- **Small PRs to `main`, `npm run check` green first.** Merging to `main` deploys.

## Product rules that are not negotiable

- This is a toy, not a medical or legal measurement.
- Never tell anyone they are fine to drive. Never show a blood alcohol figure.
- With any alcohol logged today, every result shows the fixed safety line, Steady included.
- Code decides the verdict and the nudge. Claude only writes the line on the ticket.
- The server receives numbers and closed enums only. No free text, no drinks on the room board.
- Never ship these words in UI copy: "safe to drive", "fine to drive", "ok to drive", "sober",
  "legal limit", "BAC", "diagnosis".
- The Anthropic key lives only in the server environment. Never in the repo, the bundle, chat or a
  screenshot. Only `server/verdict.ts` reads it.
