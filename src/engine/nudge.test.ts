import { describe, expect, it } from 'vitest'
import type { Drink } from '../../shared/contracts'
import { nudgeFor } from './nudge'

const beer: Drink[] = [{ kind: 'beer', at: 0 }]
const coffee: Drink[] = [{ kind: 'coffee', at: 0 }]

describe('safety rules', () => {
  it('tipsy always maps to ride-or-friend', () => {
    expect(nudgeFor('tipsy', beer).nudge).toBe('ride-or-friend')
    expect(nudgeFor('tipsy', []).nudge).toBe('ride-or-friend')
  })

  it('any alcohol logged shows the safety line, steady included', () => {
    for (const verdict of ['steady', 'wired', 'tipsy', 'wobbly'] as const) {
      expect(nudgeFor(verdict, beer).showSafetyLine).toBe(true)
    }
  })

  it('steady with alcohol logged is never a plain carry-on', () => {
    expect(nudgeFor('steady', beer).nudge).toBe('steady-not-a-driving-test')
  })

  it('caffeine alone does not show the safety line', () => {
    expect(nudgeFor('steady', coffee).showSafetyLine).toBe(false)
  })
})
