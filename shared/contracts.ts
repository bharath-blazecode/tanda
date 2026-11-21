// The one file both the client and the server import.
// Source of truth for these shapes: docs/05-architecture.md, "Contracts".
// Change this file only after saying so out loud: every card depends on it.
import { z } from 'zod'

// ---------- what each test returns ----------

export const StandMetrics = z.object({
  swayRms: z.number().nonnegative(),
  swayLateralRms: z.number().nonnegative(),
  hz: z.number().positive(),
  valid: z.boolean(),
})
export type StandMetrics = z.infer<typeof StandMetrics>

export const ChoiceMetrics = z.object({
  medianMs: z.number().positive(),
  wrong: z.number().int().min(0),
  lapses: z.number().int().min(0),
  trials: z.number().int().positive(),
})
export type ChoiceMetrics = z.infer<typeof ChoiceMetrics>

export const HrSource = z.enum(['band', 'camera'])
export type HrSource = z.infer<typeof HrSource>

/** At least one of the two scored tests must be present, or there is nothing to compare. */
export const hasAScoredTest = (r: { stand?: unknown; choice?: unknown }): boolean =>
  r.stand !== undefined || r.choice !== undefined

export const RunResult = z
  .object({
    stand: StandMetrics.optional(), // absent without motion sensors, or if skipped
    choice: ChoiceMetrics.optional(), // skippable, but only when the standing test was done
    hr: z.number().min(30).max(220).optional(), // average bpm; a small capped term in drift (D46)
    hrSource: HrSource.optional(),
    at: z.number().int(), // epoch ms
  })
  // Either test alone can carry a reading, but a run with neither is not a reading at all, so
  // the contract refuses it rather than leaving every consumer to check. The pulse cannot stand
  // in for either: it is capped and only ever adjusts a reading the other two produced (D46).
  .refine(hasAScoredTest, { message: 'A run needs at least one of the standing or tapping test' })
export type RunResult = z.infer<typeof RunResult>

// ---------- what the engine produces ----------

export const MetricKey = z.enum(['sway', 'choiceRt', 'choiceWrong', 'hr'])
export type MetricKey = z.infer<typeof MetricKey>

export const Verdict = z.enum(['steady', 'wired', 'tipsy', 'wobbly']) // wobbly: drift with nothing logged
export type Verdict = z.infer<typeof Verdict>

export const Confidence = z.enum(['low', 'medium', 'high'])
export type Confidence = z.infer<typeof Confidence>

export const NudgeKind = z.enum([
  'carry-on',
  'water',
  'no-more-caffeine',
  'ride-or-friend',
  'steady-not-a-driving-test',
])
export type NudgeKind = z.infer<typeof NudgeKind>

export const Handicap = z.enum(['spin', 'offhand', 'jacks'])
export type Handicap = z.infer<typeof Handicap>

export const Mode = z.enum(['real', 'demo'])
export type Mode = z.infer<typeof Mode>

const driftValue = z.number().min(-3).max(3) // normalised by the noise floor; positive is worse

export const Drift = z.object({
  sway: driftValue.optional(),
  choiceRt: driftValue.optional(),
  choiceWrong: driftValue.optional(),
  hr: driftValue.optional(),
})
export type Drift = z.infer<typeof Drift>

export const Assessment = z.object({
  verdict: Verdict,
  confidence: Confidence,
  drift: Drift,
  score: z.number().int().min(0).max(100), // steadiness, for the board
  nudge: NudgeKind,
  showSafetyLine: z.boolean(),
  partial: z.boolean(),
  guessedHandicap: Handicap.optional(), // demo mode only
})
export type Assessment = z.infer<typeof Assessment>

// ---------- what is stored on the phone (localStorage key bc:v1) ----------

export const DrinkKind = z.enum(['coffee', 'energy', 'beer', 'wine', 'spirit'])
export type DrinkKind = z.infer<typeof DrinkKind>

export const Drink = z.object({ kind: DrinkKind, at: z.number().int() })
export type Drink = z.infer<typeof Drink>

export const Stored = z.object({
  v: z.literal(1),
  deviceId: z.string().min(8).max(64), // random UUID; rate-limit key only
  nickname: z.string().min(3).max(40), // generated, or typed on Landing; the server cleans it before showing it
  shareToRoom: z.boolean(),
  baseline: z.object({ run: RunResult, clean: z.boolean() }).optional(),
  drinks: z.array(Drink),
  lastResult: z
    .object({ run: RunResult, assessment: Assessment, line: z.string(), mode: Mode })
    .optional(),
})
export type Stored = z.infer<typeof Stored>

// ---------- server routes ----------
// Every field is a number or a closed enum (D9). The one exception is the room nickname, which the
// server sanitises before it reaches the board.

export const VerdictRequest = z.object({
  deviceId: z.string().min(8).max(64),
  mode: Mode,
  verdict: Verdict,
  confidence: Confidence,
  drift: Drift,
  nudge: NudgeKind,
  drinks: z.object({
    caffeineMg: z.number().min(0).max(2000),
    alcohol: z.number().int().min(0).max(40),
  }),
  localHour: z.number().int().min(0).max(23),
  handicap: Handicap.optional(),
})
export type VerdictRequest = z.infer<typeof VerdictRequest>

export const VerdictResponse = z.object({
  line: z.string().min(1).max(400),
  source: z.enum(['claude', 'canned']),
})
export type VerdictResponse = z.infer<typeof VerdictResponse>

// A typed name may reach the board: the server sanitises it (shared/nicknames.ts) and falls back to a
// generated nickname instead of rejecting, so the floor here is just "not empty".
const RoomNickname = z.string().min(1).max(40)

export const RoomResultRequest = z.object({
  deviceId: z.string().min(8).max(64),
  nickname: RoomNickname,
  verdict: Verdict,
  score: z.number().int().min(0).max(100),
  mode: Mode,
  handicap: Handicap.optional(),
})
export type RoomResultRequest = z.infer<typeof RoomResultRequest>

export const RoomEntry = z.object({
  nickname: z.string(),
  verdict: Verdict,
  score: z.number().int().min(0).max(100),
  mode: Mode,
  handicap: Handicap.optional(),
  at: z.number().int(),
})
export type RoomEntry = z.infer<typeof RoomEntry>

// What a phone is doing right now, for the "in the lab" list. Route stages plus finer ones a screen
// may set (stand, choice, pulse).
export const RoomStage = z.enum(['joined', 'baseline', 'check', 'stand', 'choice', 'pulse', 'result', 'demo', 'idle'])
export type RoomStage = z.infer<typeof RoomStage>

// A heartbeat, sent every 15 s while the tab is visible. Memory only on the server; expires after 45 s.
export const RoomPresenceRequest = z.object({
  deviceId: z.string().min(8).max(64),
  nickname: RoomNickname,
  stage: RoomStage,
})
export type RoomPresenceRequest = z.infer<typeof RoomPresenceRequest>

export const RoomLive = z.object({
  nickname: z.string(),
  stage: RoomStage,
  at: z.number().int(), // when this person's stage last changed
})
export type RoomLive = z.infer<typeof RoomLive>

export const RoomState = z.object({
  total: z.number().int().min(0),
  mix: z.object({
    steady: z.number().int().min(0),
    wired: z.number().int().min(0),
    tipsy: z.number().int().min(0),
    wobbly: z.number().int().min(0),
  }),
  feed: z.array(RoomEntry).max(12), // newest first
  top: z.object({
    real: z.array(RoomEntry).max(5), // steadiest; real readings are never ranked by drift (D22)
    demo: z.array(RoomEntry).max(5), // dizziest after the spin
  }),
  updatedAt: z.number().int(),
  commentary: z.string().nullable().optional(), // room commentator (D32), only if built
  liveCount: z.number().int().min(0).optional(), // people with a heartbeat in the last 45 s
  live: z.array(RoomLive).max(30).optional(), // most recently changed first
})
export type RoomState = z.infer<typeof RoomState>

export const Health = z.object({
  status: z.literal('ok'),
  version: z.string(),
  sha: z.string(),
})
export type Health = z.infer<typeof Health>
