// CARD 9 owns this file. The room board client. Failures are silent: no error screens for the network.
import { RoomState, type RoomPresenceRequest, type RoomResultRequest } from '../../shared/contracts'

export async function postRoomResult(body: RoomResultRequest): Promise<void> {
  try {
    await fetch('/api/room/result', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    // A failed post is dropped.
  }
}

// The "I am here, doing this" heartbeat. A missed one only means the board catches up 15 s later.
export async function postRoomPresence(body: RoomPresenceRequest): Promise<void> {
  try {
    await fetch('/api/room/presence', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    // Dropped.
  }
}

export async function fetchRoom(): Promise<RoomState | null> {
  try {
    const res = await fetch('/api/room')
    if (!res.ok) return null
    const parsed = RoomState.safeParse(await res.json())
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
