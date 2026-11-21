import type { ReactNode, CSSProperties } from 'react'
/** The dark instrument frame every screen sits in. 6px radius, 1px lighter edge. */
export function Housing({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <div className={`k-housing ${className}`.trim()} style={style}>{children}</div>
}
