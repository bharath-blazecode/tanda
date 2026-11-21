// CARD 3. Stub. Pure function: samples in, raw numbers out. Knows nothing about baselines.
// Protocol and edge cases: docs/04-screens-spec.md, T1. Signal maths: docs/05-architecture.md, Scoring.
import type { StandMetrics } from '../../../shared/contracts'
import type { MotionSample } from '../../sensors/motion'

export function analyzeStand(_samples: MotionSample[]): StandMetrics {
  return { swayRms: 1, swayLateralRms: 0.6, hz: 60, valid: true }
}
