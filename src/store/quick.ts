// Quick demo: every test once, then the ticket. For a two-minute pitch, and for a room that has
// two minutes to play.
//
// A reading needs a normal to compare with, and recording one means doing the tests twice. So the
// quick demo files a stock normal instead: typical numbers for a steady adult, not this person's.
// Anything measured against it is a simulated reading and is stamped as one, always.
import type { Stored } from '../../shared/contracts'

type Baseline = NonNullable<Stored['baseline']>

/** No real reading was ever taken at the epoch, so this timestamp marks the stock normal. */
const STOCK_AT = 0

/**
 * Typical values, set by judgement on build day and not from a study. Sway is the gyroscope RMS in
 * degrees a second for someone standing quietly with the phone on their chest; taps are a relaxed
 * four-square median. Tune `swayRms` first if everyone in the room reads the same way.
 */
export const STOCK_BASELINE: Baseline = {
  run: {
    stand: { swayRms: 0.6, swayLateralRms: 0.4, hz: 60, valid: true },
    choice: { medianMs: 480, wrong: 0, lapses: 0, trials: 8 },
    at: STOCK_AT,
  },
  clean: true,
}

export function isStockBaseline(baseline: Baseline | undefined): boolean {
  return baseline !== undefined && baseline.run.at === STOCK_AT
}

// Held in memory on purpose: it only decides which screens to skip on the way in.
let quick = false

export function setQuickDemo(on: boolean): void {
  quick = on
}

export function isQuickDemo(): boolean {
  return quick
}
