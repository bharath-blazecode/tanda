// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { PulseAnalysis, PulseAttempt } from './analyze'

const camera = vi.hoisted(() => ({ open: vi.fn(), sample: vi.fn(), stop: vi.fn(), torch: vi.fn() }))
const analyze = vi.hoisted(() => vi.fn())

vi.mock('../../sensors/camera', () => ({
  startCamera: camera.open,
  sampleFrame: camera.sample,
  stopCamera: camera.stop,
  tryTorch: camera.torch,
}))
vi.mock('./analyze', async (importOriginal) => ({
  ...await importOriginal<typeof import('./analyze')>(),
  analyzePulseAttempts: analyze,
}))

import { PulseTest } from './index'

function reading(overrides: Partial<PulseAnalysis> = {}): PulseAnalysis {
  return {
    bpm: 76,
    samples: 450,
    modulation: 1.2,
    rough: false,
    confidence: 0.8,
    coveredFraction: 1,
    seconds: 15,
    reason: 'ok',
    ...overrides,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

function cameraStream() {
  const stop = vi.fn()
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream
  return { stream, stop }
}

let now: number
let nextFrame: number
let frames: Map<number, FrameRequestCallback>
let opened: ReturnType<typeof cameraStream>[]
let play: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  now = 0
  nextFrame = 0
  frames = new Map()
  opened = []
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = ++nextFrame
    frames.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id) })
  vi.spyOn(HTMLMediaElement.prototype, 'currentTime', 'get').mockImplementation(() => now / 1000)
  camera.open.mockReset().mockImplementation(async () => {
    const next = cameraStream()
    opened.push(next)
    return { stream: next.stream }
  })
  camera.torch.mockReset().mockResolvedValue(false)
  camera.sample.mockReset().mockImplementation((_video, _canvas, t: number) => ({
    t, red: 150 + Math.sin(t / 150), green: 80, blue: 50, spread: 2, covered: true,
  }))
  camera.stop.mockReset().mockImplementation((stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop())
  })
  analyze.mockReset().mockReturnValue(reading())
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function click(name: string) {
  await act(async () => { fireEvent.click(screen.getByRole('button', { name })) })
}

/** Exercise the component's actual settling gate, frame collection and timed finish. */
function advanceFrame(ms = 100) {
  now += ms
  const pending = [...frames]
  frames.clear()
  for (const [, callback] of pending) callback(now)
}

function finishCapture() {
  const previous = analyze.mock.calls.length
  act(() => {
    for (let i = 0; i < 210 && analyze.mock.calls.length === previous; i++) advanceFrame()
  })
  expect(analyze.mock.calls.length).toBe(previous + 1)
  expect(frames.size).toBe(0)
}

function history(call: number): PulseAttempt[] {
  return analyze.mock.calls[call][0]
}

it('collects all camera channels, stops the stream, and passes a clear rate onward', async () => {
  const onDone = vi.fn()
  render(createElement(PulseTest, { onDone }))
  await click('Start')
  expect(screen.getByRole('heading', { name: 'Cover the lens' })).toBeTruthy()
  finishCapture()

  expect(screen.getByRole('heading', { name: '76 bpm' })).toBeTruthy()
  const [attempt] = history(0)
  expect(attempt.samples.length).toBeGreaterThan(100)
  expect(attempt.samples[0]).toEqual({
    t: 600, red: 150 + Math.sin(600 / 150), green: 80, blue: 50, covered: true,
  })
  expect(attempt.endedAt).toBe(now)
  expect(analyze.mock.calls[0][1]).toBe(now)
  expect(opened[0].stop).toHaveBeenCalledOnce()
  expect(onDone).not.toHaveBeenCalled()
  await click('Next')
  expect(onDone).toHaveBeenCalledExactlyOnceWith(76, { status: 'measured', bpm: 76 })
})

it('samples each presented video frame only once when animation frames run faster than the camera', async () => {
  const { container } = render(createElement(PulseTest, { onDone: vi.fn() }))
  Object.defineProperty(container.querySelector('video'), 'getVideoPlaybackQuality', {
    value: () => ({ totalVideoFrames: Math.floor(now / 80) }),
  })
  await click('Start')
  let animationFrames = 0
  act(() => {
    while (analyze.mock.calls.length === 0 && animationFrames < 1_000) {
      advanceFrame(20)
      animationFrames++
    }
  })

  expect(analyze).toHaveBeenCalledOnce()
  const times = history(0)[0].samples.map((sample) => sample.t)
  expect(times.length).toBeGreaterThan(100)
  expect(times.slice(1).every((t, i) => t - times[i] === 80)).toBe(true)
  expect(camera.sample.mock.calls.length).toBeLessThan(animationFrames / 2)
  expect(opened[0].stop).toHaveBeenCalledOnce()
})

it('finishes on time and shows no reading when the video stalls after capture begins', async () => {
  analyze.mockReturnValue(reading({ bpm: null, reason: 'too-short', seconds: 0, samples: 1 }))
  const { container } = render(createElement(PulseTest, { onDone: vi.fn() }))
  let presented = 0
  Object.defineProperty(container.querySelector('video'), 'getVideoPlaybackQuality', {
    value: () => ({ totalVideoFrames: presented }),
  })
  await click('Start')
  act(() => {
    for (let i = 0; i < 6; i++) {
      presented++
      advanceFrame()
    }
  })
  const sampled = camera.sample.mock.calls.length
  finishCapture()

  expect(camera.sample).toHaveBeenCalledTimes(sampled)
  expect(history(0)[0].samples).toHaveLength(1)
  expect(history(0)[0].endedAt - history(0)[0].samples[0].t).toBe(18_000)
  expect(screen.getByRole('heading', { name: 'No reading' })).toBeTruthy()
  expect(opened[0].stop).toHaveBeenCalledOnce()
})

it('labels a weak standalone rate as approximate and does not use it for scoring', async () => {
  analyze.mockReturnValue(reading({ rough: true, confidence: 0.4 }))
  const onDone = vi.fn()
  render(createElement(PulseTest, { onDone }))
  await click('Start')
  finishCapture()

  expect(screen.getByRole('heading', { name: 'About 76 bpm' })).toBeTruthy()
  expect(screen.getByText(/An approximate figure from a weak signal/)).toBeTruthy()
  await click('Next')
  expect(onDone).toHaveBeenCalledExactlyOnceWith(null, { status: 'approximate', bpm: 76 })
})

it('keeps an unreadable capture for a retry and explains a combined approximate result', async () => {
  analyze.mockReturnValueOnce(reading({ bpm: null, reason: 'no-rhythm', confidence: 0.2 }))
    .mockReturnValueOnce(reading({ rough: true, combined: true, confidence: 0.45 }))
  const onDone = vi.fn()
  render(createElement(PulseTest, { onDone }))
  await click('Start')
  finishCapture()
  expect(screen.getByRole('heading', { name: 'No reading' })).toBeTruthy()
  expect(onDone).not.toHaveBeenCalled()

  await click('Try again · same finger')
  finishCapture()
  expect(history(1)).toHaveLength(2)
  expect(history(1)[0]).toBe(history(0)[0])
  expect(history(1)[1].samples[0].t).toBeGreaterThan(history(1)[0].endedAt)
  expect(opened.every((entry) => entry.stop.mock.calls.length > 0)).toBe(true)
  expect(screen.getByRole('heading', { name: 'About 76 bpm' })).toBeTruthy()
  expect(screen.getByText(/Approximate from two compatible captures/)).toBeTruthy()
  await click('Next')
  expect(onDone).toHaveBeenCalledExactlyOnceWith(null, { status: 'approximate', bpm: 76, combined: true })
})

it('bounds Again history to two captures and clears it when Next completes the step', async () => {
  const onDone = vi.fn()
  render(createElement(PulseTest, { onDone }))
  await click('Start')
  finishCapture()
  await click('Again · same finger')
  finishCapture()
  await click('Again · same finger')
  finishCapture()

  expect(history(0)).toHaveLength(1)
  expect(history(1)).toHaveLength(2)
  expect(history(2)).toHaveLength(2)
  expect(history(2)[0]).toBe(history(1)[1])
  expect(history(2)).not.toContain(history(0)[0])

  await click('Next')
  await click('Again · same finger')
  finishCapture()
  expect(history(3)).toHaveLength(1)
  expect(onDone).toHaveBeenCalledExactlyOnceWith(76, { status: 'measured', bpm: 76 })
})

it('clears earlier retry context and discards the current capture on Skip', async () => {
  analyze.mockReturnValueOnce(reading({ bpm: null, reason: 'no-rhythm', confidence: 0.2 }))
  const onDone = vi.fn()
  render(createElement(PulseTest, { onDone }))
  await click('Start')
  finishCapture()
  await click('Try again · same finger')
  act(() => { for (let i = 0; i < 12; i++) advanceFrame() })
  await click('Skip')
  expect(onDone).toHaveBeenCalledExactlyOnceWith(null, { status: 'skipped' })
  expect(frames.size).toBe(0)
  expect(analyze).toHaveBeenCalledOnce()
  expect(opened[1].stop).toHaveBeenCalledOnce()

  await click('Start')
  finishCapture()
  expect(history(1)).toHaveLength(1)
  expect(history(1)[0].samples[0].t).toBeGreaterThan(history(0)[0].endedAt)
})

it('stops a capture on unmount and never shares attempt history with a new pulse step', async () => {
  const first = render(createElement(PulseTest, { onDone: vi.fn() }))
  await click('Start')
  finishCapture()
  await click('Again · same finger')
  act(() => advanceFrame())
  first.unmount()
  expect(opened[1].stop).toHaveBeenCalledOnce()
  expect(frames.size).toBe(0)

  render(createElement(PulseTest, { onDone: vi.fn() }))
  await click('Start')
  finishCapture()
  expect(history(1)).toHaveLength(1)
})

it('stops a late camera response without replacing a newer stream after Skip and Start', async () => {
  const late = deferred<{ stream: MediaStream }>()
  const stale = cameraStream()
  const current = cameraStream()
  camera.open.mockReturnValueOnce(late.promise).mockResolvedValueOnce({ stream: current.stream })
  const onDone = vi.fn()
  const { container } = render(createElement(PulseTest, { onDone }))
  await click('Start')
  expect(screen.getByText('Asking for the camera.')).toBeTruthy()
  await click('Skip')
  await click('Start')
  await act(async () => { late.resolve({ stream: stale.stream }) })

  expect(stale.stop).toHaveBeenCalledOnce()
  expect(current.stop).not.toHaveBeenCalled()
  expect(container.querySelector('video')?.srcObject).toBe(current.stream)
  expect(camera.torch).toHaveBeenCalledExactlyOnceWith(current.stream)
  finishCapture()
  expect(current.stop).toHaveBeenCalledOnce()
  expect(history(0)).toHaveLength(1)
})

it('ignores a late denied-camera response after Skip', async () => {
  const late = deferred<{ error: 'denied' }>()
  camera.open.mockReturnValueOnce(late.promise)
  render(createElement(PulseTest, { onDone: vi.fn() }))
  await click('Start')
  await click('Skip')
  await act(async () => { late.resolve({ error: 'denied' }) })
  expect(screen.getByRole('heading', { name: 'Pulse' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'No reading' })).toBeNull()
  expect(frames.size).toBe(0)
})

it('stops a camera that opens after unmount before playing or enabling its torch', async () => {
  const late = deferred<{ stream: MediaStream }>()
  const stale = cameraStream()
  camera.open.mockReturnValueOnce(late.promise)
  const view = render(createElement(PulseTest, { onDone: vi.fn() }))
  await click('Start')
  view.unmount()
  await act(async () => { late.resolve({ stream: stale.stream }) })
  expect(stale.stop).toHaveBeenCalledOnce()
  expect(play).not.toHaveBeenCalled()
  expect(camera.torch).not.toHaveBeenCalled()
  expect(frames.size).toBe(0)
  expect(analyze).not.toHaveBeenCalled()
})

it('does not enable the torch or begin capture when playback resolves after Skip', async () => {
  const playing = deferred<void>()
  play.mockReturnValueOnce(playing.promise)
  render(createElement(PulseTest, { onDone: vi.fn() }))
  await click('Start')
  await click('Skip')
  await act(async () => { playing.resolve() })
  expect(opened[0].stop).toHaveBeenCalled()
  expect(camera.torch).not.toHaveBeenCalled()
  expect(screen.getByRole('heading', { name: 'Pulse' })).toBeTruthy()
  expect(frames.size).toBe(0)
  expect(analyze).not.toHaveBeenCalled()
})

it('does not revive capture when torch setup resolves after unmount', async () => {
  const torch = deferred<boolean>()
  camera.torch.mockReturnValueOnce(torch.promise)
  const view = render(createElement(PulseTest, { onDone: vi.fn() }))
  await click('Start')
  expect(camera.torch).toHaveBeenCalledOnce()
  view.unmount()
  await act(async () => { torch.resolve(true) })
  expect(opened[0].stop).toHaveBeenCalled()
  expect(frames.size).toBe(0)
  expect(analyze).not.toHaveBeenCalled()
})

it('drops the capture and stops all callbacks when the page leaves the foreground', async () => {
  render(createElement(PulseTest, { onDone: vi.fn() }))
  await click('Start')
  act(() => { window.dispatchEvent(new Event('pagehide')) })
  expect(opened[0].stop).toHaveBeenCalled()
  expect(frames.size).toBe(0)
  expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy()
})
