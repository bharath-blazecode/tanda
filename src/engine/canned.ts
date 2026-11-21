// CARD 8 owns this file. Local fallback lines, shown at once and kept if Claude does not answer in 4 s.
// Used by the client and by the server's fallback, so both print the same voice.
// Voice: Dr. Bin Chicken, dry and unimpressed. Never mentions driving, medicine or the law.
import type { Handicap, Mode, Verdict } from '../../shared/contracts'

export const REAL_LINES: Record<Verdict, readonly string[]> = {
  steady: [
    'Readings within your normal range. Disappointing. I had a bin to get back to.',
    'Nothing moved that should not have. I have seen more drama in an empty wheelie bin.',
    'Steady. Congratulations on standing still and tapping squares, the two skills you walked in with.',
  ],
  wired: [
    'Fast and twitchy. Whatever was in that cup is doing laps.',
    'Your taps arrived before the squares did. Impressive, in a worrying way.',
    'Jittery readings. I have seen calmer seagulls at a chip shop.',
  ],
  tipsy: [
    'Your sway wandered off without you. The chart paper is embarrassed.',
    'Wobbly pen, slow taps. Those drinks have filed their own report.',
    'Off your normal, and not in a fun direction. Logged, with a sigh.',
  ],
  wobbly: [
    'You drifted with nothing logged. Either the phone is haunted or you forgot to mention a drink.',
    'Off your normal with a clean log. Suspicious. I will be going through your bin later.',
    'Readings went sideways with nothing on the books. Long day, perhaps. I do not care either way.',
  ],
}

// With alcohol logged a steady reading must never read as clearance (D19): it only says the two tests went well.
export const STEADY_WITH_ALCOHOL_LINES: readonly string[] = [
  'Steady on the stand and the taps. That is all these two tests know about. The drinks are still in there.',
  'You stood still and tapped well. That proves nothing beyond standing and tapping, so do not get ideas.',
  'Good numbers for standing and tapping. That is the whole list of what I measured.',
]

export const DEMO_LINES: Record<Handicap, readonly string[]> = {
  spin: [
    'You spun around and now act surprised. The pen nearly left the paper.',
    'Dizzy by choice. Bold strategy. The chart agrees with you.',
    'Spun on the spot. The trace looks like my lunch after a bin raid.',
  ],
  offhand: [
    'Wrong hand, wrong squares. A bold experiment with predictable results.',
    'Your other hand tapped like it had never met you.',
    'Offhand taps logged. That hand should stick to holding chips.',
  ],
  jacks: [
    'Jumping jacks before standing still. Truly a scientist.',
    'You did star jumps, then wondered why you wobble. Fascinating work.',
    'Legs pumping, numbers jumping. Exercise was a choice and so was this.',
  ],
}

export const DEMO_NO_DRIFT_LINES: readonly string[] = [
  'You tried to mess it up and failed. Even your sabotage is steady.',
  'Demo mode, no drift. You had one job and it was to wobble.',
  'The handicap did nothing. I remain as unimpressed as ever.',
]

export type CannedContext = { handicap?: Handicap; alcohol?: number }

function choose(lines: readonly string[], pick: number): string {
  const i = Math.abs(Math.floor(Number.isFinite(pick) ? pick : 0)) % lines.length
  return lines[i]
}

// `pick` chooses deterministically (callers pass a random or rotating number); `context` refines the
// choice when the caller knows the handicap guess or the alcohol count. Two-argument calls still work.
export function cannedLine(verdict: Verdict, mode: Mode, pick = 0, context: CannedContext = {}): string {
  if (mode === 'demo') {
    if (verdict === 'steady') return choose(DEMO_NO_DRIFT_LINES, pick)
    if (context.handicap) return choose(DEMO_LINES[context.handicap], pick)
  }
  if (verdict === 'steady' && (context.alcohol ?? 0) > 0) return choose(STEADY_WITH_ALCOHOL_LINES, pick)
  return choose(REAL_LINES[verdict], pick)
}

export function allCannedLines(): string[] {
  return [
    ...Object.values(REAL_LINES).flat(),
    ...STEADY_WITH_ALCOHOL_LINES,
    ...Object.values(DEMO_LINES).flat(),
    ...DEMO_NO_DRIFT_LINES,
  ]
}
