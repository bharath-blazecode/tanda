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

// Cyrillic and Greek letters that look Latin, so "nаzі" with Cyrillic а and і reads as "nazi".
// Both cases are listed because some capitals look like a different Latin letter than their small
// form (Greek Η is H, η is not).
const LOOKALIKE: Record<string, string> = {
  а: 'a', А: 'a', в: 'b', В: 'b', е: 'e', Е: 'e', к: 'k', К: 'k', м: 'm', М: 'm', н: 'h', Н: 'h',
  о: 'o', О: 'o', р: 'p', Р: 'p', с: 'c', С: 'c', т: 't', Т: 't', х: 'x', Х: 'x', у: 'y', У: 'y',
  і: 'i', І: 'i', ј: 'j', Ј: 'j', ѕ: 's', Ѕ: 's', һ: 'h', Һ: 'h', ԁ: 'd', ԛ: 'q', ԝ: 'w', Ԝ: 'w',
  α: 'a', Α: 'a', β: 'b', Β: 'b', ε: 'e', Ε: 'e', Ζ: 'z', Η: 'h', ι: 'i', Ι: 'i', κ: 'k', Κ: 'k',
  Μ: 'm', ν: 'v', Ν: 'n', ο: 'o', Ο: 'o', ρ: 'p', Ρ: 'p', τ: 't', Τ: 't', υ: 'u', Υ: 'y', χ: 'x',
  Χ: 'x',
}

// Unicode keeps each set of ten decimal digits contiguous and in order from zero, and adjacent sets
// are whole tens, so the count of digits just before this one, mod 10, is its value. The longest
// contiguous stretch is 50, hence the cap on the walk.
const isDigit = (cp: number) => cp > 0 && /\p{Nd}/u.test(String.fromCodePoint(cp))
function digitValue(ch: string): string {
  const cp = ch.codePointAt(0) ?? 0
  let before = 0
  while (before < 60 && isDigit(cp - before - 1)) before++
  return String(before % 10)
}

// What the blocklist is checked against, never what is shown: accents off, any script's digits as
// ASCII then as leetspeak letters, Cyrillic and Greek look-alikes as Latin, lower case.
function comparisonForm(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/\p{Nd}/gu, digitValue)
    .replace(/[013457]/g, (d) => LEET[d] ?? d)
    .replace(/./gsu, (ch) => LOOKALIKE[ch] ?? ch)
    .toLowerCase()
}

function isHateful(name: string): boolean {
  const form = comparisonForm(name)
  const words = form.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  const compact = words.join('')
  if (HATE_ANYWHERE.some((term) => compact.includes(term))) return true
  if (words.some((w) => HATE_WORDS.some((term) => w === term || w === `${term}s`))) return true
  // Again with every non-letter removed, so "n-a-z-i" or "F A G" is caught. A short term only counts
  // when it spans a removed gap: inside one word it is "Spicy" or "Nazir", which are fine.
  const letters: string[] = []
  const wordOf: number[] = []
  let word = 0
  for (const ch of form) {
    if (/\p{L}/u.test(ch)) {
      letters.push(ch)
      wordOf.push(word)
    } else if (wordOf.length > 0 && wordOf[wordOf.length - 1] === word) word++
  }
  const joined = letters.join('')
  if (HATE_ANYWHERE.some((term) => joined.includes(term))) return true
  return HATE_WORDS.some((term) => {
    for (let i = joined.indexOf(term); i !== -1; i = joined.indexOf(term, i + 1)) {
      if (wordOf[i] !== wordOf[i + term.length - 1]) return true
    }
    return false
  })
}

// A link on a projector is an advert nobody approved. "Mr. Bean" passes; "kachka.fun",
// "kachka . fun" and "kachka. fun" do not: a dot, spaces and a capital reads as an abbreviation,
// so only that shape is allowed. No `i` flag on the second test, where \p{Lu} would match any case.
const looksLikeLink = (s: string) =>
  /http|www|@/i.test(s) || /\.\p{L}|\s\.\s*\p{L}|\.\s+(?!\p{Lu})\p{L}/u.test(s)

// Default-ignorable code points render as nothing. Most are format characters the filter below drops
// anyway, but the Hangul fillers (U+115F, U+1160, U+3164, U+FFA0) count as letters and would make a
// blank name, and the grapheme joiner and variation selectors count as marks.
const INVISIBLE = /\p{Default_Ignorable_Code_Point}/gu

/** Cleans a typed name for the room board, or returns null when it cannot be shown. */
export function sanitizeName(raw: string): string | null {
  const normal = raw.normalize('NFKC').replace(INVISIBLE, '').replace(/\s+/gu, ' ')
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
  // The comparison form also catches a link spelled with look-alikes ("һttр").
  if (looksLikeLink(name) || /http|www|@/.test(comparisonForm(name)) || isHateful(name)) return null
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
  return sanitizeName(raw) ?? deviceNickname(deviceId)
}

/** The generated nickname that is stable for a device: the fallback, and all of ROOM_NAMES=generated. */
export function deviceNickname(deviceId: string): string {
  return generateNickname(seededRandom(deviceId))
}
