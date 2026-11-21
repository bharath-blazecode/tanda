// CARD 7. Result (docs/04-screens-spec.md, section 7).
// The last reading, printed on the ticket. Everything comes from storage, so a reload prints the
// same ticket again with no network call (the bird's line was saved with the result).
import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { load } from '../../store/local'
import { InkFilter, Key } from '../../ui'
import { guessFromDrift, guessLine, isDemoHandicap } from '../demo/guess'
import { metricRows, printedAt, serialFor, ticketTags } from './format'
import { ResultPreview } from './Preview'
import { ResultTicket, nudges } from './ResultTicket'
import { buildShareImage, canShareFile, shareOrSave, type ShareCard } from './share'
import './result.css'

/** The ticket as a picture. Built ahead of the tap, so the share sheet opens inside the gesture. */
function ShareKey({ card }: { card: ShareCard }) {
  const [file, setFile] = useState<File | null>(null)
  const cardRef = useRef(card)
  useEffect(() => {
    let cancelled = false
    void buildShareImage(cardRef.current).then((built) => {
      if (!cancelled) setFile(built)
    })
    return () => {
      cancelled = true
    }
  }, [])
  if (!file) return null
  return <Key onClick={() => void shareOrSave(file)}>{canShareFile(file) ? 'Share ticket' : 'Save ticket'}</Key>
}

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

  const rows = metricRows(assessment.drift, run, baseline.run)
  const cleanLine = line.trim().replace(/^["“]+|["”]+$/g, '').trim()
  const readingId = serialFor(run.at).replace(/^No\. /, '')
  const timestamp = printedAt(run.at)
  const tags = ticketTags({ mode, assessment, baselineClean: baseline.clean })
  const card: ShareCard = {
    name: stored.nickname,
    readingId,
    timestamp,
    tags,
    rows,
    extra: guess,
    verdict: assessment.verdict,
    line: cleanLine,
    nudge: nudges[assessment.nudge],
    // The same rule as the ticket on screen: the safety line travels with the picture.
    safety: assessment.showSafetyLine || assessment.verdict === 'tipsy',
  }

  return (
    <>
      <InkFilter />
      <ResultTicket
        assessment={assessment}
        rows={rows}
        line={cleanLine}
        readingId={readingId}
        timestamp={timestamp}
        name={stored.nickname}
        tags={tags}
        extra={guess}
        action={<ShareKey card={card} />}
        againTo={mode === 'demo' ? '/demo' : '/check'}
      />
    </>
  )
}
