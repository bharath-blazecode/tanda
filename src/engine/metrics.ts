// CARD 5 owns src/engine. Pure TypeScript: no React, no DOM, no network, and no Date.now()
// inside functions (time comes in as an argument). That is what makes it testable.
// Formulas and starting values: docs/05-architecture.md, Scoring.
import type { MetricKey } from '../../shared/contracts'

/** Run-to-run variation with nothing changed. Starting values, tuned in calibration (D16, D46). */
export const NOISE_FLOOR: Record<MetricKey, number> = {
  sway: 0.3,
  choiceRt: 0.15, // tied to the trial count: 0.12 was for 12 taps, this is 0.12 * sqrt(12/8) for 8
  choiceWrong: 1,
  hr: 0.15,
}

/** Below this much total drift the verdict is Steady. */
export const DRIFT_THRESHOLD = 1.5

/** Pulse can tip a borderline reading and can never decide one alone (D46). */
export const PULSE_CAP = 0.5
