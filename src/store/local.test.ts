import { describe, expect, it } from 'vitest'
import { Stored, StoredV1 } from '../../shared/contracts'
import { isValidNickname } from '../../shared/nicknames'
import { KEY, LEGACY_KEY, load, migrateV1, parseStored, reset, setRoomSharing, update } from './local'

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

const NOW = 1_763_700_000_000
const stand = { swayRms: 0.5, swayLateralRms: 0.3, hz: 60, valid: true }
const choice = { medianMs: 450, wrong: 0, lapses: 0, trials: 8 }
const assessment = {
  verdict: 'steady',
  confidence: 'high',
  drift: { sway: 0.1 },
  score: 96,
  nudge: 'carry-on',
  showSafetyLine: false,
  partial: false,
}

function v1Record(over: Record<string, unknown> = {}) {
  return {
    v: 1,
    deviceId: '00000000-0000-4000-8000-000000000001',
    nickname: 'Calm Quokka',
    shareToRoom: true,
    baseline: { run: { stand, choice, at: NOW - 86_400_000 }, clean: true },
    drinks: [
      { kind: 'coffee', at: NOW - 3_600_000 },
      { kind: 'energy', at: NOW - 1_800_000 },
      { kind: 'beer', at: NOW - 600_000 },
    ],
    lastResult: { run: { stand, choice, at: NOW - 60_000 }, assessment, line: 'Hello.', mode: 'real' },
    ...over,
  }
}

describe('a fresh record', () => {
  it('is v2, has a generated nickname, no drinks, and nothing shared until asked', () => {
    const value = load(fakeStorage())
    expect(value.v).toBe(2)
    expect(value.drinks).toEqual([])
    expect(value.baseline).toBeUndefined()
    expect(value.shareToRoom).toBe(false)
    expect(value.aiCommentary).toBe(false)
    expect(isValidNickname(value.nickname)).toBe(true)
  })

  it('keeps the same device id across loads', () => {
    const storage = fakeStorage()
    expect(load(storage).deviceId).toBe(load(storage).deviceId)
  })

  it('persists an update', () => {
    const storage = fakeStorage()
    update((s) => ({ ...s, drinks: [...s.drinks, { id: 'a', kind: 'coffee', at: 1 }] }), storage)
    expect(load(storage).drinks).toHaveLength(1)
  })
})

describe('migration from v1', () => {
  it('keeps a personal baseline, the log and the last ticket, and writes them under bc:v2', () => {
    const storage = fakeStorage({ [LEGACY_KEY]: JSON.stringify(v1Record()) })
    const value = load(storage)
    expect(value.v).toBe(2)
    expect(value.nickname).toBe('Calm Quokka')
    expect(value.deviceId).toBe('00000000-0000-4000-8000-000000000001')
    expect(value.baseline?.run.stand?.swayRms).toBe(0.5)
    expect(value.baseline?.clean).toBe(true)
    expect(value.drinks).toHaveLength(3)
    expect(value.lastResult?.reference.kind).toBe('personal')
    expect(value.lastResult?.reference.run.at).toBe(NOW - 86_400_000)
    expect(Stored.safeParse(JSON.parse(storage.data.get(KEY)!)).success).toBe(true)
  })

  it('leaves the v1 record byte for byte, so a rolled-back build still reads it', () => {
    const original = JSON.stringify(v1Record())
    const storage = fakeStorage({ [LEGACY_KEY]: original })
    load(storage)
    update((s) => ({ ...s, nickname: 'Changed Name' }), storage)
    expect(storage.data.get(LEGACY_KEY)).toBe(original)
    expect(StoredV1.safeParse(JSON.parse(storage.data.get(LEGACY_KEY)!)).success).toBe(true)
  })

  it('gives every drink an id, marks it legacy, and writes the v1 coffee and energy defaults down', () => {
    const value = load(fakeStorage({ [LEGACY_KEY]: JSON.stringify(v1Record()) }))
    const [coffee, energy, beer] = value.drinks
    expect(new Set(value.drinks.map((d) => d.id)).size).toBe(3)
    expect(value.drinks.every((d) => d.legacy === true)).toBe(true)
    expect(coffee.caffeine).toEqual({ basis: 'serving', mg: 100, source: 'default' })
    expect(energy.caffeine).toEqual({ basis: 'serving', mg: 80, source: 'default' })
    // A v1 beer was a count. It stays a count: no volume, no strength, no standard drinks invented.
    expect(beer.caffeine).toBeUndefined()
    expect(beer.alcohol).toBeUndefined()
    expect(beer.servingMl).toBeUndefined()
  })

  it('turns room sharing off, because v1 turned it on without asking', () => {
    const value = load(fakeStorage({ [LEGACY_KEY]: JSON.stringify(v1Record({ shareToRoom: true })) }))
    expect(value.shareToRoom).toBe(false)
  })

  it('does not carry the stock normal into the personal baseline, and keeps it as the ticket reference', () => {
    const stock = { run: { stand, choice, at: 0 }, clean: true }
    const migrated = migrateV1(v1Record({ baseline: stock }))
    expect(migrated?.value.baseline).toBeUndefined()
    expect(migrated?.exampleBaselineRemoved).toBe(true)
    expect(migrated?.value.lastResult?.reference.kind).toBe('example')
  })

  it('drops only the drink that fails validation', () => {
    const drinks = [{ kind: 'coffee', at: 1 }, { kind: 'absinthe', at: 2 }, { kind: 'wine', at: 'late' }, { kind: 'wine', at: 3 }]
    const migrated = migrateV1(v1Record({ drinks }))
    expect(migrated?.value.drinks.map((d) => d.kind)).toEqual(['coffee', 'wine'])
    expect(migrated?.dropped).toEqual(['drinks[1]', 'drinks[2]'])
    expect(migrated?.value.baseline).toBeDefined()
  })

  it('drops a v1 ticket that has no baseline to print it against, and keeps the rest', () => {
    const migrated = migrateV1(v1Record({ baseline: undefined }))
    expect(migrated?.value.lastResult).toBeUndefined()
    expect(migrated?.dropped).toContain('lastResult')
    expect(migrated?.value.drinks).toHaveLength(3)
  })

  it('regenerates a nickname that fails validation rather than wiping the record', () => {
    const migrated = migrateV1(v1Record({ nickname: 'x' }))
    expect(isValidNickname(migrated!.value.nickname)).toBe(true)
    expect(migrated?.value.baseline).toBeDefined()
  })
})

describe('reading a v2 record', () => {
  it('keeps every valid field when one drink is broken, and rewrites the record without it', () => {
    const good = load(fakeStorage())
    const raw = { ...good, drinks: [{ id: 'a', kind: 'tea', at: 5 }, { id: 'b', kind: 'tea', at: 'noon' }] }
    const storage = fakeStorage({ [KEY]: JSON.stringify(raw) })
    const value = load(storage)
    expect(value.drinks.map((d) => d.id)).toEqual(['a'])
    expect(value.deviceId).toBe(good.deviceId)
    expect(JSON.parse(storage.data.get(KEY)!).drinks).toHaveLength(1)
  })

  it('drops a broken baseline but keeps the log and the name', () => {
    const good = load(fakeStorage())
    const parsed = parseStored({ ...good, nickname: 'Keep Me', baseline: { run: { at: 1 }, clean: true } })
    expect(parsed?.value.baseline).toBeUndefined()
    expect(parsed?.value.nickname).toBe('Keep Me')
    expect(parsed?.dropped).toEqual(['baseline'])
  })

  it('refuses a stored approximate pulse that claims to be scored', () => {
    const good = load(fakeStorage())
    const run = { choice, hr: 70, pulse: { status: 'approximate', bpm: 70 }, at: 1 }
    const parsed = parseStored({ ...good, baseline: { run, clean: true } })
    expect(parsed?.value.baseline).toBeUndefined()
  })

  it('falls back to the v1 record when the v2 text is unreadable', () => {
    const storage = fakeStorage({ [KEY]: '{not json', [LEGACY_KEY]: JSON.stringify(v1Record()) })
    expect(load(storage).nickname).toBe('Calm Quokka')
  })

  it('starts fresh from something that is neither version', () => {
    const storage = fakeStorage({ [LEGACY_KEY]: JSON.stringify({ v: 0, junk: true }) })
    expect(load(storage).v).toBe(2)
  })
})

describe('storage failures', () => {
  it('honours withdrawal when the old enabled preference and grant stay readable', () => {
    const storage = fakeStorage()
    expect(setRoomSharing(true, storage).shareToRoom).toBe(true)
    storage.setItem = storage.removeItem = () => { throw new Error('Storage denied') }
    expect(setRoomSharing(false, storage).shareToRoom).toBe(false)
    expect(JSON.parse(storage.data.get(KEY)!).shareToRoom).toBe(true)
    expect(load(storage).shareToRoom).toBe(false)
    expect(load(fakeStorage(Object.fromEntries(storage.data))).shareToRoom).toBe(false)
    expect(setRoomSharing(true, storage).shareToRoom).toBe(false)
    expect(reset(storage)).toBe(false)
  })

  it('an old disk record cannot grant sharing to another document', () => {
    const storage = fakeStorage()
    setRoomSharing(true, storage)
    expect(load({ ...storage }).shareToRoom).toBe(false)
  })

  it('keeps one identity for the session when the browser refuses to store anything', () => {
    const refusing = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {},
    }
    const first = load(refusing)
    const second = update((s) => ({ ...s, nickname: 'Still Me' }), refusing)
    expect(second.deviceId).toBe(first.deviceId)
    expect(load(refusing).nickname).toBe('Still Me')
  })

  it('survives a storage that throws on read', () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {},
      removeItem: () => {},
    }
    expect(load(broken).v).toBe(2)
  })
})

describe('reset', () => {
  it('removes the v2 record and the v1 rollback copy', () => {
    const storage = fakeStorage({ [LEGACY_KEY]: JSON.stringify(v1Record()) })
    const before = load(storage).deviceId
    reset(storage)
    expect(storage.data.has(KEY)).toBe(false)
    expect(storage.data.has(LEGACY_KEY)).toBe(false)
    expect(load(storage).deviceId).not.toBe(before)
  })
})
