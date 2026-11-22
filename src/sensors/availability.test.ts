// Detection of "no usable motion samples arrive", in the node environment: window is a stub.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  detectMotion,
  getMotionAvailability,
  isUsable,
  motionSupport,
  readMotion,
  setMotionAvailability,
} from "./motion";

function host(DeviceMotionEvent: unknown, isSecureContext = true) {
  const target = Object.assign(new EventTarget(), {
    isSecureContext,
    DeviceMotionEvent,
  });
  vi.stubGlobal("window", target);
  return target;
}
function motion(target: EventTarget, fields: Record<string, unknown>) {
  const event = Object.assign(new Event("devicemotion"), fields);
  Object.defineProperty(event, "timeStamp", { value: performance.now() });
  target.dispatchEvent(event);
}
const nulls = {
  acceleration: { x: null, y: null, z: null },
  accelerationIncludingGravity: { x: null, y: null, z: null },
  rotationRate: { alpha: null, beta: null, gamma: null },
};
const zeros = {
  acceleration: { x: 0, y: 0, z: 0 },
  accelerationIncludingGravity: { x: 0, y: 0, z: 0 },
  rotationRate: { alpha: 0, beta: 0, gamma: 0 },
};
const real = {
  acceleration: { x: 0.01, y: -0.02, z: 0 },
  accelerationIncludingGravity: { x: 0.1, y: 9.79, z: 0.3 },
  rotationRate: { alpha: 0.4, beta: -0.2, gamma: 0.1 },
};

beforeEach(() => {
  vi.useFakeTimers();
  setMotionAvailability("unknown");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("isUsable", () => {
  it("accepts a real sample and rejects all-null or all-zero ones", () => {
    expect(isUsable(readMotion(real as never, 0))).toBe(true);
    expect(isUsable(readMotion(nulls as never, 0))).toBe(false);
    expect(isUsable(readMotion(zeros as never, 0))).toBe(false);
    expect(isUsable(null)).toBe(false);
  });
});

describe("motionSupport", () => {
  it("tells iOS (needs a tap) from Android and desktop (just listen) and from no API", () => {
    host({ requestPermission: () => Promise.resolve("granted") });
    expect(motionSupport()).toBe("needs-tap");
    host({});
    expect(motionSupport()).toBe("listen");
    host(undefined);
    expect(motionSupport()).toBe("unsupported");
    host({}, false);
    expect(motionSupport()).toBe("insecure");
  });
});

describe("detectMotion", () => {
  it("gives up when no event arrives within the window", async () => {
    host({});
    const pending = detectMotion(1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await pending).toBe("no-data");
    expect(getMotionAvailability()).toBe("unavailable");
  });

  it("does not count events whose values are all null or all zero", async () => {
    const target = host({});
    const pending = detectMotion(1000);
    await vi.advanceTimersByTimeAsync(0);
    motion(target, nulls);
    motion(target, zeros);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await pending).toBe("no-data");
    expect(getMotionAvailability()).toBe("unavailable");
  });

  it("accepts the first real sample at once and stops listening", async () => {
    const target = host({});
    const remove = vi.spyOn(target, "removeEventListener");
    const pending = detectMotion(1000);
    await vi.advanceTimersByTimeAsync(0);
    motion(target, real);
    expect(await pending).toBe("granted");
    expect(getMotionAvailability()).toBe("available");
    expect(remove).toHaveBeenCalledWith("devicemotion", expect.any(Function));
  });

  it("with no permission API, asks nothing and just listens", async () => {
    const target = host({});
    const pending = detectMotion(1000);
    await vi.advanceTimersByTimeAsync(0);
    motion(target, real);
    expect(await pending).toBe("granted");
  });

  it("with no DeviceMotionEvent at all, says unsupported without waiting", async () => {
    host(undefined);
    expect(await detectMotion(1000)).toBe("unsupported");
    expect(getMotionAvailability()).toBe("unavailable");
  });

  it("on a denied permission, records unavailable and never listens", async () => {
    const requestPermission = vi.fn().mockResolvedValue("denied");
    const target = host({ requestPermission });
    const add = vi.spyOn(target, "addEventListener");
    const pending = detectMotion(1000);
    // iOS only shows its prompt when it is requested inside the tap, before any await.
    expect(requestPermission).toHaveBeenCalledOnce();
    expect(await pending).toBe("denied");
    expect(add).not.toHaveBeenCalled();
    expect(getMotionAvailability()).toBe("unavailable");
  });
});

it("rejects gravity alone when neither measurement source is available", () => {
  expect(isUsable(readMotion({ accelerationIncludingGravity: real.accelerationIncludingGravity } as never, 0))).toBe(false);
});

it("ignores a permission decision arriving after Setup has been abandoned", async () => {
  let resolve!: (result: string) => void;
  const target = host({ requestPermission: () => new Promise(done => { resolve = done; }) });
  const add = vi.spyOn(target, "addEventListener");
  const controller = new AbortController();
  const pending = detectMotion(1000, controller.signal);
  controller.abort();
  resolve("granted");
  await vi.advanceTimersByTimeAsync(1000);
  await pending;
  expect(add).not.toHaveBeenCalled();
  expect(getMotionAvailability()).toBe("unknown");
});

it("detaches a live Setup probe immediately on cancellation", async () => {
  const target = host({});
  const remove = vi.spyOn(target, "removeEventListener");
  const controller = new AbortController();
  const pending = detectMotion(1000, controller.signal);
  await vi.advanceTimersByTimeAsync(0);
  controller.abort();
  await pending;
  expect(remove).toHaveBeenCalledWith("devicemotion", expect.any(Function));
  expect(getMotionAvailability()).toBe("unknown");
  expect(vi.getTimerCount()).toBe(0);
});
