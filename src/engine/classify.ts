// CARD 5. Stub. drift + the drink log -> verdict, confidence, nudge.
// The sensors give the amount of drift; the log gives it a name (D17, D18).
import type { Assessment, Drink, Mode, RunResult } from '../../shared/contracts'
import { driftFor } from './drift'
import { nudgeFor } from './nudge'

export type AssessInput = {
  baseline: RunResult
  baselineClean: boolean
  run: RunResult
  drinksToday: Drink[]
  mode: Mode
  checksSinceBaseline: number // the first few "faster than baseline" readings are learning, not drift
}

export function assess(input: AssessInput): Assessment {
  const { nudge, showSafetyLine } = nudgeFor('steady', input.drinksToday)
  return {
    verdict: 'steady',
    confidence: 'low',
    drift: driftFor(input.baseline, input.run),
    score: 100,
    nudge,
    showSafetyLine,
    partial: !input.run.stand,
  }
}
