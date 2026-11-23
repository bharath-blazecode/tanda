// Start over, done in the right order: ask the server to take this device off the room screen
// first, while the device ID still exists, then clear this browser. Once the ID is gone the board
// entry could no longer be addressed by anyone, including its owner.
import { withdrawFromRoom } from '../../api/room'
import { load, setRoomSharing, reset } from '../../store/local'

export type EraseOutcome = { roomWithdrawn: boolean; cleared: boolean; error?: string }

export async function eraseEverything(deviceId: string): Promise<EraseOutcome> {
  setRoomSharing(false)
  // Always asked, even with sharing off now: it may have been on earlier. The answer is the same
  // whether or not there was an entry.
  const roomWithdrawn = await withdrawFromRoom(deviceId)
  // Another tab can finish Start over while the network request is pending.
  // Never scrub a replacement identity or restore the old handle into its record.
  if (load().deviceId !== deviceId) {
    return { roomWithdrawn, cleared: false, error: 'This browser record changed during removal. Review it before starting over again.' }
  }
  return { roomWithdrawn, cleared: reset(undefined, roomWithdrawn ? undefined : deviceId) }
}
