// CARD 13. Camera plumbing for the fingertip pulse step (D46). This file owns the DOM side:
// permission, the stream, and reducing each frame to one number. The maths is in
// src/tests/pulse/analyze.ts and stays pure.
//
// Known device limits, checked on Friday rather than assumed:
// - Torch (`applyConstraints({ advanced: [{ torch: true }] })`) is not supported by any Safari,
//   and ImageCapture does not exist there either. So the torch is best effort: ask for it, carry
//   on without it, and tell the user to find good light instead.
// - getUserMedia needs a secure context (https or localhost) and must be called from a user
//   gesture to avoid the prompt being suppressed.
import type { PulseSample } from '../tests/pulse/analyze'

export type CameraPermission = 'granted' | 'denied' | 'unsupported' | 'insecure' | 'no-camera'

/** The patch we average, in pixels, taken from the centre of the frame. Small on purpose: the
 *  signal is a whole-field brightness change, and a small patch keeps the per-frame work tiny. */
const PATCH = 48

// These bounds are deliberately generous. A phone with no torch runs its auto-exposure hard
// against a covered lens, so a real fingertip wanders far more than a clean test signal does.
/** A covered lens is red-dominant, because a fingertip passes red light and blocks the rest. */
const MIN_RED_DOMINANCE = 1.25
/** Saturated white or pure black both mean the lens is not covered by a finger. */
const MIN_RED = 8
const MAX_RED = 253
/** A covered lens is a flat field. A view of the room is not. */
const MAX_SPREAD = 40

export function cameraSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

export function secureEnough(): boolean {
  if (typeof window === 'undefined') return false
  return window.isSecureContext === true
}

/**
 * Ask for the rear camera. Returns the stream, or why not. Call this from a tap handler.
 * The caller is responsible for calling `stopCamera` on the result.
 */
export async function startCamera(): Promise<{ stream: MediaStream } | { error: CameraPermission }> {
  if (!cameraSupported()) return { error: 'unsupported' }
  if (!secureEnough()) return { error: 'insecure' }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 320 },
        height: { ideal: 240 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    })
    return { stream }
  } catch (error) {
    const name = error instanceof Error ? error.name : ''
    if (name === 'NotAllowedError' || name === 'SecurityError') return { error: 'denied' }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return { error: 'no-camera' }
    return { error: 'unsupported' }
  }
}

export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

/**
 * Best effort torch. Resolves to whether it came on. Never throws: on every Safari this simply
 * is not available, and the step has to work without it.
 */
export async function tryTorch(stream: MediaStream | null): Promise<boolean> {
  const track = stream?.getVideoTracks()[0]
  if (!track) return false
  try {
    const capabilities = track.getCapabilities?.() as { torch?: boolean } | undefined
    if (!capabilities?.torch) return false
    // `torch` is not in the TypeScript DOM types because it is not in the published spec.
    await track.applyConstraints({ advanced: [{ torch: true }] } as unknown as MediaTrackConstraints)
    return true
  } catch {
    return false
  }
}

/** The per-frame statistics the lens gate needs. Exported so it can be tested without a camera. */
export type FrameStats = { red: number; green: number; blue: number; spread: number }

/** Is this frame a fingertip over the lens, rather than a view of the room. */
export function isCovered(stats: FrameStats): boolean {
  if (stats.red < MIN_RED || stats.red > MAX_RED) return false
  if (stats.spread > MAX_SPREAD) return false
  const others = (stats.green + stats.blue) / 2
  return stats.red >= Math.max(1, others) * MIN_RED_DOMINANCE
}

/**
 * Average the centre patch of a video frame and measure how flat it is.
 * Returns null while the video has no dimensions yet, which is normal for the first frames.
 */
export function sampleFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  t: number,
): (PulseSample & FrameStats) | null {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) return null

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null

  const size = Math.min(PATCH, width, height)
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size
    canvas.height = size
  }
  // Draw only the centre patch, scaled to the canvas, so we never read a full frame back.
  context.drawImage(video, (width - size) / 2, (height - size) / 2, size, size, 0, 0, size, size)

  const { data } = context.getImageData(0, 0, size, size)
  let red = 0
  let green = 0
  let blue = 0
  const pixels = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    red += data[i]
    green += data[i + 1]
    blue += data[i + 2]
  }
  red /= pixels
  green /= pixels
  blue /= pixels

  // Mean absolute deviation of the red channel: cheaper than a standard deviation and enough
  // to tell a flat fingertip from a view of the room.
  let deviation = 0
  for (let i = 0; i < data.length; i += 4) deviation += Math.abs(data[i] - red)
  const spread = deviation / pixels

  const stats = { red, green, blue, spread }
  return { t, covered: isCovered(stats), ...stats }
}
