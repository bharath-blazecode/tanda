// CARD 6. Check (docs/04-screens-spec.md, section 6).
// Run the tests again and compare. Scoring is local and instant; the bird's line is the only thing
// that waits on the network, it falls back to a canned one (D12), and it is not asked for at all
// when the person has switched Claude commentary off.
//
// Three routes arrive here:
// - personal: compared with the baseline the person recorded.
// - example: the quick demo, compared with fixed example numbers. Simulated, always.
// - demo challenge: a chosen handicap against the personal baseline. Simulated, always.
// Which one is carried in router state, so a reload mid-way keeps it.
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { ChoiceMetrics, Mode, PulseRecord, ResultReference, StandMetrics } from '../../../shared/contracts'
import { requestVerdictLine } from '../../api/verdict'
import { cannedLine } from '../../engine/canned'
import { evaluate } from '../../engine/classify'
import { plannedComparison, standStatus, type Comparability } from '../../engine/compare'
import { hasAlcohol } from '../../engine/nudge'
import { buildRun } from '../../engine/run'
import { tallyAlcohol, tallyCaffeine } from '../../engine/serving'
import { getMotionAvailability } from '../../sensors/motion'
import { ChoiceTest } from '../../tests/choice'
import { PulseTest } from '../../tests/pulse'
import { StandTest } from '../../tests/stand'
import { drinksToday } from '../../store/day'
import { load, update } from '../../store/local'
import { EXAMPLE_REFERENCE, readCheckState, type CheckRouteState } from '../../store/quick'
import { Housing, Key, Label, Plate, Rows, SafetyLine, Sheet } from '../../ui'
import { DrinkPicker } from '../log/DrinkPicker'
import { printedAt } from '../result/format'

type Step = 'what' | 'intro' | 'stand' | 'choice' | 'pulse' | 'scoring' | 'nothing'

/** Why a test could not be compared, in a sentence, for the "nothing to compare" screen. */
const WHY: Record<string, string> = {
  'not-taken': 'not taken this time',
  'not-in-reference': 'not in your baseline',
  unusable: 'no usable reading this time',
  'reference-unusable': 'not usable in your baseline',
  'protocol-changed': 'the standing protocol changed',
  'placement-changed': 'different or changing phone placement',
  'cadence-changed': 'different motion sampling rates',
  'unknown-source': 'motion sensor was not recorded',
  'trial-count-changed': 'different tap trial counts',
  'sensor-changed': 'a different motion sensor from your baseline',
  'capture-changed': 'a different capture length from your baseline',
}

export function Check() {
  const navigate = useNavigate()
  const location = useLocation()
  const route = readCheckState(location.state)
  const stored = useRef(load()).current
  const example = route.reference === 'example'

  const reference: ResultReference | null = example
    ? EXAMPLE_REFERENCE
    : stored.baseline
      ? { kind: 'personal', run: stored.baseline.run, clean: stored.baseline.clean }
      : null
  // A reading against example numbers, or with a chosen handicap, is never a real one.
  const mode: Mode = example || route.mode === 'demo' ? 'demo' : 'real'
  const noMotion = getMotionAvailability() === 'unavailable'
  const firstTest: Step = noMotion ? 'choice' : 'stand'

  // The example run starts with the drink question, unless it was answered before a reload.
  const [step, setStep] = useState<Step>(example ? (route.answered ? firstTest : 'what') : 'intro')
  const [stand, setStand] = useState<StandMetrics | null>(null)
  const [choice, setChoice] = useState<ChoiceMetrics | null>(null)
  // The pulse is opt-in on a personal check: it fails often enough on real phones that nobody
  // should meet it unasked. The example run shows all three tests once, each with a skip key.
  const [withPulse, setWithPulse] = useState(example)
  const [refused, setRefused] = useState<Comparability | null>(null)

  // A personal check only means something against a baseline.
  useEffect(() => {
    if (!reference) navigate('/baseline', { replace: true })
  }, [reference, navigate])

  if (!reference) return null

  // `stood` is passed when the standing test has only just finished, before its state has landed.
  const finish = async (taps: ChoiceMetrics | null, pulse: PulseRecord | null, stood: StandMetrics | null = stand) => {
    setStep('scoring')
    const now = Date.now()
    const run = buildRun(stood, taps, pulse, now)
    // Read again: the example run may have logged drinks after this screen mounted.
    const current = load()
    const today = drinksToday(current.drinks, now)

    const outcome = evaluate({
      baseline: reference.run,
      baselineClean: reference.clean,
      run,
      drinksToday: today,
      mode,
      checksSinceBaseline: example ? 0 : (current.baseline?.checks ?? 0),
      reference: reference.kind,
    })
    if (!outcome.ok) {
      // Nothing comparable: no verdict, no ticket, no board post, no Claude call.
      setRefused(outcome.comparability)
      setStep('nothing')
      return
    }
    const { assessment } = outcome

    const caffeineMg = Math.round(tallyCaffeine(today).mg)
    const alcohol = tallyAlcohol(today).entries
    const handicap = assessment.guessedHandicap

    // The line is the bird's, not the engine's. A canned one stands unless Claude answers in time.
    let line = cannedLine(assessment.verdict, mode, now, { alcohol, handicap, reference: reference.kind })
    let lineSource: 'claude' | 'canned' = 'canned'
    if (current.aiCommentary) {
      const answer = await requestVerdictLine({
        deviceId: current.deviceId,
        mode,
        verdict: assessment.verdict,
        confidence: assessment.confidence,
        drift: assessment.drift,
        nudge: assessment.nudge,
        drinks: { caffeineMg: Math.min(2000, caffeineMg), alcohol: Math.min(40, alcohol) },
        localHour: new Date(now).getHours(),
        handicap,
        reference: reference.kind,
      })
      if (answer) {
        line = answer.line
        lineSource = answer.source
      }
    }

    update((latest) => ({
      ...latest,
      lastResult: { run, assessment, line, mode, reference, lineSource },
      // Count real checks against this baseline, so "learning" means what it says (classify.ts).
      ...(reference.kind === 'personal' && mode === 'real' && latest.baseline
        ? { baseline: { ...latest.baseline, checks: (latest.baseline.checks ?? 0) + 1 } }
        : {}),
    }))
    navigate('/result', { state: mode === 'demo' ? { handicap: route.handicap } : null })
  }

  // After the standing test, or without it. A tapping test the reference does not have would not be
  // compared, so it is not asked for: the run goes on to the pulse, or straight to the outcome.
  const afterStand = (stood: StandMetrics | null) => {
    setStand(stood)
    if (reference.run.choice) setStep('choice')
    else if (withPulse) setStep('pulse')
    else void finish(null, null, stood)
  }
  // Motion was there at baseline but is not now: run the tapping test alone and mark it partial.
  const skipStand = () => afterStand(null)
  const begin = (pulse: boolean) => {
    setWithPulse(pulse)
    if (!planned.stand) skipStand()
    else setStep('stand')
  }

  const planned = plannedComparison(reference.run, !noMotion)
  const pulseWillScore = reference.run.hr !== undefined

  if (step === 'what') {
    return (
      <Housing>
        <Plate small serial={'Quick demo\nExample numbers'} />
        <DrinkPicker
          label="Quick demo · Simulated"
          intro="Three short tests, then a ticket. You are compared with fixed example numbers, not with yourself, so the reading is simulated."
          onDone={(drinks) => {
            if (drinks.length > 0) update((current) => ({ ...current, drinks: [...current.drinks, ...drinks] }))
            const state: CheckRouteState = { ...route, answered: true }
            navigate('.', { replace: true, state })
            setStep(firstTest)
          }}
        />
      </Housing>
    )
  }

  if (step === 'intro') {
    const nothing = !planned.stand && !planned.choice
    return (
      <Housing>
        <Plate small serial={`Check\n${mode === 'demo' ? 'Demo challenge' : 'Against your baseline'}`} />
        <Sheet grow>
          <Label paper>{mode === 'demo' ? 'Simulated' : 'Same tests'}</Label>
          <h2>{nothing ? 'Nothing to compare here.' : 'About forty seconds.'}</h2>
          <p>Compared with your baseline from {printedAt(reference.run.at)}, not with anybody else.</p>
          <Rows
            items={[
              ['Stand still', planned.stand ? 'compared' : 'not compared'],
              ['Choice tap', planned.choice ? 'compared' : 'not compared'],
              ['Pulse', pulseWillScore ? 'optional, compared' : 'optional, shown only'],
            ]}
          />
          {!planned.stand && reference.run.stand && noMotion && (
            <p className="k-small">This phone is not sending motion now, so the standing test cannot run.</p>
          )}
          {!planned.stand && !noMotion && reference.run.stand && (
            <p className="k-small">Record a new baseline to compare standing under the current protocol.</p>
          )}
          {!reference.run.stand && <p className="k-small">Your baseline has no standing test in it.</p>}
          {!reference.run.choice && <p className="k-small">Your baseline has no tapping test in it.</p>}
          {!reference.clean && <p className="k-small">Your baseline was taken after a drink, so read this one loosely.</p>}
          <p className="k-small">Compared with one earlier recording. Practice, posture and the phone can all move the result.</p>
        </Sheet>
        {nothing ? (
          <Key onClick={() => navigate('/baseline')}>Record a new baseline</Key>
        ) : (
          <>
            <Key onClick={() => begin(false)}>Start</Key>
            <Key quiet onClick={() => begin(true)}>
              Start, and add a pulse reading
            </Key>
          </>
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

  if (step === 'nothing' && refused) {
    const alcoholToday = hasAlcohol(drinksToday(load().drinks, Date.now()))
    const why = (status: Comparability['stand']) => (status.compared ? 'compared' : WHY[status.reason])
    return (
      <Housing>
        <Plate small serial={'Check\nNo reading'} />
        <Sheet grow>
          <Label paper>Nothing to compare</Label>
          <h2>No reading this time.</h2>
          <p>Neither test could be compared with {example ? 'the example numbers' : 'your baseline'}, so there is no result to print.</p>
          <Rows
            items={[
              ['Stand still', why(refused.stand)],
              ['Choice tap', why(refused.choice)],
            ]}
          />
          {!example && <p className="k-small">A new baseline recorded on this phone, with both tests, fixes most of these.</p>}
          {alcoholToday && <SafetyLine />}
        </Sheet>
        {!example && <Key onClick={() => navigate('/baseline')}>Record a new baseline</Key>}
        <Key quiet onClick={() => navigate('/home')}>
          Home
        </Key>
      </Housing>
    )
  }

  const total = withPulse ? 3 : 2
  return (
    <Housing>
      <Plate
        small
        serial={`${example ? 'Quick demo' : 'Check'}\n${step === 'stand' ? `1 of ${total}` : step === 'choice' ? `2 of ${total}` : `3 of ${total}`}`}
      />
      {step === 'stand' && <Label>{`Test 1 of ${total} · Stand still`}</Label>}
      {step === 'pulse' ? (
        <PulseTest
          label={pulseWillScore ? 'Optional · Pulse' : 'Optional · Pulse · shown, not scored'}
          onDone={(_bpm, pulse) => void finish(choice, pulse)}
        />
      ) : step === 'stand' ? (
        <StandTest reference={reference.run.stand} onDone={afterStand} />
      ) : (
        <ChoiceTest
          label={noMotion ? 'No motion sensor here · Choice tap only' : `Test 2 of ${total} · Choice tap`}
          onDone={(metrics) => {
            setChoice(metrics)
            if (withPulse) setStep('pulse')
            else void finish(metrics, null)
          }}
        />
      )}
      {step === 'choice' && standStatus(reference.run.stand, stand ?? undefined).compared && (
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
