import { describe, expect, it } from "vitest";
import { analyze } from "./analyze";
import type { MotionReading } from "../../sensors/motion";
function capture(hz = 60): MotionReading[] {
  return Array.from({ length: 10 * hz }, (_, index) => {
    const t = index / hz;
    return {
      t,
      rotation: {
        x: Math.sin(t * 2 * Math.PI * 0.5),
        y: Math.cos(t * 2 * Math.PI * 0.7),
        z: 0,
      },
      acceleration: {
        x: 0.1 * Math.sin(t * 3),
        y: 0.1 * Math.cos(t * 4),
        z: 0,
      },
      gravity: { x: 0, y: 9.81, z: 0 },
    };
  });
}
describe("Stand Still analysis", () => {
  it("returns finite sway and a 8 second trace from a 10 second capture", () => {
    const result = analyze(capture());
    expect(result.metrics.valid).toBe(true);
    expect(result.metrics.hz).toBeCloseTo(60);
    expect(result.metrics.swayRms).toBeGreaterThan(0.5);
    expect(result.metrics.swayRms).toBeLessThan(1.1);
    expect(result.trace[0].t).toBeGreaterThanOrEqual(2);
    expect(result.trace.at(-1)!.t).toBeLessThan(10);
    expect(result.trace.at(-1)!.t - result.trace[0].t).toBeCloseTo(8, 1);
  });
  it("is stable across 30 and 60 Hz inputs", () => {
    expect(
      analyze(capture(30)).metrics.swayRms /
        analyze(capture(60)).metrics.swayRms,
    ).toBeCloseTo(1, 1);
  });
  it("does not mistake constant rotation offset for sway", () => {
    const data = capture().map((sample) => ({
      ...sample,
      rotation: { x: 5, y: 5, z: 0 },
    }));
    expect(analyze(data).metrics.valid).toBe(false);
  });
  it("uses acceleration consistently when the gyroscope is missing", () => {
    const result = analyze(
      capture().map((sample) => ({ ...sample, rotation: null })),
    );
    expect(result.source).toBe("acceleration");
    expect(result.metrics.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
  it("rejects interruptions and disconnected segments", () => {
    expect(analyze(capture().slice(0, 200)).metrics.valid).toBe(false);
    expect(analyze(capture().slice(0, 9 * 60)).metrics.valid).toBe(false);
    expect(
      analyze(capture().filter((sample) => sample.t < 5 || sample.t > 7))
        .metrics.valid,
    ).toBe(false);
  });
  it("keeps a complete recording with a brief acceleration spike", () => {
    const shaken = capture();
    shaken[500].acceleration!.x = 25;
    const result = analyze(shaken);
    expect(result.metrics.valid).toBe(true);
    expect(result.reason).toBeNull();
    expect(result.warnings).toContain(
      "A sudden movement was recorded. It is included in your reading.",
    );
    expect(result.trace.length).toBeGreaterThan(0);
  });
  it("keeps a complete recording with a brief tilt over 25 degrees", () => {
    const tilted = capture();
    tilted[500].gravity = { x: 8, y: 2, z: 0 };
    const result = analyze(tilted);
    expect(result.metrics.valid).toBe(true);
    expect(result.reason).toBeNull();
    expect(result.warnings.some((warning) => warning.includes("tilted"))).toBe(true);
  });
  it("measures pronounced swaying without flattening or discarding it", () => {
    const ordinary = analyze(capture());
    const swaying = capture().map((sample) => {
      const angle = Math.sin(sample.t * 2 * Math.PI * 0.5) * Math.PI / 4;
      return {
        ...sample,
        rotation: {
          x: sample.rotation!.x * 30,
          y: sample.rotation!.y * 30,
          z: 0,
        },
        gravity: { x: 9.81 * Math.sin(angle), y: 9.81 * Math.cos(angle), z: 0 },
      };
    });
    const result = analyze(swaying);
    expect(result.metrics.valid).toBe(true);
    expect(result.reason).toBeNull();
    expect(result.metrics.swayRms).toBeCloseTo(ordinary.metrics.swayRms * 30);
    expect(result.trace).toHaveLength(ordinary.trace.length);
    expect(result.warnings.some((warning) => warning.includes("tilted"))).toBe(true);
  });
  it("includes large acceleration in the fallback reading", () => {
    const ordinary = capture().map((sample) => ({ ...sample, rotation: null }));
    const moving = ordinary.map((sample) => ({
      ...sample,
      acceleration: {
        x: sample.acceleration!.x * 250,
        y: sample.acceleration!.y * 250,
        z: 0,
      },
    }));
    const result = analyze(moving);
    expect(result.metrics.valid).toBe(true);
    expect(result.source).toBe("acceleration");
    expect(result.metrics.swayRms).toBeCloseTo(analyze(ordinary).metrics.swayRms * 250);
    expect(result.warnings.some((warning) => warning.includes("sudden"))).toBe(true);
  });
  it("warns on low rate without rejecting a continuous 10 Hz capture", () => {
    const result = analyze(capture(10));
    expect(result.metrics.valid).toBe(true);
    expect(result.warnings).toContain("Low sample rate. Read this loosely.");
  });
  it("rejects a stationary table trace", () => {
    expect(
      analyze(
        capture().map((sample) => ({
          ...sample,
          rotation: { x: 0, y: 0, z: 0 },
        })),
      ).metrics.valid,
    ).toBe(false);
  });
});

it("keeps the public analyzer compatible with millisecond scaffold samples", async () => {
  const { analyzeStand } = await import("./analyze");
  const samples = capture().map((sample) => ({
    t: sample.t * 1000,
    ax: sample.gravity!.x,
    ay: sample.gravity!.y,
    az: sample.gravity!.z,
    ra: sample.rotation!.z,
    rb: sample.rotation!.x,
    rg: sample.rotation!.y,
  }));
  expect(analyzeStand(samples).valid).toBe(true);
  expect(analyzeStand(samples).hz).toBeCloseTo(60);
  expect(analyzeStand([]).valid).toBe(false);
});

describe("Stand recording quality", () => {
  it("retains gyro units across one missing source sample", () => {
    const data = capture();
    const complete = analyze(data);
    data[300].rotation = null;
    const run = analyze(data);
    expect(run.source).toBe("gyroscope");
    expect(run.metrics.recovered).toBe(true);
    expect(run.metrics.swayRms).toBeCloseTo(complete.metrics.swayRms, 4);
  });
  it("does not bridge twelve missing events at 60 Hz", () => {
    const data = capture().filter((s) => s.t < 4 || s.t >= 4.2);
    expect(analyze(data).metrics.valid).toBe(false);
  });
  it("does not claim a complete window after losing the last third of a second", () => {
    expect(analyze(capture().slice(0, -20)).metrics.valid).toBe(false);
  });
  it("rejects an event stream starting late on the capture clock", () => {
    expect(analyze(capture().map(s => ({ ...s, t: s.t + 0.4 })), 0).metrics.valid).toBe(false);
  });
  it("rejects invalid clocks and invalid values without returning a NaN score", () => {
    const data = capture();
    data[300].t = NaN;
    expect(analyze(data).metrics.valid).toBe(false);
    const broken = capture().map(s => ({ ...s, rotation: { x: NaN, y: 1, z: 0 }, acceleration: null }));
    expect(analyze(broken).metrics.valid).toBe(false);
  });
  it("refuses to compare a source below twice the filter's 3 Hz upper band", () => {
    expect(analyze(capture(5)).metrics.valid).toBe(false);
  });
  it("requires continuity of one field across the entire window", () => {
    const switched = capture().map(s => ({ ...s, rotation: s.t > 5 ? null : s.rotation, acceleration: s.t <= 5 ? null : s.acceleration }));
    expect(analyze(switched).metrics.valid).toBe(false);
  });
});

it("does not fold 59.5 Hz vibration on a 120 Hz sensor into slow sway during resampling", () => {
  const readings = capture(120).map(s => ({
    ...s, rotation: { x: Math.sin(2 * Math.PI * 59.5 * s.t), y: 0, z: 0 },
  }));
  expect(analyze(readings).metrics.swayRms).toBeLessThan(0.12);
});

it("records coarse device-axis placement and flags changes", () => {
  const frames = capture();
  expect(analyze(frames).metrics.placement).toBe("portrait-up");
  frames[430].gravity = { x: 9.81, y: 0, z: 0 };
  expect(analyze(frames).metrics.placementChanged).toBe(true);
  expect(analyze(frames.map(s => ({ ...s, gravity: null }))).metrics.placement).toBeUndefined();
  const diagonal = frames.map(s => ({ ...s, gravity: { x: 7, y: 7, z: 0 } }));
  expect(analyze(diagonal).metrics.placement).toBeUndefined();
});

it("does not label gravity-inclusive legacy samples as linear acceleration", async () => {
  const { analyzeStand } = await import("./analyze");
  const samples = capture().map(s => ({
    t: s.t * 1000, ax: s.rotation!.x, ay: s.rotation!.y, az: 9.81, ra: null, rb: null, rg: null,
  }));
  expect(analyzeStand(samples).valid).toBe(false);
  expect(analyzeStand(samples.map(s => ({ ...s, linearAcceleration: { x: s.ax, y: s.ay, z: 0 } }))).valid).toBe(true);
});

it("uses continuous linear acceleration when gyro has a sustained dropout", () => {
  const readings = capture().map(s => ({ ...s, rotation: s.t >= 4 && s.t < 4.5 ? null : s.rotation }));
  const run = analyze(readings);
  expect(run.metrics).toMatchObject({ valid: true, source: "acceleration", protocolVersion: 2 });
  expect(run.metrics.swayRms).toBeCloseTo(analyze(readings.map(s => ({ ...s, rotation: null }))).metrics.swayRms);
});

it("accepts modest timing jitter but rejects repeated data loss", () => {
  const frames = capture();
  const jittered = frames.map((s, i) => ({ ...s, t: s.t + 0.001 * Math.sin(i) }));
  expect(analyze(jittered).metrics.swayRms).toBeCloseTo(analyze(frames).metrics.swayRms, 2);
  expect(analyze(frames.filter((_, i) => i % 10 !== 5)).metrics.valid).toBe(false);
});
