import { useEffect, useRef, useState } from "react";
import {
  ensurePermission,
  isUsable,
  setMotionAvailability,
  subscribe,
  type MotionReading,
} from "../../sensors/motion";
import { analyze, CAPTURE_SECONDS, type StandAnalysis } from "./analyze";
import { startStandMusic } from "./music";
export type Phase =
  | "intro"
  | "permission"
  | "countdown"
  | "running"
  | "done"
  | "error"
  | "skipped"
  | "unavailable";
/** No usable sample this long after the sensor was opened means no sensor, not a retry. */
export const NO_SENSOR_MS = 1500;
export function useStand(
  onComplete?: (reading: StandAnalysis) => void,
  onSkip?: () => void,
  onUnavailable?: () => void,
) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [seconds, setSeconds] = useState(3);
  const [error, setError] = useState("");
  const [reading, setReading] = useState<StandAnalysis | null>(null);
  const [audioWarning, setAudioWarning] = useState(false);
  const cleanup = useRef<() => void>(() => {});
  const generation = useRef(0);
  function cancel() {
    generation.current++;
    cleanup.current();
    cleanup.current = () => {};
  }
  useEffect(() => {
    const interrupt = () => {
      if (!document.hidden) return;
      cancel();
      setPhase((previous) => {
        if (["permission", "countdown", "running"].includes(previous)) {
          setError(
            "Capture interrupted. Keep this page open until the end beep.",
          );
          return "error";
        }
        return previous;
      });
    };
    const leave = () => cancel();
    document.addEventListener("visibilitychange", interrupt);
    window.addEventListener("pagehide", leave);
    return () => {
      cancel();
      document.removeEventListener("visibilitychange", interrupt);
      window.removeEventListener("pagehide", leave);
    };
  }, []);
  function start() {
    cancel();
    const token = generation.current;
    setReading(null);
    setError("");
    setPhase("permission");
    setAudioWarning(false);
    // Both permission and audio are initiated synchronously within the user gesture.
    const permission = ensurePermission();
    let audio: AudioContext | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let unsubscribe = () => {};
    let stopMusic = () => {};
    const oscillators = new Set<OscillatorNode>();
    try {
      audio = new AudioContext();
      void audio.resume().catch(() => setAudioWarning(true));
    } catch {
      setAudioWarning(true);
    }
    const beep = (frequency: number, duration: number) => {
      if (!audio || audio.state !== "running") {
        setAudioWarning(true);
        return;
      }
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.12, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audio.currentTime + duration,
      );
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillators.add(oscillator);
      oscillator.onended = () => {
        oscillators.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start();
      oscillator.stop(audio.currentTime + duration);
    };
    cleanup.current = () => {
      unsubscribe();
      clearInterval(timer);
      stopMusic();
      oscillators.forEach((oscillator) => {
        try {
          oscillator.stop();
        } catch {}
      });
      if (audio && audio.state !== "closed") void audio.close().catch(() => {});
    };
    const fail = (message: string) => {
      cancel();
      setError(message);
      setPhase("error");
    };
    // Retrying cannot fix a missing, blocked or denied sensor (iOS remembers a no for the session),
    // so say so and let the run carry on with Choice Tap.
    const unavailable = () => {
      cancel();
      setMotionAvailability("unavailable");
      setPhase("unavailable");
      onUnavailable?.();
    };
    void permission.then((status) => {
      if (token !== generation.current) return;
      if (status !== "granted") {
        unavailable();
        return;
      }
      let firstEvent = 0,
        lastEvent = 0,
        startedAt = 0,
        lastCount = 4;
      let captured: MotionReading[] = [];
      const requestedAt = performance.now();
      unsubscribe = subscribe((sample) => {
        const now = performance.now();
        if (!firstEvent) {
          // All-zero events are what a blocked sensor sends; they must not start the countdown.
          if (!isUsable(sample)) return;
          firstEvent = now;
          setMotionAvailability("available");
          setPhase("countdown");
        }
        lastEvent = now;
        if (startedAt && now - startedAt <= CAPTURE_SECONDS * 1000)
          captured.push(sample);
      });
      timer = setInterval(() => {
        const now = performance.now();
        if (!firstEvent) {
          if (now - requestedAt > NO_SENSOR_MS) unavailable();
          return;
        }
        if (now - lastEvent > 1000) {
          fail("Motion readings stopped. Keep this page open and start again.");
          return;
        }
        if (!startedAt) {
          const remaining = 3 - Math.floor((now - firstEvent) / 1000);
          if (remaining > 0) {
            setSeconds(remaining);
            if (remaining !== lastCount) {
              beep(660, 0.1);
              lastCount = remaining;
            }
          } else {
            startedAt = now;
            captured = [];
            setSeconds(CAPTURE_SECONDS);
            setPhase("running");
            beep(990, 0.25);
            if (audio?.state === "running") {
              try {
                stopMusic = startStandMusic(audio, CAPTURE_SECONDS);
              } catch {
                setAudioWarning(true);
              }
            }
            navigator.vibrate?.(80);
          }
          return;
        }
        const elapsed = (now - startedAt) / 1000;
        setSeconds(Math.max(0, Math.ceil(CAPTURE_SECONDS - elapsed)));
        if (elapsed >= CAPTURE_SECONDS) {
          unsubscribe();
          clearInterval(timer);
          stopMusic();
          beep(990, 0.4);
          navigator.vibrate?.([80, 70, 80]);
          const result = analyze(captured);
          if (!result.metrics.valid) {
            setError(result.reason ?? "Start again.");
            setPhase("error");
            return;
          }
          setReading(result);
          setPhase("done");
          onComplete?.(result);
        }
      }, 50);
    });
  }
  function skip() {
    cancel();
    setReading(null);
    setPhase("skipped");
    onSkip?.();
  }
  function abort() {
    cancel();
    setPhase("intro");
    setReading(null);
  }
  return { phase, seconds, error, reading, audioWarning, start, skip, abort };
}
