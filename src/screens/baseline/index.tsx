// CARD 6. Baseline (docs/04-screens-spec.md, section 3).
// Record the person's own normal, once. Nothing is saved until both tests are through,
// so walking away mid-way leaves no half-baseline behind.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { ChoiceMetrics, DrinkKind, StandMetrics } from '../../../shared/contracts'
import { ChoiceTest } from '../../tests/choice'
import { PulseTest } from '../../tests/pulse'
import { StandTest } from '../../tests/stand'
import { getMotionAvailability } from '../../sensors/motion'
import { update } from '../../store/local'
import { Housing, Key, Keys, Label, Plate, Sheet } from '../../ui'

type Step = 'clean' | 'what' | 'stand' | 'choice' | 'pulse' | 'saved'

const DRINKS: { kind: DrinkKind; label: string }[] = [
  { kind: 'coffee', label: 'Coffee' },
  { kind: 'energy', label: 'Energy drink' },
  { kind: 'beer', label: 'Beer' },
  { kind: 'wine', label: 'Wine' },
  { kind: 'spirit', label: 'Spirit' },
]
const NONE: Record<DrinkKind, number> = { coffee: 0, energy: 0, beer: 0, wine: 0, spirit: 0 }

/** Setup found no motion: go straight to Choice Tap rather than mount Stand Still to stall. */
const firstTest = (): Step => (getMotionAvailability() === 'unavailable' ? 'choice' : 'stand')

export function Baseline() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('clean')
  const [clean, setClean] = useState(true)
  const [stand, setStand] = useState<StandMetrics | null>(null)
  const [counts, setCounts] = useState<Record<DrinkKind, number>>(NONE)
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  /**
   * Write what was already drunk before the tests, so the label is right from the first reading
   * rather than being filled in afterwards.
   *
   * They are logged at the current time because a Drink carries only `at`, with no "how long
   * ago". That makes the caffeine curve read slightly high for something drunk hours earlier,
   * which errs toward saying more is on board rather than less.
   */
  const logThenContinue = () => {
    const at = Date.now()
    const drinks = DRINKS.flatMap(({ kind }) =>
      Array.from({ length: counts[kind] }, (_, i) => ({ kind, at: at - i })),
    )
    if (drinks.length > 0) update((current) => ({ ...current, drinks: [...current.drinks, ...drinks] }))
    setStep(firstTest())
  }
  const [hasPulse, setHasPulse] = useState(false)

  // The normal is saved as soon as both tests are through. The pulse (D46) is opt-in from the
  // saved screen, because it fails often enough on real phones that nobody should meet it unasked.
  // The tapping test may be skipped, but only once the standing test has been recorded: a run
  // with neither is not a reading, and the contract refuses it (shared/contracts.ts).
  const finish = (taps: ChoiceMetrics | null) => {
    update((current) => ({
      ...current,
      baseline: {
        run: { stand: stand ?? undefined, choice: taps ?? undefined, at: Date.now() },
        clean,
      },
    }))
    setStep('saved')
  }

  // A pulse only ever counts when the baseline has one too, which is why it can be added here.
  const addPulse = (hr: number | null) => {
    if (hr !== null) {
      update((current) =>
        current.baseline
          ? { ...current, baseline: { ...current.baseline, run: { ...current.baseline.run, hr, hrSource: 'camera' as const } } }
          : current,
      )
      setHasPulse(true)
    }
    setStep('saved')
  }

  if (step === 'clean') {
    return (
      <Housing>
        <Plate small serial={'Setup\n2 of 2'} />
        <Sheet grow>
          <Label paper>Your normal</Label>
          <h2>Had anything yet today?</h2>
          <p>We record your normal once. It works best before the first coffee or drink.</p>
          <p className="k-small">Either answer is fine. We just label the reading honestly.</p>
        </Sheet>
        <Keys>
          <Key
            style={{ fontSize: 22 }}
            onClick={() => {
              setClean(true)
              setStep(firstTest())
            }}
          >
            Nothing yet
          </Key>
          <Key
            style={{ fontSize: 22 }}
            onClick={() => {
              setClean(false)
              setStep('what')
            }}
          >
            Already had some
          </Key>
        </Keys>
      </Housing>
    )
  }

  if (step === 'saved') {
    return (
      <Housing>
        <Plate small serial={'Your normal\nOn file'} />
        <Sheet grow>
          <Label paper>Saved</Label>
          <h2>That is your normal.</h2>
          <p>Every reading from here is measured against it, not against anybody else.</p>
          {!clean && (
            <p className="k-small">
              You had something before this one, so later readings are worth reading loosely.
            </p>
          )}
        </Sheet>
        <Key onClick={() => navigate('/demo')}>No drink in hand? Fake it</Key>
        <Key quiet onClick={() => navigate('/home')}>
          I will log real drinks
        </Key>
        {!hasPulse && (
          <Key quiet onClick={() => setStep('pulse')}>
            Add a pulse reading (optional)
          </Key>
        )}
      </Housing>
    )
  }

  if (step === 'what') {
    return (
      <Housing>
        <Plate small serial={'Setup\nWhat you had'} />
        <Sheet grow>
          <Label paper>Before we start</Label>
          <h2>What have you had?</h2>
          <p className="k-small">Tap one for each. This is only used to label the reading.</p>
          <div style={{ display: 'grid', gap: 'var(--s3)', marginTop: 'var(--z)' }}>
            {DRINKS.map(({ kind, label }) => (
              <Key
                key={kind}
                style={{ fontSize: 20 }}
                onClick={() => setCounts((c) => ({ ...c, [kind]: c[kind] + 1 }))}
              >
                {label}
                {counts[kind] > 0 ? ` · ${counts[kind]}` : ''}
              </Key>
            ))}
          </div>
        </Sheet>
        <Key style={{ fontSize: 22 }} onClick={logThenContinue}>
          {total > 0 ? `Start with ${total}` : 'Start'}
        </Key>
        {total > 0 && (
          <Key quiet onClick={() => setCounts(NONE)}>
            Clear
          </Key>
        )}
      </Housing>
    )
  }

  return (
    <Housing>
      <Plate small serial={`Recording\n${step === 'stand' ? '1 of 2' : step === 'choice' ? '2 of 2' : 'Optional'}`} />
      {step === 'stand' && <Label>Test 1 of 2 · Stand still</Label>}
      {step === 'pulse' ? (
        <PulseTest label="Optional · Pulse" onDone={addPulse} />
      ) : step === 'stand' ? (
        <StandTest
          onDone={(metrics) => {
            setStand(metrics)
            setStep('choice')
          }}
        />
      ) : (
        <ChoiceTest
          label={
            getMotionAvailability() === 'unavailable'
              ? 'No motion sensor here · Choice tap only'
              : 'Test 2 of 2 · Choice tap'
          }
          onDone={(metrics) => {
            finish(metrics)
          }}
        />
      )}
      {step === 'choice' && stand !== null && (
        <Key quiet onClick={() => finish(null)}>
          Skip this test
        </Key>
      )}
    </Housing>
  )
}
