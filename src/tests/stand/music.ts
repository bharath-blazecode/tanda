// Original procedural cue for KACHKA. No recordings, samples, or external audio.
// All timing uses the audio clock so rendering/sensor work cannot jitter the beat.
export function startStandMusic(audio: AudioContext, duration: number): () => void {
  const output = audio.createGain();
  output.gain.setValueAtTime(0.45, audio.currentTime);
  output.connect(audio.destination);
  const voices = new Set<OscillatorNode>();
  const start = audio.currentTime + 0.3; // Leave room for the start beep.
  const end = audio.currentTime + duration;
  const eighth = 60 / 72 / 2;
  const pitch = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
  const note = (
    frequency: number,
    offset: number,
    length: number,
    volume: number,
    type: OscillatorType = "sine",
    fallTo?: number,
  ) => {
    const when = start + offset;
    const until = Math.min(when + length, end - 0.05);
    if (until <= when + 0.03) return;
    const oscillator = audio.createOscillator();
    const envelope = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    if (fallTo) oscillator.frequency.exponentialRampToValueAtTime(fallTo, until);
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.exponentialRampToValueAtTime(volume, when + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.0001, until);
    oscillator.connect(envelope);
    envelope.connect(output);
    voices.add(oscillator);
    oscillator.onended = () => {
      voices.delete(oscillator);
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(when);
    oscillator.stop(until);
  };
  // A short, original mellow phrase: warm seventh chords, sparse keys and a
  // soft sine kick/woodblock. No sampled drums or borrowed melodies.
  const chords = [[48, 55, 58, 63], [53, 60, 64, 67], [46, 53, 57, 60]];
  const melody = [75, 0, 70, 67, 0, 74, 0, 72, 69, 0, 65, 0, 67, 0, 70, 0];
  for (let step = 0; start + step * eighth < end; step++) {
    const offset = step * eighth;
    const chord = chords[Math.floor(step / 8) % chords.length];
    if (step % 8 === 0) {
      chord.forEach((key) => note(pitch(key), offset, eighth * 7, 0.025, "triangle"));
      note(pitch(chord[0] - 12), offset, eighth * 3, 0.065);
    }
    if (step % 4 === 0) note(95, offset, 0.16, 0.075, "sine", 38);
    if (step % 4 === 2) note(410, offset + 0.025, 0.055, 0.025, "triangle");
    const key = melody[step % melody.length];
    if (key) note(pitch(key), offset + (step % 2 ? 0.035 : 0), 0.5, 0.035);
  }
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    output.disconnect();
    voices.forEach((voice) => {
      try { voice.stop(); } catch { /* Already ended. */ }
    });
    voices.clear();
  };
}
