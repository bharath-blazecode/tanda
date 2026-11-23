// CARD 9 owns this file. The room board client. Failures are silent: no error screens for the network.
import {
  RoomState,
  type RoomPresenceRequest,
  type RoomResultRequest,
  type RoomWithdrawRequest,
} from '../../shared/contracts'

// A withdrawal from this document follows reports it already sent. Each write has a
// deadline so an unavailable network cannot leave the removal button waiting indefinitely.
const pendingReports = new Set<Promise<boolean>>()

async function postJson(path: string, body: RoomResultRequest | RoomPresenceRequest | RoomWithdrawRequest, timeoutMs: number) {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
    return res.status === 204
  } catch {
    return false
  }
}

async function report(path: string, body: RoomResultRequest | RoomPresenceRequest) {
  const pending = postJson(path, body, 4000)
  pendingReports.add(pending)
  try { return await pending } finally { pendingReports.delete(pending) }
}

export function postRoomResult(body: RoomResultRequest) {
  return report('/api/room/result', body)
}

export function postRoomPresence(body: RoomPresenceRequest) {
  return report('/api/room/presence', body)
}

/**
 * Takes this device off the board and out of the live list. Resolves true only when the server
 * confirmed it; the caller says so honestly when it could not be reached.
 */
export async function withdrawFromRoom(deviceId: string, timeoutMs = 4000): Promise<boolean> {
  await Promise.all([...pendingReports])
  return postJson('/api/room/withdraw', { deviceId }, timeoutMs)
}

export async function fetchRoom(): Promise<RoomState | null> {
  try {
    const res = await fetch('/api/room', { cache: 'no-store', signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const parsed = RoomState.safeParse(await res.json())
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
