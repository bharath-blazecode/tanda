import { STAND_CAPTURE_SECONDS, STAND_PROTOCOL_VERSION, type StandMetrics } from "../../../shared/contracts";
import { bandpass, rms } from "./signal";
import {
  measuredHz,
  type MotionReading,
  type Vector,
} from "../../sensors/motion";
export const CAPTURE_SECONDS = STAND_CAPTURE_SECONDS;
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
/** Coarse device-axis gravity signature. Useful for refusing a known mismatch;
 * a matching signature cannot establish the person's stance or grip. */
function placement(v: Vector | null | undefined): StandMetrics["placement"] {
  if (!v) return undefined;
  const length = magnitude(v);
  if (length < 5 || length > 15) return undefined;
  const limit = length * Math.cos(Math.PI / 6);
  if (Math.abs(v.x) >= limit) return v.x > 0 ? "landscape-left" : "landscape-right";
  if (Math.abs(v.y) >= limit) return v.y > 0 ? "portrait-up" : "portrait-down";
  if (Math.abs(v.z) >= limit) return v.z > 0 ? "face-up" : "face-down";
  return undefined;
}
type SensorField = "rotation" | "acceleration";
type Observed = MotionReading & { value: Vector };

/** Work on one field in its own units. Bound interpolation by the observed cadence,
 * so a stall on a fast phone cannot masquerade as a normal interval on a slow one. */
function windowFor(samples: readonly MotionReading[], field: SensorField, start: number) {
  const frames: Observed[] = [];
  for (const sample of samples) {
    const value = sample[field];
    if (value && [value.x, value.y, value.z].every(Number.isFinite))
      frames.push({ ...sample, value });
  }
  if (frames.length < 2) return null;
  const hz = measuredHz(frames);
  // 10 Hz leaves margin above Nyquist for the existing 3 Hz low-pass.
  if (hz < 10 - 1e-6) return null;
  const intervals = frames.slice(1).map((s, i) => s.t - frames[i].t);
  const sorted = intervals.slice().sort((a, b) => a - b);
  const period = sorted[Math.floor(sorted.length / 2)];
  const tolerance = 1e-6;
  const boundary = Math.min(0.15, 1.75 * period) + tolerance;
  if (frames[0].t - start > boundary || start + CAPTURE_SECONDS - frames.at(-1)!.t > boundary) return null;
  const maxGap = Math.min(0.2, 2.5 * period) + tolerance;
  if (intervals.some(gap => gap > maxGap)) return null;
  const gaps = intervals.filter(gap => gap > 1.75 * period + tolerance).length;
  if (gaps > Math.max(1, Math.floor(0.02 * intervals.length))) return null;
  return { frames, hz, period, recovered: gaps > 0 };
}

export function analyze(samples: readonly MotionReading[], startedAt = samples[0]?.t ?? 0): StandAnalysis {
  const warnings: string[] = [];
  const result: StandAnalysis = {
    metrics: { swayRms: 0, swayLateralRms: 0, hz: 0, valid: false },
    source: "gyroscope",
    trace: [],
    warnings,
    reason: null,
  };
  const fail = (reason: string) => ({ ...result, reason });
  if (!Number.isFinite(startedAt) || samples.some((sample, i) =>
    !Number.isFinite(sample.t) || sample.t < startedAt || sample.t > startedAt + CAPTURE_SECONDS + 1e-6 ||
    (i > 0 && sample.t <= samples[i - 1].t)))
    return fail("Motion readings arrived outside the recording window or out of order. Try Stand Still again.");
  const angular = windowFor(samples, "rotation", startedAt);
  const window = angular ?? windowFor(samples, "acceleration", startedAt);
  if (!window)
    return fail("Too few continuous motion readings. Keep this page open and try Stand Still again.");
  const { frames, hz, period, recovered } = window;
  const gyro = angular !== null;
  const source = gyro ? "gyroscope" : "acceleration";
  result.source = source;
  if (hz < 15) warnings.push("Low sample rate. Read this loosely.");
  if (!gyro) warnings.push("Using acceleration. Keep this baseline on the same phone and sensor source.");
  if (recovered) warnings.push("Recovered a brief gap using adjacent readings from the same sensor.");
  const origin = frames[0].t;
  const settled = samples.filter(sample => sample.t - startedAt >= SETTLE_SECONDS);
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
  const placementChanged = !!(
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
  );
  if (placementChanged) warnings.push(
      "The phone tilted during capture. Your reading includes this movement; keep it against your chest for a consistent comparison.",
    );
  // Maintain source cadence through the filter. Decimating a 120 Hz source to
  // 60 Hz first would alias 59.5 Hz vibration into an apparent 0.5 Hz sway.
  const span = frames.at(-1)!.t - origin;
  const count = Math.min(Math.round(span / period) + 1, frames.length + Math.ceil(frames.length * 0.02));
  const rate = (count - 1) / span;
  let index = 0;
  const interpolate = (axis: "x" | "y") =>
    Array.from({ length: count }, (_, i) => {
      const t = origin + i / rate;
      while (index < frames.length - 2 && frames[index + 1].t < t) index++;
      const a = frames[index],
        b = frames[index + 1];
      const fraction = (t - a.t) / (b.t - a.t);
      return a.value[axis] + (b.value[axis] - a.value[axis]) * fraction;
    });
  const forward = bandpass(interpolate("x"), rate);
  index = 0;
  const lateral = bandpass(interpolate("y"), rate);
  result.trace = lateral
    .map((value, i) => ({ t: origin - startedAt + i / rate, lateral: value, forward: forward[i] }))
    .filter((point) => point.t >= SETTLE_SECONDS);
  const lateralRms = rms(result.trace.map((point) => point.lateral));
  const forwardRms = rms(result.trace.map((point) => point.forward));
  const swayRms = Math.hypot(lateralRms, forwardRms);
  if (!Number.isFinite(swayRms)) return fail("Motion values were unreadable. Try Stand Still again.");
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
    protocolVersion: STAND_PROTOCOL_VERSION,
    placement: placement(reference),
    ...(placementChanged ? { placementChanged: true } : {}),
    ...(recovered ? { recovered: true } : {}),
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
      // Legacy ax/ay/az may include gravity. Only a named linear source can
      // enter the acceleration metric.
      acceleration: sample.linearAcceleration ?? null,
      // The scaffold does not identify a distinct gravity-inclusive source.
      gravity: null,
    })),
  ).metrics;
}
