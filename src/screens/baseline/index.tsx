// CARD 6. Baseline (docs/04-screens-spec.md, section 3).
// Record the person's own baseline, once. Nothing is saved until the tests are through, so walking
// away mid-way leaves no half-baseline behind and leaves an existing baseline untouched.
//
// This screen only ever records a personal baseline. The quick demo's example numbers live in
// src/store/quick.ts and are never written here (schema v2).
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { ChoiceMetrics, PulseRecord, StandMetrics } from '../../../shared/contracts'
import { hasAlcohol } from '../../engine/nudge'
import { buildRun } from '../../engine/run'
import { getMotionAvailability } from '../../sensors/motion'
import { ChoiceTest } from '../../tests/choice'
import { PulseTest } from '../../tests/pulse'
import { StandTest } from '../../tests/stand'
import { drinksToday } from '../../store/day'
import { load, update } from '../../store/local'
import { Housing, Key, Keys, Label, Plate, Rows, Sheet } from '../../ui'
import { DrinkPicker } from '../log/DrinkPicker'
import { printedAt } from '../result/format'

type Step = 'intro' | 'clean' | 'what' | 'stand' | 'choice' | 'pulse' | 'saved'

/** Router state, so a reload after the drink question goes back to the tests, not the question. */
type BaselineRouteState = { answered?: boolean; clean?: boolean }

/** Setup found no motion: go straight to Choice Tap rather than mount Stand Still to stall. */
const firstTest = (): Step => (getMotionAvailability() === 'unavailable' ? 'choice' : 'stand')

export function Baseline() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = (location.state ?? {}) as BaselineRouteState
  const [stored] = useState(load)
  const existing = stored.baseline
  const now = Date.now()
  const today = drinksToday(stored.drinks, now)
  // D21: replacing a baseline after a drink would quietly make every later comparison read better.
  const blocked = existing !== undefined && hasAlcohol(today)
  const alreadyLogged = today.length > 0

  const [step, setStep] = useState<Step>(routeState.answered ? firstTest() : 'intro')
  const [clean, setClean] = useState(routeState.clean ?? !alreadyLogged)
  const [stand, setStand] = useState<StandMetrics | null>(null)
  const [choice, setChoice] = useState<ChoiceMetrics | null>(null)

  /** Remember in router state that the drink question is done, then start the tests. */
  const toTests = (isClean: boolean) => {
    setClean(isClean)
    navigate('.', { replace: true, state: { answered: true, clean: isClean } satisfies BaselineRouteState })
    setStep(firstTest())
  }

  // The tapping test may be skipped, but only once the standing test has been recorded: a run
  // with neither is not a reading, and the contract refuses it (shared/contracts.ts).
  const finish = (taps: ChoiceMetrics | null, pulse: PulseRecord | null) => {
    update((current) => ({
      ...current,
      baseline: { run: buildRun(stand, taps, pulse, Date.now()), clean, checks: 0 },
    }))
    setStep('saved')
  }

  if (step === 'intro') {
    if (blocked) {
      return (
        <Housing>
          <Plate small serial={'Baseline\nNot today'} />
          <Sheet grow>
            <Label paper>Recalibrate</Label>
            <h2>Not with alcohol logged today.</h2>
            <p>
              A baseline recorded after a drink makes every later comparison look better than it is. Your current
              baseline stays as it is. Recalibrate on a day with nothing alcoholic logged.
            </p>
          </Sheet>
          <Key onClick={() => navigate('/home')}>Back</Key>
        </Housing>
      )
    }
    return (
      <Housing>
        <Plate small serial={existing ? 'Recalibrate\nYour baseline' : 'Your baseline\nOnce'} />
        <Sheet grow>
          <Label paper>{existing ? 'Recalibrate' : 'Why one baseline'}</Label>
          <h2>{existing ? 'Record a new baseline.' : 'First, your own normal.'}</h2>
          {existing ? (
            <p>
              This replaces the baseline from {printedAt(existing.run.at)}. Your log, your name and your settings stay.
              Your last ticket keeps its own copy of what it was compared with.
            </p>
          ) : (
            <p>
              Kachka compares you only with yourself, so it needs one recording of how you do these tasks on a normal
              day. You record it once. After that, a check goes straight to the tests.
            </p>
          )}
          <Rows
            items={[
              ['Stand still', 'about 15 s'],
              ['Choice tap', 'about 25 s'],
              ['Pulse', 'optional, 18 s'],
            ]}
          />
          <p className="k-small">
            Best before your first coffee or drink. Skip leaves a test out of the baseline, and a later check can only
            compare the tests your baseline has. Nothing is saved until the end.
          </p>
        </Sheet>
        <Key style={{ fontSize: 22 }} onClick={() => (alreadyLogged ? toTests(false) : setStep('clean'))}>
          Start
        </Key>
        {alreadyLogged && (
          <p className="k-small" style={{ color: 'var(--housing-dim)', margin: 0 }}>
            You have logged something today, so this baseline will be marked as taken after a drink.
          </p>
        )}
        <Key quiet onClick={() => navigate(existing ? '/home' : '/')}>
          Back
        </Key>
      </Housing>
    )
  }

  if (step === 'clean') {
    return (
      <Housing>
        <Plate small serial={'Baseline\nBefore the tests'} />
        <Sheet grow>
          <Label paper>Your baseline</Label>
          <h2>Had anything yet today?</h2>
          <p>Either answer is fine. We just label the baseline honestly.</p>
        </Sheet>
        <Keys>
          <Key style={{ fontSize: 22 }} onClick={() => toTests(true)}>
            Nothing yet
          </Key>
          <Key style={{ fontSize: 22 }} onClick={() => setStep('what')}>
            Already had some
          </Key>
        </Keys>
      </Housing>
    )
  }

  if (step === 'what') {
    return (
      <Housing>
        <Plate small serial={'Baseline\nWhat you had'} />
        <DrinkPicker
          label="Before we start"
          onDone={(drinks) => {
            if (drinks.length > 0) update((current) => ({ ...current, drinks: [...current.drinks, ...drinks] }))
            toTests(drinks.length === 0)
          }}
        />
      </Housing>
    )
  }

  if (step === 'saved') {
    return (
      <Housing>
        <Plate small serial={'Your baseline\nOn file'} />
        <Sheet grow>
          <Label paper>Saved</Label>
          <h2>That is your baseline.</h2>
          <p>Every check from here is compared with it, not with anybody else. A check goes straight to the tests.</p>
          {!clean && <p className="k-small">You had something before this one, so later readings are worth reading loosely.</p>}
        </Sheet>
        <Key style={{ fontSize: 22 }} onClick={() => navigate('/home')}>
          Done
        </Key>
        <Key quiet onClick={() => navigate('/demo')}>
          Try the demo challenge
        </Key>
      </Housing>
    )
  }

  const noMotion = getMotionAvailability() === 'unavailable'
  return (
    <Housing>
      <Plate
        small
        serial={`Baseline\n${step === 'stand' ? 'Test 1 of 2' : step === 'choice' ? 'Test 2 of 2' : 'Optional'}`}
      />
      {step === 'stand' && <Label>Test 1 of 2 · Stand still</Label>}
      {step === 'pulse' ? (
        <PulseTest label="Optional · Pulse" onDone={(_bpm, pulse) => finish(choice, pulse)} />
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
            setStep('pulse')
          }}
        />
      )}
      {step === 'choice' && stand !== null && (
        <Key
          quiet
          onClick={() => {
            setChoice(null)
            setStep('pulse')
          }}
        >
          Skip this test
        </Key>
      )}
    </Housing>
  )
}
