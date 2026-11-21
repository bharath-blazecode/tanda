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
