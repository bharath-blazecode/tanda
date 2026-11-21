// CARD 9, "Room board". Routes are wired and validated; the store behind them is a stub.
// What reaches the board: a generated nickname, the verdict, the score and the mode. Never drinks (D23).
import { Hono } from 'hono'
import { RoomResultRequest } from '../shared/contracts'
import { isValidNickname } from '../shared/nicknames'
import type { Config } from './config'
import { createRoomStore, type RoomStore } from './state'

export function roomRoutes(config: Config, store: RoomStore = createRoomStore()) {
  const routes = new Hono()

  routes.post('/room/result', async (c) => {
    const parsed = RoomResultRequest.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success || !isValidNickname(parsed.data.nickname)) {
      return c.json({ error: 'bad_request' }, 400)
    }
    const { deviceId, ...entry } = parsed.data
    store.add({ ...entry, at: Date.now() }, deviceId)
    return c.body(null, 204)
  })

  routes.get('/room', (c) => c.json(store.snapshot(Date.now())))

  routes.post('/room/reset', (c) => {
    const token = c.req.header('x-admin-token')
    if (!config.roomAdminToken || token !== config.roomAdminToken) {
      return c.json({ error: 'forbidden' }, 403)
    }
    store.reset()
    return c.body(null, 204)
  })

  return routes
}
