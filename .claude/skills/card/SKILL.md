---
name: card
description: Start or continue one task card from the Kachka build board. Use when someone says "take card N", "start the Stand Still card", "work on the ticket", or names any card from docs/05-architecture.md.
---

# Working a card

A card is one small piece of Kachka with one owner and one folder. This is how to do one well.

## Before writing code

1. Find the card in `docs/05-architecture.md`, section "How the work is split". Note its folder, its
   "done when" and whether it says "port" (the logic already works in `docs/design/prototype-flow.html`).
2. Read the matching section of `docs/04-screens-spec.md`: the states and the edge-case table are the
   requirements.
3. If the card has any UI, read `docs/design/DESIGN.md`. Screens use the components and tokens in
   `src/ui` and never write their own colours, fonts or spacing.
4. Read `shared/contracts.ts`. Your piece takes and returns those shapes exactly.
5. Open the files in your folder. Files marked `CARD n ... Stub` are yours to replace; keep their exported
   names and signatures unless you announce a change to the team.

## While building

- Stay in your folder. If you need something from another card, use its stub. If the stub's signature is
  wrong for you, tell its owner; do not edit it.
- `shared/contracts.ts`, `src/engine/metrics.ts`, `src/ui/tokens.css` and `package.json` are shared.
  Change them only after saying so to the team, in a PR of their own if you can.
- Pure logic goes in a plain function with a test next to it (`*.test.ts`, Vitest). Name tests like
  specs: "counts a wrong square and keeps it out of the median".
- Check it on a real phone early. Sensors, touch timing and iOS permissions behave differently there.
  Use the `phone` skill.
- The product rules in `CLAUDE.md` always apply: no blood alcohol figure, nothing that reads as clearance
  to drive, no free text to the server.

## Done

1. The card's "done when" is true on a real phone, not only in a desktop browser.
2. `npm run check` and `npm run build` pass (the `check` skill).
3. Open a small PR to `main` that says which card it closes and what you could not test. Merging deploys.
4. Move the card on the board.
