// CARD 7. The words for each nudge, in one file so a test can read all of them (D19).
// The engine picks the nudge; nothing here decides anything. Words are from
// docs/04-screens-spec.md, section 7.
//
// Rules for anything added here:
// - Never say a person is fine, clear, or able to drive. Not in any wording.
// - Never promise that doing something changes a reading or speeds anything up.
import type { NudgeKind } from '../../../shared/contracts'

/** After this hour, the caffeine nudge mentions sleep as well (spec, section 7). */
export const EVENING_HOUR = 15

export function nudgeText(nudge: NudgeKind, localHour: number): string {
  switch (nudge) {
    case 'ride-or-friend':
      return 'Get a ride or ping a friend. Have a water too.'
    case 'no-more-caffeine':
      return localHour >= EVENING_HOUR
        ? 'No more coffee today. It will still be with you at bedtime.'
        : 'No more coffee today.'
    case 'water':
      return 'Something has you off your normal. Water, and a slow breath.'
    case 'steady-not-a-driving-test':
      return 'Tests look steady. Still not a driving test.'
    case 'carry-on':
      return 'Carry on.'
  }
}
