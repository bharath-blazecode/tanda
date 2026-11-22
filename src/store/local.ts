// The only file that touches localStorage. What is stored here stays in this browser; what leaves
// the phone, and when, is listed on the Privacy screen and in docs/portfolio/THREAT-MODEL.md.
//
// Schema v2 lives under bc:v2. A v1 record under bc:v1 is migrated once and then left exactly as it
// was, so rolling the app back to a v1 build finds its own data intact instead of a record it would
// reject and wipe. Start over removes both.
//
// Validation is field by field: a bad drink costs that drink, not the baseline and the whole log.
import type { z } from 'zod'
import {
  Baseline,
  Drink,
  LastResult,
  LegacyDrink,
  Stored,
  StoredV1,
  type ResultReference,
} from '../../shared/contracts'
import { generateNickname } from '../../shared/nicknames'
import { DEFAULT_CAFFEINE_MG } from '../engine/serving'

export const KEY = 'bc:v2'
export const LEGACY_KEY = 'bc:v1'

/** v1 marked its stock normal by a reading taken at the epoch, which no real reading ever was. */
const V1_STOCK_AT = 0

type KeyValue = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const browserStorage = (): KeyValue => globalThis.localStorage

// When the browser refuses to store anything (private mode, a full disk), the session keeps one
// record in memory instead of minting a new name and device ID on every read.
const memory = new WeakMap<object, string>()

/** A random ID. `randomUUID` only exists in a secure context, so plain http gets the fallback. */
export function newId(): string {
  const c = globalThis.crypto
  if (typeof c?.randomUUID === 'function') return c.randomUUID()
  const bytes = new Uint8Array(16)
  c.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function fresh(): Stored {
  return {
    v: 2,
    deviceId: newId(),
    nickname: generateNickname(),
    // Off until the person turns it on. A stored false here is only honest because no screen
    // turns it on without asking (D23).
    shareToRoom: false,
    aiCommentary: true,
    drinks: [],
  }
}

export type Parsed = { value: Stored; dropped: string[] }

function field<T>(schema: z.ZodType<T>, value: unknown, name: string, dropped: string[]): T | undefined {
  if (value === undefined) return undefined
  const parsed = schema.safeParse(value)
  if (parsed.success) return parsed.data
  dropped.push(name)
  return undefined
}

function list<T>(schema: z.ZodType<T>, value: unknown, name: string, dropped: string[]): T[] {
  if (!Array.isArray(value)) {
    if (value !== undefined) dropped.push(name)
    return []
  }
  const out: T[] = []
  value.forEach((item, i) => {
    const parsed = schema.safeParse(item)
    if (parsed.success) out.push(parsed.data)
    else dropped.push(`${name}[${i}]`)
  })
  return out
}

/** Reads a v2 record, keeping every field that validates. Null if it is not a v2 record at all. */
export function parseStored(raw: unknown): Parsed | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  if (r.v !== 2) return null
  const dropped: string[] = []
  const base = fresh()
  const shape = Stored.shape
  const value: Stored = {
    v: 2,
    deviceId: field(shape.deviceId, r.deviceId, 'deviceId', dropped) ?? base.deviceId,
    nickname: field(shape.nickname, r.nickname, 'nickname', dropped) ?? base.nickname,
    shareToRoom: field(shape.shareToRoom, r.shareToRoom, 'shareToRoom', dropped) ?? false,
    aiCommentary: field(shape.aiCommentary, r.aiCommentary, 'aiCommentary', dropped) ?? true,
    drinks: list(Drink, r.drinks, 'drinks', dropped),
  }
  const bedtime = field(shape.bedtimeMinutes, r.bedtimeMinutes, 'bedtimeMinutes', dropped)
  if (bedtime !== undefined) value.bedtimeMinutes = bedtime
  const baseline = field(Baseline, r.baseline, 'baseline', dropped)
  if (baseline) value.baseline = baseline
  const last = field(LastResult, r.lastResult, 'lastResult', dropped)
  if (last) value.lastResult = last
  return { value, dropped }
}

export type Migrated = Parsed & { exampleBaselineRemoved: boolean }

/**
 * v1 to v2. What changes, and why:
 * - The stock normal stops pretending to be a baseline. A v1 baseline taken "at the epoch" was the
 *   quick demo's fixed numbers, so it is not carried into `baseline`; a ticket made against it keeps
 *   it as its `example` reference.
 * - Every drink gets an ID and `legacy: true`. Coffee and energy drinks keep the v1 default dose,
 *   now written down as the app's assumption. Alcohol counts stay counts: v1 never knew volume or
 *   strength, so they are never turned into standard drinks.
 * - Room sharing restarts off. In v1 both landing keys turned it on without asking, so a stored
 *   true was not a choice anyone made.
 */
export function migrateV1(raw: unknown): Migrated | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  if (r.v !== 1) return null
  const dropped: string[] = []
  const base = fresh()
  const shape = StoredV1.shape

  const legacyDrinks = list(LegacyDrink, r.drinks, 'drinks', dropped)
  const drinks: Drink[] = legacyDrinks.map((d, i) => {
    const mg = DEFAULT_CAFFEINE_MG[d.kind]
    return {
      id: `v1-${d.at}-${i}`,
      kind: d.kind,
      at: d.at,
      legacy: true,
      ...(mg === undefined ? {} : { caffeine: { basis: 'serving' as const, mg, source: 'default' as const } }),
    }
  })

  const v1Baseline = field(shape.baseline, r.baseline, 'baseline', dropped)
  const wasStock = v1Baseline !== undefined && v1Baseline.run.at === V1_STOCK_AT

  const value: Stored = {
    v: 2,
    deviceId: field(shape.deviceId, r.deviceId, 'deviceId', dropped) ?? base.deviceId,
    nickname: field(shape.nickname, r.nickname, 'nickname', dropped) ?? base.nickname,
    shareToRoom: false,
    aiCommentary: true,
    drinks,
  }
  if (v1Baseline && !wasStock) value.baseline = { run: v1Baseline.run, clean: v1Baseline.clean }

  const v1Last = field(shape.lastResult, r.lastResult, 'lastResult', dropped)
  if (v1Last) {
    if (v1Baseline) {
      const reference: ResultReference = {
        kind: wasStock ? 'example' : 'personal',
        run: v1Baseline.run,
        clean: v1Baseline.clean,
      }
      value.lastResult = { ...v1Last, reference }
    } else {
      // A v1 ticket always had a baseline beside it; without one there is nothing to print it against.
      dropped.push('lastResult')
    }
  }
  return { value, dropped, exampleBaselineRemoved: wasStock }
}

function read(storage: KeyValue, key: string): unknown {
  let text: string | null = null
  try {
    text = storage.getItem(key)
  } catch {
    text = null
  }
  if (text === null && key === KEY) text = memory.get(storage) ?? null
  if (text === null) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/** Returns what is stored, migrating v1 once if that is all there is, or a fresh record. */
export function load(storage: KeyValue = browserStorage()): Stored {
  const current = parseStored(read(storage, KEY))
  if (current) {
    if (current.dropped.length > 0) save(current.value, storage)
    return current.value
  }
  const migrated = migrateV1(read(storage, LEGACY_KEY))
  if (migrated) {
    // bc:v1 is deliberately left in place: it is the rollback copy.
    save(migrated.value, storage)
    return migrated.value
  }
  const value = fresh()
  save(value, storage)
  return value
}

export function save(value: Stored, storage: KeyValue = browserStorage()): void {
  const text = JSON.stringify(value)
  try {
    storage.setItem(KEY, text)
    memory.delete(storage)
  } catch {
    // Private mode or a full disk: keep this session's copy in memory.
    memory.set(storage, text)
  }
}

export function update(change: (current: Stored) => Stored, storage: KeyValue = browserStorage()): Stored {
  const next = change(load(storage))
  save(next, storage)
  return next
}

/**
 * Deletes everything this app keeps in this browser: the v2 record and the v1 rollback copy.
 * It does not reach the server. Callers withdraw the room entry first (src/api/room.ts).
 */
export function reset(storage: KeyValue = browserStorage()): void {
  memory.delete(storage)
  for (const key of [KEY, LEGACY_KEY]) {
    try {
      storage.removeItem(key)
    } catch {
      // Nothing to clear.
    }
  }
}
