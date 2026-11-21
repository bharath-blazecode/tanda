import type { ReactNode } from 'react';
import { Ibis, type Mood } from './Ibis';
import { Stamp } from './Stamp';

/** Thermal paper with the zigzag bottom edge and the print-in animation.
 *  It prints top to bottom in about 1.2s, which covers the wait for Claude's line;
 *  the stamp lands after it. Pass `print` to run that sequence. */
export function Ticket({ children, print = false, className = '' }: { children: ReactNode; print?: boolean; className?: string }) {
  return <div className={`k-ticket${print ? ' k-ticket--print' : ''} ${className}`.trim()}>{children}</div>;
}

/** The mascot beside the stamp, as he appears on a Result ticket. */
export function TicketVerdict({ verdict, mood, note = 'Certified by a bin chicken' }: { verdict: string; mood: Mood; note?: string }) {
  return (
    <div className="k-stamp-wrap">
      <div className="k-stamp-badge"><Ibis mood={mood} /></div>
      <Stamp verdict={verdict} note={note} />
    </div>
  );
}

/** Dr. Bin Chicken's line, with his byline under it. */
export function Quote({ children, byline = 'Dr. Bin Chicken, lab tech' }: { children: ReactNode; byline?: string }) {
  return (
    <>
      <p className="k-ticket__quote">{children}</p>
      <p className="k-ticket__byline">{byline}</p>
    </>
  );
}

/** The tear-off part of a ticket: a dashed tear line, a small label, one large instruction. */
export function Stub({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <hr className="k-tear" />
      <div className="k-stub">
        <span className="k-label k-label--paper">{label}</span>
        <b>{children}</b>
      </div>
    </>
  );
}
