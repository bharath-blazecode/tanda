// CARD 4. Choice Tap: 2 warm-up taps plus 12 that count.
// Protocol and edge cases: docs/04-screens-spec.md, T2. Ported from docs/design/prototype-flow.html.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChoiceMetrics } from '../../../shared/contracts'
import { Key, Label, Rows, Sheet } from '../../ui'
import { hasCleanTaps, SCORED_TRIALS, summariseChoice, type ChoiceTrial } from './analyze'
import { createTapSound } from './sound'
import './choice.css'

/** `onDone` fires from the Next key on the results sheet, so the person sees their taps first.
 *  `label` is the engraved step label, e.g. "Test 2 of 2 · Choice tap". */
type Props = { onDone: (metrics: ChoiceMetrics) => void; label?: string }

const WARM_UPS = 2
const SQUARES = 4
const MAX_REPEATS = 3 // per run, across "too soon" and anticipation
const LAPSE_MS = 2000 // no tap this long after a square lights
const ANTICIPATION_MS = 100 // under this is a guess, not a reaction
const WAIT_MIN_MS = 800
const WAIT_MAX_MS = 2000

/** Each square lights the same number of times across the scored trials, shuffled, after two warm-ups. */
function buildSequence(): number[] {
  const scored: number[] = []
  for (let square = 0; square < SQUARES; square++) {
    for (let n = 0; n < SCORED_TRIALS / SQUARES; n++) scored.push(square)
  }
  for (let i = scored.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[scored[i], scored[j]] = [scored[j], scored[i]]
  }
  const warmUps = Array.from({ length: WARM_UPS }, () => Math.floor(Math.random() * SQUARES))
  return [...warmUps, ...scored]
}

type Phase = 'intro' | 'waiting' | 'lit' | 'done'

export function ChoiceTest({ onDone, label = 'Choice tap' }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [result, setResult] = useState<ChoiceMetrics | null>(null)
  const [lit, setLit] = useState(-1)
  const [index, setIndex] = useState(0)
  const [message, setMessage] = useState('')

  // Refs, not state: the trial loop reads these inside timers, where stale state would lie.
  const sequence = useRef<number[]>([])
  const trials = useRef<ChoiceTrial[]>([])
  const repeats = useRef(0)
  const litAt = useRef(0)
  const timers = useRef<number[]>([])
  const phaseRef = useRef<Phase>('intro')
  const indexRef = useRef(0)
  const sound = useRef<ReturnType<typeof createTapSound> | null>(null)

  const setPhaseBoth = (next: Phase) => {
    phaseRef.current = next
    setPhase(next)
  }

  const clearTimers = () => {
    for (const t of timers.current) window.clearTimeout(t)
    timers.current = []
  }
  const after = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  useEffect(() => () => {
    clearTimers()
    sound.current?.close()
  }, [])

  const finish = useCallback(() => {
    clearTimers()
    setLit(-1)
    setResult(summariseChoice(trials.current))
    setPhaseBoth('done')
  }, [])

  /** `note` survives into the next trial; without it the reset below would clear it in the same tick. */
  const nextTrial = useCallback((note = '') => {
    clearTimers()
    setLit(-1)
    setMessage(note)

    const i = indexRef.current
    if (i >= sequence.current.length) {
      finish()
      return
    }

    setIndex(i)
    setPhaseBoth('waiting')
    after(WAIT_MIN_MS + Math.random() * (WAIT_MAX_MS - WAIT_MIN_MS), () => {
      const square = sequence.current[i]
      litAt.current = performance.now()
      setLit(square)
      setPhaseBoth('lit')
      after(LAPSE_MS, () => {
        if (i >= WARM_UPS) trials.current.push({ lit: square, tapped: null, ms: null })
        indexRef.current = i + 1
        nextTrial()
      })
    })
  }, [finish])

  const start = useCallback(() => {
    sound.current?.close()
    sound.current = createTapSound()
    clearTimers()
    sequence.current = buildSequence()
    trials.current = []
    repeats.current = 0
    indexRef.current = 0
    setResult(null)
    setMessage('')
    nextTrial()
  }, [nextTrial])

  /** A hidden tab means the taps that follow are not reaction times. Start the run again. */
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden' && phaseRef.current !== 'intro' && phaseRef.current !== 'done') {
        clearTimers()
        sound.current?.close()
        sound.current = null
        setLit(-1)
        setPhaseBoth('intro')
        setMessage('That restarted when you left the page.')
      }
    }
    document.addEventListener('visibilitychange', onHidden)
    return () => document.removeEventListener('visibilitychange', onHidden)
  }, [])

  const tap = (square: number) => {
    const i = indexRef.current

    // Tapped before anything lit.
    if (phaseRef.current === 'waiting') {
      if (repeats.current < MAX_REPEATS) {
        repeats.current++
        nextTrial('Too soon.')
      }
      return
    }
    if (phaseRef.current !== 'lit') return

    const ms = performance.now() - litAt.current
    clearTimers()

    // Faster than a person can react: a guess. Discard and run the trial again.
    if (ms < ANTICIPATION_MS && repeats.current < MAX_REPEATS) {
      repeats.current++
      nextTrial()
      return
    }

    if (i >= WARM_UPS) trials.current.push({ lit: sequence.current[i], tapped: square, ms })
    sound.current?.play(square === sequence.current[i])
    indexRef.current = i + 1
    nextTrial()
  }

  const counter =
    phase === 'intro'
      ? `${SCORED_TRIALS} taps`
      : phase === 'done'
        ? 'Done'
        : index < WARM_UPS
          ? `Warm-up ${index + 1}/${WARM_UPS}`
          : `${index - WARM_UPS + 1}/${SCORED_TRIALS}`

  const running = phase === 'waiting' || phase === 'lit'

  return (
    <div className="choice-test">
      <div className="choice-head">
        <Label>{label}</Label>
        <span className="choice-counter" aria-live="polite">
          {counter}
        </span>
      </div>

      {phase === 'intro' && (
        <>
          <Sheet grow>
            <Label paper>Speed and accuracy</Label>
            <h2>Tap the square that lights up.</h2>
            <p>Four squares. One lights up; tap it as fast as you can. The first two do not count.</p>
            <p>Correct taps chime. Wrong squares buzz. You can still take the test with sound off.</p>
          </Sheet>
          {message && (
            <div className="choice-status" role="status" aria-live="polite">
              {message}
            </div>
          )}
          <Key onClick={start}>Start</Key>
        </>
      )}

      {running && (
        <>
          <div className="choice-grid">
            {Array.from({ length: SQUARES }, (_, square) => (
              <Key
                key={square}
                lit={lit === square}
                aria-label={`Square ${square + 1}${lit === square ? ', lit' : ''}`}
                onPointerDown={(e) => {
                  e.preventDefault()
                  tap(square)
                }}
              >
                {lit === square ? 'Tap' : ''}
              </Key>
            ))}
          </div>
          <div className="choice-status" role="status" aria-live="polite">
            {message}
          </div>
        </>
      )}

      {phase === 'done' && result && (
        <>
          <Sheet grow>
            <Label paper>Choice tap</Label>
            <h2>{hasCleanTaps(result) ? `${Math.round(result.medianMs)} ms` : 'No clean taps'}</h2>
            <p>Median of your correct taps.</p>
            <Rows
              items={[
                ['Wrong squares', String(result.wrong)],
                ['Missed', String(result.lapses)],
              ]}
            />
          </Sheet>
          <Key onClick={() => onDone(result)}>Next</Key>
          {!hasCleanTaps(result) && (
            <Key quiet onClick={start}>
              Try again
            </Key>
          )}
        </>
      )}
    </div>
  )
}
