// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { load, reset, update } from '../../store/local'
import { eraseEverything } from './erase'

afterEach(() => { vi.unstubAllGlobals(); reset() })

it('keeps a replacement record if another tab completes Start over during withdrawal', async () => {
  let reply!: (r: Response) => void
  vi.stubGlobal('fetch', () => new Promise(resolve => { reply = resolve }))
  const old = load().deviceId
  const erasing = eraseEverything(old)
  await vi.waitFor(() => expect(reply).toBeTypeOf('function'))
  reset()
  const replacement = update(s => ({ ...s, nickname: 'New Heron' }))
  reply(new Response(null, { status: 503 }))
  expect(await erasing).toMatchObject({ roomWithdrawn: false, cleared: false })
  expect(load()).toMatchObject({ deviceId: replacement.deviceId, nickname: 'New Heron' })
})
