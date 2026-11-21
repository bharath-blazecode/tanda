// CARD 6. Check (docs/04-screens-spec.md, section 6).
// Run the same two tests and compare. Scoring is local and instant; the bird's line is the only
// thing that waits on the network, and it falls back to a canned one (D12).
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { ChoiceMetrics, Handicap, Mode, RunResult, StandMetrics } from '../../../shared/contracts'
import { requestVerdictLine } from '../../api/verdict'
import { cannedLine } from '../../engine/canned'
import { assess } from '../../engine/classify'
import { CAFFEINE_MG } from '../../engine/nudge'
import { ChoiceTest } from '../../tests/choice'
import { StandTest } from '../../tests/stand'
import { getMotionAvailability } from '../../sensors/motion'
import { drinksToday } from '../../store/day'
import { load, update } from '../../store/local'
import { Housing, Key, Label, Plate, Sheet } from '../../ui'

type Step = 'intro' | 'stand' | 'choice' | 'scoring'

export function Check() {
  const navigate = useNavigate()
  const stored = useRef(load()).current
  // Demo hands over its mode and the handicap picked; anything else is a real check.
  const handed = useLocation().state as { mode?: Mode; handicap?: Handicap } | null
  const mode: Mode = handed?.mode === 'demo' ? 'demo' : 'real'
  const [step, setStep] = useState<Step>('intro')
  const [stand, setStand] = useState<StandMetrics | null>(null)

  // A check only means something against a baseline.
  useEffect(() => {
    if (!stored.baseline) navigate('/baseline', { replace: true })
  }, [stored.baseline, navigate])

  if (!stored.baseline) return null
  const baseline = stored.baseline

  const finish = async (choice: ChoiceMetrics) => {
    setStep('scoring')
    const now = Date.now()
    const run: RunResult = { stand: stand ?? undefined, choice, at: now }
    const today = drinksToday(stored.drinks, now)

    const assessment = assess({
      baseline: baseline.run,
      baselineClean: baseline.clean,
      run,
      drinksToday: today,
      mode,
      checksSinceBaseline: 0,
    })

    const caffeineMg = today.reduce((sum, d) => sum + (CAFFEINE_MG[d.kind] ?? 0), 0)
    const alcohol = today.filter((d) => CAFFEINE_MG[d.kind] === undefined).length

    // The line is the bird's, not the engine's. A canned one shows at once and stays if the
    // server does not answer inside its timeout.
    let line = cannedLine(assessment.verdict, mode, now, { alcohol, handicap: assessment.guessedHandicap })
    const answer = await requestVerdictLine({
      deviceId: stored.deviceId,
      mode,
      verdict: assessment.verdict,
      confidence: assessment.confidence,
      drift: assessment.drift,
      nudge: assessment.nudge,
      drinks: { caffeineMg, alcohol },
      localHour: new Date(now).getHours(),
      handicap: assessment.guessedHandicap,
    })
    if (answer) line = answer.line

    update((current) => ({ ...current, lastResult: { run, assessment, line, mode } }))
    navigate('/result', { state: mode === 'demo' ? { handicap: handed?.handicap } : null })
  }

  // Motion was there at baseline but is not now: run the tapping test alone and mark it partial.
  const skipStand = () => {
    setStand(null)
    setStep('choice')
  }

  // Known to have no motion this session: do not mount Stand Still only to watch it stall.
  const noMotion = getMotionAvailability() === 'unavailable'

  if (step === 'intro') {
    return (
      <Housing>
        <Plate small serial={'Check\nAgainst your normal'} />
        <Sheet grow>
          <Label paper>Same two tests</Label>
          <h2>About fifty seconds.</h2>
          <p>Stand still, then tap fast. We compare both against the normal you recorded.</p>
          {!baseline.run.stand && (
            <p className="k-small">
              Your normal has no standing test in it, so this one will not be scored.
            </p>
          )}
          {!baseline.clean && (
            <p className="k-small">Your normal was taken after a drink, so read this one loosely.</p>
          )}
          {noMotion && (
            <p className="k-small">No motion sensor here, running one test instead.</p>
          )}
        </Sheet>
        <Key onClick={() => (noMotion ? skipStand() : setStep('stand'))}>Start</Key>
        <Key quiet onClick={() => navigate('/home')}>
          Back
        </Key>
      </Housing>
    )
  }

  if (step === 'scoring') {
    return (
      <Housing>
        <Plate small serial={'Check\nReading'} />
        <Sheet grow>
          <Label paper>Working</Label>
          <h2>Reading the chart.</h2>
        </Sheet>
      </Housing>
    )
  }

  return (
    <Housing>
      <Plate small serial={`Check\n${step === 'stand' ? '1' : '2'} of 2`} />
      {step === 'stand' && <Label>Test 1 of 2 · Stand still</Label>}
      {step === 'stand' ? (
        <StandTest
          onDone={(metrics) => {
            setStand(metrics)
            setStep('choice')
          }}
        />
      ) : (
        <ChoiceTest
          label={noMotion ? 'No motion sensor here · Choice tap only' : 'Test 2 of 2 · Choice tap'}
          onDone={finish}
        />
      )}
      {step === 'stand' && (
        <Key quiet onClick={skipStand}>
          Skip this test
        </Key>
      )}
    </Housing>
  )
}
