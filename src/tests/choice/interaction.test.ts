// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ChoiceTest } from './index'

const sound = vi.hoisted(() => ({ play: vi.fn(), stop: vi.fn(), close: vi.fn(), create: vi.fn() }))
vi.mock('./sound', () => ({ createTapSound: sound.create }))

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  sound.play.mockReset()
  sound.close.mockReset()
  sound.create.mockReset().mockReturnValue(sound)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('unlocks audio on Start and gives matching feedback without changing tap scoring', async () => {
  const done = vi.fn()
  render(createElement(ChoiceTest, { onDone: done }))
  expect(sound.create).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Start' }))
  expect(sound.create).toHaveBeenCalledOnce()
  // An early tap is discarded, without playing success or failure feedback.
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Square 1' }))
  expect(sound.play).not.toHaveBeenCalled()
  let scored = 0
  while (!screen.queryByRole('button', { name: 'Next' })) {
    await act(async () => { await vi.advanceTimersByTimeAsync(1400) })
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    const target = screen.getByRole('button', { name: /, lit$/ })
    const wrong = scored === 3 // The first two are warm-ups; wrong on scored trial 2.
    const tapped = wrong
      ? screen.getAllByRole('button', { name: /^Square/ }).find((button) => button !== target)!
      : target
    fireEvent.pointerDown(tapped)
    expect(sound.play).toHaveBeenLastCalledWith(!wrong)
    scored++
  }
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(done).toHaveBeenCalledOnce()
  expect(done.mock.calls[0][0].wrong).toBe(1)
  expect(done.mock.calls[0][0].medianMs).toBe(200)
  expect(sound.play).toHaveBeenCalledTimes(scored)
})

it('closes audio when leaving the test', () => {
  const view = render(createElement(ChoiceTest, { onDone: vi.fn() }))
  fireEvent.click(screen.getByRole('button', { name: 'Start' }))
  view.unmount()
  expect(sound.close).toHaveBeenCalledOnce()
})

it('stops audio and resets the test when the page is hidden', () => {
  render(createElement(ChoiceTest, { onDone: vi.fn() }))
  fireEvent.click(screen.getByRole('button', { name: 'Start' }))
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  fireEvent(document, new Event('visibilitychange'))
  expect(sound.close).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy()
})
