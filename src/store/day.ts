// CARD 6. Which drinks count as "today". Pure: the clock arrives as an argument.
// The night rolls over at 4am (D20), so a beer at 1am belongs with the one at 11pm.

export const DAY_STARTS_AT_HOUR = 4

/** The 4am boundary most recently passed, in the device's own local time. */
export function dayStart(now: number): number {
  const d = new Date(now)
  d.setHours(DAY_STARTS_AT_HOUR, 0, 0, 0)
  if (d.getTime() > now) d.setDate(d.getDate() - 1)
  return d.getTime()
}

/** Newest first, so Home can print the list without sorting again. */
export function drinksToday<T extends { at: number }>(drinks: readonly T[], now: number): T[] {
  const from = dayStart(now)
  return drinks.filter((d) => d.at >= from).sort((a, b) => b.at - a.at)
}
