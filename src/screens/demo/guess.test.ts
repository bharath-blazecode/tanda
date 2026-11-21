import { describe, expect, it } from 'vitest'
import { guessFromDrift, guessLine, isDemoHandicap } from './guess'

describe('guessFromDrift', () => {
  it('names the spin when body sway drifts more than the taps', () => {
    expect(guessFromDrift({ sway: 2.5, choiceRt: 0.2, choiceWrong: 0 })).toBe('spin')
  })
  it('names the other hand when the taps drift more', () => {
    expect(guessFromDrift({ sway: 0.1, choiceRt: 1.2, choiceWrong: 1 })).toBe('offhand')
  })
  it('names the other hand when there was no standing test to drift', () => {
    expect(guessFromDrift({ choiceRt: 2, choiceWrong: 0 })).toBe('offhand')
  })
  it('names nothing below the steady threshold', () => {
    expect(guessFromDrift({ sway: 0.6, choiceRt: 0.4, choiceWrong: 0 })).toBe('none')
    expect(guessFromDrift({})).toBe('none')
  })
  it('does not count improvement as drift', () => {
    expect(guessFromDrift({ sway: -3, choiceRt: -3, choiceWrong: -3 })).toBe('none')
  })
})

describe('guessLine', () => {
  it('says the guess plainly when it matches the pick', () => {
    expect(guessLine('spin', 'spin')).toBe('We think you spun.')
    expect(guessLine('offhand', 'offhand')).toBe('We think that was your other hand.')
  })
  it('owns up when the guess differs from the pick', () => {
    expect(guessLine('offhand', 'spin')).toBe('We think that was your other hand. If we guessed wrong, bodies are odd.')
    expect(guessLine('spin', 'offhand')).toBe('We think you spun. If we guessed wrong, bodies are odd.')
  })
  it('asks for more effort when nothing moved', () => {
    expect(guessLine('none', 'spin')).toBe('Barely a wobble. Try again, with feeling.')
  })
  it('makes no claim about the pick when it is unknown', () => {
    expect(guessLine('spin')).toBe('We think you spun.')
  })
})

describe('isDemoHandicap', () => {
  it('accepts only the two offered handicaps', () => {
    expect(isDemoHandicap('spin')).toBe(true)
    expect(isDemoHandicap('offhand')).toBe(true)
    expect(isDemoHandicap('jacks')).toBe(false)
    expect(isDemoHandicap(undefined)).toBe(false)
  })
})
