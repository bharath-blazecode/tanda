// CARD 4. Choice Tap: 2 warm-up taps plus 12 that count.
// Protocol and edge cases: docs/04-screens-spec.md, T2. Ported from docs/design/prototype-flow.html.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChoiceMetrics } from '../../../shared/contracts'
import { Key, Label } from '../../ui'
import { SCORED_TRIALS, summariseChoice, type ChoiceTrial } from './analyze'

type Props = { onDone: (metrics: ChoiceMetrics) => void }

const WARM_UPS = 2
const SQUARES = 4
const MAX_REPEATS = 3 // per run, across "too soon" and anticipation
const LAPSE_MS = 2000 // no tap this long after a square lights
const ANTICIPATION_MS = 100 // under this is a guess, not a reaction
const WAIT_MIN_MS = 800
const WAIT_MAX_MS = 2000

/** Each square lights three times across the scored trials, shuffled, after two warm-ups. */
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

type Phase = 'idle' | 'waiting' | 'lit' | 'done'

export function ChoiceTest({ onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [lit, setLit] = useState(-1)
  const [index, setIndex] = useState(0)
  const [message, setMessage] = useState('')

  // Refs, not state: the trial loop reads these inside timers, where stale state would lie.
  const sequence = useRef<number[]>([])
  const trials = useRef<ChoiceTrial[]>([])
  const repeats = useRef(0)
  const litAt = useRef(0)
  const timers = useRef<number[]>([])
  const phaseRef = useRef<Phase>('idle')
  const indexRef = useRef(0)

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

  useEffect(() => clearTimers, [])

  const finish = useCallback(() => {
    clearTimers()
    setLit(-1)
    setPhaseBoth('done')
    onDone(summariseChoice(trials.current))
  }, [onDone])

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
    clearTimers()
    sequence.current = buildSequence()
    trials.current = []
    repeats.current = 0
    indexRef.current = 0
    setMessage('')
    nextTrial()
  }, [nextTrial])

  /** A hidden tab means the taps that follow are not reaction times. Start the run again. */
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden' && phaseRef.current !== 'idle' && phaseRef.current !== 'done') {
        clearTimers()
        setLit(-1)
        setPhaseBoth('idle')
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
    indexRef.current = i + 1
    nextTrial()
  }

  const counter =
    phase === 'idle' || phase === 'done'
      ? ''
      : index < WARM_UPS
        ? `Warm-up ${index + 1}/${WARM_UPS}`
        : `${index - WARM_UPS + 1}/${SCORED_TRIALS}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--s3)' }}>
        <Label>{phase === 'done' ? 'Done' : 'Choice tap'}</Label>
        <Label>{message || counter}</Label>
      </div>

      {phase === 'idle' || phase === 'done' ? (
        <Key onClick={start}>{phase === 'done' ? 'Again' : 'Start'}</Key>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)' }}>
          {Array.from({ length: SQUARES }, (_, square) => (
            <Key
              key={square}
              lit={lit === square}
              aria-label={`Square ${square + 1}${lit === square ? ', lit' : ''}`}
              style={{ aspectRatio: '1 / 1', fontSize: 'clamp(20px, 7vw, 34px)' }}
              onPointerDown={(e) => {
                e.preventDefault()
                tap(square)
              }}
            >
              {lit === square ? 'Tap' : ''}
            </Key>
          ))}
        </div>
      )}
    </div>
  )
}
