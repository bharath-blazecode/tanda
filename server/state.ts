// CARD 9, "Room board". In-memory state for the room.
// Memory is the source of truth for every read (D6). An optional Redis mirror (server/room-mirror.ts)
// copies it so a restart or deploy can refill the board; without one, a redeploy empties it.
import type { RoomEntry, RoomState } from '../shared/contracts'

export type RoomStore = {
  add(entry: RoomEntry, deviceId: string): void
  snapshot(now: number): RoomState
  reset(): void
  // Folds in entries from elsewhere (the mirror). Newer `at` wins; returns how many changed.
  merge(pairs: Iterable<readonly [deviceId: string, entry: RoomEntry]>, now: number): number
}

export type RoomStoreOptions = {
  maxEntries?: number
  maxAgeMs?: number
  // Told which devices were dropped by the cap or by expiry, so a mirror can drop them too.
  onEvict?: (deviceIds: string[]) => void
}

export const FEED_SIZE = 12
export const TOP_SIZE = 5
export const DEFAULT_MAX_ENTRIES = 2000
export const DEFAULT_MAX_AGE_MS = 12 * 60 * 60 * 1000
// Clock skew between containers is seconds; an entry further ahead was planted, and would sit on top
// of the feed (and never expire) until its time came.
export const MAX_FUTURE_MS = 60_000

// `seq` orders entries that share a timestamp, so "most recent first" is stable.
type Stored = { entry: RoomEntry; seq: number }

const newestFirst = (a: Stored, b: Stored) => b.entry.at - a.entry.at || b.seq - a.seq

export function createRoomStore({
  maxEntries = DEFAULT_MAX_ENTRIES,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
  onEvict,
}: RoomStoreOptions = {}): RoomStore {
  // Keyed by device so tallies count people, not runs. Map order is insertion order,
  // and a replaced entry is re-inserted, so the first key is always the oldest.
  const byDevice = new Map<string, Stored>()
  let seq = 0
  let lastChange: number | null = null

  // A failing hook must never break the board.
  const evicted = (deviceIds: string[]) => {
    if (deviceIds.length === 0 || !onEvict) return
    try {
      onEvict(deviceIds)
    } catch {
      // best effort
    }
  }

  const trimToCap = () => {
    const dropped: string[] = []
    while (byDevice.size > maxEntries) {
      const oldest = byDevice.keys().next().value
      if (oldest === undefined) break
      byDevice.delete(oldest)
      dropped.push(oldest)
    }
    evicted(dropped)
  }

  return {
    add(entry, deviceId) {
      byDevice.delete(deviceId)
      byDevice.set(deviceId, { entry: { ...entry }, seq: seq++ })
      trimToCap()
      lastChange = entry.at
    },

    snapshot(now) {
      const expired: string[] = []
      for (const [deviceId, stored] of byDevice) {
        if (now - stored.entry.at > maxAgeMs) {
          byDevice.delete(deviceId)
          expired.push(deviceId)
          lastChange = now
        }
      }
      evicted(expired)

      const all = [...byDevice.values()]
      const mix = { steady: 0, wired: 0, tipsy: 0, wobbly: 0 }
      for (const { entry } of all) mix[entry.verdict]++

      // Real readings rank steadiest first; never by drift, which would reward drinking (D22).
      // Only Steady verdicts qualify: a Tipsy reading under "steadiest" would read as an all-clear.
      const real = all
        .filter((s) => s.entry.mode === 'real' && s.entry.verdict === 'steady')
        .sort((a, b) => b.entry.score - a.entry.score || newestFirst(a, b))
      // The demo list is for people the handicap actually moved, so Steady readings stay off it.
      const demo = all
        .filter((s) => s.entry.mode === 'demo' && s.entry.verdict !== 'steady')
        .sort((a, b) => a.entry.score - b.entry.score || newestFirst(a, b))
      const pick = (list: Stored[], size: number) => list.slice(0, size).map((s) => ({ ...s.entry }))

      return {
        total: all.length,
        mix,
        feed: pick(all.sort(newestFirst), FEED_SIZE),
        top: { real: pick(real, TOP_SIZE), demo: pick(demo, TOP_SIZE) },
        updatedAt: all.length === 0 || lastChange === null ? now : lastChange,
      }
    },

    reset() {
      byDevice.clear()
      lastChange = null
    },

    merge(pairs, now) {
      const incoming = [...pairs]
        .filter(([deviceId, entry]) => {
          if (now - entry.at > maxAgeMs || entry.at - now > MAX_FUTURE_MS) return false
          const current = byDevice.get(deviceId)
          // Ties keep what memory has: memory is the source of truth.
          return !current || entry.at > current.entry.at
        })
        .sort(([, a], [, b]) => a.at - b.at)
      if (incoming.length === 0) return 0
      for (const [deviceId, entry] of incoming) {
        byDevice.set(deviceId, { entry: { ...entry }, seq: seq++ })
      }
      // Rebuild in time order so the cap still drops the oldest entry first.
      const ordered = [...byDevice].sort(([, a], [, b]) => a.entry.at - b.entry.at || a.seq - b.seq)
      byDevice.clear()
      for (const [deviceId, stored] of ordered) byDevice.set(deviceId, stored)
      trimToCap()
      lastChange = now
      return incoming.length
    },
  }
}
