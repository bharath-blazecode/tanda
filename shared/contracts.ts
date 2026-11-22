// The one file both the client and the server import.
// Source of truth for these shapes: docs/05-architecture.md, "Contracts".
// Change this file only after saying so out loud: every card depends on it.
import { z } from 'zod'

// ---------- what each test returns ----------

/** Which sensor the standing reading came from. They have different units: deg/s and m/s². */
export const StandSource = z.enum(['gyroscope', 'acceleration'])
export type StandSource = z.infer<typeof StandSource>

export const StandMetrics = z.object({
  swayRms: z.number().nonnegative(),
  swayLateralRms: z.number().nonnegative(),
  hz: z.number().positive(),
  valid: z.boolean(),
  // Recorded from schema v2 on. Absent on older readings, which means "not recorded", never "the
  // same as now": the engine refuses to compare two readings whose sources are known to differ.
  source: StandSource.optional(),
  /** Length of the capture, settling included, in seconds. Absent on older readings. */
  captureSeconds: z.number().positive().max(120).optional(),
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

/**
 * What happened at the pulse step, so a ticket never collapses a failed reading into "Skipped".
 * - measured: a clear reading. Only this one may be scored (it is also copied to `hr`).
 * - approximate: a weak signal. Shown with "about", never scored.
 * - unreadable: the camera ran but no supported rhythm came out. Not evidence of no pulse.
 * - blocked: no camera, or permission refused.
 * - skipped: the person chose not to.
 */
export const PulseStatus = z.enum(['measured', 'approximate', 'unreadable', 'blocked', 'skipped'])
export type PulseStatus = z.infer<typeof PulseStatus>

export const PulseRecord = z.object({
  status: PulseStatus,
  bpm: z.number().min(30).max(220).optional(), // measured and approximate only
})
export type PulseRecord = z.infer<typeof PulseRecord>

/** A pulse is scored only when it was measured, so an approximate figure can never reach `hr`. */
export const pulseIsConsistent = (r: { hr?: number; pulse?: PulseRecord }): boolean =>
  r.pulse === undefined || r.pulse.status === 'measured' || r.hr === undefined

export const RunResult = z
  .object({
    stand: StandMetrics.optional(), // absent without motion sensors, or if skipped
    choice: ChoiceMetrics.optional(), // skippable, but only when the standing test was done
    hr: z.number().min(30).max(220).optional(), // scored bpm; a small capped term in drift (D46)
    hrSource: HrSource.optional(),
    pulse: PulseRecord.optional(), // from schema v2; absent means the step was not offered or predates v2
    at: z.number().int(), // epoch ms
  })
  // Either test alone can carry a reading, but a run with neither is not a reading at all, so
  // the contract refuses it rather than leaving every consumer to check. The pulse cannot stand
  // in for either: it is capped and only ever adjusts a reading the other two produced (D46).
  .refine(hasAScoredTest, { message: 'A run needs at least one of the standing or tapping test' })
  .refine(pulseIsConsistent, { message: 'Only a measured pulse may be scored' })
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

// ---------- what is stored on the phone ----------
// Schema v2 lives under localStorage key bc:v2. The v1 record under bc:v1 is read once, migrated,
// and left in place untouched so that rolling the app back finds the old data intact.

export const DrinkKind = z.enum(['coffee', 'tea', 'energy', 'other-caffeine', 'beer', 'wine', 'spirit'])
export type DrinkKind = z.infer<typeof DrinkKind>

/** Where a number on a drink came from. `default` is the app's own assumption, never a measurement. */
export const AmountSource = z.enum(['label', 'estimate', 'default'])
export type AmountSource = z.infer<typeof AmountSource>

/**
 * Caffeine in one serving, in explicit units. A bare drink with no `caffeine` keeps the v1 meaning:
 * the app default for its kind, if it has one. Say `unknown` to leave it out of every estimate.
 */
export const CaffeineAmount = z.discriminatedUnion('basis', [
  z.object({ basis: z.literal('serving'), mg: z.number().min(0).max(1000), source: AmountSource }),
  z.object({ basis: z.literal('per100ml'), mgPer100ml: z.number().min(0).max(100), source: AmountSource }),
  z.object({ basis: z.literal('unknown') }),
])
export type CaffeineAmount = z.infer<typeof CaffeineAmount>

/**
 * Alcohol in one serving. `labelStandardDrinks` is the number printed on an Australian label for the
 * serving as sold; `abv` is the label strength in percent. Neither is ever turned into a blood figure.
 */
export const AlcoholAmount = z.object({
  abv: z.number().min(0).max(100).optional(),
  labelStandardDrinks: z.number().min(0).max(50).optional(),
  source: z.enum(['label', 'estimate']),
})
export type AlcoholAmount = z.infer<typeof AlcoholAmount>

export const Drink = z.object({
  id: z.string().min(1).max(64),
  kind: DrinkKind,
  at: z.number().int(), // when it was drunk, as the person says; epoch ms
  loggedAt: z.number().int().optional(), // when it was entered
  approxTime: z.boolean().optional(), // the person picked a rough time ("about an hour ago")
  name: z.string().max(40).optional(), // product or preparation; stays on the phone
  note: z.string().max(140).optional(), // stays on the phone
  servingMl: z.number().positive().max(3000).optional(), // the serving as sold or made
  fraction: z.number().gt(0).max(1).optional(), // share of that serving actually drunk; default 1
  caffeine: CaffeineAmount.optional(),
  alcohol: AlcoholAmount.optional(),
  legacy: z.literal(true).optional(), // migrated from v1: kind and time only, no serving detail
})
export type Drink = z.infer<typeof Drink>

/** The two references a reading can be compared with. `example` is fixed numbers, never a person. */
export const ReferenceKind = z.enum(['personal', 'example'])
export type ReferenceKind = z.infer<typeof ReferenceKind>

export const Baseline = z.object({
  run: RunResult,
  clean: z.boolean(),
  /** Real checks compared against this baseline so far. Absent on migrated baselines: unknown. */
  checks: z.number().int().min(0).max(1_000_000).optional(),
})
export type Baseline = z.infer<typeof Baseline>

/** The reference a stored result was actually compared with, kept with the result itself. */
export const ResultReference = z.object({
  kind: ReferenceKind,
  run: RunResult,
  clean: z.boolean(),
})
export type ResultReference = z.infer<typeof ResultReference>

export const LastResult = z.object({
  run: RunResult,
  assessment: Assessment,
  line: z.string(),
  mode: Mode,
  reference: ResultReference,
  lineSource: z.enum(['claude', 'canned']).optional(),
})
export type LastResult = z.infer<typeof LastResult>

export const Stored = z.object({
  v: z.literal(2),
  deviceId: z.string().min(8).max(64), // random UUID; rate-limit and board key, not an account
  nickname: z.string().min(3).max(40), // generated, or typed on Landing; the server cleans it before showing it
  shareToRoom: z.boolean(), // off until the person turns it on
  aiCommentary: z.boolean(), // whether the ticket line may be requested from Claude
  bedtimeMinutes: z.number().int().min(0).max(1439).optional(), // minutes after local midnight
  baseline: Baseline.optional(), // personal only: the example reference is never stored here
  drinks: z.array(Drink),
  lastResult: LastResult.optional(),
})
export type Stored = z.infer<typeof Stored>

// ---------- schema v1, read only for migration ----------

export const LegacyDrinkKind = z.enum(['coffee', 'energy', 'beer', 'wine', 'spirit'])
export const LegacyDrink = z.object({ kind: LegacyDrinkKind, at: z.number().int() })
export type LegacyDrink = z.infer<typeof LegacyDrink>

export const StoredV1 = z.object({
  v: z.literal(1),
  deviceId: z.string().min(8).max(64),
  nickname: z.string().min(3).max(40),
  shareToRoom: z.boolean(),
  baseline: z.object({ run: RunResult, clean: z.boolean() }).optional(),
  drinks: z.array(LegacyDrink),
  lastResult: z
    .object({ run: RunResult, assessment: Assessment, line: z.string(), mode: Mode })
    .optional(),
})
export type StoredV1 = z.infer<typeof StoredV1>

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
  // A closed enum like the rest. `example` tells the bird the comparison was with fixed example
  // numbers, so it does not tease a handicap nobody chose or call them the person's normal.
  reference: ReferenceKind.optional(),
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

// Takes this device's entry off the board and out of the live list. The answer is the same whether
// or not an entry existed, so the route cannot be used to test which device IDs are present.
export const RoomWithdrawRequest = z.object({
  deviceId: z.string().min(8).max(64),
})
export type RoomWithdrawRequest = z.infer<typeof RoomWithdrawRequest>

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
