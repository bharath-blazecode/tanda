import { describe, expect, it } from 'vitest'
import type { DrinkInput as Drink } from './serving'
import { CAFFEINE_MG, caffeineMgToday, nudgeFor } from './nudge'

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

describe('caffeine', () => {
  it('does not turn a Wired stamp into a caffeine instruction', () => {
    expect(nudgeFor('wired', coffee).nudge).toBe('carry-on')
  })

  it('does not treat a logged intake total as an individual stopping point', () => {
    const heavy: Drink[] = Array.from({ length: 5 }, () => ({ kind: 'coffee', at: 0 }))
    expect(caffeineMgToday(heavy)).toBe(500)
    expect(nudgeFor('steady', heavy).nudge).toBe('carry-on')
  })

  it('leaves a steady reading alone after one coffee', () => {
    expect(nudgeFor('steady', coffee).nudge).toBe('carry-on')
  })

  it('counts only the drinks that carry caffeine', () => {
    expect(caffeineMgToday(beer)).toBe(0)
    expect(caffeineMgToday(coffee)).toBe(CAFFEINE_MG.coffee)
  })
})
