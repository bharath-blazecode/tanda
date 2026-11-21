// Nicknames are generated on the phone from these fixed lists and validated on the server
// against the same lists. There is no free text, so there is nothing to moderate (D23).

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
