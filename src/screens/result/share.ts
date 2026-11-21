// CARD 7. The ticket as a picture, for the share sheet (Instagram, WhatsApp, anywhere).
// Drawn by hand on a canvas rather than screenshotted from the DOM: a DOM capture loses fonts and
// filters on iOS, and this has to work on whatever phone is in the room. Nothing leaves the phone
// here; the person decides where the picture goes.
import type { Verdict } from '../../../shared/contracts'
import { SAFETY_TEXT } from '../../ui'

export type ShareCard = {
  name: string
  readingId: string
  timestamp: string
  tags: string[]
  rows: [string, string][]
  extra?: string
  verdict: Verdict
  line: string
  nudge: string
  safety: boolean
}

const W = 1080
const PAPER_X = 80
const PAPER_W = W - PAPER_X * 2
const PAD = 70
const TEXT_X = PAPER_X + PAD
const TEXT_W = PAPER_W - PAD * 2
const TOOTH = 24

// The same values as src/ui/tokens.css. A canvas cannot read CSS variables.
const HOUSING = '#1e2a27'
const HOUSING_INK = '#dce6df'
const HOUSING_DIM = '#93a79e'
const RECEIPT = '#fafaf4'
const INK = '#1c1f25'
const INK_SOFT = '#5a606a'
const STAMP = '#c3273b'
const DISPLAY = "'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif"
const MONO = "'Courier Prime', 'Courier New', Courier, monospace"

/** Break text into lines no wider than `maxWidth`. A single word that is too wide keeps its own line. */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = []
  let current = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word
    if (current && measure(candidate) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

/** Draws the card and returns the height it used. Run once to measure, once for real. */
function draw(ctx: CanvasRenderingContext2D, card: ShareCard, height: number): number {
  const measure = (s: string) => ctx.measureText(s).width
  const paperTop = 70
  let y = paperTop + PAD

  ctx.fillStyle = HOUSING
  ctx.fillRect(0, 0, W, height)

  // The paper, with the ticket's zigzag tear along the bottom. Its height comes from the first pass.
  const paperBottom = height - 250
  ctx.fillStyle = RECEIPT
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

  const centred = (text: string, font: string, color: string, lineHeight: number) => {
    ctx.font = font
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    for (const line of wrapText(text, TEXT_W, measure)) {
      y += lineHeight
      ctx.fillText(line, W / 2, y)
    }
  }
  const left = (text: string, font: string, color: string, lineHeight: number, width = TEXT_W) => {
    ctx.font = font
    ctx.fillStyle = color
    ctx.textAlign = 'left'
    for (const line of wrapText(text, width, measure)) {
      y += lineHeight
      ctx.fillText(line, TEXT_X, y)
    }
  }

  centred('KACHKA', `900 130px ${DISPLAY}`, INK, 112)
  y += 14
  centred(`READING ${card.readingId} · ${card.timestamp}`.toUpperCase(), `700 30px ${MONO}`, INK, 42)
  centred(`SUBJECT · ${card.name}`.toUpperCase(), `700 30px ${MONO}`, INK, 42)
  y += 30

  if (card.tags.length > 0) left(card.tags.join(' · '), `400 28px ${MONO}`, INK, 40)

  // Rows: label, dotted leader, value.
  y += 10
  for (const [label, value] of card.rows) {
    y += 54
    ctx.font = `400 36px ${MONO}`
    ctx.fillStyle = INK
    ctx.textAlign = 'left'
    ctx.fillText(label, TEXT_X, y)
    const labelEnd = TEXT_X + measure(label) + 16
    ctx.font = `700 36px ${MONO}`
    ctx.textAlign = 'right'
    ctx.fillText(value, TEXT_X + TEXT_W, y)
    const valueStart = TEXT_X + TEXT_W - measure(value) - 16
    ctx.strokeStyle = INK_SOFT
    ctx.lineWidth = 3
    ctx.setLineDash([3, 9])
    ctx.beginPath()
    ctx.moveTo(labelEnd, y - 6)
    ctx.lineTo(valueStart, y - 6)
    ctx.stroke()
    ctx.setLineDash([])
  }

  if (card.extra) {
    y += 18
    left(card.extra, `700 34px ${MONO}`, INK, 48)
  }

  // The stamp: the one red thing on the ticket, slightly off square like a real one.
  y += 70
  const word = card.verdict.toUpperCase()
  ctx.font = `900 170px ${DISPLAY}`
  const stampW = Math.min(TEXT_W, Math.max(measure(word) + 90, 520))
  const stampH = 250
  ctx.save()
  ctx.translate(TEXT_X + stampW / 2, y + stampH / 2)
  ctx.rotate((-5 * Math.PI) / 180)
  ctx.strokeStyle = STAMP
  ctx.lineWidth = 10
  ctx.strokeRect(-stampW / 2, -stampH / 2, stampW, stampH)
  ctx.lineWidth = 3
  ctx.strokeRect(-stampW / 2 + 14, -stampH / 2 + 14, stampW - 28, stampH - 28)
  ctx.fillStyle = STAMP
  ctx.textAlign = 'center'
  ctx.fillText(word, 0, 42)
  ctx.font = `700 24px ${MONO}`
  ctx.fillText('CERTIFIED BY A BIN CHICKEN', 0, 88)
  ctx.restore()
  y += stampH + 60

  left(`“${card.line}”`, `400 34px ${MONO}`, INK, 48)
  y += 10
  left('DR. KACHKA', `700 24px ${MONO}`, INK_SOFT, 36)

  if (card.safety) {
    y += 34
    ctx.font = `700 28px ${MONO}`
    const lines = wrapText(SAFETY_TEXT, TEXT_W - 48, measure)
    const boxH = lines.length * 40 + 40
    ctx.strokeStyle = INK
    ctx.lineWidth = 4
    ctx.strokeRect(TEXT_X, y, TEXT_W, boxH)
    ctx.fillStyle = INK
    ctx.textAlign = 'left'
    let lineY = y + 16
    for (const line of lines) {
      lineY += 40
      ctx.fillText(line, TEXT_X + 24, lineY - 8)
    }
    y += boxH
  }

  // The tear-off stub.
  y += 44
  ctx.strokeStyle = INK_SOFT
  ctx.lineWidth = 4
  ctx.setLineDash([18, 12])
  ctx.beginPath()
  ctx.moveTo(TEXT_X, y)
  ctx.lineTo(TEXT_X + TEXT_W, y)
  ctx.stroke()
  ctx.setLineDash([])
  y += 8
  left('NEXT', `700 24px ${MONO}`, INK_SOFT, 40)
  left(card.nudge.toUpperCase(), `900 68px ${DISPLAY}`, INK, 70)
  y += PAD

  // Under the paper, on the housing: where to get your own.
  const paperEnd = y
  y = paperEnd + TOOTH + 20
  centred('KACHKA.FUN', `900 84px ${DISPLAY}`, HOUSING_INK, 92)
  centred('A toy, not a test. For adults.', `400 28px ${MONO}`, HOUSING_DIM, 48)

  return paperEnd + 250
}

/** The ticket as a PNG file, or null when this browser cannot make one. */
export async function buildShareImage(card: ShareCard): Promise<File | null> {
  try {
    // The faces are already in the app; this only waits until the canvas may use them.
    await Promise.all([
      document.fonts.load(`900 130px ${DISPLAY}`),
      document.fonts.load(`700 30px ${MONO}`),
      document.fonts.load(`400 30px ${MONO}`),
    ])
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = 10
    const probe = canvas.getContext('2d')
    if (!probe) return null
    const height = Math.ceil(draw(probe, card, 4000))
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    draw(ctx, card, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    return blob ? new File([blob], 'kachka-ticket.png', { type: 'image/png' }) : null
  } catch {
    return null
  }
}

/** True when the phone's share sheet takes a picture. Otherwise the picture is saved instead. */
export function canShareFile(file: File): boolean {
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

/** Open the share sheet with the picture, or save it where there is no share sheet. */
export async function shareOrSave(file: File): Promise<void> {
  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title: 'Kachka', text: 'kachka.fun' })
    } catch {
      // Closing the share sheet rejects. That is a choice, not an error.
    }
    return
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
