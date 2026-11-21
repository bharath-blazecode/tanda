// Which handicap the reading points at, decided from the drift alone and never from what the person
// picked: the whole trick of the demo is that the app can tell. Pure, so it is tested on its own.
// The engine's own guessedHandicap names a side for any drift at all; the ticket also needs "no real
// drift", so this reuses the engine's total and threshold rather than restating them.
import type { Drift } from '../../../shared/contracts'
import { totalDrift } from '../../engine/classify'
import { pos } from '../../engine/drift'
import { DRIFT_THRESHOLD } from '../../engine/metrics'

/** The handicaps the demo offers. Jumping jacks are left out: the check never measures a pulse. */
export type DemoHandicap = 'spin' | 'offhand'
export type DemoGuess = DemoHandicap | 'none'

export const DEMO_HANDICAPS: readonly DemoHandicap[] = ['spin', 'offhand']

export function isDemoHandicap(value: unknown): value is DemoHandicap {
  return value === 'spin' || value === 'offhand'
}

export function guessFromDrift(drift: Drift): DemoGuess {
  // Below the threshold the verdict is Steady, so the reading points at nothing.
  if (totalDrift(drift) < DRIFT_THRESHOLD) return 'none'
  const sway = pos(drift.sway)
  const taps = pos(drift.choiceRt) + pos(drift.choiceWrong)
  return sway > taps ? 'spin' : 'offhand'
}

/** The extra ticket line. A wrong guess is said out loud, never hidden. */
export function guessLine(guess: DemoGuess, picked?: DemoHandicap): string {
  if (guess === 'none') return 'Barely a wobble. Try again, with feeling.'
  const line = guess === 'spin' ? 'We think you spun.' : 'We think that was your other hand.'
  return picked && picked !== guess ? `${line} If we guessed wrong, bodies are odd.` : line
}
