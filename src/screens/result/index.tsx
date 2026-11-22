// CARD 7. Result (docs/04-screens-spec.md, section 7).
// The last reading, printed on the ticket. Everything comes from the stored result, including the
// reference it was compared with, so a reload prints the same ticket with no network call, and a
// later recalibration cannot change the numbers on an old ticket.
import { useRef } from 'react'
import { Navigate, useLocation } from 'react-router'
import { compareRuns } from '../../engine/compare'
import { drinksToday } from '../../store/day'
import { load } from '../../store/local'
import type { CheckRouteState } from '../../store/quick'
import { InkFilter } from '../../ui'
import { guessFromDrift, guessLine, isDemoHandicap } from '../demo/guess'
import {
  comparisonRows,
  conditionsWords,
  describeDrinks,
  labelNote,
  printedAt,
  referenceLine,
  serialFor,
  stampNote,
  ticketTags,
} from './format'
import { ResultPreview } from './Preview'
import { ResultTicket } from './ResultTicket'
import './result.css'

export function Result() {
  const location = useLocation()
  const stored = useRef(load()).current

  // The four verdict animations on sample data, for the lab page and the pitch.
  if (new URLSearchParams(location.search).has('preview')) return <ResultPreview />

  const last = stored.lastResult
  if (!last) return <Navigate to="/home" replace />

  const { run, assessment, line, mode, reference } = last
  const can = compareRuns(reference.run, run)
  const { rows, notes } = comparisonRows(run, reference.run, can)
  // What the person picked, handed over by Check. Only used to own up to a wrong guess.
  const picked = (location.state as { handicap?: unknown } | null)?.handicap
  // The guess comes from the reading itself, never from the pick. An example run had no handicap.
  const guess =
    mode === 'demo' && reference.kind === 'personal'
      ? guessLine(guessFromDrift(assessment.drift), isDemoHandicap(picked) ? picked : undefined)
      : undefined

  const again: { to: string; state?: CheckRouteState } =
    reference.kind === 'example'
      ? { to: '/check', state: { reference: 'example', answered: true } }
      : mode === 'demo'
        ? { to: '/demo' }
        : { to: '/check' }

  return (
    <>
      <InkFilter />
      <ResultTicket
        assessment={assessment}
        rows={rows}
        notes={notes}
        line={line.trim().replace(/^["“]+|["”]+$/g, '').trim()}
        readingId={serialFor(run.at).replace(/^No\. /, '')}
        timestamp={printedAt(run.at)}
        name={stored.nickname}
        reference={referenceLine(reference)}
        tags={ticketTags({ mode, assessment, baselineClean: reference.clean, reference: reference.kind })}
        conditions={conditionsWords(assessment.confidence)}
        stampNote={stampNote(mode)}
        labelNote={labelNote(assessment.verdict)}
        logged={describeDrinks(drinksToday(stored.drinks, run.at))}
        extra={guess}
        againTo={again.to}
        againState={again.state}
      />
    </>
  )
}
