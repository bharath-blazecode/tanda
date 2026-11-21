import type { ReactNode, CSSProperties } from 'react'
/** Chart paper with the two-level grid and a thick dark frame. Holds a canvas.
 *  (The build board calls this card "Window"; DESIGN.md calls it ChartWindow, which wins —
 *  it also avoids shadowing the DOM `Window` type.) */
export function ChartWindow({
  children,
  className = '',
  style,
  minHeight,
  bottom = false,
}: {
  children?: ReactNode
  className?: string
  style?: CSSProperties
  minHeight?: number | string
  /** Push printed content to the foot of the chart, so a Legend can sit at the head. */
  bottom?: boolean
}) {
  return (
    <div className={`k-window${bottom ? ' k-window--bottom' : ''} ${className}`.trim()} style={{ minHeight, ...style }}>
      {children}
    </div>
  )
}

/** Top-left key for the two traces. Blue pencil is your baseline, black ink is right now. */
export function Legend({ now = 'Now', baseline = 'Your normal' }: { now?: string; baseline?: string }) {
  return (
    <div className="k-window__legend">
      <span>{now}</span>
      <b>{baseline}</b>
    </div>
  )
}

/** Time axis along the bottom of a chart window. */
export function Axis({ left, right }: { left: string; right: string }) {
  return (
    <div className="k-window__axis">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  )
}

/** Content printed onto the chart paper rather than drawn on the canvas. */
export function Printed({ children }: { children: ReactNode }) {
  return <div className="k-window__printed">{children}</div>
}
