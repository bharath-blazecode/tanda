import { afterEach, expect, it, vi } from 'vitest'
import { postRoomPresence, postRoomResult, withdrawFromRoom } from './room'

afterEach(() => vi.unstubAllGlobals())

it('submits a withdrawal after both earlier reports from this document finish', async () => {
  const finish: Array<(r: Response) => void> = []
  const fetch = vi.fn((url: string) => url.endsWith('withdraw') ? Promise.resolve(new Response(null, { status: 204 })) :
    new Promise<Response>(resolve => finish.push(resolve)))
  vi.stubGlobal('fetch', fetch)
  const deviceId = 'local-test-device'
  const nickname = 'Quiet Heron'
  const beat = postRoomPresence({ deviceId, nickname, stage: 'idle' })
  const post = postRoomResult({ deviceId, nickname, score: 70, mode: 'demo', verdict: 'steady' })
  const removal = withdrawFromRoom(deviceId)
  finish[1](new Response(null, { status: 204 }))
  await post
  expect(fetch).toHaveBeenCalledTimes(2)
  finish[0](new Response(null, { status: 503 }))
  await beat
  expect(await removal).toBe(true)
  expect(fetch.mock.calls.map(([url]) => url)).toEqual(['/api/room/presence', '/api/room/result', '/api/room/withdraw'])
})
