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

  if (req.mode === 'demo') {
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

const BANNED_PHRASES = [
  'safe to drive',
  'fine to drive',
  'ok to drive',
  'okay to drive',
  'sober',
  'legal limit',
  'blood alcohol',
]

// Word-boundary patterns for short stems that would otherwise match innocent words ("back", "bacon").
const BANNED_PATTERNS = [/\bbac\b/i, /\bdiagnos/i, /\bdriv(?:e|ing)/i]

const WRAPPING_QUOTES = /^["'`“”‘’«»]+|["'`“”‘’«»]+$/g

export function hasBannedPhrase(text: string): boolean {
  const lower = text.toLowerCase()
  return BANNED_PHRASES.some((p) => lower.includes(p)) || BANNED_PATTERNS.some((re) => re.test(text))
}

// Returns the cleaned line, or null when it must not be printed (the caller falls back to canned).
export function filterLine(raw: string): string | null {
  const line = raw.trim().replace(WRAPPING_QUOTES, '').replace(/\s+/g, ' ').trim()
  if (line.length === 0 || line.length > MAX_LINE_CHARS) return null
  if (hasBannedPhrase(line)) return null
  return line
}
