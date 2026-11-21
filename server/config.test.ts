import { describe, expect, it } from 'vitest'
import { loadConfig } from './config'

describe('loadConfig VERDICT_MODEL', () => {
  it('defaults to haiku and accepts sonnet', () => {
    expect(loadConfig({}).verdictModel).toBe('claude-haiku-5-5')
    expect(loadConfig({ VERDICT_MODEL: 'claude-sonnet-5-5' }).verdictModel).toBe('claude-sonnet-5-5')
  })

  it('refuses to boot with a model outside the allowlist', () => {
    for (const model of ['claude-opus-5-5', 'claude-haiku-5-5-latest', 'gpt-whatever']) {
      expect(() => loadConfig({ VERDICT_MODEL: model })).toThrow(/VERDICT_MODEL must be one of/)
    }
  })
})

describe('loadConfig ROOM_NAMES', () => {
  it('defaults to typed and accepts generated', () => {
    expect(loadConfig({}).roomNames).toBe('typed')
    expect(loadConfig({ ROOM_NAMES: '' }).roomNames).toBe('typed')
    expect(loadConfig({ ROOM_NAMES: 'generated' }).roomNames).toBe('generated')
  })

  it('refuses to boot with any other value', () => {
    for (const value of ['Generated', 'off', 'true', 'none']) {
      expect(() => loadConfig({ ROOM_NAMES: value })).toThrow(/ROOM_NAMES must be one of/)
    }
  })
})
