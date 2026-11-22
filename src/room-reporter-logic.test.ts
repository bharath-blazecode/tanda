import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Stored } from '../shared/contracts'
import { createHeartbeat, effectiveStage, RESULT_FRESH_MS, resultToPost, routeStage } from './room-reporter-logic'

const NOW = 1_763_700_000_000

describe('routeStage', () => {
  it('maps each phone route to a stage', () => {
    expect(routeStage('/')).toBe('joined')
    expect(routeStage('/setup')).toBe('joined')
    expect(routeStage('/baseline')).toBe('baseline')
    expect(routeStage('/check')).toBe('check')
    expect(routeStage('/result')).toBe('result')
    expect(routeStage('/demo')).toBe('demo')
    expect(routeStage('/home')).toBe('idle')
    expect(routeStage('/log')).toBe('idle')
    expect(routeStage('/check/')).toBe('check')
  })

  it('never reports the projector, the lab or an unknown route', () => {
    for (const path of ['/room', '/room/', '/lab', '/lab/stand', '/lab/kit', '/nope']) {
      expect(routeStage(path)).toBeNull()
    }
  })
})

describe('effectiveStage', () => {
  it('lets a finer stage win on the route it was set on, and only there', () => {
    const stand = { stage: 'stand' as const, pathname: '/check' }
    expect(effectiveStage('/check', null)).toBe('check')
    expect(effectiveStage('/check', stand)).toBe('stand')
    expect(effectiveStage('/result', stand)).toBe('result')
    expect(effectiveStage('/room', { stage: 'stand', pathname: '/room' })).toBeNull()
  })
})

const stored = (over: Partial<Stored> = {}): Stored => ({
  v: 2,
  deviceId: '00000000-0000-4000-8000-000000000001',
  nickname: 'Calm Quokka',
  shareToRoom: true,
  aiCommentary: true,
  drinks: [],
  lastResult: {
    run: { choice: { medianMs: 420, wrong: 0, lapses: 0, trials: 12 }, at: NOW - 1000 },
    assessment: {
      verdict: 'wired',
      confidence: 'high',
      drift: {},
      score: 71,
      nudge: 'water',
      showSafetyLine: false,
      partial: true,
    },
    line: 'Hello.',
    mode: 'real',
    reference: { kind: 'personal', run: { choice: { medianMs: 400, wrong: 0, lapses: 0, trials: 12 }, at: NOW - 86_400_000 }, clean: true },
  },
  ...over,
})

describe('resultToPost', () => {
  it('builds the board post from the stored result', () => {
    expect(resultToPost(stored(), null, NOW)).toEqual({
      deviceId: '00000000-0000-4000-8000-000000000001',
      nickname: 'Calm Quokka',
      verdict: 'wired',
      score: 71,
      mode: 'real',
    })
  })

  it('posts nothing when sharing is off or there is no result', () => {
    expect(resultToPost(stored({ shareToRoom: false }), null, NOW)).toBeNull()
    expect(resultToPost(stored({ lastResult: undefined }), null, NOW)).toBeNull()
  })

  it('posts a result once per session', () => {
    expect(resultToPost(stored(), NOW - 1000, NOW)).toBeNull()
    expect(resultToPost(stored(), NOW - 99_000, NOW)).not.toBeNull()
  })

  it('does not post an old ticket reopened later', () => {
    expect(resultToPost(stored(), null, NOW - 1000 + RESULT_FRESH_MS)).not.toBeNull()
    expect(resultToPost(stored(), null, NOW + RESULT_FRESH_MS)).toBeNull()
  })

  it('carries the guessed handicap in demo mode only', () => {
    const base = stored().lastResult!
    const demo = stored({
      lastResult: { ...base, mode: 'demo', assessment: { ...base.assessment, guessedHandicap: 'spin' } },
    })
    expect(resultToPost(demo, null, NOW)).toMatchObject({ mode: 'demo', handicap: 'spin' })
    const real = stored({ lastResult: { ...base, assessment: { ...base.assessment, guessedHandicap: 'spin' } } })
    expect(resultToPost(real, null, NOW)).not.toHaveProperty('handicap')
  })

  it('posts an example run as simulated, and never with a handicap nobody chose', () => {
    const base = stored().lastResult!
    const example = stored({
      lastResult: {
        ...base,
        mode: 'demo',
        reference: { ...base.reference, kind: 'example' },
        assessment: { ...base.assessment, guessedHandicap: 'spin' },
      },
    })
    const post = resultToPost(example, null, NOW)
    expect(post).toMatchObject({ mode: 'demo' })
    expect(post).not.toHaveProperty('handicap')
  })
})

describe('createHeartbeat', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('beats at once on a stage change, then every interval, and not on a repeat of the same stage', async () => {
    const send = vi.fn()
    const hb = createHeartbeat({ send, isHidden: () => false, intervalMs: 15_000 })
    hb.setStage('joined')
    expect(send).toHaveBeenLastCalledWith('joined')
    hb.setStage('joined')
    expect(send).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(15_000)
    expect(send).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(5_000)
    hb.setStage('check')
    expect(send).toHaveBeenCalledTimes(3)
    expect(send).toHaveBeenLastCalledWith('check')
    // The change restarted the interval.
    await vi.advanceTimersByTimeAsync(14_999)
    expect(send).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(1)
    expect(send).toHaveBeenCalledTimes(4)
    hb.stop()
  })

  it('stays silent while hidden and beats again when visible', async () => {
    let hidden = false
    const send = vi.fn()
    const hb = createHeartbeat({ send, isHidden: () => hidden, intervalMs: 15_000 })
    hb.setStage('baseline')
    hidden = true
    hb.visibilityChanged()
    await vi.advanceTimersByTimeAsync(60_000)
    hb.setStage('check')
    expect(send).toHaveBeenCalledTimes(1)
    hidden = false
    hb.visibilityChanged()
    expect(send).toHaveBeenCalledTimes(2)
    expect(send).toHaveBeenLastCalledWith('check')
    hb.stop()
  })

  it('stops on a null stage and on stop()', async () => {
    const send = vi.fn()
    const hb = createHeartbeat({ send, isHidden: () => false, intervalMs: 15_000 })
    hb.setStage('idle')
    hb.setStage(null)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(send).toHaveBeenCalledTimes(1)
    hb.setStage('demo')
    hb.stop()
    hb.visibilityChanged()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(send).toHaveBeenCalledTimes(2)
  })
})
