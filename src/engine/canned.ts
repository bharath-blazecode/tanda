// CARD 8 owns this file. Local fallback lines, shown at once and kept if Claude does not answer in 4 s.
// Used by the client and by the server's fallback, so both print the same voice.
// Voice: Dr. Bin Chicken, dry and unimpressed. Never mentions driving, medicine or the law.
import type { Handicap, Mode, ReferenceKind, Verdict } from '../../shared/contracts'

export const REAL_LINES: Record<Verdict, readonly string[]> = {
  steady: [
    'Readings within your normal range. Disappointing. I had a bin to get back to.',
    'Nothing moved that should not have. I have seen more drama in an empty wheelie bin.',
    'Steady. Congratulations on standing still and tapping squares, the two skills you walked in with.',
  ],
  wired: [
    'The readings wandered. I have circled the paperwork with my beak.',
    'A change on the chart. There goes my lunch break.',
    'Different from your baseline. I have made a small, official squawk.',
  ],
  tipsy: [
    'Your sway wandered off without you. The chart paper is embarrassed.',
    'The pen has filed a report. It requests a sharper pencil.',
    'Off your normal, and not in a fun direction. Logged, with a sigh.',
  ],
  wobbly: [
    'Your readings wandered. I blame the stationery department.',
    'Off your baseline. My paperwork pile just got taller.',
    'The figures moved. I have stamped the page and returned to my chips.',
  ],
}

// With alcohol logged a steady reading must never read as clearance (D19): it only says the two tests went well.
export const STEADY_WITH_ALCOHOL_LINES: readonly string[] = [
  'Steady on the stand and the taps. That is all these two tests know about. I only stamp the paperwork.',
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

// Against the quick demo's example numbers: not the person's normal, and no handicap was chosen.
export const EXAMPLE_LINES: Record<Verdict, readonly string[]> = {
  steady: [
    'Close to the example numbers. They are not yours, so I am not impressed either way.',
    'Near the stock figures. Record your own baseline if you want a reading about you.',
    'Matches numbers I made up on build day. Congratulations on resembling a spreadsheet.',
  ],
  wired: [
    'Off the example numbers, with caffeine on the books. Those numbers were never yours.',
    'Twitchier than the stock figures. Your own baseline would say more than I can.',
    'Faster and messier than the example. Logged, loosely.',
  ],
  tipsy: [
    'Off the example numbers, with drinks on the books. They were never your normal.',
    'Further from the stock figures than expected. Your own baseline would tell you more.',
    'Drifted from numbers that were never yours. Logged, with a sigh.',
  ],
  wobbly: [
    'Off the example numbers with nothing logged. They were never yours to begin with.',
    'Away from the stock figures. A bin chicken cannot read much into that, and neither should you.',
    'Not like the example. Record your own baseline and we can talk.',
  ],
}

export type CannedContext = { handicap?: Handicap; alcohol?: number; reference?: ReferenceKind }

function choose(lines: readonly string[], pick: number): string {
  const i = Math.abs(Math.floor(Number.isFinite(pick) ? pick : 0)) % lines.length
  return lines[i]
}

// `pick` chooses deterministically (callers pass a random or rotating number); `context` refines the
// choice when the caller knows the handicap guess or the alcohol count. Two-argument calls still work.
export function cannedLine(verdict: Verdict, mode: Mode, pick = 0, context: CannedContext = {}): string {
  // Steady with alcohol is the one line that must never read as clearance, whatever else applies.
  if (verdict === 'steady' && (context.alcohol ?? 0) > 0 && context.reference === 'example') {
    return choose(STEADY_WITH_ALCOHOL_LINES, pick)
  }
  if (context.reference === 'example') return choose(EXAMPLE_LINES[verdict], pick)
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
    ...Object.values(EXAMPLE_LINES).flat(),
  ]
}
