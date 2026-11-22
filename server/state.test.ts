import { describe, expect, it } from 'vitest'
import { RoomState, type RoomEntry } from '../shared/contracts'
import { createRoomStore, DEFAULT_MAX_AGE_MS, MAX_FUTURE_MS } from './state'

const T0 = 1_763_700_000_000

const entry = (over: Partial<RoomEntry> = {}): RoomEntry => ({
  nickname: 'Calm Quokka',
  verdict: 'steady',
  score: 80,
  mode: 'real',
  at: T0,
  ...over,
})

describe('createRoomStore', () => {
  it('returns an empty board stamped with now', () => {
    const state = createRoomStore().snapshot(T0)
    expect(state).toEqual({
      total: 0,
      mix: { steady: 0, wired: 0, tipsy: 0, wobbly: 0 },
      feed: [],
      top: { real: [], demo: [] },
      updatedAt: T0,
    })
  })

  it('keeps one entry per device, so a rerun replaces the earlier one', () => {
    const store = createRoomStore()
    store.add(entry({ verdict: 'steady', at: T0 }), 'device-aaaa')
    store.add(entry({ verdict: 'tipsy', score: 40, at: T0 + 1000 }), 'device-aaaa')
    const state = store.snapshot(T0 + 2000)
    expect(state.total).toBe(1)
    expect(state.mix).toEqual({ steady: 0, wired: 0, tipsy: 1, wobbly: 0 })
    expect(state.feed.map((e) => e.verdict)).toEqual(['tipsy'])
  })

  it('counts total and the mix per verdict', () => {
    const store = createRoomStore()
    const verdicts = ['steady', 'steady', 'wired', 'tipsy', 'wobbly', 'wobbly', 'wobbly'] as const
    verdicts.forEach((verdict, i) => store.add(entry({ verdict, at: T0 + i }), `device-${i}-xxxx`))
    const state = store.snapshot(T0 + 100)
    expect(state.total).toBe(7)
    expect(state.mix).toEqual({ steady: 2, wired: 1, tipsy: 1, wobbly: 3 })
  })

  it('puts the newest first in the feed and caps it at 12', () => {
    const store = createRoomStore()
    for (let i = 0; i < 20; i++) store.add(entry({ score: i, at: T0 + i * 1000 }), `device-${i}-xxxx`)
    const state = store.snapshot(T0 + 60_000)
    expect(state.total).toBe(20)
    expect(state.feed).toHaveLength(12)
    expect(state.feed.map((e) => e.score)).toEqual([19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8])
  })

  it('ranks top.real steadiest first and leaves demo entries out', () => {
    const store = createRoomStore()
    const scores = [50, 95, 70, 88, 60, 91]
    scores.forEach((score, i) => store.add(entry({ score, mode: 'real', at: T0 + i }), `real-${i}-xxxx`))
    store.add(entry({ score: 100, mode: 'demo', at: T0 + 10 }), 'demo-high-xxxx')
    const { top } = store.snapshot(T0 + 100)
    expect(top.real.map((e) => e.score)).toEqual([95, 91, 88, 70, 60])
    expect(top.real.every((e) => e.mode === 'real')).toBe(true)
  })

  it('ranks top.demo dizziest first and leaves real entries out', () => {
    const store = createRoomStore()
    const scores = [40, 12, 77, 25, 5, 60]
    scores.forEach((score, i) =>
      store.add(entry({ score, verdict: 'tipsy', mode: 'demo', handicap: 'spin', at: T0 + i }), `demo-${i}-xxxx`),
    )
    store.add(entry({ score: 0, mode: 'real', verdict: 'tipsy', at: T0 + 10 }), 'real-low-xxxx')
    const { top } = store.snapshot(T0 + 100)
    expect(top.demo.map((e) => e.score)).toEqual([5, 12, 25, 40, 60])
    expect(top.demo.every((e) => e.mode === 'demo')).toBe(true)
  })

  it('never lists a non-steady real reading under steadiest, whatever its score', () => {
    const store = createRoomStore()
    store.add(entry({ nickname: 'Calm Ibis', score: 80, verdict: 'steady', at: T0 }), 'device-s-xxxx')
    store.add(entry({ nickname: 'Woozy Emu', score: 99, verdict: 'tipsy', at: T0 + 1 }), 'device-t-xxxx')
    store.add(entry({ nickname: 'Zippy Emu', score: 95, verdict: 'wired', at: T0 + 2 }), 'device-w-xxxx')
    expect(store.snapshot(T0 + 100).top.real.map((e) => e.nickname)).toEqual(['Calm Ibis'])
  })

  it('keeps a steady demo reading off the dizziest list', () => {
    const store = createRoomStore()
    store.add(entry({ nickname: 'Calm Ibis', score: 97, verdict: 'steady', mode: 'demo', at: T0 }), 'device-d1-xxx')
    store.add(entry({ nickname: 'Dizzy Galah', score: 30, verdict: 'tipsy', mode: 'demo', at: T0 + 1 }), 'device-d2-xxx')
    expect(store.snapshot(T0 + 100).top.demo.map((e) => e.nickname)).toEqual(['Dizzy Galah'])
  })

  it('breaks score ties by most recent first, including equal timestamps', () => {
    const store = createRoomStore()
    store.add(entry({ nickname: 'Calm Ibis', score: 90, at: T0 }), 'device-1-xxxx')
    store.add(entry({ nickname: 'Brisk Emu', score: 90, at: T0 + 5 }), 'device-2-xxxx')
    store.add(entry({ nickname: 'Zippy Emu', score: 90, at: T0 + 5 }), 'device-3-xxxx')
    const state = store.snapshot(T0 + 100)
    expect(state.top.real.map((e) => e.nickname)).toEqual(['Zippy Emu', 'Brisk Emu', 'Calm Ibis'])
    expect(state.feed.map((e) => e.nickname)).toEqual(['Zippy Emu', 'Brisk Emu', 'Calm Ibis'])
  })

  it('drops entries older than 12 hours when taking a snapshot', () => {
    const store = createRoomStore()
    store.add(entry({ at: T0 }), 'old-device-xxxx')
    store.add(entry({ verdict: 'wired', at: T0 + 60_000 }), 'new-device-xxxx')
    const state = store.snapshot(T0 + DEFAULT_MAX_AGE_MS + 1)
    expect(state.total).toBe(1)
    expect(state.mix.wired).toBe(1)
    expect(store.snapshot(T0 + 60_000 + DEFAULT_MAX_AGE_MS + 1).total).toBe(0)
  })

  it('refuses to merge an entry more than 60 s in the future', () => {
    const store = createRoomStore()
    const changed = store.merge(
      [
        ['device-far-xxxx', entry({ nickname: 'Far', at: T0 + MAX_FUTURE_MS + 1 })],
        ['device-near-xxx', entry({ nickname: 'Near', at: T0 + MAX_FUTURE_MS })],
      ],
      T0,
    )
    expect(changed).toBe(1)
    expect(store.snapshot(T0).feed.map((e) => e.nickname)).toEqual(['Near'])
  })

  it('keeps at most maxEntries, dropping the oldest', () => {
    const store = createRoomStore({ maxEntries: 3 })
    for (let i = 0; i < 5; i++) store.add(entry({ score: i, at: T0 + i }), `device-${i}-xxxx`)
    const state = store.snapshot(T0 + 10)
    expect(state.total).toBe(3)
    expect(state.feed.map((e) => e.score)).toEqual([4, 3, 2])
  })

  it('stamps updatedAt with the last change, and with now once empty', () => {
    const store = createRoomStore()
    store.add(entry({ at: T0 + 500 }), 'device-aaaa')
    expect(store.snapshot(T0 + 9000).updatedAt).toBe(T0 + 500)
    store.reset()
    expect(store.snapshot(T0 + 9500).updatedAt).toBe(T0 + 9500)
  })

  it('reset empties the board', () => {
    const store = createRoomStore()
    store.add(entry(), 'device-aaaa')
    store.reset()
    expect(store.snapshot(T0).total).toBe(0)
  })

  it('always produces a snapshot that parses with the RoomState schema', () => {
    const store = createRoomStore()
    expect(RoomState.safeParse(store.snapshot(T0)).success).toBe(true)
    for (let i = 0; i < 30; i++) {
      store.add(
        entry({
          verdict: (['steady', 'wired', 'tipsy', 'wobbly'] as const)[i % 4],
          mode: i % 2 ? 'demo' : 'real',
          handicap: i % 2 ? 'offhand' : undefined,
          score: (i * 37) % 101,
          at: T0 + i,
        }),
        `device-${i}-xxxx`,
      )
      expect(RoomState.safeParse(store.snapshot(T0 + i)).success).toBe(true)
    }
  })
  it('merges newer entries, keeps newer ones in memory, skips expired ones and still drops the oldest', () => {
    const evicted: string[] = []
    const store = createRoomStore({ maxEntries: 3, onEvict: (ids) => evicted.push(...ids) })
    store.add(entry({ nickname: 'Calm Ibis', at: T0 + 10 }), 'device-a-xxxx')
    store.add(entry({ nickname: 'Brisk Emu', verdict: 'wired', at: T0 + 20 }), 'device-b-xxxx')
    const changed = store.merge(
      [
        ['device-a-xxxx', entry({ nickname: 'Calm Ibis', verdict: 'tipsy', at: T0 + 5 })], // older: ignored
        ['device-b-xxxx', entry({ nickname: 'Brisk Emu', verdict: 'wobbly', at: T0 + 30 })], // newer: wins
        ['device-c-xxxx', entry({ nickname: 'Zippy Emu', at: T0 + 1 })], // new but oldest: evicted by the cap
        ['device-d-xxxx', entry({ nickname: 'Brave Ibis', at: T0 + 40 })],
        ['device-e-xxxx', entry({ at: T0 - DEFAULT_MAX_AGE_MS - 1 })], // expired: skipped
      ],
      T0 + 50,
    )
    expect(changed).toBe(3)
    expect(evicted).toEqual(['device-c-xxxx'])
    const state = store.snapshot(T0 + 50)
    expect(state.feed.map((e) => [e.nickname, e.verdict])).toEqual([
      ['Brave Ibis', 'steady'],
      ['Brisk Emu', 'wobbly'],
      ['Calm Ibis', 'steady'],
    ])
    expect(store.merge([], T0 + 60)).toBe(0)
  })
})

describe('remove', () => {
  it('takes one device off and says whether it was there', () => {
    const store = createRoomStore()
    store.add({ nickname: 'Calm Quokka', verdict: 'steady', score: 90, mode: 'real', at: 1 }, 'device-a')
    store.add({ nickname: 'Brisk Emu', verdict: 'wired', score: 70, mode: 'real', at: 2 }, 'device-b')
    expect(store.remove('device-a', 3)).toBe(true)
    expect(store.remove('device-a', 3)).toBe(false)
    const snap = store.snapshot(3)
    expect(snap.total).toBe(1)
    expect(snap.feed.map((e) => e.nickname)).toEqual(['Brisk Emu'])
    expect(snap.updatedAt).toBe(3)
  })
})
