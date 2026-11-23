// A durable copy of the room board, so a restart or a deploy does not empty the projector.
// Memory stays the source of truth: reads never touch the mirror, writes go to it without being
// awaited, except deletion and reset, which require confirmation. No mirror means memory only, as before.
import { RoomEntry } from '../shared/contracts'
import type { Config } from './config'
import { createRedisMirror } from './redis'
import { namePolicy, type NamePolicy } from './room-names'
import {
  createRoomStore,
  DEFAULT_MAX_AGE_MS,
  DEFAULT_MAX_ENTRIES,
  MAX_FUTURE_MS,
  type RoomStore,
  type RoomStoreOptions,
} from './state'

export const HYDRATE_TIMEOUT_MS = 2_000
export const SYNC_INTERVAL_MS = 15_000
export const CALL_TIMEOUT_MS = 1_500
const LOG_EVERY_MS = 60_000

// Field = deviceId, value = JSON of a RoomEntry. Values are raw strings so junk can be caught here.
export type RoomMirror = {
  readAll(maxFields: number): Promise<Record<string, string>>
  write(deviceId: string, value: string): Promise<void>
  remove(deviceIds: string[]): Promise<void>
  clear(): Promise<void>
  close(): Promise<void>
}

// Names and counts only: never the URL, never an error message.
export type MirrorLogLine = { msg: string; reason?: string; entries?: number }
export type MirrorLog = (line: MirrorLogLine) => void

const defaultLog: MirrorLog = (line) => console.warn(JSON.stringify(line))

// A short, fixed token: error messages can carry hosts or more, so they are never logged.
export function errorReason(err: unknown): string {
  const raw =
    err && typeof err === 'object'
      ? (('code' in err && typeof err.code === 'string' && err.code) ||
        ('name' in err && typeof err.name === 'string' && err.name) ||
        'error')
      : 'error'
  return /^[A-Za-z0-9_]{1,40}$/.test(raw) ? raw : 'error'
}

// Settles within `ms` whatever the work does, including throwing synchronously or never resolving.
export function withTimeout<T>(work: () => Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Object.assign(new Error('mirror timeout'), { name: 'MirrorTimeout' })),
      ms,
    )
    timer.unref?.()
    let pending: Promise<T>
    try {
      pending = Promise.resolve(work())
    } catch (err) {
      pending = Promise.reject(err)
    }
    pending.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

// Keeps what parses as a RoomEntry under a plausible deviceId; everything else is junk to drop.
export function parseMirrored(raw: unknown): { pairs: Array<[string, RoomEntry]>; junk: string[] } {
  const pairs: Array<[string, RoomEntry]> = []
  const junk: string[] = []
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { pairs, junk }
  for (const [deviceId, value] of Object.entries(raw)) {
    let parsed: unknown
    try {
      parsed = typeof value === 'string' && value.length <= 1024 ? JSON.parse(value) : undefined
    } catch {
      parsed = undefined
    }
    const entry = RoomEntry.safeParse(parsed)
    if (entry.success && deviceId.length >= 8 && deviceId.length <= 64) pairs.push([deviceId, entry.data])
    else junk.push(deviceId)
  }
  return { pairs, junk }
}

export type MirroredRoomOptions = {
  storeOptions?: Omit<RoomStoreOptions, 'onEvict'>
  now?: () => number
  log?: MirrorLog
  callTimeoutMs?: number
  // The same name rule as live requests; defaults to typed names.
  names?: NamePolicy
}

export type MirroredRoom = {
  store: RoomStore
  hydrate(timeoutMs?: number): Promise<number>
  sync(): Promise<number>
  startSync(intervalMs?: number): () => void
  report(err: unknown): void
  errors(): number
}

export function createMirroredRoom(
  mirror: RoomMirror,
  {
    storeOptions = {},
    now = Date.now,
    log = defaultLog,
    callTimeoutMs = CALL_TIMEOUT_MS,
    names = namePolicy('typed'),
  }: MirroredRoomOptions = {},
): MirroredRoom {
  const maxAgeMs = storeOptions.maxAgeMs ?? DEFAULT_MAX_AGE_MS
  // The store never holds more than maxEntries, so a hash far past that was not written by us.
  const maxFields = 2 * (storeOptions.maxEntries ?? DEFAULT_MAX_ENTRIES)
  let errorCount = 0
  let lastLog = -Infinity
  // Bumped on reset, so a read that started before a reset cannot bring the old board back.
  let generation = 0
  // Hide unconfirmed withdrawals until a durable delete or an explicit new local share.
  // The expiry includes clock skew allowed on hydrated rows.
  const withdrawn = new Map<string, { until: number }>()
  let suspendUntil = 0
  let resetPending: symbol | undefined
  const MAX_WITHDRAWN = 5_000

  const report = (err: unknown) => {
    errorCount++
    const at = now()
    if (at - lastLog < LOG_EVERY_MS) return
    lastLog = at
    try {
      log({ msg: 'room mirror unavailable', reason: errorReason(err) })
    } catch {
      // logging must not throw either
    }
  }

  // Fire and forget: the caller never waits and never sees an error.
  const fire = (work: () => Promise<void>) => {
    withTimeout(work, callTimeoutMs).catch(report)
  }

  const inner = createRoomStore({ ...storeOptions, onEvict: (ids) => fire(() => mirror.remove(ids)) })

  const pull = async (timeoutMs: number): Promise<number> => {
    if (resetPending || now() < suspendUntil) return 0
    const started = generation
    try {
      const raw = await withTimeout(() => mirror.readAll(maxFields), timeoutMs)
      if (started !== generation) return 0
      if (raw && typeof raw === 'object' && Object.keys(raw).length > maxFields) {
        report(Object.assign(new Error('mirror too large'), { name: 'MirrorTooLarge' }))
        return 0
      }
      const at = now()
      const { pairs, junk } = parseMirrored(raw)
      // Redis is not trusted more than a request: the live name rule applies, and a planted entry
      // with an unusable name or a time far ahead is dropped here and removed from the mirror.
      const kept: Array<[string, RoomEntry]> = []
      const drop = [...junk]
      for (const [deviceId, entry] of pairs) {
        const nickname = names(entry.nickname, deviceId)
        const gone = withdrawn.get(deviceId)
        if (gone && at <= gone.until) drop.push(deviceId)
        else if (nickname === null || at - entry.at > maxAgeMs || entry.at - at > MAX_FUTURE_MS) drop.push(deviceId)
        else kept.push([deviceId, { ...entry, nickname }])
      }
      if (drop.length > 0) fire(() => mirror.remove(drop))
      return inner.merge(kept, at)
    } catch (err) {
      report(err)
      return 0
    }
  }

  const store: RoomStore = {
    add(entry, deviceId) {
      generation++
      withdrawn.delete(deviceId)
      inner.add(entry, deviceId)
      // Only the RoomEntry fields go to Redis; zod strips anything else, deviceId included.
      const clean = RoomEntry.safeParse(entry)
      if (clean.success) fire(() => mirror.write(deviceId, JSON.stringify(clean.data)))
    },
    snapshot: (at) => inner.snapshot(at),
    async reset() {
      inner.reset()
      generation++
      const reset = Symbol()
      resetPending = reset
      withdrawn.clear()
      try {
        await withTimeout(() => mirror.clear(), callTimeoutMs)
        if (resetPending === reset) resetPending = undefined
      } catch (error) {
        report(error)
        throw error
      }
    },
    async remove(deviceId, at) {
      const had = inner.remove(deviceId, at)
      generation++
      const marker = { until: at + maxAgeMs + MAX_FUTURE_MS }
      withdrawn.delete(deviceId)
      withdrawn.set(deviceId, marker)
      for (const [id, previous] of withdrawn) {
        if (withdrawn.size <= MAX_WITHDRAWN && at <= previous.until) break
        // If unresolved deletes fill the table, memory stays available while pulls
        // pause until even the evicted withdrawal's old row must have expired.
        if (at <= previous.until) suspendUntil = Math.max(suspendUntil, previous.until + 1)
        withdrawn.delete(id)
      }
      try {
        await withTimeout(() => mirror.remove([deviceId]), callTimeoutMs)
        generation++
        if (withdrawn.get(deviceId) === marker) withdrawn.delete(deviceId)
      } catch (error) {
        report(error)
        throw error
      }
      return had
    },
    merge: (pairs, at) => inner.merge(pairs, at),
  }

  let syncing = false
  const sync = async () => {
    if (syncing) return 0
    syncing = true
    try {
      return await pull(callTimeoutMs)
    } finally {
      syncing = false
    }
  }

  return {
    store,
    hydrate: (timeoutMs = HYDRATE_TIMEOUT_MS) => pull(timeoutMs),
    sync,
    startSync(intervalMs = SYNC_INTERVAL_MS) {
      const timer = setInterval(() => void sync(), intervalMs)
      // Never keep the process alive just to sync.
      timer.unref?.()
      return () => clearInterval(timer)
    },
    report,
    errors: () => errorCount,
  }
}

export type PreparedRoom = { store: RoomStore; close(): Promise<void> }

export type PrepareRoomOptions = {
  createMirror?: (url: string, onError: (err: unknown) => void) => RoomMirror
  log?: MirrorLog
  hydrateTimeoutMs?: number
  syncIntervalMs?: number
}

// Boot wiring: memory only without REDIS_URL; otherwise hydrate (capped) and start the periodic merge.
// Never rejects, so a bad Redis can only cost the boot its hydrate timeout.
export async function prepareRoom(
  config: Pick<Config, 'redisUrl'> & Partial<Pick<Config, 'roomNames'>>,
  {
    createMirror = createRedisMirror,
    log = defaultLog,
    hydrateTimeoutMs = HYDRATE_TIMEOUT_MS,
    syncIntervalMs = SYNC_INTERVAL_MS,
  }: PrepareRoomOptions = {},
): Promise<PreparedRoom> {
  const memoryOnly = (): PreparedRoom => ({ store: createRoomStore(), close: async () => {} })
  if (!config.redisUrl) return memoryOnly()

  let room: MirroredRoom | undefined
  let mirror: RoomMirror
  try {
    mirror = createMirror(config.redisUrl, (err) => room?.report(err))
  } catch (err) {
    log({ msg: 'room mirror disabled', reason: errorReason(err) })
    const fallback = memoryOnly()
    const local = fallback.store
    const unconfirmed = () => { throw new Error('Room mirror unavailable') }
    return { ...fallback, store: {
      ...local,
      async remove(id, at) { local.remove(id, at); return unconfirmed() },
      async reset() { local.reset(); return unconfirmed() },
    } }
  }
  room = createMirroredRoom(mirror, { log, names: namePolicy(config.roomNames ?? 'typed') })
  const loaded = await room.hydrate(hydrateTimeoutMs)
  log({ msg: 'room mirror hydrated', entries: loaded })
  const stopSync = room.startSync(syncIntervalMs)
  return {
    store: room.store,
    async close() {
      stopSync()
      await withTimeout(() => mirror.close(), 1_000).catch(() => undefined)
    },
  }
}
