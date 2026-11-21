import type { ReactNode } from 'react'
/** The 11px engraved label. `paper` recolours it for use on chart or ticket. */
export function Label({
  children,
  paper = false,
  className = '',
}: {
  children: ReactNode
  paper?: boolean
  className?: string
}) {
  return <div className={`k-label${paper ? ' k-label--paper' : ''} ${className}`.trim()}>{children}</div>
}
