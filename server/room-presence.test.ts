import { describe, expect, it } from 'vitest'
import { createPresenceStore, PRESENCE_TTL_MS } from './room-presence'

const T0 = 1_763_700_000_000

describe('createPresenceStore', () => {
  it('keeps a person while heartbeats arrive and drops them 45 s after the last one', () => {
    const p = createPresenceStore()
    p.beat('device-a', 'Ann', 'joined', T0)
    p.beat('device-a', 'Ann', 'joined', T0 + 40_000)
    expect(p.snapshot(T0 + 40_000 + PRESENCE_TTL_MS).liveCount).toBe(1)
    expect(p.snapshot(T0 + 40_001 + PRESENCE_TTL_MS)).toEqual({ liveCount: 0, live: [] })
  })

  it('stamps `at` with the last change, not the last heartbeat', () => {
    const p = createPresenceStore()
    p.beat('device-a', 'Ann', 'check', T0)
    p.beat('device-a', 'Ann', 'check', T0 + 15_000)
    expect(p.snapshot(T0 + 15_000).live).toEqual([{ nickname: 'Ann', stage: 'check', at: T0 }])
    p.beat('device-a', 'Ann', 'stand', T0 + 16_000)
    expect(p.snapshot(T0 + 16_000).live[0]?.at).toBe(T0 + 16_000)
  })

  it('orders ties by arrival, newest first', () => {
    const p = createPresenceStore()
    p.beat('device-a', 'Ann', 'joined', T0)
    p.beat('device-b', 'Bea', 'joined', T0)
    expect(p.snapshot(T0).live.map((x) => x.nickname)).toEqual(['Bea', 'Ann'])
  })

  it('drops the least recently seen device past the cap', () => {
    const p = createPresenceStore({ maxDevices: 2, liveSize: 10 })
    p.beat('device-a', 'Ann', 'joined', T0)
    p.beat('device-b', 'Bea', 'joined', T0 + 1)
    p.beat('device-a', 'Ann', 'joined', T0 + 2) // Ann seen again, so Bea is now the oldest
    p.beat('device-c', 'Cat', 'joined', T0 + 3)
    const names = p.snapshot(T0 + 3).live.map((x) => x.nickname)
    expect(names.sort()).toEqual(['Ann', 'Cat'])
  })

  it('returns only nickname, stage and at', () => {
    const p = createPresenceStore()
    p.beat('secret-device', 'Ann', 'demo', T0)
    expect(Object.keys(p.snapshot(T0).live[0]!).sort()).toEqual(['at', 'nickname', 'stage'])
    expect(JSON.stringify(p.snapshot(T0))).not.toContain('secret-device')
  })
})
