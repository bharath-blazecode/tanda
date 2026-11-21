// CARD 9, "Room board". The projector polls GET /api/room every 2 seconds (D13).
// What reaches the board: a generated nickname, the verdict, the score and the mode. Never drinks (D23).
import { createHash, timingSafeEqual } from 'node:crypto'
import { Hono } from 'hono'
import { RoomResultRequest } from '../shared/contracts'
import { isValidNickname } from '../shared/nicknames'
import { clientIp } from './client-ip'
import type { Config } from './config'
import { createRoomStore, type RoomStore } from './state'

export type RoomRouteOptions = {
  now?: () => number
  postsPerMinute?: number
}

const WINDOW_MS = 60_000
export const DEFAULT_POSTS_PER_MINUTE = 600
// Past this many tracked clients, expired windows are swept so the limiter cannot grow without bound.
const SWEEP_AT = 5_000

// Hashing first gives equal-length buffers, which timingSafeEqual requires, without leaking the length.
function sameToken(given: string, expected: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(given), digest(expected))
}

export { clientIp }

// Fixed one-minute window per IP. Crude, but enough to stop one script from flooding the board.
// The default is wide because a whole auditorium may share one venue IP; the store keeps one entry
// per device, which is what really stops a flood from filling the board.
function createLimiter(limit: number) {
  const windows = new Map<string, { start: number; count: number }>()
  return (key: string, now: number): boolean => {
    if (windows.size > SWEEP_AT) {
      for (const [k, w] of windows) if (now - w.start >= WINDOW_MS) windows.delete(k)
    }
    const current = windows.get(key)
    if (!current || now - current.start >= WINDOW_MS) {
      windows.set(key, { start: now, count: 1 })
      return true
    }
    current.count++
    return current.count <= limit
  }
}

export function roomRoutes(
  config: Config,
  store: RoomStore = createRoomStore(),
  { now = Date.now, postsPerMinute = DEFAULT_POSTS_PER_MINUTE }: RoomRouteOptions = {},
) {
  const routes = new Hono()
  const allow = createLimiter(postsPerMinute)

  routes.post('/room/result', async (c) => {
    if (!allow(clientIp((name) => c.req.header(name)), now())) {
      return c.json({ error: 'rate_limited' }, 429)
    }
    const parsed = RoomResultRequest.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success || !isValidNickname(parsed.data.nickname)) {
      return c.json({ error: 'bad_request' }, 400)
    }
    // The deviceId is only the key for one-entry-per-device; it is never stored in an entry.
    const { deviceId, ...entry } = parsed.data
    store.add({ ...entry, at: now() }, deviceId)
    return c.body(null, 204)
  })

  routes.get('/room', (c) => c.json(store.snapshot(now())))

  routes.post('/room/reset', (c) => {
    const token = c.req.header('x-admin-token')
    if (!config.roomAdminToken || !token || !sameToken(token, config.roomAdminToken)) {
      return c.json({ error: 'forbidden' }, 403)
    }
    store.reset()
    return c.body(null, 204)
  })

  return routes
}
