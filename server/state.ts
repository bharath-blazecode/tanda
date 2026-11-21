// CARD 9, "Room board". In-memory state for the room. This file is a stub.
// There is no database on purpose (D6): a redeploy empties the board, and it refills in seconds.
import type { RoomEntry, RoomState } from '../shared/contracts'

export type RoomStore = {
  add(entry: RoomEntry, deviceId: string): void
  snapshot(now: number): RoomState
  reset(): void
}

export function createRoomStore(): RoomStore {
  return {
    add() {
      // Stub: card 9 stores the entry and keeps one entry per device.
    },
    snapshot(now) {
      return {
        total: 0,
        mix: { steady: 0, wired: 0, tipsy: 0, wobbly: 0 },
        feed: [],
        top: { real: [], demo: [] },
        updatedAt: now,
      }
    },
    reset() {},
  }
}
