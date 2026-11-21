/** Original synthesized feedback. No recordings, downloads, or third-party samples. */
export function createTapSound() {
  let audio: AudioContext | null = null
  const voices = new Set<OscillatorNode>()
  const stop = () => {
    voices.forEach((voice) => {
      try { voice.stop() } catch { /* Already ended. */ }
    })
    voices.clear()
  }
  const close = () => {
    stop()
    const previous = audio
    audio = null
    if (previous && previous.state !== 'closed') void previous.close().catch(() => {})
  }
  try {
    // Called synchronously by Start, so mobile browsers can unlock audio.
    audio = new AudioContext()
    void audio.resume().catch(() => {})
  } catch {
    // Audio support/permission must never prevent the reaction test.
  }
  const play = (correct: boolean) => {
    if (!audio || audio.state !== 'running') return
    try {
      stop()
      const now = audio.currentTime
      const tone = (frequency: number, offset: number, duration: number, end?: number) => {
        const oscillator = audio!.createOscillator()
        const gain = audio!.createGain()
        const start = now + offset
        oscillator.type = correct ? 'sine' : 'triangle'
        oscillator.frequency.setValueAtTime(frequency, start)
        if (end) oscillator.frequency.exponentialRampToValueAtTime(end, start + duration)
        gain.gain.setValueAtTime(0.001, start)
        gain.gain.exponentialRampToValueAtTime(0.10, start + 0.008)
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
        oscillator.connect(gain)
        gain.connect(audio!.destination)
        voices.add(oscillator)
        oscillator.onended = () => {
          voices.delete(oscillator)
          oscillator.disconnect()
          gain.disconnect()
        }
        oscillator.start(start)
        oscillator.stop(start + duration)
      }
      if (correct) {
        tone(660, 0, 0.07)
        tone(990, 0.055, 0.10)
      } else {
        tone(180, 0, 0.16, 90)
      }
    } catch {
      // Keep scoring taps even if the browser interrupts its audio output.
      stop()
    }
  }
  return { play, stop, close }
}
