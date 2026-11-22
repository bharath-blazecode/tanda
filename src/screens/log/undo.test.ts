import { describe, expect, it } from 'vitest'
import type { Drink } from '../../../shared/contracts'
import { applyUndo, readUndo } from './undo'

const a: Drink = { id: 'a', kind: 'coffee', at: 1 }
const b: Drink = { id: 'b', kind: 'tea', at: 2 }

describe('applyUndo', () => {
  it('removes only the entry that was added', () => {
    expect(applyUndo([a, b], { kind: 'added', id: 'b' })).toEqual([a])
  })

  it('puts back the previous version of an edited entry and leaves the rest', () => {
    const edited = { ...a, at: 99, name: 'Flat white' }
    expect(applyUndo([edited, b], { kind: 'edited', previous: a })).toEqual([a, b])
  })

  it('restores a removed entry once, even if undone twice', () => {
    const once = applyUndo([b], { kind: 'removed', previous: a })
    expect(once).toEqual([b, a])
    expect(applyUndo(once, { kind: 'removed', previous: a })).toEqual([b, a])
  })
})

describe('readUndo', () => {
  it('reads a valid operation from router state and ignores anything else', () => {
    expect(readUndo({ undo: { kind: 'added', id: 'x' } })).toEqual({ kind: 'added', id: 'x' })
    expect(readUndo({ undo: 12345 })).toBeNull()
    expect(readUndo(null)).toBeNull()
  })
})
