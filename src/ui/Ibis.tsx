import type { ReactNode, CSSProperties } from 'react';

/** Dr. Bin Chicken. Ported verbatim from the `ibis(mood)` function in docs/design/prototype.html.
 *  He is only ever drawn on paper (chart or ticket), never straight onto the dark housing.
 *  On the housing, wrap him in <Badge>. */

export type Mood = 'steady' | 'wired' | 'tipsy' | 'wobbly';

/** Wobbly reuses the tipsy mood without the hiccup bubbles. */
const bodyMood = (mood: Mood) => (mood === 'wobbly' ? 'tipsy' : mood);

function Eye({ mood }: { mood: Mood }) {
  const m = bodyMood(mood);
  if (m === 'tipsy') {
    return (
      <>
        <circle className="eye" cx="89" cy="25" r="4.5" />
        <path
          className="blk"
          d="M86.5 22.5l5 5m0-5l-5 5"
          style={{ stroke: 'var(--ink)', strokeWidth: 1.8, strokeLinecap: 'round' }}
        />
      </>
    );
  }
  if (m === 'wired') {
    return (
      <>
        <circle className="eye" cx="89" cy="25" r="6" />
        <circle className="blk" cx="90" cy="25" r="1.3" />
        <path className="ln thin" d="M79 19l-5-6M85 16l-1-8M92 17l4-7" />
      </>
    );
  }
  return (
    <>
      <circle className="eye" cx="89" cy="25" r="4.2" />
      <circle className="blk" cx="90" cy="26.5" r="1.7" />
      <path className="blk lid" d="M84.6 25a4.4 4.4 0 0 1 8.8 0z" />
    </>
  );
}

export function Ibis({ mood = 'steady', className = '' }: { mood?: Mood; className?: string }) {
  const hiccups = mood === 'tipsy';
  return (
    <svg
      className={`k-ibis k-ibis--${mood} ${className}`.trim()}
      viewBox="0 0 120 130"
      role="img"
      aria-label={`Dr. Bin Chicken the ibis, looking ${mood}`}
    >
      <g className="bird">
        <path className="ln" d="M46 90L44 108L40 122M40 122l-7 3M40 122l6 4" />
        <path className="ln" d="M60 90L62 108L60 122M60 122l-7 3M60 122l6 4" />
        <path className="blk" d="M24 66L8 60L18 70L6 74L20 78L10 86L28 82Z" />
        <ellipse className="wht" cx="52" cy="72" rx="30" ry="21" />
        <path className="ln thin" d="M36 70Q52 84 70 72" />
        <path className="neck" d="M72 62Q84 52 86 34" />
        <circle className="blk" cx="87" cy="28" r="10" />
        <path className="beak" d="M95 27Q116 28 113 62" />
        <Eye mood={mood} />
        {hiccups && (
          <>
            <circle className="ln thin" cx="112" cy="14" r="3" />
            <circle className="ln thin" cx="104" cy="6" r="2" />
          </>
        )}
      </g>
    </svg>
  );
}

/** The paper square that lets the mascot sit on the dark housing. */
export function Badge({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <span className="k-badge" style={style}>{children}</span>;
}
