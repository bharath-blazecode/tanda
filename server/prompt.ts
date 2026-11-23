// CARD 8. What Claude is told, and what we accept back. Pure functions only: no SDK, no key, no I/O,
// so the voice and the filter can be unit tested and the canned lines checked against the same filter.
import type { Drift, Handicap, MetricKey, VerdictRequest } from '../shared/contracts'

export const MAX_LINE_CHARS = 220

// One shared voice for every Claude call (D36). The rules repeat CLAUDE.md's product rules because
// Claude never sees that file; the output filter below enforces the critical ones anyway.
export const SYSTEM_PROMPT = `You are Dr. Bin Chicken, an Australian white ibis who works as a lab technician in a toy reaction-test lab. You print one line on a paper ticket after someone stands still and taps squares on their phone.

Voice: dry, deadpan, unimpressed, a little rude, never cruel. Tease what the person did (the drinks, the taps, the wobble, the stunt), never who they are. Bins, chips and lab paperwork are fair game.

Rules:
- Write one or two short sentences, at most 180 characters in total.
- Plain text only. No emoji, no hashtags, no quotation marks around the answer, no preamble.
- Never mention driving, cars, medicine, doctors, the law, blood alcohol or sobriety.
- Never tell the person they are fine, safe, sober or okay to do anything.
- Never encourage drinking more of anything.
- A log gives context. Never attribute a change in a task to a drink or infer a cause from the stamp.
- The verdict is already decided. Do not argue with it and do not give advice; the app shows its own advice.
- Reply with the line and nothing else.`

const METRIC_NAMES: Record<MetricKey, string> = {
  sway: 'body sway',
  choiceRt: 'tap reaction time',
  choiceWrong: 'wrong taps',
  hr: 'heart rate',
}

const HANDICAP_TEXT: Record<Handicap, string> = {
  spin: 'spun around on the spot before the test',
  offhand: 'tapped with their other hand',
  jacks: 'did jumping jacks right before the test',
}

// Drift is normalised by the noise floor and positive is worse, so these bands read as "how many
// noise floors away from their own normal".
export function driftLabel(d: number): string {
  if (d <= -1) return 'better than their normal'
  if (d < 0.5) return 'about their normal'
  if (d < 1.5) return 'a bit above their normal'
  if (d < 2.5) return 'well above their normal'
  return 'far above their normal'
}

function timeOfDay(hour: number): string {
  if (hour < 5) return 'small hours of the night'
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'late night'
}

// Renders only the fields Claude needs. Every value is a number or a closed enum (D9), and the
// deviceId is deliberately left out: it is a rate-limit key, not something Claude should see.
export function buildUserMessage(req: VerdictRequest): string {
  const lines: string[] = [
    `Verdict: ${req.verdict}`,
    `Confidence: ${req.confidence}`,
    `Mode: ${req.mode}`,
  ]

  const drift: Drift = req.drift
  for (const key of Object.keys(METRIC_NAMES) as MetricKey[]) {
    const d = drift[key]
    if (d === undefined) continue
    lines.push(`- ${METRIC_NAMES[key]}: ${driftLabel(d)}`)
  }
  if (lines.length === 3) lines.push('- no metrics measured')

  lines.push(`Caffeine logged today: about ${Math.round(req.drinks.caffeineMg)} mg`)
  lines.push(`Alcoholic drinks logged today: ${req.drinks.alcohol}`)
  lines.push(`Local time: ${req.localHour}:00 (${timeOfDay(req.localHour)})`)

  if (req.mode === 'demo' && req.reference === 'example') {
    lines.push('Example mode: compared with fixed example numbers, not with this person. No handicap was chosen.')
  } else if (req.mode === 'demo') {
    lines.push('Demo mode: the person messed up the test on purpose to see what happens.')
    if (req.handicap) lines.push(`Handicap the app guessed: they ${HANDICAP_TEXT[req.handicap]}`)
  }

  if (req.verdict === 'steady' && req.drinks.alcohol > 0) {
    lines.push(
      'Important: alcohol was logged. Steady tests prove nothing beyond standing and tapping. Do not imply they are fine or cleared for anything.',
    )
  }

  return `Write the ticket line for this result.\n${lines.join('\n')}`
}

// Matched against normalise(text), so punctuation, case and spacing tricks collapse first.
// Prefixes catch inflections ("driven", "sobriety", "medical"); short or common stems are whole
// words only so innocent words survive ("back", "careful", "wheelie bin" in a canned line).
const BANNED_PATTERNS: readonly RegExp[] = [
  /\bdriv/,
  /\bdrove/,
  /\bwheels?\b/,
  /\bcars?\b/,
  /\bsober/,
  /\bsobri/,
  /\bbac\b/,
  /\bblood alcohol/,
  /\blegal/,
  /\blimit/,
  /\blicen[cs]e/,
  /\bdiagnos/,
  /\bdoctor/,
  /\bmedic/,
]

// With alcohol logged, any word that reads as clearance is out, whatever the verdict.
const ALCOHOL_PATTERNS: readonly RegExp[] = [
  /\b(?:fine|safe|okay|ok|alright)\b/,
  /\ball clear\b/,
  /\bgood to go\b/,
  /\bclear to\b/,
]

const WRAPPING_QUOTES = /^["'`“”‘’«»]+|["'`“”‘’«»]+$/g
const ZERO_WIDTH = /[​‌‍⁠﻿]/g
// Any letter or combining mark outside ASCII. Look-alike alphabets (Cyrillic "о" for "o") are the
// cheap way past a word list, and the voice is plain English. Punctuation such as curly quotes and
// dashes is not a letter, so it passes here and becomes a space in normalise().
const NON_ASCII_LETTER = /(?![A-Za-z])[\p{L}\p{M}]/u

export type FilterOptions = { alcohol?: boolean }

function clean(text: string): string {
  return text.normalize('NFKC').replace(ZERO_WIDTH, '')
}

// Lower-case letters and digits separated by single spaces. Runs of single letters are then joined,
// so "B.A.C." and "s o b e r" read as "bac" and "sober".
export function normalise(text: string): string {
  return clean(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\b(?:\p{L} )+\p{L}\b/gu, (run) => run.replace(/ /g, ''))
}

export function hasBannedPhrase(text: string, { alcohol = false }: FilterOptions = {}): boolean {
  if (NON_ASCII_LETTER.test(clean(text))) return true
  const norm = normalise(text)
  if (BANNED_PATTERNS.some((re) => re.test(norm))) return true
  return alcohol && ALCOHOL_PATTERNS.some((re) => re.test(norm))
}

// Returns the cleaned line, or null when it must not be printed (the caller falls back to canned).
// `alcohol: true` adds the stricter list, for any request with alcohol logged.
export function filterLine(raw: string, options: FilterOptions = {}): string | null {
  const line = clean(raw).trim().replace(WRAPPING_QUOTES, '').replace(/\s+/g, ' ').trim()
  if (line.length === 0 || line.length > MAX_LINE_CHARS) return null
  if (hasBannedPhrase(line, options)) return null
  return line
}
