import { expect, it } from 'vitest'
import { wrapText } from './share'

// One unit per character, so widths are easy to read.
const measure = (s: string) => s.length

it('keeps a short line whole', () => {
  expect(wrapText('get a ride', 20, measure)).toEqual(['get a ride'])
})

it('breaks at spaces and never mid-word', () => {
  expect(wrapText('your phone noticed before you did', 12, measure)).toEqual([
    'your phone',
    'noticed',
    'before you',
    'did',
  ])
})

it('gives a word that is too wide its own line', () => {
  expect(wrapText('a supercalifragilistic b', 6, measure)).toEqual(['a', 'supercalifragilistic', 'b'])
})

it('returns nothing for empty text', () => {
  expect(wrapText('   ', 10, measure)).toEqual([])
})
