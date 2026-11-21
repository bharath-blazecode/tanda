import { describe, expect, it } from 'vitest'
import { isCovered, type FrameStats } from './camera'

const frame = (over: Partial<FrameStats> = {}): FrameStats => ({
  // A fingertip over the lens: red passes through, the rest does not, and the field is flat.
  red: 150,
  green: 40,
  blue: 30,
  spread: 6,
  ...over,
})

describe('isCovered', () => {
  it('accepts a fingertip over the lens', () => {
    expect(isCovered(frame())).toBe(true)
  })

  it('accepts a dim fingertip, which is what an iPhone gives with no torch', () => {
    expect(isCovered(frame({ red: 40, green: 10, blue: 8 }))).toBe(true)
  })

  it('rejects a view of the room, which is not flat', () => {
    expect(isCovered(frame({ spread: 60 }))).toBe(false)
  })

  it('rejects a washed out frame', () => {
    expect(isCovered(frame({ red: 254, green: 250, blue: 250 }))).toBe(false)
  })

  it('rejects a black frame, so a covered camera with no light is not read as a pulse', () => {
    expect(isCovered(frame({ red: 4, green: 2, blue: 2 }))).toBe(false)
  })

  it('rejects grey, where red is not dominant', () => {
    expect(isCovered(frame({ red: 120, green: 115, blue: 110 }))).toBe(false)
  })

  it('does not divide by zero on a pure red frame', () => {
    expect(isCovered(frame({ red: 200, green: 0, blue: 0 }))).toBe(true)
  })
})
