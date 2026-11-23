import { useState } from 'react'
import { Logo } from '../../ui'
import './recorder.css'

const steps = ['Stand still', 'Tap the squares', 'Read your ticket'] as const

/** Ink printed on the demonstration strip. The adjacent caption carries the same meaning. */
function InstructionMark({ step }: { step: number }) {
  if (step === 2) return <Logo />
  return (
    <svg viewBox="0 0 80 54" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round">
      {step === 0 ? <>
        <circle cx="40" cy="10" r="7" />
        <path d="M28 50V33l-5 11-7-3 8-18 10-4m12 0 10 4 8 18-7 3-5-11v17" />
        <rect x="34" y="24" width="12" height="19" rx="2" fill="var(--grid)" />
        <path d="M37 39h6" />
      </> : <>
        <rect x="9" y="7" width="19" height="16" /><rect x="32" y="7" width="19" height="16" fill="currentColor" />
        <rect x="9" y="27" width="19" height="16" /><rect x="32" y="27" width="19" height="16" />
        <path d="m58 47-11-9-5-17c-1-4 3-5 5-2l6 11 3-3 12 7-4 16z" fill="var(--chart)" />
      </>}
    </svg>
  )
}

export function PaperRecorder() {
  // The feed number also restarts a single mechanical stroke when presses interrupt one another.
  const [feed, setFeed] = useState(0)
  const step = feed % steps.length
  const previous = (step + steps.length - 1) % steps.length
  return (
    <div className="recorder">
      <div className="recorder-stage" aria-hidden="true">
        <div className="recorder-deck">
          <div className="recorder-front"><b>BC-2</b><i /></div>
          <div className="recorder-side" />
          <div className="recorder-window">
            <div key={feed} className={feed ? 'recorder-paper recorder-paper--feed' : 'recorder-paper'}>
              <div><InstructionMark step={previous} /></div>
              <div><InstructionMark step={step} /></div>
            </div>
          </div>
          <span className="recorder-roller" />
          <span className="recorder-grille" />
          <span className="recorder-wheel"><i style={{ transform: `rotate(${feed * 120}deg)` }} /></span>
        </div>
      </div>
      <div className="recorder-controls">
        <button type="button" className="recorder-key" onClick={() => setFeed(n => n + 1)}>
          Feed paper <span aria-hidden="true">↧</span>
        </button>
        <span className="recorder-caption" role="status" aria-atomic="true">{steps[step]}</span>
      </div>
    </div>
  )
}
