// CARD 5. The safety rules live here and are covered by tests. Nothing in the engine returns copy:
// a nudge is a closed enum, and the words for it live in one file that a test greps (D19).
// - Tipsy always maps to ride-or-friend.
// - Any alcohol logged today shows the safety line, whatever the verdict.
import type { Drink, NudgeKind, Verdict } from '../../shared/contracts'

const ALCOHOL = new Set(['beer', 'wine', 'spirit'])

/**
 * Caffeine per drink, in mg. Starting values from docs/05-architecture.md.
 * CARD 14 owns the on-board decay curve in caffeine.ts; it should import these rather than
 * restate them, so the two never drift apart.
 */
export const CAFFEINE_MG: Partial<Record<Drink['kind'], number>> = {
  coffee: 100,
  energy: 80,
}

/** Past this much in a day, say something even when the reading is steady. */
export const CAFFEINE_LIMIT_MG = 400

export function hasAlcohol(drinksToday: Drink[]): boolean {
  return drinksToday.some((d) => ALCOHOL.has(d.kind))
}

export function hasCaffeine(drinksToday: Drink[]): boolean {
  return drinksToday.some((d) => CAFFEINE_MG[d.kind] !== undefined)
}

/** Total consumed today, not what is still on board. The limit rule is about the day's intake. */
export function caffeineMgToday(drinksToday: Drink[]): number {
  return drinksToday.reduce((total, d) => total + (CAFFEINE_MG[d.kind] ?? 0), 0)
}

export function nudgeFor(verdict: Verdict, drinksToday: Drink[]): { nudge: NudgeKind; showSafetyLine: boolean } {
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
