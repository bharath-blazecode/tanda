// CARD 6. Baseline (docs/04-screens-spec.md, section 3).
// Record the person's own normal, once. Nothing is saved until both tests are through,
// so walking away mid-way leaves no half-baseline behind.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { ChoiceMetrics, StandMetrics } from '../../../shared/contracts'
import { ChoiceTest } from '../../tests/choice'
import { StandTest } from '../../tests/stand'
import { update } from '../../store/local'
import { Housing, Key, Keys, Label, Plate, Sheet } from '../../ui'

type Step = 'clean' | 'stand' | 'choice' | 'saved'

export function Baseline() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('clean')
  const [clean, setClean] = useState(true)
  const [stand, setStand] = useState<StandMetrics | null>(null)

  const finish = (choice: ChoiceMetrics) => {
    update((current) => ({
      ...current,
      baseline: {
        run: { stand: stand ?? undefined, choice, at: Date.now() },
        clean,
      },
    }))
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
              setStep('stand')
            }}
          >
            Nothing yet
          </Key>
          <Key
            style={{ fontSize: 22 }}
            onClick={() => {
              setClean(false)
              setStep('stand')
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
      </Housing>
    )
  }

  return (
    <Housing>
      <Plate small serial={`Recording\n${step === 'stand' ? '1' : '2'} of 2`} />
      <Label>{step === 'stand' ? 'Test 1 of 2 · Stand still' : 'Test 2 of 2 · Choice tap'}</Label>
      {step === 'stand' ? (
        <StandTest
          onDone={(metrics) => {
            setStand(metrics)
            setStep('choice')
          }}
        />
      ) : (
        <ChoiceTest onDone={finish} />
      )}
    </Housing>
  )
}
