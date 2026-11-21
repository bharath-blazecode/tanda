/** The mark: a square of chart paper, the ibis's head top left, his beak curving down,
 *  and the trace he has just drawn along the bottom. Ported from the `MARK` constant in
 *  docs/design/prototype.html. Always on its own paper square, in ink. Never recoloured. */

export function Logo({ size, className = '' }: { size?: number | string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Kachka logo: an ibis whose beak draws a trace"
    >
      <rect x="2" y="2" width="60" height="60" style={{ fill: 'var(--chart)', stroke: 'var(--ink)', strokeWidth: 3 }} />
      <path
        d="M8 50L16 47L24 53L30 41L36 55L42 44L50 50"
        style={{ fill: 'none', stroke: 'var(--ink)', strokeWidth: 2.5, strokeLinejoin: 'round', strokeLinecap: 'round' }}
      />
      <path d="M27 21Q54 20 50 50" style={{ fill: 'none', stroke: 'var(--ink)', strokeWidth: 4.5, strokeLinecap: 'round' }} />
      <circle cx="20" cy="21" r="11" style={{ fill: 'var(--ink)' }} />
      <circle cx="23" cy="18.5" r="4" style={{ fill: 'var(--receipt)' }} />
      <circle cx="24" cy="19.8" r="1.6" style={{ fill: 'var(--ink)' }} />
      <path d="M19 18.5a4 4 0 0 1 8 0z" style={{ fill: 'var(--ink)' }} />
    </svg>
  )
}
