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
import { PulseTest } from '../../tests/pulse'
import { StandTest } from '../../tests/stand'
import { getMotionAvailability } from '../../sensors/motion'
import { drinksToday } from '../../store/day'
import { load, update } from '../../store/local'
import { isQuickDemo } from '../../store/quick'
import { Housing, Key, Label, Plate, Sheet } from '../../ui'

type Step = 'intro' | 'stand' | 'choice' | 'pulse' | 'scoring'

export function Check() {
  const navigate = useNavigate()
  const stored = useRef(load()).current
  // Demo hands over its mode and the handicap picked; anything else is a real check.
  const handed = useLocation().state as { mode?: Mode; handicap?: Handicap } | null
  const mode: Mode = handed?.mode === 'demo' ? 'demo' : 'real'
  const [step, setStep] = useState<Step>('intro')
  const [stand, setStand] = useState<StandMetrics | null>(null)
  const [choice, setChoice] = useState<ChoiceMetrics | null>(null)
  // The pulse step is opt-in: it fails often enough on real phones that nobody should meet it
  // unasked, least of all in a two-minute demo. One quiet key on the intro turns it on.
  const [withPulse, setWithPulse] = useState(false)

  // A check only means something against a baseline.
  useEffect(() => {
    if (!stored.baseline) navigate('/baseline', { replace: true })
  }, [stored.baseline, navigate])

  if (!stored.baseline) return null
  const baseline = stored.baseline

  const finish = async (taps: ChoiceMetrics | null, hr: number | null) => {
    setStep('scoring')
    const now = Date.now()
    const run: RunResult = {
      stand: stand ?? undefined,
      choice: taps ?? undefined,
      at: now,
      ...(hr === null ? {} : { hr, hrSource: 'camera' as const }),
    }
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

  // The pulse is always on offer, never gated on the baseline: gating trapped anyone whose normal
  // predates the camera step. It is only SCORED when the baseline has a pulse too (D46).
  const pulseWillScore = baseline.run.hr !== undefined
  // Quick demo shows all three tests once, in the pass that ends in the ticket: stand still, the
  // tapping test with its skip key, then the pulse with its own. Only the standing test is scored,
  // because the quick normal has nothing else in it.
  const quick = isQuickDemo()
  const begin = (pulse: boolean) => {
    setWithPulse(pulse)
    if (noMotion) skipStand()
    else setStep('stand')
  }

  if (step === 'intro') {
    return (
      <Housing>
        <Plate small serial={'Check\nAgainst your normal'} />
        <Sheet grow>
          <Label paper>{quick ? 'Quick demo · Three tests' : 'Same two tests'}</Label>
          <h2>{quick ? 'Stand, tap, pulse.' : 'About fifty seconds.'}</h2>
          <p>
            {quick
              ? 'Stand still for ten seconds. Then the tapping test and the pulse: try them, or skip either with the key underneath.'
              : 'Stand still, then tap fast. We compare both against the normal you recorded.'}
          </p>
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
        <Key onClick={() => begin(quick)}>Start</Key>
        {!quick && (
          <Key quiet onClick={() => begin(true)}>
            Start, and add a pulse reading
          </Key>
        )}
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
      <Plate small serial={`Check\n${step === 'stand' ? '1 of 2' : step === 'choice' ? '2 of 2' : 'Optional'}`} />
      {step === 'stand' && <Label>Test 1 of 2 · Stand still</Label>}
      {step === 'pulse' ? (
        <PulseTest
          label={pulseWillScore ? 'Optional · Pulse' : 'Optional · Pulse · shown, not scored'}
          onDone={(hr) => void finish(choice, hr)}
        />
      ) : step === 'stand' ? (
        <StandTest
          onDone={(metrics) => {
            setStand(metrics)
            setStep('choice')
          }}
        />
      ) : (
        <ChoiceTest
          label={noMotion ? 'No motion sensor here · Choice tap only' : 'Test 2 of 2 · Choice tap'}
          onDone={(metrics) => {
            setChoice(metrics)
            if (withPulse) setStep('pulse')
            else void finish(metrics, null)
          }}
        />
      )}
      {step === 'choice' && stand !== null && (
        <Key quiet onClick={() => (withPulse ? (setChoice(null), setStep('pulse')) : void finish(null, null))}>
          Skip this test
        </Key>
      )}
      {step === 'stand' && (
        <Key quiet onClick={skipStand}>
          Skip this test
        </Key>
      )}
    </Housing>
  )
}
