// CARD 7. Result (docs/04-screens-spec.md, section 7).
// The verdict, the evidence, one funny line, one nudge. Nothing here decides anything: the
// verdict, the nudge and whether the safety line shows were all settled in src/engine and saved
// with the result, so a reload shows the same screen without a second call to anyone (D19).
import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import type { Drift, MetricKey } from '../../../shared/contracts'
import { load } from '../../store/local'
import { Badge, Housing, Ibis, Key, Keys, Label, Plate, Quote, Rows, SafetyLine, Sheet, Stamp, Ticket, type Mood } from '../../ui'
import { nudgeText } from './nudge-copy'

const METRIC_LABELS: Record<MetricKey, string> = {
  sway: 'Standing',
  choiceRt: 'Tap speed',
  choiceWrong: 'Wrong taps',
  hr: 'Pulse',
}

/** Drift is in multiples of this person's own run-to-run noise, so a sign and one decimal is
 *  the honest amount of precision. Negative means sharper than their normal. */
function driftRows(drift: Drift): [string, string][] {
  const order: MetricKey[] = ['sway', 'choiceRt', 'choiceWrong', 'hr']
  return order
    .filter((key) => drift[key] !== undefined)
    .map((key) => {
      const value = drift[key] as number
      const sign = value > 0 ? '+' : ''
      return [METRIC_LABELS[key], `${sign}${value.toFixed(1)}`]
    })
}

export function Result() {
  const navigate = useNavigate()
  const stored = load()
  const last = stored.lastResult

  // Nothing to show: someone landed here directly, or storage was cleared.
  useEffect(() => {
    if (!last) navigate('/home', { replace: true })
  }, [last, navigate])
  if (!last) return null

  const { assessment, line, run } = last
  const verdict = assessment.verdict
  const rows = driftRows(assessment.drift)

  return (
    <Housing>
      <Plate small serial={'Result\nModel BC-2'} />

      <Ticket>
        <Stamp verdict={verdict.toUpperCase()} />
        <Ibis mood={verdict as Mood} className="k-ibis--ticket" />

        {/* Tags come before the evidence, so nobody reads a number without its caveat. */}
        {assessment.partial && <Badge>Partial reading · no standing test</Badge>}
        {assessment.confidence === 'low' && <Badge>Loose reading</Badge>}

        {/* The bird's line. Written by Claude or canned; the screen cannot tell and does not care. */}
        <Quote>{line}</Quote>

        {rows.length > 0 && (
          <>
            <Label paper>How far from your normal</Label>
            <Rows items={rows} />
          </>
        )}

        <Label paper>What to do</Label>
        <p>{nudgeText(assessment.nudge, new Date(run.at).getHours())}</p>

        {/* Mandatory whenever anything alcoholic was logged today, Steady included (D19). */}
        {assessment.showSafetyLine && <SafetyLine />}
      </Ticket>

      <Keys>
        <Key onClick={() => navigate('/check')}>Run again</Key>
        <Key onClick={() => navigate('/home')}>Home</Key>
      </Keys>
    </Housing>
  )
}
