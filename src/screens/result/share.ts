// Saving and sharing the reading as an image.
// Share-with-files is not everywhere: iOS Safari and Android Chrome have it, desktop Firefox
// does not, and no browser has it outside a secure context. So the share button only appears
// where it works, and saving is always offered as the thing that always works.
import { drawReceipt, receiptFilename, type ReceiptData } from './receipt-image'

export type ShareOutcome = 'shared' | 'saved' | 'cancelled' | 'unavailable'

function fileFrom(blob: Blob, readingId: string): File {
  return new File([blob], receiptFilename(readingId), { type: 'image/png' })
}

/** Can this browser put an image into the share sheet, rather than only text. */
export function canShareReceipt(): boolean {
  if (typeof navigator === 'undefined' || !navigator.canShare || !navigator.share) return false
  try {
    // A one byte probe: canShare needs a real File, and the type is what it actually checks.
    return navigator.canShare({ files: [new File([new Uint8Array(1)], 'p.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}

function download(blob: Blob, readingId: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = receiptFilename(readingId)
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking immediately can cancel the download on some browsers; a tick is enough.
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

/** Always available: writes the PNG to the person's downloads. */
export async function saveReceipt(data: ReceiptData): Promise<'saved' | 'unavailable'> {
  const blob = await drawReceipt(data)
  if (!blob) return 'unavailable'
  download(blob, data.readingId)
  return 'saved'
}

/**
 * Hands the image to the system share sheet, falling back to a save where that is not offered.
 * A cancelled share is a normal outcome and is not an error.
 */
export async function shareReceipt(data: ReceiptData): Promise<ShareOutcome> {
  const blob = await drawReceipt(data)
  if (!blob) return 'unavailable'
  const file = fileFrom(blob, data.readingId)
  if (!navigator.canShare?.({ files: [file] })) {
    download(blob, data.readingId)
    return 'saved'
  }
  try {
    await navigator.share({ files: [file], title: 'Kachka reading' })
    return 'shared'
  } catch (error) {
    // AbortError is the person closing the sheet. Anything else, fall back to saving.
    if (error instanceof Error && error.name === 'AbortError') return 'cancelled'
    download(blob, data.readingId)
    return 'saved'
  }
}
