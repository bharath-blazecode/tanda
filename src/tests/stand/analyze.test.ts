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
