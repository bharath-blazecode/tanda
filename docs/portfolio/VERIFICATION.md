# Verification record for the portfolio slice

Branch `claude/awesome-einstein-e124bb`, 22 November 2026. Starting point: `main` at `b3d93a6`.
Every result below is labelled passed, failed, skipped, synthetic or not run.

## Software checks

| Check | Command | Result |
|---|---|---|
| Typecheck and unit tests on `main` before any change | `npm run check` | Passed: 40 files, 457 tests |
| Typecheck and unit tests at the end of the slice | `npm run check` | Passed: 46 files, 577 tests |
| Production build at the end of the slice | `npm run build` | Passed |
| The new tests ran, not only the exit code | `npx vitest run` output read per file | `compare.test.ts`, `serving.test.ts`, `run.test.ts`, `local.test.ts` (rewritten), `presets.test.ts`, `form.test.ts`, `undo.test.ts`, the new `room.test.ts`, `room-mirror.test.ts` and `state.test.ts` cases, and the new format, receipt, canned, prompt, care-copy, aftercare and caffeine cases all reported |

### What the new unit tests cover

| Area | Tests |
|---|---|
| Schema migration, invalid old data, storage failure, deletion | `src/store/local.test.ts`: v1 kept byte for byte for rollback; personal baseline, log and ticket migrated; stock normal not carried into the baseline; one bad drink dropped alone; v1 ticket without a baseline dropped; storage that refuses writes keeps one identity; storage that throws on read; reset removes both keys |
| Comparisons | `src/engine/compare.test.ts`: the three reproduced faults (F1 to F3), capture-length change, legacy sensor caveat, tap-count caveat, every pulse status, example runs never guess a handicap |
| Arithmetic | `src/engine/serving.test.ts`, `src/screens/log/form.test.ts`: 32 mg per 100 mL and 250 mL is 80 mg; fractions; per 100 mL needs a volume; unknowns; 375 mL at 4.5% is about 1.3 standard drinks; every row of the handoff table; label declaration preferred; counts never become standard drinks; out-of-range values refused |
| Time | `form.test.ts`, `presets.test.ts`, `caffeine.test.ts`, `aftercare.test.ts`: retrospective times, rough times, future and week-old times refused, a minute of clock slack, "earlier today" never before 4am, carry-over across 4am, the 48-hour window, bedtime at any minute |
| Editing and undo | `form.test.ts`, `undo.test.ts`: full round trip of every field, legacy mark kept, kind change drops irrelevant detail, precise undo of add, edit and remove |
| Room consent and withdrawal | `server/room.test.ts`, `server/room-mirror.test.ts`, `server/state.test.ts`: withdrawal removes the entry and live row, leaves others, answers the same for unknown devices, refuses bad bodies, is rate limited, allows sharing again; mirror field deleted; a stale mirror read cannot resurrect it; a newer post is accepted |
| Safety and provenance on exports | `src/screens/result/receipt-image.test.ts`, `format.test.ts`: name and log only when chosen; provenance, reference and safety line always; banned words absent from new copy |

## Browser checks

Run with `scripts/browser-checks/*.cjs` against the production build on a local server, headless
Chromium at 390 by 844 (and 320 by 640 where noted).

| Section | Result | Kind of evidence |
|---|---|---|
| Example route: picker asks for a time, ticket says Simulated and Example reference, reload keeps it, no baseline written, no room post with sharing off, Home offers a personal baseline | 11 of 11 passed | Synthetic: no motion, Choice Tap by dispatched pointer events |
| Personal route: Setup hands over, baseline records sensor and capture length and a skipped pulse, check intro lists what is compared, ticket compares against the baseline, checks are counted, safety line on Home with one beer, recalibration blocked with alcohol, an old ticket keeps its reference after recalibration | 13 of 13 passed | Synthetic motion events |
| Reduced route: a standing-only baseline with no motion warns before starting; after a reload, Stand Still finds no sensor and the run ends with "No reading" and no ticket; no verdict request | 3 of 3 passed | Synthetic |
| Migration: v1 record migrates, v1 kept, sharing off, baseline and drinks kept | 3 of 3 passed | Seeded storage |
| Privacy: sharing off by default; on, presence and a simulated result are posted without a handicap; commentary off sends no verdict request; receipt preview omits the name until chosen; turning sharing off withdraws and the board no longer shows the entry; no heartbeat for 16 s after; Start over withdraws first and clears both keys | 12 of 12 passed | Local server, in-memory board |
| Caffeine and serving: carry-over shown, legacy beer a count, label arithmetic live in the editor, real consumption time stored, edit and undo, standard-drink arithmetic, totals only for detailed entries, unknown tea said to read low, remove and undo, future time refused, bedtime saved and used | 16 of 16 passed | Seeded storage and real form input |
| Routes load without page errors (12 routes including lab, preview, room, unknown) | Passed | |
| No horizontal scroll at 320 px on Home, ticket, Privacy and the editor | 4 of 4 passed | |
| A Tipsy example ticket at 320 px keeps the safety line, provenance, approximate pulse and "No clean taps" | Passed | Seeded storage |
| Keyboard only: arrow keys move the kind choice, a tea with an amount can be added, entries are buttons | 3 of 3 passed | Playwright keyboard input, not a screen reader |
| Reduced motion: the ticket print animation is off | Passed | Emulated `prefers-reduced-motion` |

Total: 68 of 68 browser checks passed on the final build.

## Measurements

| Measure | `main` at `b3d93a6` | End of slice | Note |
|---|---|---|---|
| JS bundle, raw | 462,142 bytes | 505,259 bytes | +43 KB from new screens, schemas and copy. No dependency added |
| JS bundle, gzip -9 | 144,525 bytes | 157,713 bytes | +13.2 KB |
| CSS, raw / gzip | 25,213 / 5,895 bytes | 29,179 / 6,599 bytes | |
| Startup, desktop headless, localhost, median of 5 | not measured | DOMContentLoaded 46 ms, load 46 ms, JS heap 4.1 MB | Not representative of a phone. First contentful paint is not reported in this headless mode |

Proposed budgets until code splitting is done, set from these numbers: JS at most 165 KB gzip, CSS at
most 8 KB gzip, no new runtime dependency without a measured reason. They are not enforced in CI yet.

## Not run, and why

| Check | Status |
|---|---|
| Any physical phone: motion, camera pulse, touch timing, iOS permission prompts | **Not run.** Owned by the project owner (section 14). Protocol in the final report |
| Pulse capture with a covered lens | **Not run.** The fake camera is never covered; only Skip was exercised |
| Screen reader use (VoiceOver, TalkBack) | **Not run.** Roles and accessible names were checked through Playwright queries only |
| Choice Tap by keyboard or switch | **Not supported yet.** Squares listen to pointer events only. Deferred to the accessibility stage with a recorded modality |
| CSP and security headers | **Not run.** Reviewed in `THREAT-MODEL.md`; not enforced |
| Live deployment, Cloudflare, real Redis | **Not run.** The mirror was tested against an in-memory fake |
| Frame cadence, interaction delay and memory during capture on phones | **Not run** |
| Lighthouse or a performance trace | **Not run** |
| Security audit or compliance assessment | **Not done.** The threat model is a design review with local reproductions |
