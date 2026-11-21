import { describe, expect, it } from 'vitest'
import { isValidNickname } from '../../shared/nicknames'
import { load, reset, update } from './local'

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

describe('local store', () => {
  it('creates a fresh record with a generated nickname and no drinks', () => {
    const value = load(fakeStorage())
    expect(value.drinks).toEqual([])
    expect(value.baseline).toBeUndefined()
    expect(isValidNickname(value.nickname)).toBe(true)
  })

  it('keeps the same device id across loads', () => {
    const storage = fakeStorage()
    expect(load(storage).deviceId).toBe(load(storage).deviceId)
  })

  it('wipes a stored value that fails validation', () => {
    const storage = fakeStorage({ 'bc:v1': JSON.stringify({ v: 0, junk: true }) })
    expect(load(storage).v).toBe(1)
  })

  it('persists an update', () => {
    const storage = fakeStorage()
    update((s) => ({ ...s, drinks: [...s.drinks, { kind: 'coffee', at: 1 }] }), storage)
    expect(load(storage).drinks).toHaveLength(1)
  })

  it('reset clears everything', () => {
    const storage = fakeStorage()
    const before = load(storage).deviceId
    reset(storage)
    expect(load(storage).deviceId).not.toBe(before)
  })
})
