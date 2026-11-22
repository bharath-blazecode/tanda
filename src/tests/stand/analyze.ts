import type { StandMetrics } from "../../../shared/contracts";
import { bandpass, rms } from "./signal";
import {
  measuredHz,
  type MotionReading,
  type Vector,
} from "../../sensors/motion";
export const CAPTURE_SECONDS = 10;
export const SETTLE_SECONDS = 2;
export type StandAnalysis = {
  metrics: StandMetrics;
  source: "gyroscope" | "acceleration";
  trace: { t: number; lateral: number; forward: number }[];
  warnings: string[];
  reason: string | null;
};
function magnitude(v: Vector): number {
  return Math.hypot(v.x, v.y, v.z);
}
export function analyze(samples: readonly MotionReading[]): StandAnalysis {
  const hz = measuredHz(samples);
  const gyro =
    samples.length > 0 && samples.every((sample) => sample.rotation !== null);
  const source = gyro ? "gyroscope" : "acceleration";
  const warnings = [];
  if (hz < 15) warnings.push("Low sample rate. Read this loosely.");
  if (!gyro)
    warnings.push(
      "Using acceleration. Keep this baseline on the same phone and sensor source.",
    );
  // The source and capture length travel with the metrics, so a later comparison can refuse to set
  // degrees a second against metres per second squared (src/engine/compare.ts).
  const result: StandAnalysis = {
    metrics: { swayRms: 0, swayLateralRms: 0, hz, valid: false, source, captureSeconds: CAPTURE_SECONDS },
    source,
    trace: [],
    warnings,
    reason: null,
  };
  const fail = (reason: string) => ({ ...result, reason });
  if (samples.length < 2 || samples.at(-1)!.t - samples[0].t < CAPTURE_SECONDS - 0.5)
    return fail("Capture interrupted. Start again.");
  const origin = samples[0].t;
  const settled = samples.filter(
    (sample) => sample.t - origin >= SETTLE_SECONDS,
  );
  if (hz < 5 || settled.length < 20)
    return fail(
      "Too few motion readings. Try opening this link in your phone browser.",
    );
  if (
    samples.some(
      (sample, i) =>
        i > 0 &&
        (sample.t <= samples[i - 1].t || sample.t - samples[i - 1].t > 0.5),
    )
  )
    return fail(
      "Motion readings stopped or arrived out of order. Start again.",
    );
  // Movement is the signal being measured. Flag large movements for context
  // rather than discarding an otherwise complete recording.
  if (
    samples.some(
      (sample) => sample.acceleration && magnitude(sample.acceleration) > 19.62,
    )
  )
    warnings.push(
      "A sudden movement was recorded. It is included in your reading.",
    );
  const reference = settled.find(
    (sample) => sample.gravity && magnitude(sample.gravity) > 5,
  )?.gravity;
  if (
    reference &&
    settled.some((sample) => {
      if (!sample.gravity || magnitude(sample.gravity) < 5) return false;
      const dot =
        reference.x * sample.gravity.x +
        reference.y * sample.gravity.y +
        reference.z * sample.gravity.z;
      return (
        dot / (magnitude(reference) * magnitude(sample.gravity)) <
        Math.cos((25 * Math.PI) / 180)
      );
    })
  )
    warnings.push(
      "The phone tilted during capture. Your reading includes this movement; keep it against your chest for a consistent comparison.",
    );
  const field = gyro ? "rotation" : "acceleration";
  if (samples.some((sample) => !sample[field]))
    return fail(
      "This phone did not provide a continuous sensor source. Start again.",
    );
  const rate = Math.min(60, hz);
  const count = Math.floor((samples.at(-1)!.t - origin) * rate) + 1;
  let index = 0;
  const interpolate = (axis: "x" | "y") =>
    Array.from({ length: count }, (_, i) => {
      const t = origin + i / rate;
      while (index < samples.length - 2 && samples[index + 1].t < t) index++;
      const a = samples[index],
        b = samples[index + 1];
      const fraction = (t - a.t) / (b.t - a.t);
      return a[field]![axis] + (b[field]![axis] - a[field]![axis]) * fraction;
    });
  const forward = bandpass(interpolate("x"), rate);
  index = 0;
  const lateral = bandpass(interpolate("y"), rate);
  result.trace = lateral
    .map((value, i) => ({ t: i / rate, lateral: value, forward: forward[i] }))
    .filter((point) => point.t >= SETTLE_SECONDS);
  const lateralRms = rms(result.trace.map((point) => point.lateral));
  const forwardRms = rms(result.trace.map((point) => point.forward));
  const swayRms = Math.hypot(lateralRms, forwardRms);
  // Provisional floor, exposed in the lab for physical calibration.
  if (swayRms < (gyro ? 0.005 : 0.0005))
    return fail(
      "Almost no movement recorded. Pick up the phone and hold it against your chest.",
    );
  result.metrics = {
    swayRms,
    swayLateralRms: lateralRms,
    hz,
    valid: true,
    source,
    captureSeconds: CAPTURE_SECONDS,
  };
  return result;
}

/** Preserves the scaffold API: timestamped motion samples in, raw metrics out. */
export function analyzeStand(
  samples: import("../../sensors/motion").MotionSample[],
): StandMetrics {
  return analyze(
    samples.map((sample) => ({
      t: sample.t / 1000,
      rotation:
        sample.ra !== null && sample.rb !== null && sample.rg !== null
          ? { x: sample.rb, y: sample.rg, z: sample.ra }
          : null,
      acceleration: { x: sample.ax, y: sample.ay, z: sample.az },
      gravity: { x: sample.ax, y: sample.ay, z: sample.az },
    })),
  ).metrics;
}
