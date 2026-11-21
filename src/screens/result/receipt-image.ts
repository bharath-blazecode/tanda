// Draw the reading as a receipt image, so it can be saved or shared.
// It is drawn from the data rather than screenshotted from the DOM: a canvas renders the same
// on every phone, where html-to-image depends on fonts and SVG support that Safari and Chrome
// disagree about. It also means the content is a plain list that a test can read.
import { SAFETY_TEXT } from '../../ui'

export type ReceiptData = {
  readingId: string
  timestamp: string
  name?: string
  tags: string[]
  rows: [label: string, value: string][]
  verdict: string
  line: string
  /** Mandatory whenever anything alcoholic was logged today, Steady included (D19). */
  safety: boolean
  nudge: string
}

export type ReceiptLine =
  | { kind: 'title'; text: string }
  | { kind: 'meta'; text: string }
  | { kind: 'tag'; text: string }
  | { kind: 'rule' }
  | { kind: 'row'; label: string; value: string }
  | { kind: 'stamp'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'byline'; text: string }
  | { kind: 'safety'; text: string }
  | { kind: 'next'; text: string }

/**
 * Everything the image says, in order. Pure, so a test can check the safety line is on a
 * receipt that needs one without needing a canvas.
 */
export function receiptLines(d: ReceiptData): ReceiptLine[] {
  const out: ReceiptLine[] = [
    { kind: 'title', text: 'KACHKA' },
    { kind: 'meta', text: `Reading ${d.readingId}` },
    { kind: 'meta', text: d.timestamp },
  ]
  if (d.name) out.push({ kind: 'meta', text: `Subject · ${d.name}` })
  out.push({ kind: 'rule' })
  for (const tag of d.tags) out.push({ kind: 'tag', text: tag })
  for (const [label, value] of d.rows) out.push({ kind: 'row', label, value })
  out.push({ kind: 'rule' })
  out.push({ kind: 'stamp', text: d.verdict.toUpperCase() })
  out.push({ kind: 'quote', text: `“${d.line}”` })
  out.push({ kind: 'byline', text: 'Dr. Kachka · Certified by a bin chicken' })
  if (d.safety) out.push({ kind: 'safety', text: SAFETY_TEXT })
  out.push({ kind: 'next', text: `Next · ${d.nudge}` })
  return out
}

/** The filename a saved or shared receipt carries. */
export function receiptFilename(readingId: string): string {
  return `kachka-reading-${readingId.replace(/[^a-zA-Z0-9-]/g, '')}.png`
}

const W = 720
const PAD = 48
const INK = '#1C1F25'
const SOFT = '#5A606A'
const PAPER = '#FAFAF4'
const STAMP = '#C3273B'
const MONO = '"Courier Prime", ui-monospace, Menlo, monospace'

/** Split text to fit the width, measuring with the font already set on the context. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (ctx.measureText(next).width > max && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

/**
 * Render to a PNG blob. Returns null where canvas is unavailable, so the caller can hide the
 * buttons rather than hand someone a broken one.
 */
export async function drawReceipt(d: ReceiptData, scale = 2): Promise<Blob | null> {
  if (typeof document === 'undefined') return null
  // Web fonts load after first paint; without this the receipt renders in a fallback face.
  try {
    await document.fonts?.ready
  } catch {
    // A browser without the font loading API still draws, just in its fallback face.
  }

  const measure = document.createElement('canvas').getContext('2d')
  if (!measure) return null
  const inner = W - PAD * 2
  const plan: { y: number; line: ReceiptLine; wrapped: string[] }[] = []
  let y = PAD

  for (const line of receiptLines(d)) {
    let wrapped: string[] = []
    switch (line.kind) {
      case 'title':
        y += 54
        break
      case 'meta':
        y += 30
        break
      case 'rule':
        y += 28
        break
      case 'tag':
        measure.font = `16px ${MONO}`
        wrapped = wrap(measure, line.text, inner)
        y += wrapped.length * 24 + 6
        break
      case 'row':
        y += 34
        break
      case 'stamp':
        y += 76
        break
      case 'quote':
        measure.font = `italic 24px ${MONO}`
        wrapped = wrap(measure, line.text, inner)
        y += wrapped.length * 32 + 10
        break
      case 'byline':
        y += 30
        break
      case 'safety':
        measure.font = `bold 18px ${MONO}`
        wrapped = wrap(measure, line.text, inner - 32)
        y += wrapped.length * 26 + 36
        break
      case 'next':
        measure.font = `18px ${MONO}`
        wrapped = wrap(measure, line.text, inner)
        y += wrapped.length * 26 + 20
        break
    }
    plan.push({ y, line, wrapped })
  }
  const H = y + PAD

  const canvas = document.createElement('canvas')
  canvas.width = W * scale
  canvas.height = H * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.scale(scale, scale)
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'alphabetic'

  for (const { y: at, line, wrapped } of plan) {
    switch (line.kind) {
      case 'title':
        ctx.fillStyle = INK
        ctx.font = `bold 44px ${MONO}`
        ctx.textAlign = 'center'
        ctx.fillText(line.text, W / 2, at)
        break
      case 'meta':
        ctx.fillStyle = SOFT
        ctx.font = `18px ${MONO}`
        ctx.textAlign = 'center'
        ctx.fillText(line.text, W / 2, at)
        break
      case 'rule':
        ctx.strokeStyle = '#C6D6C0'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 6])
        ctx.beginPath()
        ctx.moveTo(PAD, at - 12)
        ctx.lineTo(W - PAD, at - 12)
        ctx.stroke()
        ctx.setLineDash([])
        break
      case 'tag':
        ctx.fillStyle = SOFT
        ctx.font = `16px ${MONO}`
        ctx.textAlign = 'left'
        wrapped.forEach((t, i) => ctx.fillText(t, PAD, at - (wrapped.length - 1 - i) * 24))
        break
      case 'row': {
        ctx.fillStyle = INK
        ctx.font = `20px ${MONO}`
        ctx.textAlign = 'left'
        ctx.fillText(line.label, PAD, at)
        ctx.textAlign = 'right'
        ctx.font = `bold 20px ${MONO}`
        ctx.fillText(line.value, W - PAD, at)
        // The dotted leader, drawn between the two so it never runs under either.
        const from = PAD + ctx.measureText(line.label).width + 60
        const to = W - PAD - ctx.measureText(line.value).width - 12
        if (to > from) {
          ctx.strokeStyle = '#9DB897'
          ctx.lineWidth = 2
          ctx.setLineDash([2, 5])
          ctx.beginPath()
          ctx.moveTo(from, at - 6)
          ctx.lineTo(to, at - 6)
          ctx.stroke()
          ctx.setLineDash([])
        }
        break
      }
      case 'stamp':
        ctx.save()
        ctx.translate(W / 2, at - 16)
        ctx.rotate(-0.045)
        ctx.strokeStyle = STAMP
        ctx.fillStyle = STAMP
        ctx.lineWidth = 4
        ctx.font = `bold 52px ${MONO}`
        ctx.textAlign = 'center'
        const width = ctx.measureText(line.text).width + 64
        ctx.strokeRect(-width / 2, -54, width, 76)
        ctx.fillText(line.text, 0, 0)
        ctx.restore()
        break
      case 'quote':
        ctx.fillStyle = INK
        ctx.font = `italic 24px ${MONO}`
        ctx.textAlign = 'left'
        wrapped.forEach((t, i) => ctx.fillText(t, PAD, at - (wrapped.length - 1 - i) * 32))
        break
      case 'byline':
        ctx.fillStyle = SOFT
        ctx.font = `15px ${MONO}`
        ctx.textAlign = 'left'
        ctx.fillText(line.text, PAD, at)
        break
      case 'safety': {
        const height = wrapped.length * 26 + 20
        ctx.strokeStyle = INK
        ctx.lineWidth = 3
        ctx.strokeRect(PAD, at - height, W - PAD * 2, height)
        ctx.fillStyle = INK
        ctx.font = `bold 18px ${MONO}`
        ctx.textAlign = 'left'
        wrapped.forEach((t, i) => ctx.fillText(t, PAD + 16, at - height + 32 + i * 26))
        break
      }
      case 'next':
        ctx.fillStyle = INK
        ctx.font = `18px ${MONO}`
        ctx.textAlign = 'left'
        wrapped.forEach((t, i) => ctx.fillText(t, PAD, at - (wrapped.length - 1 - i) * 26))
        break
    }
  }

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'))
}
