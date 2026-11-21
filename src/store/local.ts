// The only file that touches localStorage. Everything personal lives here and never leaves the phone (D7).
import { Stored } from '../../shared/contracts'
import { generateNickname } from '../../shared/nicknames'

const KEY = 'bc:v1'

type KeyValue = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const browserStorage = (): KeyValue => globalThis.localStorage

export function fresh(): Stored {
  return {
    v: 1,
    deviceId: globalThis.crypto.randomUUID(),
    nickname: generateNickname(),
    shareToRoom: false,
    drinks: [],
  }
}

/** Returns what is stored, or a fresh record. A value that fails validation is wiped: no migrations. */
export function load(storage: KeyValue = browserStorage()): Stored {
  try {
    const raw = storage.getItem(KEY)
    if (raw) {
      const parsed = Stored.safeParse(JSON.parse(raw))
      if (parsed.success) return parsed.data
    }
  } catch {
    // Unreadable storage or broken JSON: fall through to a fresh record.
  }
  const value = fresh()
  save(value, storage)
  return value
}

export function save(value: Stored, storage: KeyValue = browserStorage()): void {
  try {
    storage.setItem(KEY, JSON.stringify(value))
  } catch {
    // Private mode or a full disk: the app keeps working for this session.
  }
}

export function update(change: (current: Stored) => Stored, storage: KeyValue = browserStorage()): Stored {
  const next = change(load(storage))
  save(next, storage)
  return next
}

export function reset(storage: KeyValue = browserStorage()): void {
  try {
    storage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}
