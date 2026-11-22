// The example reference behind the quick demo: every test once, then a ticket, without recording a
// baseline first. For a two-minute pitch, and for a visitor who wants to see the whole loop.
//
// A comparison needs something to compare with. These are fixed numbers, set by judgement on build
// day and not from a study. They are not a healthy adult norm and not this person's normal, so a
// reading against them is simulated and stamped as one on the screen, after a reload, in the receipt
// image and on the room board.
//
// Since schema v2 this is never written into the personal baseline: a quick demo cannot overwrite a
// baseline someone recorded, and a reading's reference travels with the reading (LastResult.reference).
import { STAND_CAPTURE_SECONDS, STAND_PROTOCOL_VERSION, type Handicap, type ResultReference } from '../../shared/contracts'

export const EXAMPLE_REFERENCE: ResultReference = {
  kind: 'example',
  run: {
    // Gyroscope RMS in degrees a second, standing with the phone on the chest. A phone that only
    // reports acceleration (m/s²) is not compared with this at all: the units differ.
    stand: { swayRms: 0.6, swayLateralRms: 0.4, hz: 60, valid: true, source: 'gyroscope', protocolVersion: STAND_PROTOCOL_VERSION, captureSeconds: STAND_CAPTURE_SECONDS },
    choice: { medianMs: 480, wrong: 0, lapses: 0, trials: 8 },
    at: 0,
  },
  clean: true,
}

/**
 * What a route hands to Check, in router state. Router state survives a reload, unlike a module
 * variable, so an example run stays an example run after the page is refreshed mid-way.
 */
export type CheckRouteState = {
  /** `example` compares with EXAMPLE_REFERENCE. Absent means the personal baseline. */
  reference?: 'example'
  /** The demo challenge: a deliberate handicap against the personal baseline. */
  mode?: 'demo'
  handicap?: Handicap
  /** The drink question was answered in this visit, so a reload does not log the drinks twice. */
  answered?: boolean
}

export function readCheckState(state: unknown): CheckRouteState {
  if (!state || typeof state !== 'object') return {}
  const s = state as Record<string, unknown>
  const out: CheckRouteState = {}
  if (s.reference === 'example') out.reference = 'example'
  if (s.mode === 'demo') out.mode = 'demo'
  if (s.handicap === 'spin' || s.handicap === 'offhand' || s.handicap === 'jacks') out.handicap = s.handicap
  if (s.answered === true) out.answered = true
  return out
}
