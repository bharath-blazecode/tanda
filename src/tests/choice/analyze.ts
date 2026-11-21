// CARD 4. Stub. Pure function: trials in, raw numbers out.
// Protocol and edge cases: docs/04-screens-spec.md, T2. Working logic to port: docs/design/prototype-flow.html.
import type { ChoiceMetrics } from '../../../shared/contracts'

export type ChoiceTrial = {
  lit: number // which of the four squares lit up, 0 to 3
  tapped: number | null // which square was tapped; null is a lapse
  ms: number | null // time from light to tap
}

export function summariseChoice(_trials: ChoiceTrial[]): ChoiceMetrics {
  return { medianMs: 430, wrong: 0, lapses: 0, trials: 12 }
}
