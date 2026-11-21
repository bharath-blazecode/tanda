// Draw the reading as a receipt image, so it can be saved or shared.
// The picture is meant to read as the ticket on screen: the housing behind it, the display face,
// the red stamp off square, the torn edge, and where to get your own underneath.
// It is drawn from the data rather than screenshotted from the DOM: a canvas renders the same
// on every phone, where html-to-image depends on fonts and SVG support that Safari and Chrome
// disagree about. It also means the content is a plain list that a test can read.
import { SAFETY_TEXT } from '../../ui'

/** Printed under the ticket. The one address worth typing. */
export const SITE = 'kachka.fun'

export type ReceiptData = {
  readingId: string
  timestamp: string
  name?: string
  tags: string[]
  rows: [label: string, value: string][]
  /** One line under the rows: the demo's guess at the handicap. */
  extra?: string
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
  | { kind: 'extra'; text: string }
  | { kind: 'site'; text: string }

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
  if (d.extra) out.push({ kind: 'extra', text: d.extra })
  out.push({ kind: 'rule' })
  out.push({ kind: 'stamp', text: d.verdict.toUpperCase() })
  out.push({ kind: 'quote', text: `“${d.line}”` })
  out.push({ kind: 'byline', text: 'Dr. Kachka' })
  if (d.safety) out.push({ kind: 'safety', text: SAFETY_TEXT })
  out.push({ kind: 'next', text: d.nudge })
  // Whoever sees the picture should know where to get their own.
  out.push({ kind: 'site', text: SITE })
  return out
}

/** The filename a saved or shared receipt carries. */
export function receiptFilename(readingId: string): string {
  return `kachka-reading-${readingId.replace(/[^a-zA-Z0-9-]/g, '')}.png`
}

const W = 1080
const PAPER_X = 80
const PAPER_W = W - PAPER_X * 2
const PAD = 70
const X = PAPER_X + PAD
const INNER = PAPER_W - PAD * 2
const TOOTH = 24
/** Housing left under the paper for the address and the fine print. */
const FOOT = 250

// The same values as src/ui/tokens.css. A canvas cannot read CSS variables.
const HOUSING = '#1e2a27'
const HOUSING_INK = '#dce6df'
const HOUSING_DIM = '#93a79e'
const PAPER = '#fafaf4'
const CHART = '#eef2e6'
const INK = '#1c1f25'
const SOFT = '#5a606a'
const STAMP = '#c3273b'
const DISPLAY = '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif'
const MONO = '"Courier Prime", "Courier New", Courier, monospace'

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

/** The logo mark from src/ui/Logo.tsx, drawn in a 64 unit box. It stands where the bird does on screen. */
function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 64, size / 64)
  ctx.fillStyle = CHART
  ctx.strokeStyle = INK
  ctx.lineWidth = 3
  ctx.fillRect(2, 2, 60, 60)
  ctx.strokeRect(2, 2, 60, 60)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.lineWidth = 2.5
  ctx.stroke(new Path2D('M8 50L16 47L24 53L30 41L36 55L42 44L50 50'))
  ctx.lineWidth = 4.5
  ctx.stroke(new Path2D('M27 21Q54 20 50 50'))
  ctx.fillStyle = INK
  ctx.beginPath()
  ctx.arc(20, 21, 11, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = PAPER
  ctx.beginPath()
  ctx.arc(23, 18.5, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = INK
  ctx.beginPath()
  ctx.arc(24, 19.8, 1.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fill(new Path2D('M19 18.5a4 4 0 0 1 8 0z'))
  ctx.restore()
}

/**
 * Paints every line and returns the height the picture needs. It runs twice: once on a scrap
 * context to learn the height, then for real, because the paper is drawn before the words on it.
 */
function paint(ctx: CanvasRenderingContext2D, lines: ReceiptLine[], height: number): number {
  const paperTop = 70
  const paperBottom = height - FOOT
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = HOUSING
  ctx.fillRect(0, 0, W, height)

  // The paper, with the ticket's torn edge along the bottom.
  ctx.fillStyle = PAPER
  ctx.beginPath()
  ctx.moveTo(PAPER_X, paperTop)
  ctx.lineTo(PAPER_X + PAPER_W, paperTop)
  ctx.lineTo(PAPER_X + PAPER_W, paperBottom)
  for (let x = PAPER_X + PAPER_W; x > PAPER_X; x -= TOOTH * 2) {
    ctx.lineTo(Math.max(PAPER_X, x - TOOTH), paperBottom + TOOTH)
    ctx.lineTo(Math.max(PAPER_X, x - TOOTH * 2), paperBottom)
  }
  ctx.closePath()
  ctx.fill()

  let y = paperTop + PAD
  let paperEnd = y
  const block = (text: string, font: string, color: string, lineHeight: number, align: 'left' | 'center', max = INNER) => {
    ctx.font = font
    ctx.fillStyle = color
    ctx.textAlign = align
    for (const t of wrap(ctx, text, max)) {
      y += lineHeight
      ctx.fillText(t, align === 'center' ? W / 2 : X, y)
    }
  }
  const dashed = (dash: number[], color: string, width: number) => {
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.setLineDash(dash)
    ctx.beginPath()
    ctx.moveTo(X, y)
    ctx.lineTo(X + INNER, y)
    ctx.stroke()
    ctx.setLineDash([])
  }

  let rulesSeen = 0
  for (const line of lines) {
    switch (line.kind) {
      case 'title':
        block(line.text, `900 130px ${DISPLAY}`, INK, 112, 'center')
        y += 14
        break
      case 'meta':
        block(line.text.toUpperCase(), `700 30px ${MONO}`, INK, 42, 'center')
        break
      case 'rule':
        // The first rule only opens the body; the second gives the stamp its room.
        y += rulesSeen === 0 ? 30 : 60
        rulesSeen += 1
        break
      case 'tag':
        block(line.text, `400 28px ${MONO}`, INK, 40, 'left')
        break
      case 'row': {
        y += 54
        ctx.font = `400 36px ${MONO}`
        ctx.fillStyle = INK
        ctx.textAlign = 'left'
        ctx.fillText(line.label, X, y)
        const from = X + ctx.measureText(line.label).width + 16
        ctx.font = `700 36px ${MONO}`
        ctx.textAlign = 'right'
        ctx.fillText(line.value, X + INNER, y)
        const to = X + INNER - ctx.measureText(line.value).width - 16
        // The dotted leader, drawn between the two so it never runs under either.
        if (to > from) {
          ctx.strokeStyle = SOFT
          ctx.lineWidth = 3
          ctx.setLineDash([3, 9])
          ctx.beginPath()
          ctx.moveTo(from, y - 6)
          ctx.lineTo(to, y - 6)
          ctx.stroke()
          ctx.setLineDash([])
        }
        break
      }
      case 'extra':
        y += 18
        block(line.text, `700 34px ${MONO}`, INK, 48, 'left')
        break
      case 'stamp': {
        // The one red thing on the ticket, slightly off square like a real stamp.
        const stampH = 250
        ctx.font = `900 170px ${DISPLAY}`
        const stampW = Math.min(INNER - 190, Math.max(ctx.measureText(line.text).width + 90, 480))
        ctx.save()
        ctx.translate(X + stampW / 2, y + stampH / 2)
        ctx.rotate((-5 * Math.PI) / 180)
        ctx.strokeStyle = STAMP
        ctx.fillStyle = STAMP
        ctx.lineWidth = 10
        ctx.strokeRect(-stampW / 2, -stampH / 2, stampW, stampH)
        ctx.lineWidth = 3
        ctx.strokeRect(-stampW / 2 + 14, -stampH / 2 + 14, stampW - 28, stampH - 28)
        ctx.textAlign = 'center'
        ctx.fillText(line.text, 0, 42, stampW - 60)
        ctx.font = `700 24px ${MONO}`
        ctx.fillText('CERTIFIED BY A BIN CHICKEN', 0, 88, stampW - 60)
        ctx.restore()
        drawMark(ctx, X + INNER - 160, y + 45, 160)
        y += stampH + 50
        break
      }
      case 'quote':
        block(line.text, `400 34px ${MONO}`, INK, 48, 'left')
        break
      case 'byline':
        y += 10
        block(line.text.toUpperCase(), `700 24px ${MONO}`, SOFT, 36, 'left')
        break
      case 'safety': {
        y += 34
        ctx.font = `700 28px ${MONO}`
        const wrapped = wrap(ctx, line.text, INNER - 48)
        const boxH = wrapped.length * 40 + 40
        ctx.strokeStyle = INK
        ctx.lineWidth = 4
        ctx.strokeRect(X, y, INNER, boxH)
        ctx.fillStyle = INK
        ctx.textAlign = 'left'
        wrapped.forEach((t, i) => ctx.fillText(t, X + 24, y + 48 + i * 40))
        y += boxH
        break
      }
      case 'next':
        // The tear-off stub.
        y += 44
        dashed([18, 12], SOFT, 4)
        y += 8
        block('NEXT', `700 24px ${MONO}`, SOFT, 40, 'left')
        block(line.text.toUpperCase(), `900 68px ${DISPLAY}`, INK, 70, 'left')
        y += PAD
        paperEnd = y
        break
      case 'site':
        // Under the paper, on the housing.
        y = paperEnd + TOOTH + 20
        block(line.text.toUpperCase(), `900 84px ${DISPLAY}`, HOUSING_INK, 92, 'center')
        block('A toy, not a test. For adults.', `400 28px ${MONO}`, HOUSING_DIM, 48, 'center')
        break
    }
  }
  return paperEnd + FOOT
}

/**
 * Render to a PNG blob. Returns null where canvas is unavailable, so the caller can hide the
 * buttons rather than hand someone a broken one.
 */
export async function drawReceipt(d: ReceiptData): Promise<Blob | null> {
  if (typeof document === 'undefined') return null
  // Web fonts load after first paint; without this the receipt renders in a fallback face.
  try {
    await document.fonts?.ready
    await Promise.all([
      document.fonts?.load(`900 130px ${DISPLAY}`),
      document.fonts?.load(`700 30px ${MONO}`),
      document.fonts?.load(`400 30px ${MONO}`),
    ])
  } catch {
    // A browser without the font loading API still draws, just in its fallback face.
  }

  const lines = receiptLines(d)
  const scrap = document.createElement('canvas').getContext('2d')
  if (!scrap) return null
  const height = Math.ceil(paint(scrap, lines, 4000))

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  paint(ctx, lines, height)

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'))
}
