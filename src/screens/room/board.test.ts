import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { create } from 'qrcode'
import type { RoomState } from '../../../shared/contracts'
import {
  commentaryLine,
  createPoller,
  displayUrl,
  emptyRoom,
  initialBoard,
  isStale,
  joinUrl,
  qrGeometry,
  QR_QUIET_ZONE,
  reduceBoard,
} from './board'

const live: RoomState = {
  ...emptyRoom,
  total: 2,
  mix: { steady: 1, wired: 1, tipsy: 0, wobbly: 0 },
  feed: [{ nickname: 'Quiet Heron', verdict: 'steady', score: 91, mode: 'real', at: 1 }],
  updatedAt: 10,
}

describe('reduceBoard', () => {
  it('keeps the last good state when a poll fails, and marks it stale after repeated failures', () => {
    const ok = reduceBoard(initialBoard, live)
    expect(ok).toEqual({ room: live, failures: 0 })
    expect(isStale(ok)).toBe(false)

    const once = reduceBoard(ok, null)
    expect(once.room).toBe(live)
    expect(isStale(once)).toBe(false) // a single dropped poll stays quiet

    const twice = reduceBoard(once, null)
    expect(twice.room).toBe(live)
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
    expect(joinUrl('https://kachka.fun')).toBe('https://kachka.fun/')
    expect(joinUrl('http://192.168.1.5:5173/')).toBe('http://192.168.1.5:5173/')
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
