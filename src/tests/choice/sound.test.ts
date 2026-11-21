import { afterEach, expect, it, vi } from 'vitest'
import { createTapSound } from './sound'

afterEach(() => vi.unstubAllGlobals())

it('plays distinct cues and releases audio resources', () => {
  const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() })
  const makeVoice = () => ({
    type: 'sine', frequency: param(), start: vi.fn(), stop: vi.fn(),
    connect: vi.fn(), disconnect: vi.fn(), onended: null as (() => void) | null,
  })
  const voices: ReturnType<typeof makeVoice>[] = []
  const close = vi.fn().mockResolvedValue(undefined)
  const resume = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('AudioContext', class {
    state = 'running'
    currentTime = 2
    destination = {}
    close = close
    resume = resume
    createGain() { return { gain: param(), connect: vi.fn(), disconnect: vi.fn() } }
    createOscillator() { const voice = makeVoice(); voices.push(voice); return voice }
  })
  const sound = createTapSound()
  expect(resume).toHaveBeenCalledOnce()
  sound.play(true)
  expect(voices).toHaveLength(2)
  expect(voices[0].frequency.setValueAtTime).toHaveBeenCalledWith(660, 2)
  expect(voices[1].frequency.setValueAtTime).toHaveBeenCalledWith(990, 2.055)
  voices[0].onended!()
  expect(voices[0].disconnect).toHaveBeenCalledOnce()
  sound.play(false)
  expect(voices).toHaveLength(3)
  expect(voices[2].type).toBe('triangle')
  expect(voices[2].frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(90, 2.16)
  sound.close()
  expect(voices[2].stop).toHaveBeenLastCalledWith()
  expect(close).toHaveBeenCalledOnce()
  sound.play(true)
  expect(voices).toHaveLength(3)
})

it('keeps silent when audio is unsupported', () => {
  vi.stubGlobal('AudioContext', undefined)
  const sound = createTapSound()
  expect(() => { sound.play(true); sound.play(false); sound.close() }).not.toThrow()
})
