import { useEffect, useRef, useState } from "react";
import {
  ensurePermission,
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
  | "skipped";
export function useStand(
  onComplete?: (reading: StandAnalysis) => void,
  onSkip?: () => void,
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
    void permission.then((status) => {
      if (token !== generation.current) return;
      if (status !== "granted") {
        const messages = {
          denied:
            "Motion permission was denied. Close this tab, reopen the link and tap Start. You can also skip this test.",
          unsupported:
            "Motion sensors are unavailable here. Open this link on a phone, or skip this test.",
          insecure:
            "Motion needs HTTPS. Open the secure development link on your phone.",
        };
        fail(messages[status]);
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
          firstEvent = now;
          setPhase("countdown");
        }
        lastEvent = now;
        if (startedAt && now - startedAt <= CAPTURE_SECONDS * 1000)
          captured.push(sample);
      });
      timer = setInterval(() => {
        const now = performance.now();
        if (!firstEvent) {
          if (now - requestedAt > 1000)
            fail(
              "Permission was allowed, but no motion readings arrived. Open the link directly in your phone browser, or skip this test.",
            );
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
