import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { RoomState, type RoomPresenceRequest, type RoomResultRequest } from '../shared/contracts'
import { loadConfig } from './config'
import { isValidNickname } from '../shared/nicknames'
import { DEFAULT_HEARTBEATS_PER_MINUTE, DEFAULT_POSTS_PER_MINUTE, roomRoutes } from './room'
import { createRoomStore, DEFAULT_MAX_AGE_MS } from './state'

const TOKEN = 'test-token-0123456789'
const T0 = 1_763_700_000_000

function setup({ withToken = true, postsPerMinute = 30 } = {}) {
  const clock = { t: T0 }
  const config = loadConfig(withToken ? { ROOM_ADMIN_TOKEN: TOKEN } : {})
  const app = new Hono().route(
    '/api',
    roomRoutes(config, createRoomStore(), { now: () => clock.t, postsPerMinute }),
  )
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    app.request(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  const board = async () => RoomState.parse(await (await app.request('/api/room')).json())
  return { app, clock, post, board }
}

const result = (over: Partial<RoomResultRequest> = {}): RoomResultRequest => ({
  deviceId: '00000000-0000-4000-8000-000000000001',
  nickname: 'Calm Quokka',
  verdict: 'steady',
  score: 88,
  mode: 'real',
  ...over,
})

describe('POST /api/room/result', () => {
  it('stores a valid result and answers 204', async () => {
    const { post, board } = setup()
    const res = await post('/api/room/result', result())
    expect(res.status).toBe(204)
    const state = await board()
    expect(state.total).toBe(1)
    expect(state.feed[0]).toMatchObject({ nickname: 'Calm Quokka', verdict: 'steady', score: 88, at: T0 })
  })

  it('keeps one entry per device', async () => {
    const { post, board, clock } = setup()
    await post('/api/room/result', result({ verdict: 'steady' }))
    clock.t += 1000
    await post('/api/room/result', result({ verdict: 'wired', score: 61 }))
    const state = await board()
    expect(state.total).toBe(1)
    expect(state.mix).toEqual({ steady: 0, wired: 1, tipsy: 0, wobbly: 0 })
  })

  // Changed on purpose (live presence): a typed name is sanitised, or replaced, never rejected.
  it('stores a free-text nickname under a sanitised or generated name', async () => {
    const { post, board, clock } = setup()
    const cases = ['Free Text', '  Calm   Quokka\tplease ', 'calm quokka', 'Quokka Calm', 'Twitchy Kookaburra']
    for (const [i, nickname] of cases.entries()) {
      clock.t += 1000
      const res = await post('/api/room/result', result({ nickname, deviceId: `device-${i}-0000000` }))
      expect(res.status).toBe(204)
    }
    const names = (await board()).feed.map((e) => e.nickname).reverse()
    // A generated nickname stays whole even past the 16-character cap for typed names.
    expect(names).toEqual(['Free Text', 'Calm Quokka plea', 'calm quokka', 'Quokka Calm', 'Twitchy Kookaburra'])
  })

  it('falls back to a generated nickname for a hateful name, the same one every time', async () => {
    const { post, board, clock } = setup()
    await post('/api/room/result', result({ nickname: 'N1gg3r' }))
    const first = (await board()).feed[0]!.nickname
    expect(isValidNickname(first)).toBe(true)
    clock.t += 1000
    await post('/api/room/result', result({ nickname: 'n i g g e r' }))
    expect((await board()).feed[0]!.nickname).toBe(first)
  })

  it('lets a funny or rude name through', async () => {
    const { post, board } = setup()
    await post('/api/room/result', result({ nickname: 'Drunk Uncle Bob!' }))
    expect((await board()).feed[0]!.nickname).toBe('Drunk Uncle Bob!')
  })

  it('refuses a link as a name', async () => {
    const { app, post, board, clock } = setup()
    for (const [i, nickname] of ['kachka.fun', 'www lol', 'me@x', 'http now'].entries()) {
      clock.t += 1000
      await post('/api/room/result', result({ nickname, deviceId: `device-${i}-0000000` }))
    }
    expect((await board()).feed.every((e) => isValidNickname(e.nickname))).toBe(true)
    const text = await (await app.request('/api/room')).text()
    for (const bit of ['kachka', 'www', '@', 'http']) expect(text).not.toContain(bit)
  })

  it('rejects an empty or overlong nickname', async () => {
    const { post } = setup()
    expect((await post('/api/room/result', result({ nickname: '' }))).status).toBe(400)
    expect((await post('/api/room/result', result({ nickname: 'x'.repeat(41) }))).status).toBe(400)
  })

  it('rejects a body outside the contract', async () => {
    const { post } = setup()
    expect((await post('/api/room/result', result({ score: 101 }))).status).toBe(400)
    expect((await post('/api/room/result', { ...result(), verdict: 'sober' })).status).toBe(400)
    const notJson = await setup().app.request('/api/room/result', { method: 'POST', body: 'nope' })
    expect(notJson.status).toBe(400)
  })

  it('answers 429 past 30 posts a minute from one IP, and lets other IPs through', async () => {
    const { post, clock } = setup()
    const ip = { 'cf-connecting-ip': '203.0.113.7' }
    for (let i = 0; i < 30; i++) {
      expect((await post('/api/room/result', result(), ip)).status).toBe(204)
    }
    const limited = await post('/api/room/result', result(), ip)
    expect(limited.status).toBe(429)
    expect(await limited.json()).toEqual({ error: 'rate_limited' })
    expect((await post('/api/room/result', result(), { 'cf-connecting-ip': '203.0.113.8' })).status).toBe(204)
    clock.t += 60_000
    expect((await post('/api/room/result', result(), ip)).status).toBe(204)
  })

  it('lets 200 devices on one shared venue IP all post inside a minute with the default limit', async () => {
    const clock = { t: T0 }
    const app = new Hono().route('/api', roomRoutes(loadConfig({}), createRoomStore(), { now: () => clock.t }))
    const venue = { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.50' }
    const send = (i: number) =>
      app.request('/api/room/result', {
        method: 'POST',
        headers: venue,
        body: JSON.stringify(result({ deviceId: `device-${String(i).padStart(4, '0')}-0000` })),
      })
    for (let i = 0; i < 200; i++) {
      clock.t += 250
      expect((await send(i)).status).toBe(204)
    }
    expect(RoomState.parse(await (await app.request('/api/room')).json()).total).toBe(200)
    expect(DEFAULT_POSTS_PER_MINUTE).toBe(600)
  })

  it('treats a spoofed non-IP header as unknown', async () => {
    const { post } = setup({ postsPerMinute: 1 })
    expect((await post('/api/room/result', result(), { 'cf-connecting-ip': 'spoof-a' })).status).toBe(204)
    // A different made-up value lands on the same 'unknown' key instead of a fresh window.
    expect((await post('/api/room/result', result(), { 'cf-connecting-ip': 'spoof-b' })).status).toBe(429)
  })

  it('falls back to the first X-Forwarded-For entry for the client IP', async () => {
    const { post } = setup({ postsPerMinute: 1 })
    const first = { 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }
    expect((await post('/api/room/result', result(), first)).status).toBe(204)
    expect((await post('/api/room/result', result(), { 'x-forwarded-for': '198.51.100.1' })).status).toBe(429)
    expect((await post('/api/room/result', result(), { 'x-forwarded-for': '198.51.100.2, 10.0.0.1' })).status).toBe(204)
  })
})

describe('GET /api/room', () => {
  it('ranks steadiest real and dizziest demo, each without the other mode', async () => {
    const { post, board, clock } = setup()
    const rows: Array<Partial<RoomResultRequest>> = [
      { score: 90, mode: 'real' },
      { score: 70, mode: 'real' },
      { score: 99, mode: 'demo', handicap: 'spin' },
      { score: 10, mode: 'demo', handicap: 'offhand' },
      { score: 5, mode: 'real', verdict: 'tipsy' },
    ]
    for (const [i, row] of rows.entries()) {
      clock.t += 1000
      await post('/api/room/result', result({ ...row, deviceId: `device-${i}-0000000` }))
    }
    const { top } = await board()
    expect(top.real.map((e) => e.score)).toEqual([90, 70, 5])
    expect(top.demo.map((e) => e.score)).toEqual([10, 99])
  })

  it('expires entries older than 12 hours', async () => {
    const { post, board, clock } = setup()
    await post('/api/room/result', result())
    clock.t += DEFAULT_MAX_AGE_MS + 1
    expect((await board()).total).toBe(0)
  })

  it('never returns a deviceId', async () => {
    const { app, post } = setup()
    const deviceId = 'secret-device-id-123456'
    await post('/api/room/result', result({ deviceId }))
    const text = await (await app.request('/api/room')).text()
    expect(text).toContain('Calm Quokka')
    expect(text).not.toContain(deviceId)
    expect(text).not.toContain('deviceId')
  })

  it('does not set commentary', async () => {
    const { post, board } = setup()
    await post('/api/room/result', result())
    expect('commentary' in (await board())).toBe(false)
  })
})

describe('POST /api/room/reset', () => {
  it('clears the board with the right token', async () => {
    const { post, board } = setup()
    await post('/api/room/result', result())
    expect((await post('/api/room/reset', {}, { 'x-admin-token': TOKEN })).status).toBe(204)
    expect((await board()).total).toBe(0)
  })

  it('refuses a missing or wrong token and keeps the board', async () => {
    const { post, board } = setup()
    await post('/api/room/result', result())
    expect((await post('/api/room/reset', {})).status).toBe(403)
    expect((await post('/api/room/reset', {}, { 'x-admin-token': 'wrong-token-0123456789' })).status).toBe(403)
    expect((await post('/api/room/reset', {}, { 'x-admin-token': TOKEN.slice(0, -1) })).status).toBe(403)
    expect((await board()).total).toBe(1)
  })

  it('refuses every reset when no token is configured', async () => {
    const { post } = setup({ withToken: false })
    expect((await post('/api/room/reset', {}, { 'x-admin-token': '' })).status).toBe(403)
    expect((await post('/api/room/reset', {}, { 'x-admin-token': TOKEN })).status).toBe(403)
  })
})

describe('POST /api/room/presence', () => {
  const beat = (over: Partial<RoomPresenceRequest> = {}): RoomPresenceRequest => ({
    deviceId: '00000000-0000-4000-8000-000000000001',
    nickname: 'Calm Quokka',
    stage: 'joined',
    ...over,
  })

  it('answers 204 and shows the person in GET /api/room', async () => {
    const { post, board } = setup()
    expect((await post('/api/room/presence', beat({ stage: 'baseline' }))).status).toBe(204)
    const state = await board()
    expect(state.liveCount).toBe(1)
    expect(state.live).toEqual([{ nickname: 'Calm Quokka', stage: 'baseline', at: T0 }])
    // Presence is not a reading: the tallies keep their meaning.
    expect(state.total).toBe(0)
  })

  it('lists the most recently changed first, and a plain heartbeat does not move anyone', async () => {
    const { post, board, clock } = setup()
    await post('/api/room/presence', beat({ deviceId: 'device-a-0000000', nickname: 'Ann' }))
    clock.t += 1000
    await post('/api/room/presence', beat({ deviceId: 'device-b-0000000', nickname: 'Bea' }))
    clock.t += 1000
    await post('/api/room/presence', beat({ deviceId: 'device-a-0000000', nickname: 'Ann' }))
    expect((await board()).live?.map((p) => p.nickname)).toEqual(['Bea', 'Ann'])
    clock.t += 1000
    await post('/api/room/presence', beat({ deviceId: 'device-a-0000000', nickname: 'Ann', stage: 'check' }))
    const live = (await board()).live
    expect(live?.map((p) => p.nickname)).toEqual(['Ann', 'Bea'])
    expect(live?.[0]).toEqual({ nickname: 'Ann', stage: 'check', at: T0 + 3000 })
  })

  it('expires a device 45 seconds after its last heartbeat', async () => {
    const { post, board, clock } = setup()
    await post('/api/room/presence', beat())
    clock.t += 30_000
    await post('/api/room/presence', beat())
    clock.t += 45_000
    expect((await board()).liveCount).toBe(1)
    clock.t += 1
    const state = await board()
    expect(state.liveCount).toBe(0)
    expect(state.live).toEqual([])
  })

  it('flips the stage to result when a result is posted, and still counts the person', async () => {
    const { post, board, clock } = setup()
    await post('/api/room/presence', beat({ stage: 'check' }))
    clock.t += 1000
    await post('/api/room/result', result())
    const state = await board()
    expect(state.total).toBe(1)
    expect(state.liveCount).toBe(1)
    expect(state.live?.[0]).toEqual({ nickname: 'Calm Quokka', stage: 'result', at: T0 + 1000 })
  })

  it('uses the same board name for presence and the result', async () => {
    const { post, board } = setup()
    await post('/api/room/presence', beat({ nickname: 'w3tback' }))
    await post('/api/room/result', result({ nickname: 'w3tback' }))
    const state = await board()
    expect(isValidNickname(state.live![0]!.nickname)).toBe(true)
    expect(state.live![0]!.nickname).toBe(state.feed[0]!.nickname)
  })

  it('never returns a deviceId', async () => {
    const { app, post } = setup()
    const deviceId = 'secret-device-id-123456'
    await post('/api/room/presence', beat({ deviceId }))
    const text = await (await app.request('/api/room')).text()
    expect(text).toContain('Calm Quokka')
    expect(text).not.toContain(deviceId)
    expect(text).not.toContain('deviceId')
  })

  it('caps the room at 1,000 devices and the list at 30', async () => {
    const { post, board, clock } = setup()
    for (let i = 0; i < 1005; i++) {
      clock.t += 1
      await post('/api/room/presence', beat({ deviceId: `device-${String(i).padStart(5, '0')}`, nickname: `P${i}` }))
    }
    const state = await board()
    expect(state.liveCount).toBe(1000)
    expect(state.live).toHaveLength(30)
    expect(state.live?.[0]?.nickname).toBe('P1004')
  })

  it('rejects a body outside the contract', async () => {
    const { post } = setup()
    expect((await post('/api/room/presence', { ...beat(), stage: 'drinking' })).status).toBe(400)
    expect((await post('/api/room/presence', beat({ deviceId: 'short' }))).status).toBe(400)
    expect((await post('/api/room/presence', beat({ nickname: '' }))).status).toBe(400)
  })

  it('rate limits heartbeats per IP on their own window', async () => {
    const clock = { t: T0 }
    const app = new Hono().route(
      '/api',
      roomRoutes(loadConfig({}), createRoomStore(), { now: () => clock.t, postsPerMinute: 1, heartbeatsPerMinute: 2 }),
    )
    const send = (path: string, body: unknown) =>
      app.request(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9' },
        body: JSON.stringify(body),
      })
    expect((await send('/api/room/presence', beat())).status).toBe(204)
    expect((await send('/api/room/presence', beat())).status).toBe(204)
    expect((await send('/api/room/presence', beat())).status).toBe(429)
    // A flood of heartbeats never costs anyone their result post.
    expect((await send('/api/room/result', result())).status).toBe(204)
    clock.t += 60_000
    expect((await send('/api/room/presence', beat())).status).toBe(204)
    expect(DEFAULT_HEARTBEATS_PER_MINUTE).toBe(3000)
  })

  it('is cleared by a reset', async () => {
    const { post, board } = setup()
    await post('/api/room/presence', beat())
    await post('/api/room/reset', {}, { 'x-admin-token': TOKEN })
    expect((await board()).liveCount).toBe(0)
  })
})
