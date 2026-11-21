// Pure wording for the result ticket. No React, no clock: the screen hands everything in.
// The engine only gives enums and normalised drift; the words a person reads live here.
import type { Assessment, Mode, NudgeKind, RunResult, Verdict } from '../../../shared/contracts'
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

/**
 * One row per metric the engine actually scored, compared with the baseline run.
 * The drift record decides which rows exist; the raw runs decide what they say.
 */
export function metricRows(
  drift: Assessment['drift'],
  run: RunResult,
  baseline: RunResult,
): [label: string, value: string][] {
  const rows: [string, string][] = []
  if (drift.sway !== undefined && run.stand && baseline.stand) {
    rows.push(['Body sway', signedPercent(run.stand.swayRms, baseline.stand.swayRms)])
  }
  if (drift.choiceRt !== undefined) {
    rows.push(['Choice time', signedPercent(run.choice.medianMs, baseline.choice.medianMs)])
  }
  if (drift.choiceWrong !== undefined) {
    rows.push(['Wrong squares', signedCount(run.choice.wrong, baseline.choice.wrong)])
  }
  // Pulse always gets a row, unlike the others, because it is the one step a person chooses to
  // do or not: a missing row reads as a bug, where "Skipped" reads as a choice. When only this
  // run has a pulse there is nothing to compare it with, so it shows the reading rather than a
  // change it cannot honestly state (D46).
  if (run.hr !== undefined && baseline.hr !== undefined) {
    rows.push(['Pulse', signedPercent(run.hr, baseline.hr)])
  } else if (run.hr !== undefined) {
    rows.push(['Pulse', `${Math.round(run.hr)} bpm`])
  } else {
    rows.push(['Pulse', 'Skipped'])
  }
  return rows
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

/** Tags only appear when they apply, in a fixed order. */
export function ticketTags(input: {
  mode: Mode
  assessment: Pick<Assessment, 'partial' | 'confidence'>
  baselineClean: boolean
}): string[] {
  const tags: string[] = []
  if (input.mode === 'demo') tags.push('Simulated')
  if (input.assessment.partial) tags.push('Partial reading: no Stand Still')
  if (input.assessment.confidence === 'low' || !input.baselineClean) tags.push('Loose reading')
  return tags
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
