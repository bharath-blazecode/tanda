// CARD 5. The safety rules live here and are covered by tests. Nothing in the engine returns copy:
// a nudge is a closed enum, and the words for it live in one file that a test greps (D19).
// - Tipsy always maps to ride-or-friend.
// - Any alcohol logged today shows the safety line, whatever the verdict.
import type { NudgeKind, Verdict } from '../../shared/contracts'
import { ALCOHOL_KINDS, CAFFEINE_KINDS, DEFAULT_CAFFEINE_MG, tallyCaffeine, type DrinkInput } from './serving'

/** The app's one-tap defaults, in mg. Kept under this name for older imports; see serving.ts. */
export const CAFFEINE_MG = DEFAULT_CAFFEINE_MG

/**
 * Past this much logged in a day, the stub suggests pausing caffeine even when the reading is steady.
 * A product prompt, not a safety limit or anyone's guidance: see the evidence ledger.
 */
export const CAFFEINE_LIMIT_MG = 400

export function hasAlcohol(drinksToday: readonly DrinkInput[]): boolean {
  return drinksToday.some((d) => ALCOHOL_KINDS.has(d.kind))
}

/** Any caffeinated kind counts, including one whose amount is unknown. */
export function hasCaffeine(drinksToday: readonly DrinkInput[]): boolean {
  return drinksToday.some((d) => CAFFEINE_KINDS.has(d.kind))
}

/** Known caffeine drunk today, not what is still on board. Unknown amounts add nothing here. */
export function caffeineMgToday(drinksToday: readonly DrinkInput[]): number {
  return tallyCaffeine(drinksToday).mg
}

export function nudgeFor(verdict: Verdict, drinksToday: readonly DrinkInput[]): { nudge: NudgeKind; showSafetyLine: boolean } {
  const alcohol = hasAlcohol(drinksToday)

  // Safety first, and in this order: these two rules outrank everything below them.
  if (verdict === 'tipsy') return { nudge: 'ride-or-friend', showSafetyLine: true }
  if (verdict === 'steady' && alcohol) return { nudge: 'steady-not-a-driving-test', showSafetyLine: true }

  if (verdict === 'wired') return { nudge: 'no-more-caffeine', showSafetyLine: alcohol }
  if (verdict === 'wobbly') return { nudge: 'water', showSafetyLine: alcohol }

  // Steady, nothing alcoholic logged: only worth saying something if the day has been heavy.
  if (caffeineMgToday(drinksToday) >= CAFFEINE_LIMIT_MG) {
    return { nudge: 'no-more-caffeine', showSafetyLine: false }
  }
  return { nudge: 'carry-on', showSafetyLine: alcohol }
}
