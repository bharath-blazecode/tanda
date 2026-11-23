import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { create } from 'qrcode'
import { RoomStage, type RoomLive, type RoomState } from '../../../shared/contracts'
import {
  commentaryLine,
  createPoller,
  displayUrl,
  emptyRoom,
  initialBoard,
  isStale,
  joinUrl,
  liveView,
  POLL_MS,
  qrGeometry,
  QR_QUIET_ZONE,
  reduceBoard,
  roomMood,
  STAGE_LABEL,
} from './board'

const live: RoomState = {
  ...emptyRoom,
  total: 2,
  mix: { steady: 1, wired: 1, tipsy: 0, wobbly: 0 },
  feed: [{ nickname: 'Quiet Heron', verdict: 'steady', score: 91, mode: 'real', at: 1 }],
  updatedAt: 10,
}

describe('reduceBoard', () => {
  it('clears participant data as soon as a poll fails', () => {
    const ok = reduceBoard(initialBoard, live)
    expect(ok).toEqual({ room: live, failures: 0 })
    expect(isStale(ok)).toBe(false)

    const once = reduceBoard(ok, null)
    expect(once.room).toBeNull()
    expect(isStale(once)).toBe(true)

    const twice = reduceBoard(once, null)
    expect(twice.room).toBeNull()
    expect(isStale(twice)).toBe(true)
  })

  it('clears the stale mark on the next good poll', () => {
    const stale = reduceBoard(reduceBoard(reduceBoard(initialBoard, live), null), null)
    const next = { ...live, total: 3 }
    expect(reduceBoard(stale, next)).toEqual({ room: next, failures: 0 })
  })

  it('stays empty, not broken, when the first polls fail', () => {
    const b = reduceBoard(reduceBoard(initialBoard, null), null)
    expect(b.room).toBeNull()
    expect(isStale(b)).toBe(true)
  })
})

describe('liveView', () => {
  const person = (nickname: string, at: number, stage: RoomLive['stage'] = 'joined'): RoomLive => ({
    nickname,
    stage,
    at,
  })

  it('draws every present person in plain words when they fit', () => {
    const view = liveView({ ...live, liveCount: 2, live: [person('Ann', 2, 'stand'), person('Bea', 1)] }, 12)
    expect(view).toEqual({
      count: 2,
      rows: [
        { key: 'Ann|stand|2', nickname: 'Ann', doing: 'standing still' },
        { key: 'Bea|joined|1', nickname: 'Bea', doing: 'just walked in' },
      ],
      more: 0,
    })
  })

  it('gives the last row to "and N more" when the room outgrows the list', () => {
    const many = Array.from({ length: 30 }, (_, i) => person(`P${i}`, 100 - i))
    const view = liveView({ ...live, liveCount: 140, live: many }, 12)
    expect(view.rows).toHaveLength(11)
    expect(view.more).toBe(129)
  })

  it('keeps keys unique when two phones share a name and a moment', () => {
    const view = liveView({ ...live, liveCount: 2, live: [person('Ann', 5), person('Ann', 5)] }, 12)
    expect(new Set(view.rows.map((r) => r.key)).size).toBe(2)
  })

  it('copes with a server that sends no presence', () => {
    expect(liveView(live, 12)).toEqual({ count: 0, rows: [], more: 0 })
  })

  it('has a plain label for every stage', () => {
    for (const stage of RoomStage.options) expect(STAGE_LABEL[stage].length).toBeGreaterThan(0)
    expect(STAGE_LABEL.choice).toBe('tapping')
    expect(STAGE_LABEL.result).toBe('reading the ticket')
  })
})

describe('roomMood', () => {
  it('wears the most common verdict, steady when empty or tied', () => {
    expect(roomMood(emptyRoom)).toBe('steady')
    expect(roomMood({ ...live, mix: { steady: 1, wired: 3, tipsy: 2, wobbly: 0 } })).toBe('wired')
    expect(roomMood({ ...live, mix: { steady: 2, wired: 2, tipsy: 0, wobbly: 0 } })).toBe('steady')
  })
})

it('polls every 1.5 seconds', () => {
  expect(POLL_MS).toBe(1500)
})

describe('commentaryLine', () => {
  it('shows only a non-empty string', () => {
    expect(commentaryLine({ ...live, commentary: 'The room is calm.' })).toBe('The room is calm.')
    expect(commentaryLine({ ...live, commentary: '   ' })).toBeNull()
    expect(commentaryLine({ ...live, commentary: null })).toBeNull()
    expect(commentaryLine({ ...live, commentary: undefined })).toBeNull()
  })
})

describe('join URL and QR', () => {
  it('points at the phone app on the same origin', () => {
    expect(joinUrl('https://kachka.fun')).toBe('https://kachka.fun/privacy')
    expect(joinUrl('http://192.168.1.5:5173/')).toBe('http://192.168.1.5:5173/privacy')
    expect(displayUrl('https://kachka.fun/')).toBe('kachka.fun')
  })

  it('encodes the URL with a quiet zone and the finder patterns in place', () => {
    const url = joinUrl('https://kachka.fun')
    const n = create(url, { errorCorrectionLevel: 'M' }).modules.size
    const qr = qrGeometry(url)
    expect(qr.size).toBe(n + 2 * QR_QUIET_ZONE)
    const q = QR_QUIET_ZONE
    // Top row of the top-left and top-right finders: a run of 7 dark modules, offset by the quiet zone.
    expect(qr.path.startsWith(`M${q} ${q}h7v1h-7z`)).toBe(true)
    expect(qr.path).toContain(`M${q + n - 7} ${q}h7v1h-7z`)
    // Nothing is drawn inside the quiet zone.
    const xs = [...qr.path.matchAll(/M(\d+) (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])])
    for (const [x, y] of xs) {
      expect(x).toBeGreaterThanOrEqual(q)
      expect(y).toBeGreaterThanOrEqual(q)
      expect(x).toBeLessThan(q + n)
      expect(y).toBeLessThan(q + n)
    }
  })
})

describe('createPoller', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('polls on start and every interval, pauses while hidden, refreshes when visible', async () => {
    let hidden = false
    const fetchRoom = vi.fn(async () => live)
    const onResult = vi.fn()
    const p = createPoller({ fetchRoom, onResult, isHidden: () => hidden, intervalMs: 2000 })

    p.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchRoom).toHaveBeenCalledTimes(1)
    expect(onResult).toHaveBeenCalledWith(live)

    await vi.advanceTimersByTimeAsync(2000)
    expect(fetchRoom).toHaveBeenCalledTimes(2)

    hidden = true
    p.visibilityChanged()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchRoom).toHaveBeenCalledTimes(2)

    hidden = false
    p.visibilityChanged()
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchRoom).toHaveBeenCalledTimes(3)

    p.stop()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchRoom).toHaveBeenCalledTimes(3)
  })

  it('discards a response begun before hiding and obtains a fresh one on return', async () => {
    let hidden = false
    let release!: (value: RoomState) => void
    const fetchRoom = vi.fn().mockImplementationOnce(() => new Promise(resolve => { release = resolve }))
      .mockResolvedValue(emptyRoom)
    const onResult = vi.fn()
    const poller = createPoller({ fetchRoom, onResult, isHidden: () => hidden })
    poller.start()
    hidden = true
    poller.visibilityChanged()
    hidden = false
    poller.visibilityChanged()
    release(live)
    await vi.advanceTimersByTimeAsync(0)
    expect(onResult.mock.calls.map(([room]) => room)).toEqual([null, emptyRoom])
    poller.stop()
  })

  it('passes a failed poll through as null and keeps polling', async () => {
    const fetchRoom = vi.fn(async () => null)
    const onResult = vi.fn()
    const p = createPoller({ fetchRoom, onResult, isHidden: () => false, intervalMs: 2000 })
    p.start()
    await vi.advanceTimersByTimeAsync(4000)
    expect(onResult).toHaveBeenCalledTimes(3)
    expect(onResult).toHaveBeenLastCalledWith(null)
    p.stop()
  })
})
