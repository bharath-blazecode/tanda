// Nicknames are generated on the phone from these fixed lists. A typed name may reach the board too:
// sanitizeName cleans it and refuses links and hate terms, and the server falls back to a generated
// nickname when it does. Funny or rude is accepted; hateful is not.

export const ADJECTIVES = [
  'Wobbly', 'Brisk', 'Mellow', 'Jittery', 'Dizzy', 'Calm', 'Twitchy', 'Loose', 'Steady', 'Sleepy',
  'Zippy', 'Woozy', 'Chirpy', 'Rattled', 'Breezy', 'Shaky', 'Plucky', 'Drowsy', 'Perky', 'Wonky',
] as const

export const ANIMALS = [
  'Quokka', 'Ibis', 'Wombat', 'Gecko', 'Galah', 'Bilby', 'Numbat', 'Kookaburra', 'Echidna', 'Possum',
  'Wallaby', 'Cassowary', 'Dingo', 'Koala', 'Platypus', 'Emu', 'Magpie', 'Bandicoot', 'Pelican', 'Skink',
] as const

/** `random` is injectable so tests are deterministic. */
export function generateNickname(random: () => number = Math.random): string {
  const adjective = ADJECTIVES[Math.floor(random() * ADJECTIVES.length)]
  const animal = ANIMALS[Math.floor(random() * ANIMALS.length)]
  return `${adjective} ${animal}`
}

export function isValidNickname(value: string): boolean {
  const [adjective, animal, ...rest] = value.split(' ')
  if (rest.length > 0 || !adjective || !animal) return false
  return (
    (ADJECTIVES as readonly string[]).includes(adjective) &&
    (ANIMALS as readonly string[]).includes(animal)
  )
}

export const MAX_NAME_CHARS = 16

// Slurs and hate terms only, never ordinary swearing. Kept short on purpose; this is a toy board.
// Matched with spaces and punctuation removed, so "n i g g" is caught. Long enough not to hit names.
const HATE_ANYWHERE = [
  'nigg', 'faggot', 'tranny', 'retard', 'hitler', 'neonazi', 'siegheil', 'whitepower',
  'wetback', 'raghead', 'towelhead', 'kkk', 'ia88', // ia88 is 1488 after the digit map
]
// Short terms that hide inside ordinary words ("Spicy", "Raccoon"), so only whole words count.
const HATE_WORDS = ['nazi', 'kike', 'fag', 'spic', 'chink', 'gook', 'coon', 'paki', 'jap']

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't' }

function isHateful(name: string): boolean {
  const words = name
    .toLowerCase()
    .replace(/[013457]/g, (d) => LEET[d] ?? d)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
  const compact = words.join('')
  if (HATE_ANYWHERE.some((term) => compact.includes(term))) return true
  return words.some((w) => HATE_WORDS.some((term) => w === term || w === `${term}s`))
}

// A link on a projector is an advert nobody approved. "Mr. Bean" passes; "kachka.fun" does not.
const looksLikeLink = (s: string) => /http|www|@|\.\p{L}/iu.test(s)

/** Cleans a typed name for the room board, or returns null when it cannot be shown. */
export function sanitizeName(raw: string): string | null {
  const normal = raw.normalize('NFKC').replace(/\s+/gu, ' ')
  if (looksLikeLink(normal)) return null
  const kept = normal
    // Letters of any script, digits, space and ' - . ! only. Marks stay so Devanagari or Thai survive.
    .replace(/[^\p{L}\p{M}\p{Nd} '\-.!]/gu, '')
    // A mark must sit on a letter, and at most two stack: no Zalgo towers over the next row.
    .replace(/(^|[^\p{L}\p{M}])\p{M}+/gu, '$1')
    .replace(/(\p{M}{2})\p{M}+/gu, '$1')
    .replace(/ {2,}/g, ' ')
    .trim()
  // Count code points, not UTF-16 units, so a cut never splits a character in half.
  const name = Array.from(kept).slice(0, MAX_NAME_CHARS).join('').trim()
  if (!/[\p{L}\p{Nd}]/u.test(name)) return null
  if (looksLikeLink(name) || isHateful(name)) return null
  return name
}

// FNV-1a into mulberry32: a stable seed from the deviceId, so one device keeps one fallback name
// across heartbeats instead of a new random one every 15 seconds.
function seededRandom(seed: string): () => number {
  let a = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) a = Math.imul(a ^ seed.charCodeAt(i), 0x01000193)
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The name the board shows for a device. A generated nickname stays whole (some are longer than a
 * typed name may be); a typed one is sanitised; anything refused becomes a generated nickname that
 * is stable for that device.
 */
export function boardName(raw: string, deviceId: string): string {
  if (isValidNickname(raw)) return raw
  return sanitizeName(raw) ?? generateNickname(seededRandom(deviceId))
}
