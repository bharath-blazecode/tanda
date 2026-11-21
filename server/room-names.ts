// The one rule for which name the room board shows, used by live requests and by entries loaded back
// from Redis alike, so a planted mirror entry cannot show what a live request could not.
import { RoomResultRequest } from '../shared/contracts'
import { boardName, deviceNickname } from '../shared/nicknames'
import type { RoomNameMode } from './config'

// The same bound a live request must pass (1 to 40 characters) before any cleaning.
const RawName = RoomResultRequest.shape.nickname

export type NamePolicy = (raw: unknown, deviceId: string) => string | null

/** Returns the board name for a device, or null when the raw name is not one a live request may send. */
export function namePolicy(mode: RoomNameMode): NamePolicy {
  return (raw, deviceId) => {
    const parsed = RawName.safeParse(raw)
    if (!parsed.success) return null
    return mode === 'generated' ? deviceNickname(deviceId) : boardName(parsed.data, deviceId)
  }
}
