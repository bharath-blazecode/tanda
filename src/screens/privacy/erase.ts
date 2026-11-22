// Start over, done in the right order: ask the server to take this device off the room screen
// first, while the device ID still exists, then clear this browser. Once the ID is gone the board
// entry could no longer be addressed by anyone, including its owner.
import { withdrawFromRoom } from '../../api/room'
import { load, reset } from '../../store/local'

export type EraseOutcome = { roomWithdrawn: boolean }

export async function eraseEverything(): Promise<EraseOutcome> {
  const { deviceId } = load()
  // Always asked, even with sharing off now: it may have been on earlier. The answer is the same
  // whether or not there was an entry.
  const roomWithdrawn = await withdrawFromRoom(deviceId)
  reset()
  return { roomWithdrawn }
}
