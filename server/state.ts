// CARD 9, "Room board". In-memory state for the room.
// There is no database on purpose (D6): a redeploy empties the board, and it refills in seconds.
import type { RoomEntry, RoomState } from '../shared/contracts'

export type RoomStore = {
  add(entry: RoomEntry, deviceId: string): void
  snapshot(now: number): RoomState
  reset(): void
}

export type RoomStoreOptions = {
  maxEntries?: number
  maxAgeMs?: number
}

export const FEED_SIZE = 12
export const TOP_SIZE = 5
export const DEFAULT_MAX_ENTRIES = 2000
export const DEFAULT_MAX_AGE_MS = 12 * 60 * 60 * 1000

// `seq` orders entries that share a timestamp, so "most recent first" is stable.
type Stored = { entry: RoomEntry; seq: number }

const newestFirst = (a: Stored, b: Stored) => b.entry.at - a.entry.at || b.seq - a.seq

export function createRoomStore({
  maxEntries = DEFAULT_MAX_ENTRIES,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
}: RoomStoreOptions = {}): RoomStore {
  // Keyed by device so tallies count people, not runs. Map order is insertion order,
  // and a replaced entry is re-inserted, so the first key is always the oldest.
  const byDevice = new Map<string, Stored>()
  let seq = 0
  let lastChange: number | null = null

  return {
    add(entry, deviceId) {
      byDevice.delete(deviceId)
      byDevice.set(deviceId, { entry: { ...entry }, seq: seq++ })
      while (byDevice.size > maxEntries) {
        const oldest = byDevice.keys().next().value
        if (oldest === undefined) break
        byDevice.delete(oldest)
      }
      lastChange = entry.at
    },

    snapshot(now) {
      for (const [deviceId, stored] of byDevice) {
        if (now - stored.entry.at > maxAgeMs) {
          byDevice.delete(deviceId)
          lastChange = now
        }
      }

      const all = [...byDevice.values()]
      const mix = { steady: 0, wired: 0, tipsy: 0, wobbly: 0 }
      for (const { entry } of all) mix[entry.verdict]++

      // Real readings rank steadiest first; never by drift, which would reward drinking (D22).
      const real = all
        .filter((s) => s.entry.mode === 'real')
        .sort((a, b) => b.entry.score - a.entry.score || newestFirst(a, b))
      const demo = all
        .filter((s) => s.entry.mode === 'demo')
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
  }
}
