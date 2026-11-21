// Quick demo: one standing test for the normal, one for the check, nothing else.
// For a two-minute pitch, and for a room that has two minutes to play. It is still a real reading
// against the person's own normal; it only leaves the tapping test and the questions out.
// Held in memory on purpose: a reload or a new tab goes back to the full flow.
let quick = false

export function setQuickDemo(on: boolean): void {
  quick = on
}

export function isQuickDemo(): boolean {
  return quick
}
