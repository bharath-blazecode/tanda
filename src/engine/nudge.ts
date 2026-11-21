// CARD 5. Stub, except for the two safety rules, which hold even now and must keep their tests:
// - Tipsy always maps to ride-or-friend.
// - Any alcohol logged today shows the safety line, whatever the verdict (D19).
import type { Drink, NudgeKind, Verdict } from '../../shared/contracts'

const ALCOHOL = new Set(['beer', 'wine', 'spirit'])

export function hasAlcohol(drinksToday: Drink[]): boolean {
  return drinksToday.some((d) => ALCOHOL.has(d.kind))
}

export function nudgeFor(verdict: Verdict, drinksToday: Drink[]): { nudge: NudgeKind; showSafetyLine: boolean } {
  const alcohol = hasAlcohol(drinksToday)
  if (verdict === 'tipsy') return { nudge: 'ride-or-friend', showSafetyLine: true }
  if (verdict === 'steady' && alcohol) return { nudge: 'steady-not-a-driving-test', showSafetyLine: true }
  return { nudge: 'carry-on', showSafetyLine: alcohol }
}
