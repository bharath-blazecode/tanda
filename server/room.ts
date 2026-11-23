// CARD 9, "Room board". The projector polls GET /api/room every 1.5 seconds (D13).
// What reaches the board: a sanitised or generated nickname, the verdict, the score, the mode, and
// what each present phone is doing right now. Never drinks (D23).
import { createHash, timingSafeEqual } from 'node:crypto'
import { Hono } from 'hono'
import { RoomPresenceRequest, RoomResultRequest, RoomWithdrawRequest, type RoomState } from '../shared/contracts'
import { deviceNickname } from '../shared/nicknames'
import { requestClientIp } from './client-ip'
import type { Config } from './config'
import { namePolicy } from './room-names'
import { createPresenceStore, type PresenceStore } from './room-presence'
import { createRoomThrottle, type RoomThrottle } from './room-throttle'
import { createRoomStore, type RoomStore } from './state'

export type RoomRouteOptions = {
  now?: () => number
  postsPerMinute?: number
  presence?: PresenceStore
  heartbeatsPerMinute?: number
  throttle?: RoomThrottle
}

const WINDOW_MS = 60_000
export const DEFAULT_POSTS_PER_MINUTE = 600
// 200 phones on one venue IP beating every 15 s is 800 a minute; this leaves room for stage changes.
export const DEFAULT_HEARTBEATS_PER_MINUTE = 3_000
// Past this many tracked clients, expired windows are swept so the limiter cannot grow without bound.
const SWEEP_AT = 5_000

// Hashing first gives equal-length buffers, which timingSafeEqual requires, without leaking the length.
function sameToken(given: string, expected: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(given), digest(expected))
}

export { clientIp } from './client-ip'

// Fixed one-minute window per IP. Crude, but enough to stop one script from flooding the board.
// The default is wide because a whole auditorium may share one venue IP; the store keeps one entry
// per device, which is what really stops a flood from filling the board.
function createLimiter(limit: number) {
  const windows = new Map<string, { start: number; count: number }>()
  return (key: string, now: number): boolean => {
    // Buckets are ordered by window start. Release only expired entries; avoid
    // scanning the entire map for every request at capacity.
    for (const [oldest, window] of windows) {
      if (now - window.start < WINDOW_MS) break
      windows.delete(oldest)
    }
    const current = windows.get(key)
    if (!current || now - current.start >= WINDOW_MS) {
      if (windows.size >= SWEEP_AT) return false
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
  {
    now = Date.now,
    postsPerMinute = DEFAULT_POSTS_PER_MINUTE,
    presence = createPresenceStore(),
    heartbeatsPerMinute = DEFAULT_HEARTBEATS_PER_MINUTE,
    throttle = createRoomThrottle(),
  }: RoomRouteOptions = {},
) {
  const routes = new Hono()
  const policy = namePolicy(config.roomNames)
  // The contract already bounds the raw name, so the policy cannot refuse it here; the fallback is for types.
  const nameFor = (raw: string, deviceId: string) => policy(raw, deviceId) ?? deviceNickname(deviceId)
  const allow = createLimiter(postsPerMinute)
  // Separate windows: a burst of heartbeats must never cost anyone their result post.
  const allowBeat = createLimiter(heartbeatsPerMinute)

  // The IP bucket is counted once per request before the device gates, so a throttled request costs
  // the venue exactly what an accepted one does. Throttled requests get the same 204, on purpose.
  routes.post('/room/result', async (c) => {
    const ip = requestClientIp(c, config.trustedProxyIps)
    if (!allow(ip, now())) {
      return c.json({ error: 'rate_limited' }, 429)
    }
    const parsed = RoomResultRequest.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
    // The deviceId is only the key for one-entry-per-device; it is never stored in an entry.
    const { deviceId, nickname: raw, ...rest } = parsed.data
    const at = now()
    if (!throttle.admit(ip, deviceId, at) || !throttle.takeResult(deviceId, at)) return c.body(null, 204)
    const nickname = nameFor(raw, deviceId)
    store.add({ ...rest, nickname, at }, deviceId)
    presence.beat(deviceId, nickname, 'result', at, true)
    return c.body(null, 204)
  })

  routes.post('/room/presence', async (c) => {
    const ip = requestClientIp(c, config.trustedProxyIps)
    if (!allowBeat(ip, now())) {
      return c.json({ error: 'rate_limited' }, 429)
    }
    const parsed = RoomPresenceRequest.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
    const { deviceId, nickname, stage } = parsed.data
    const at = now()
    if (!throttle.admit(ip, deviceId, at)) return c.body(null, 204)
    // The store ignores a change inside its 2 s gap and only refreshes the heartbeat on a repeat.
    presence.beat(deviceId, nameFor(nickname, deviceId), stage, at)
    return c.body(null, 204)
  })

  // Stop sharing: the device's result and its live row leave the board now, not in 12 hours. It
  // answers 204 whether or not there was an entry, so it cannot be used to test which device IDs
  // are on the board. A device ID is not an account: anyone holding it could already overwrite that
  // entry, so letting them remove it adds no new power.
  routes.post('/room/withdraw', async (c) => {
    const ip = requestClientIp(c, config.trustedProxyIps)
    if (!allow(ip, now())) {
      return c.json({ error: 'rate_limited' }, 429)
    }
    const parsed = RoomWithdrawRequest.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: 'bad_request' }, 400)
    presence.remove(parsed.data.deviceId)
    try {
      await store.remove(parsed.data.deviceId, now())
    } catch {
      return c.json({ error: 'withdrawal_unconfirmed' }, 503)
    }
    return c.body(null, 204)
  })

  routes.get('/room', (c) => {
    const at = now()
    const body: RoomState = { ...store.snapshot(at), ...presence.snapshot(at) }
    return c.json(body)
  })

  routes.post('/room/reset', async (c) => {
    const token = c.req.header('x-admin-token')
    if (!config.roomAdminToken || !token || !sameToken(token, config.roomAdminToken)) {
      return c.json({ error: 'forbidden' }, 403)
    }
    presence.reset()
    try {
      await store.reset()
    } catch {
      return c.json({ error: 'reset_unconfirmed' }, 503)
    }
    return c.body(null, 204)
  })

  return routes
}
