// CARD 7. Result (docs/04-screens-spec.md, section 7).
// The last reading, printed on the ticket. Everything comes from storage, so a reload prints the
// same ticket again with no network call (the bird's line was saved with the result).
import { useRef } from 'react'
import { Navigate, useLocation } from 'react-router'
import { load } from '../../store/local'
import { InkFilter } from '../../ui'
import { guessFromDrift, guessLine, isDemoHandicap } from '../demo/guess'
import { metricRows, printedAt, serialFor, ticketTags } from './format'
import { ResultPreview } from './Preview'
import { ResultTicket } from './ResultTicket'
import './result.css'

export function Result() {
  const location = useLocation()
  const stored = useRef(load()).current

  // The four verdict animations on sample data, for the lab page and the pitch.
  if (new URLSearchParams(location.search).has('preview')) return <ResultPreview />

  const { baseline, lastResult: last } = stored
  // A ticket compares with a baseline; without either there is nothing to print.
  if (!baseline) return <Navigate to="/" replace />
  if (!last) return <Navigate to="/home" replace />

  const { run, assessment, line, mode } = last
  // What the person picked, handed over by Check. Only used to own up to a wrong guess.
  const picked = (location.state as { handicap?: unknown } | null)?.handicap
  // The guess comes from the reading itself, never from the pick.
  const guess =
    mode === 'demo'
      ? guessLine(guessFromDrift(assessment.drift), isDemoHandicap(picked) ? picked : undefined)
      : undefined

  return (
    <>
      <InkFilter />
      <ResultTicket
        assessment={assessment}
        rows={metricRows(assessment.drift, run, baseline.run)}
        line={line.trim().replace(/^["“]+|["”]+$/g, '').trim()}
        readingId={serialFor(run.at).replace(/^No\. /, '')}
        timestamp={printedAt(run.at)}
        name={stored.nickname}
        tags={ticketTags({ mode, assessment, baselineClean: baseline.clean })}
        extra={guess}
        againTo={mode === 'demo' ? '/demo' : '/check'}
      />
    </>
  )
}
