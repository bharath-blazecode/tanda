// Pure wording for the result ticket. No React, no clock: the screen hands everything in.
// The engine only gives enums and normalised drift; the words a person reads live here.
import type {
  Assessment,
  Confidence,
  DrinkKind,
  Mode,
  NudgeKind,
  ResultReference,
  RunResult,
  Verdict,
} from '../../../shared/contracts'
import { pulseStatusOf, tapErrors, type Comparability, type NotCompared } from '../../engine/compare'
import type { DrinkInput } from '../../engine/serving'
import type { Mood } from '../../ui'

/** A ratio to the person's own normal, as a signed whole percentage. Never a raw drift number. */
export function signedPercent(now: number, normal: number): string {
  if (!(normal > 0) || !Number.isFinite(now)) return 'no change'
  const change = Math.round((now / normal - 1) * 100)
  if (change === 0) return 'no change'
  return `${change > 0 ? '+' : '-'}${Math.abs(change)}%`
}

/** Wrong squares are a count, so the change is a count too. */
export function signedCount(now: number, normal: number): string {
  const change = now - normal
  if (change === 0) return 'no change'
  return `${change > 0 ? '+' : '-'}${Math.abs(change)}`
}

/** Why a test has no change printed beside it. Short, because they sit in a dotted row. */
const NOT_COMPARED_VALUE: Record<NotCompared, string> = {
  'not-taken': 'Skipped',
  'not-in-reference': 'Not compared',
  unusable: 'No reading',
  'reference-unusable': 'Not compared',
  'protocol-changed': 'Not compared',
  'placement-changed': 'Not compared',
  'cadence-changed': 'Not compared',
  'unknown-source': 'Not compared',
  'trial-count-changed': 'Not compared',
  'sensor-changed': 'Not compared',
  'capture-changed': 'Not compared',
}

/** The sentence under the rows that says why, so "Not compared" is never left unexplained. */
const NOT_COMPARED_NOTE: Partial<Record<NotCompared, string>> = {
  'not-in-reference': 'is not in the reference, so there is nothing to compare it with.',
  unusable: 'did not give a usable reading this time.',
  'reference-unusable': 'in the reference was not usable.',
  'protocol-changed': 'used a different or unknown protocol. Record a new baseline.',
  'placement-changed': 'had different or changing phone placement.',
  'cadence-changed': 'used a different motion sampling rate from the reference.',
  'unknown-source': 'has no recorded sensor to match. Record a new baseline.',
  'trial-count-changed': 'used a different number of trials. Record a new baseline.',
  'sensor-changed':
    'used a different motion sensor from the reference (rotation one time, acceleration the other). The units differ, so it was not compared. Recalibrating fixes this.',
  'capture-changed': 'ran for a different length from the reference, so it was not compared. Recalibrating fixes this.',
}

export type TicketRows = { rows: [label: string, value: string][]; notes: string[] }

/**
 * One row per test, compared with the reference the reading was actually made against (it is
 * stored with the result, so a later recalibration cannot change an old ticket). A test that was
 * not compared says so in the row and why in a note. Nothing here prints a raw drift number.
 */
export function comparisonRows(run: RunResult, reference: RunResult, can: Comparability): TicketRows {
  const rows: [string, string][] = []
  const notes: string[] = []

  if (can.stand.compared && run.stand && reference.stand) {
    rows.push(['Stand still', signedPercent(run.stand.swayRms, reference.stand.swayRms)])
    if (can.caveats.includes('unverified-placement')) notes.push('Phone orientation could not be verified in both recordings.')
    if (run.stand.recovered || reference.stand.recovered) notes.push('Stand still used a recovered same-sensor recording.')
  } else if (!can.stand.compared) {
    rows.push(['Stand still', NOT_COMPARED_VALUE[can.stand.reason]])
    const note = NOT_COMPARED_NOTE[can.stand.reason]
    if (note) notes.push(`Stand still ${note}`)
  }

  if (can.choice.compared && run.choice && reference.choice) {
    rows.push(['Tap time', can.reactionTime ? signedPercent(run.choice.medianMs, reference.choice.medianMs) : 'No clean taps'])
    rows.push(['Wrong or missed', signedCount(tapErrors(run.choice), tapErrors(reference.choice))])
    if (!can.reactionTime) {
      notes.push('Tap time needs at least one correct tap in both runs. Wrong and missed squares were still counted.')
    }
  } else if (!can.choice.compared) {
    rows.push(['Choice tap', NOT_COMPARED_VALUE[can.choice.reason]])
    const note = NOT_COMPARED_NOTE[can.choice.reason]
    if (note) notes.push(`Choice tap ${note}`)
  }

  // Pulse always gets a row, because it is the one step a person chooses: a missing row reads as a
  // bug. The row says what happened, so a failed reading is never printed as a choice to skip.
  const status = pulseStatusOf(run)
  if (can.pulse.compared && run.hr !== undefined && reference.hr !== undefined) {
    rows.push(['Pulse', signedPercent(run.hr, reference.hr)])
  } else if (status === 'measured' && run.hr !== undefined) {
    rows.push(['Pulse', `${Math.round(run.hr)} bpm`])
    notes.push('Pulse shown, not compared: the reference has no pulse.')
  } else if (status === 'approximate' && run.pulse?.bpm !== undefined) {
    rows.push(['Pulse', `about ${Math.round(run.pulse.bpm)} bpm`])
    notes.push(run.pulse.combined ? 'Pulse is approximate from two compatible captures and is not scored.' : 'Pulse is approximate, from a weak camera signal. It is shown and not scored.')
  } else if (status === 'unreadable') {
    rows.push(['Pulse', 'No reading'])
    notes.push('The camera could not find a steady rhythm. That says nothing about your pulse itself.')
  } else if (status === 'blocked') {
    rows.push(['Pulse', 'No camera'])
  } else if (status === 'skipped') {
    rows.push(['Pulse', 'Skipped'])
  } else {
    rows.push(['Pulse', 'Not taken'])
  }

  return { rows, notes }
}

const DRINK_WORDS: Record<DrinkKind, [one: string, many: string]> = {
  coffee: ['coffee', 'coffees'],
  tea: ['tea', 'teas'],
  energy: ['energy drink', 'energy drinks'],
  'other-caffeine': ['other caffeine', 'other caffeine'],
  beer: ['beer', 'beers'],
  wine: ['wine', 'wines'],
  spirit: ['spirit', 'spirits'],
}

/** The order they read in on the ticket: what is in you first, then what you drank for fun. */
const DRINK_ORDER: DrinkKind[] = ['beer', 'wine', 'spirit', 'coffee', 'tea', 'energy', 'other-caffeine']

/**
 * What was logged today, in words: "2 beers, 1 coffee". Empty when nothing was logged, so the
 * caller can leave the line off rather than printing "nothing".
 *
 * This is the label, not a measurement. How much someone drank never moves the verdict: the
 * sensors say how far a person is from their own normal, and the log only says what to call it
 * (D17, D18). A count that could soften a verdict would be a sobriety estimate, which this is not.
 */
export function describeDrinks(drinks: readonly DrinkInput[]): string {
  const counts = new Map<DrinkKind, number>()
  for (const d of drinks) counts.set(d.kind, (counts.get(d.kind) ?? 0) + 1)
  return DRINK_ORDER.filter((kind) => counts.get(kind))
    .map((kind) => {
      const n = counts.get(kind) as number
      return `${n} ${DRINK_WORDS[kind][n === 1 ? 0 : 1]}`
    })
    .join(', ')
}

const NUDGE_WORDS: Record<NudgeKind, string> = {
  'carry-on': 'Carry on.',
  water: 'Water, and a slow breath.',
  'no-more-caffeine': 'No more coffee today.',
  'ride-or-friend': 'Get a ride or ping a friend.',
  'steady-not-a-driving-test': 'Still not a driving test.',
}

/** The few words on the tear-off stub. The engine picks the kind; this only says it. */
export function nudgeWords(kind: NudgeKind): string {
  return NUDGE_WORDS[kind]
}

/** Tags only appear when they apply, in a fixed order. Provenance first: it is never optional. */
export function ticketTags(input: {
  mode: Mode
  assessment: Pick<Assessment, 'partial' | 'confidence'>
  baselineClean: boolean
  reference?: ResultReference['kind']
}): string[] {
  const tags: string[] = []
  if (input.mode === 'demo') tags.push('Simulated')
  if (input.reference === 'example') tags.push('Example reference, not your baseline')
  if (input.assessment.partial) tags.push('Partial reading')
  if (input.assessment.confidence === 'low' || !input.baselineClean) tags.push('Loose reading')
  return tags
}

/**
 * The tier describes recording conditions: sensor, sample rate, a clean baseline, what could be
 * compared. It is not a probability and not diagnostic confidence, so it is never called confidence.
 */
export function conditionsWords(confidence: Confidence): string {
  return confidence === 'high' ? 'good' : confidence === 'medium' ? 'fair' : 'poor'
}

/** What the reading was compared with, printed in the ticket header. */
export function referenceLine(reference: ResultReference): string {
  return reference.kind === 'example' ? 'Against · example numbers' : `Against · your baseline, ${printedAt(reference.run.at)}`
}

/**
 * One line that says where the stamp's word came from. Wired and Tipsy are names taken from the log;
 * the phone detects neither caffeine nor alcohol. Steady means no change past this app's threshold.
 */
export function labelNote(verdict: Verdict): string {
  switch (verdict) {
    case 'steady':
      return 'Steady: no change past this app\'s threshold in what was compared.'
    case 'wired':
    case 'tipsy':
      return 'Named from your log. The phone does not detect caffeine or alcohol.'
    case 'wobbly':
      return 'Changed, with nothing logged to name it.'
  }
}

/** Wobbly is drift with nothing logged; the kit draws it as the tipsy body without the hiccups. */
export function moodFor(verdict: Verdict): Mood {
  return verdict
}

export function stampNote(mode: Mode): string {
  // Short on purpose: a longer note wraps and pushes the stamp off the ticket at 390px.
  return mode === 'demo' ? 'Simulated reading' : 'Certified by a bin chicken'
}

/** A stable serial from the reading's own time, so a reload prints the same number. */
export function serialFor(at: number): string {
  return `No. ${String(Math.abs(Math.floor(at / 1000)) % 100000).padStart(5, '0')}`
}

/** The reading's date and time, in the phone's own time zone, e.g. "Sat 21 Nov 16:04". */
export function printedAt(at: number): string {
  const d = new Date(at)
  const day = d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '')
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${day} ${time}`
}

/** The bird's line in quotes, without doubling any quotes the line already carries. */
export function quoted(line: string): string {
  const bare = line.trim().replace(/^["“]+|["”]+$/g, '').trim()
  return `“${bare}”`
}
