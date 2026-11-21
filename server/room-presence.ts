// Who is in the lab right now, for the projector. A heartbeat store: memory only and never mirrored
// to Redis, because a restart losing 45 seconds of presence costs nothing. Time comes in as an argument.
import type { RoomLive, RoomStage } from '../shared/contracts'

export const PRESENCE_TTL_MS = 45_000
export const MAX_PRESENT = 1_000
export const LIVE_SIZE = 30

export type PresenceSnapshot = { liveCount: number; live: RoomLive[] }

export type PresenceStore = {
  // `nickname` is already the board name; this store never sees raw input.
  beat(deviceId: string, nickname: string, stage: RoomStage, now: number): void
  snapshot(now: number): PresenceSnapshot
  reset(): void
}

export type PresenceOptions = { ttlMs?: number; maxDevices?: number; liveSize?: number }

type Present = { nickname: string; stage: RoomStage; changedAt: number; seenAt: number; seq: number }

export function createPresenceStore({
  ttlMs = PRESENCE_TTL_MS,
  maxDevices = MAX_PRESENT,
  liveSize = LIVE_SIZE,
}: PresenceOptions = {}): PresenceStore {
  // Re-inserted on every beat, so Map order is "least recently seen first": expiry and the cap
  // both only ever look at the front.
  const byDevice = new Map<string, Present>()
  let seq = 0

  const expire = (now: number) => {
    for (const [deviceId, p] of byDevice) {
      if (now - p.seenAt <= ttlMs) break
      byDevice.delete(deviceId)
    }
  }

  return {
    beat(deviceId, nickname, stage, now) {
      expire(now)
      const current = byDevice.get(deviceId)
      byDevice.delete(deviceId)
      const changed = !current || current.stage !== stage || current.nickname !== nickname
      byDevice.set(deviceId, {
        nickname,
        stage,
        // A plain heartbeat keeps its place in the list; only a change moves it to the top.
        changedAt: changed ? now : current.changedAt,
        seq: changed ? seq++ : current.seq,
        seenAt: now,
      })
      while (byDevice.size > maxDevices) {
        const oldest = byDevice.keys().next().value
        if (oldest === undefined) break
        byDevice.delete(oldest)
      }
    },

    snapshot(now) {
      expire(now)
      const live = [...byDevice.values()]
        .sort((a, b) => b.changedAt - a.changedAt || b.seq - a.seq)
        .slice(0, liveSize)
        // Built field by field: the deviceId is the key and never leaves this store.
        .map((p) => ({ nickname: p.nickname, stage: p.stage, at: p.changedAt }))
      return { liveCount: byDevice.size, live }
    },

    reset() {
      byDevice.clear()
    },
  }
}
