import { expect, it, vi } from "vitest";
import { startStandMusic } from "./music";

it("schedules a quiet cue inside capture and silences scheduled voices on cleanup", () => {
  const parameter = () => ({
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  });
  const oscillators: any[] = [];
  const gains: any[] = [];
  const audio = {
    currentTime: 20,
    destination: {},
    createGain() {
      const gain = { gain: parameter(), connect: vi.fn(), disconnect: vi.fn() };
      gains.push(gain);
      return gain;
    },
    createOscillator() {
      const oscillator = {
        frequency: parameter(), type: "sine", start: vi.fn(), stop: vi.fn(),
        connect: vi.fn(), disconnect: vi.fn(), onended: null as (() => void) | null,
      };
      oscillators.push(oscillator);
      return oscillator;
    },
  };
  const stop = startStandMusic(audio as unknown as AudioContext, 10);
  expect(oscillators.length).toBeGreaterThan(20);
  for (const oscillator of oscillators) {
    const start = oscillator.start.mock.calls[0][0];
    const end = oscillator.stop.mock.calls[0][0];
    expect(start).toBeGreaterThanOrEqual(20.3);
    expect(end).toBeLessThanOrEqual(29.95);
    expect(end).toBeGreaterThan(start);
  }
  // Voices release themselves after playback, rather than accumulating nodes.
  oscillators[0].onended();
  expect(oscillators[0].disconnect).toHaveBeenCalledOnce();
  expect(gains[1].disconnect).toHaveBeenCalledOnce();
  stop();
  expect(gains[0].disconnect).toHaveBeenCalledOnce();
  expect(oscillators[1].stop).toHaveBeenLastCalledWith();
  stop();
  expect(gains[0].disconnect).toHaveBeenCalledOnce();
});
