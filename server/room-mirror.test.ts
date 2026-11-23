import { afterEach, describe, expect, it, vi } from 'vitest'
import { RoomState, type RoomEntry, type RoomResultRequest } from '../shared/contracts'
import { deviceNickname } from '../shared/nicknames'
import { createApp } from './app'
import { loadConfig } from './config'
import {
  createMirroredRoom,
  errorReason,
  HYDRATE_TIMEOUT_MS,
  parseMirrored,
  prepareRoom,
  SYNC_INTERVAL_MS,
  type MirrorLogLine,
  type RoomMirror,
} from './room-mirror'
import { DEFAULT_MAX_AGE_MS } from './state'

const T0 = 1_763_700_000_000

const entry = (over: Partial<RoomEntry> = {}): RoomEntry => ({
  nickname: 'Calm Quokka',
  verdict: 'steady',
  score: 80,
  mode: 'real',
  at: T0,
  ...over,
})

// An in-memory stand-in for Redis: same hash shape, plus switches to make it fail or hang.
function fakeMirror(initial: Record<string, string> = {}) {
  const hash = new Map(Object.entries(initial))
  const calls: string[] = []
  const state = { mode: 'ok' as 'ok' | 'throw' | 'reject' | 'hang' }
  const run = async <T>(name: string, work: () => T): Promise<T> => {
    calls.push(name)
    if (state.mode === 'throw') throw new Error('boom redis://user:secret@host')
    if (state.mode === 'reject') return Promise.reject(new Error('down'))
    if (state.mode === 'hang') return new Promise<T>(() => {})
    return work()
  }
  const mirror: RoomMirror = {
    readAll: () => run('readAll', () => Object.fromEntries(hash)),
    write: (id, value) => run('write', () => void hash.set(id, value)),
    remove: (ids) => run('remove', () => ids.forEach((id) => hash.delete(id))),
    clear: () => run('clear', () => hash.clear()),
    close: () => run('close', () => undefined),
  }
  return { mirror, hash, calls, state }
}

// Lets fire-and-forget promises settle.
const flush = () => new Promise((resolve) => setImmediate(resolve))

const quietLog = () => {
  const lines: MirrorLogLine[] = []
  return { lines, log: (line: MirrorLogLine) => void lines.push(line) }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('mirrored room store', () => {
  it('writes each add through to the mirror, without the deviceId in the value', async () => {
    const { mirror, hash } = fakeMirror()
    const { store } = createMirroredRoom(mirror, { log: quietLog().log })
    store.add(entry({ score: 91 }), 'device-aaaa-1111')
    expect(store.snapshot(T0).total).toBe(1)
    await flush()
    const value = hash.get('device-aaaa-1111')
    expect(value).toBeDefined()
    expect(JSON.parse(value!)).toEqual(entry({ score: 91 }))
    expect(value).not.toContain('device-aaaa-1111')
  })

  it('clears the mirror on reset', async () => {
    const { mirror, hash } = fakeMirror()
    const { store } = createMirroredRoom(mirror, { log: quietLog().log })
    store.add(entry(), 'device-aaaa-1111')
    await flush()
    store.reset()
    await flush()
    expect(hash.size).toBe(0)
    expect(store.snapshot(T0).total).toBe(0)
  })

  it('deletes a withdrawn device from the mirror', async () => {
    const { mirror, hash } = fakeMirror()
    const { store } = createMirroredRoom(mirror, { log: quietLog().log })
    store.add(entry(), 'device-aaaa-1111')
    store.add(entry({ nickname: 'Brisk Emu' }), 'device-bbbb-2222')
    await flush()
    expect(await store.remove('device-aaaa-1111', T0)).toBe(true)
    await flush()
    expect([...hash.keys()]).toEqual(['device-bbbb-2222'])
    expect(store.snapshot(T0).total).toBe(1)
  })

  it('never lets a mirror read that predates a withdrawal bring the entry back', async () => {
    // The delete has not reached Redis yet (or failed): the hash still holds the old entry.
    const { mirror, state } = fakeMirror({ 'device-aaaa-1111': JSON.stringify(entry({ at: T0 })) })
    const room = createMirroredRoom(mirror, { now: () => T0 + 1000, log: quietLog().log })
    await room.hydrate()
    expect(room.store.snapshot(T0 + 1000).total).toBe(1)
    state.mode = 'reject' // the HDEL fails
    const app = createApp(loadConfig({}), { store: room.store })
    const withdraw = () => app.request('/api/room/withdraw', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceId: 'device-aaaa-1111' }),
    })
    expect((await withdraw()).status).toBe(503)
    state.mode = 'ok'
    await room.sync()
    expect(room.store.snapshot(T0 + 1000).total).toBe(0)
    expect((await withdraw()).status).toBe(204)
  })

  it('keeps an unconfirmed reset hidden through recovery and confirms a later retry', async () => {
    const { mirror, state, hash } = fakeMirror({ 'device-local-001': JSON.stringify(entry()) })
    const room = createMirroredRoom(mirror, { now: () => T0, log: quietLog().log })
    await room.hydrate()
    const token = 'fixture-admin-token-123456'
    const app = createApp(loadConfig({ ROOM_ADMIN_TOKEN: token }), { store: room.store })
    const reset = () => app.request('/api/room/reset', { method: 'POST', headers: { 'x-admin-token': token } })
    state.mode = 'reject'
    expect((await reset()).status).toBe(503)
    state.mode = 'ok'
    await room.sync()
    expect(room.store.snapshot(T0).total).toBe(0)
    expect((await reset()).status).toBe(204)
    expect(hash.size).toBe(0)
  })

  it('discards a snapshot still in flight when withdrawal was confirmed, even with clock skew', async () => {
    const { mirror } = fakeMirror()
    let resolve!: (entries: Record<string, string>) => void
    mirror.readAll = () => new Promise(done => { resolve = done })
    const room = createMirroredRoom(mirror, { now: () => T0, log: quietLog().log })
    const pending = room.sync()
    await room.store.remove('device-local-001', T0)
    resolve({ 'device-local-001': JSON.stringify(entry({ at: T0 + 100 })) })
    await pending
    expect(room.store.snapshot(T0).total).toBe(0)
  })

  it('accepts a newer entry for a withdrawn device, because the person shared again', async () => {
    const { mirror, hash } = fakeMirror()
    const room = createMirroredRoom(mirror, { now: () => T0 + 6000, log: quietLog().log })
    room.store.remove('device-aaaa-1111', T0 + 1000)
    await flush()
    // Written after the withdrawal, for example by another instance taking the new result.
    hash.set('device-aaaa-1111', JSON.stringify(entry({ at: T0 + 5000, verdict: 'wired' })))
    await room.sync()
    expect(room.store.snapshot(T0 + 6000).feed[0]?.verdict).toBe('wired')
  })

  it('removes evicted and expired entries from the mirror', async () => {
    const { mirror, hash } = fakeMirror()
    const { store } = createMirroredRoom(mirror, { storeOptions: { maxEntries: 2 }, log: quietLog().log })
    for (let i = 0; i < 3; i++) store.add(entry({ at: T0 + i }), `device-${i}-xxxx`)
    await flush()
    expect([...hash.keys()].sort()).toEqual(['device-1-xxxx', 'device-2-xxxx'])
    store.snapshot(T0 + 2 + DEFAULT_MAX_AGE_MS + 1)
    await flush()
    expect([...hash.keys()]).toEqual([])
  })

  it('hydrates memory from the mirror, and the snapshot shows those entries', async () => {
    const { mirror } = fakeMirror({
      'device-aaaa-1111': JSON.stringify(entry({ nickname: 'Calm Ibis', score: 90, at: T0 })),
      'device-bbbb-2222': JSON.stringify(entry({ nickname: 'Brisk Emu', score: 70, verdict: 'tipsy', mode: 'demo', handicap: 'spin', at: T0 + 5 })),
    })
    const room = createMirroredRoom(mirror, { now: () => T0 + 10, log: quietLog().log })
    expect(await room.hydrate()).toBe(2)
    const state = RoomState.parse(room.store.snapshot(T0 + 10))
    expect(state.total).toBe(2)
    expect(state.feed.map((e) => e.nickname)).toEqual(['Brisk Emu', 'Calm Ibis'])
    expect(state.top).toEqual({ real: [], demo: [] })
  })

  it('drops junk values from the mirror and keeps the good ones', async () => {
    const { mirror, hash } = fakeMirror({
      'device-good-0000': JSON.stringify(entry()),
      'device-notjson-0': '{nope',
      'device-badscore-': JSON.stringify(entry({ score: 500 })),
      'device-verdict-0': JSON.stringify({ ...entry(), verdict: 'sober' }),
      'device-number-00': '42',
      'device-null-0000': 'null',
    })
    const room = createMirroredRoom(mirror, { now: () => T0, log: quietLog().log })
    expect(await room.hydrate()).toBe(1)
    expect(room.store.snapshot(T0).total).toBe(1)
    await flush()
    expect([...hash.keys()]).toEqual(['device-good-0000'])
  })

  it('never lets a planted huge name or a far-future entry reach the snapshot, and removes them', async () => {
    const { mirror, hash } = fakeMirror({
      'device-good-0000': JSON.stringify(entry({ nickname: 'Big Kev' })),
      'device-huge-0000': JSON.stringify(entry({ nickname: 'x'.repeat(100_000) })),
      'device-empty-000': JSON.stringify(entry({ nickname: '' })),
      'device-future-00': JSON.stringify(entry({ nickname: 'Time Lord', at: T0 + 365 * 24 * 3600_000 })),
      'device-skew-0000': JSON.stringify(entry({ nickname: 'Skewed', at: T0 + 30_000 })),
    })
    const room = createMirroredRoom(mirror, { now: () => T0, log: quietLog().log })
    expect(await room.hydrate()).toBe(2)
    const state = room.store.snapshot(T0)
    expect(state.feed.map((e) => e.nickname).sort()).toEqual(['Big Kev', 'Skewed'])
    expect(JSON.stringify(state)).not.toContain('xxxxxxxx')
    expect(JSON.stringify(state)).not.toContain('Time Lord')
    await flush()
    expect([...hash.keys()].sort()).toEqual(['device-good-0000', 'device-skew-0000'])
  })

  it('cleans a mirrored name with the live name rule', async () => {
    const { mirror } = fakeMirror({
      'device-hate-0000': JSON.stringify(entry({ nickname: 'n-a-z-i' })),
      'device-long-0000': JSON.stringify(entry({ nickname: 'Sixteen chars and more' })),
    })
    const room = createMirroredRoom(mirror, { now: () => T0, log: quietLog().log })
    await room.hydrate()
    const names = room.store.snapshot(T0).feed.map((e) => e.nickname)
    expect(names).toContain(deviceNickname('device-hate-0000'))
    expect(names).toContain('Sixteen chars an')
  })

  it('shows only generated nicknames for mirrored entries with ROOM_NAMES=generated', async () => {
    const fake = fakeMirror({ 'device-aaaa-1111': JSON.stringify(entry({ nickname: 'Big Kev', at: Date.now() })) })
    const room = await prepareRoom(loadConfig({ REDIS_URL: 'redis://127.0.0.1:1', ROOM_NAMES: 'generated' }), {
      createMirror: () => fake.mirror,
      log: quietLog().log,
    })
    expect(room.store.snapshot(Date.now()).feed.map((e) => e.nickname)).toEqual([deviceNickname('device-aaaa-1111')])
    await room.close()
  })

  it('skips a hash with more than twice maxEntries fields and counts it as an error', async () => {
    const planted = Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [`device-${i}-xxxxxxx`, JSON.stringify(entry({ at: T0 + i }))]),
    )
    const { mirror } = fakeMirror(planted)
    const { lines, log } = quietLog()
    const room = createMirroredRoom(mirror, { now: () => T0 + 10, storeOptions: { maxEntries: 4 }, log })
    expect(await room.hydrate()).toBe(0)
    expect(room.store.snapshot(T0 + 10).total).toBe(0)
    expect(room.errors()).toBe(1)
    expect(lines).toEqual([{ msg: 'room mirror unavailable', reason: 'MirrorTooLarge' }])
  })

  it('treats a non-object reply as an empty board', () => {
    for (const raw of [null, undefined, 'x', 42, ['a']]) expect(parseMirrored(raw).pairs).toEqual([])
  })

  it('keeps local writes available and surfaces failed durable resets', async () => {
    for (const mode of ['throw', 'reject'] as const) {
      const { mirror, state } = fakeMirror()
      state.mode = mode
      const { lines, log } = quietLog()
      const room = createMirroredRoom(mirror, { log })
      expect(() => room.store.add(entry(), 'device-aaaa-1111')).not.toThrow()
      expect(room.store.snapshot(T0).total).toBe(1)
      await expect(room.store.reset()).rejects.toThrow()
      expect(room.store.snapshot(T0).total).toBe(0)
      expect(await room.hydrate()).toBe(0)
      await flush()
      expect(room.errors()).toBeGreaterThan(0)
      // Never the message, which could carry the URL.
      expect(JSON.stringify(lines)).not.toContain('secret')
    }
  })

  it('gives up hydrating at the timeout when the mirror never answers, and add still works', async () => {
    vi.useFakeTimers()
    const { mirror, state } = fakeMirror()
    state.mode = 'hang'
    const room = createMirroredRoom(mirror, { log: quietLog().log })
    let settled: number | undefined
    void room.hydrate().then((n) => (settled = n))
    await vi.advanceTimersByTimeAsync(HYDRATE_TIMEOUT_MS - 1)
    expect(settled).toBeUndefined()
    await vi.advanceTimersByTimeAsync(1)
    expect(settled).toBe(0)
    room.store.add(entry(), 'device-aaaa-1111')
    room.store.reset()
    room.store.add(entry(), 'device-bbbb-2222')
    expect(room.store.snapshot(T0).total).toBe(1)
  })

  it('merges newer entries on the interval and never overwrites a newer one in memory', async () => {
    vi.useFakeTimers()
    const clock = { t: T0 + 1000 }
    const { mirror, hash } = fakeMirror()
    const room = createMirroredRoom(mirror, { now: () => clock.t, log: quietLog().log })
    room.store.add(entry({ nickname: 'Calm Ibis', verdict: 'steady', at: T0 + 500 }), 'device-mine-0000')
    room.store.add(entry({ nickname: 'Brisk Emu', verdict: 'steady', at: T0 + 500 }), 'device-both-0000')
    await vi.advanceTimersByTimeAsync(0)
    // Another container posted: a new device, a newer run for one device, an older run for another.
    hash.set('device-new-00000', JSON.stringify(entry({ nickname: 'Zippy Emu', verdict: 'wired', at: T0 + 800 })))
    hash.set('device-both-0000', JSON.stringify(entry({ nickname: 'Brisk Emu', verdict: 'tipsy', at: T0 + 900 })))
    hash.set('device-mine-0000', JSON.stringify(entry({ nickname: 'Calm Ibis', verdict: 'wobbly', at: T0 + 100 })))

    const stop = room.startSync()
    await vi.advanceTimersByTimeAsync(SYNC_INTERVAL_MS)
    stop()

    const state = room.store.snapshot(clock.t)
    expect(state.total).toBe(3)
    expect(state.mix).toEqual({ steady: 1, wired: 1, tipsy: 1, wobbly: 0 })
    const byName = Object.fromEntries(state.feed.map((e) => [e.nickname, e.verdict]))
    expect(byName).toEqual({ 'Calm Ibis': 'steady', 'Brisk Emu': 'tipsy', 'Zippy Emu': 'wired' })
  })

  it('skips the merge quietly when the mirror is down', async () => {
    vi.useFakeTimers()
    const { mirror, state } = fakeMirror()
    const room = createMirroredRoom(mirror, { log: quietLog().log })
    room.store.add(entry(), 'device-aaaa-1111')
    state.mode = 'hang'
    const stop = room.startSync(1000)
    await vi.advanceTimersByTimeAsync(10_000)
    stop()
    expect(room.store.snapshot(T0).total).toBe(1)
  })

  it('reduces errors to a short token', () => {
    expect(errorReason(Object.assign(new Error('connect ECONNREFUSED 10.0.0.1:6379'), { code: 'ECONNREFUSED' }))).toBe(
      'ECONNREFUSED',
    )
    expect(errorReason(new Error('redis://u:p@h'))).toBe('Error')
    expect(errorReason('redis://u:p@h')).toBe('error')
  })
})

describe('prepareRoom', () => {
  it('never creates or calls a mirror without REDIS_URL', async () => {
    const createMirror = vi.fn()
    const room = await prepareRoom(loadConfig({}), { createMirror })
    room.store.add(entry(), 'device-aaaa-1111')
    room.store.snapshot(T0)
    room.store.reset()
    await room.close()
    expect(createMirror).not.toHaveBeenCalled()
    expect(loadConfig({}).redisUrl).toBeUndefined()
    expect(loadConfig({ REDIS_URL: '' }).redisUrl).toBeUndefined()
  })

  it('hydrates from the mirror when REDIS_URL is set', async () => {
    const fake = fakeMirror({ 'device-aaaa-1111': JSON.stringify(entry({ at: Date.now() })) })
    const createMirror = vi.fn(() => fake.mirror)
    const { log } = quietLog()
    const room = await prepareRoom(loadConfig({ REDIS_URL: 'redis://127.0.0.1:1' }), { createMirror, log })
    expect(createMirror).toHaveBeenCalledOnce()
    expect(room.store.snapshot(Date.now()).total).toBe(1)
    await room.close()
    expect(fake.calls).toContain('close')
  })

  it('keeps local reads available but never confirms durable removal when client creation fails', async () => {
    const { lines, log } = quietLog()
    const room = await prepareRoom(loadConfig({ REDIS_URL: 'redis://x' }), {
      createMirror: () => {
        throw new Error('bad url redis://x')
      },
      log,
    })
    room.store.add(entry(), 'device-aaaa-1111')
    expect(room.store.snapshot(T0).total).toBe(1)
    await expect(room.store.remove('device-aaaa-1111', T0)).rejects.toThrow()
    expect(room.store.snapshot(T0).total).toBe(0)
    expect(lines).toEqual([{ msg: 'room mirror disabled', reason: 'Error' }])
  })
})

describe('GET /api/room with a mirrored store', () => {
  it('never returns a deviceId, including entries hydrated from the mirror', async () => {
    const hydratedId = 'hydrated-device-id-7777'
    const fake = fakeMirror({ [hydratedId]: JSON.stringify({ ...entry({ nickname: 'Brisk Emu', at: Date.now() }), deviceId: hydratedId }) })
    const room = createMirroredRoom(fake.mirror, { log: quietLog().log })
    await room.hydrate()
    const app = createApp(loadConfig({}), { store: room.store })
    const deviceId = 'secret-device-id-123456'
    const body: RoomResultRequest = { intent: 'share-ticket', deviceId, nickname: 'Calm Quokka', verdict: 'steady', score: 88, mode: 'real' }
    const res = await app.request('/api/room/result', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    expect(res.status).toBe(204)
    const text = await (await app.request('/api/room')).text()
    expect(text).toContain('Calm Quokka')
    expect(text).toContain('Brisk Emu')
    expect(text).not.toContain(deviceId)
    expect(text).not.toContain(hydratedId)
    expect(text).not.toContain('deviceId')
    await flush()
    expect(fake.hash.get(deviceId)).not.toContain(deviceId)
  })
})
