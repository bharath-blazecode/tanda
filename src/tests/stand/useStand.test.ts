// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { MotionReading } from "../../sensors/motion";
const sensor = vi.hoisted(() => ({
  listener: null as ((sample: MotionReading) => void) | null,
  permission: vi.fn(),
  stop: vi.fn(),
}));
vi.mock("../../sensors/motion", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../sensors/motion")>();
  return {
    ...original,
    ensurePermission: sensor.permission,
    subscribe: (listener: (sample: MotionReading) => void) => {
      sensor.listener = listener;
      return sensor.stop;
    },
  };
});
import { getMotionAvailability } from "../../sensors/motion";
import { useStand } from "./useStand";
let beeps: number[];
beforeEach(() => {
  vi.useFakeTimers();
  sensor.permission.mockResolvedValue("granted");
  sensor.stop.mockReset();
  sensor.listener = null;
  beeps = [];
  class AudioMock {
    state = "running";
    currentTime = 0;
    destination = {};
    resume = vi.fn().mockResolvedValue(undefined);
    close = vi.fn().mockResolvedValue(undefined);
    createGain() {
      return {
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
        disconnect() {},
      };
    }
    createOscillator() {
      const frequency = { value: 0 };
      return {
        frequency,
        connect() {},
        disconnect() {},
        start() {
          beeps.push(frequency.value);
        },
        stop() {},
        onended: null,
      };
    }
  }
  vi.stubGlobal("AudioContext", AudioMock);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function emit() {
  const t = performance.now() / 1000;
  sensor.listener?.({
    t,
    rotation: { x: Math.sin(t * 3), y: Math.cos(t * 4), z: 0 },
    acceleration: { x: 0, y: 0, z: 0 },
    gravity: { x: 0, y: 9.81, z: 0 },
  });
}
it("finishes a 10 second capture after countdown with three countdown beeps and start/end beeps", async () => {
  const complete = vi.fn();
  const { result } = renderHook(() => useStand(complete));
  await act(async () => {
    result.current.start();
  });
  const feed = setInterval(emit, 1000 / 60);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3100);
  });
  expect(result.current.phase).toBe("running");
  expect(result.current.seconds).toBe(10);
  expect(beeps).toEqual([660, 660, 660, 990]);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(9000);
  });
  expect(result.current.phase).toBe("running");
  expect(result.current.seconds).toBe(1);
  expect(complete).not.toHaveBeenCalled();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  clearInterval(feed);
  expect(result.current.phase).toBe("done");
  expect(result.current.reading?.metrics.valid).toBe(true);
  expect(complete).toHaveBeenCalledOnce();
  expect(beeps).toEqual([660, 660, 660, 990, 990]);
  expect(sensor.stop).toHaveBeenCalled();
});
it("reports no sensor on a denied permission instead of asking to retry", async () => {
  sensor.permission.mockResolvedValueOnce("denied");
  const unavailable = vi.fn();
  const { result } = renderHook(() =>
    useStand(undefined, undefined, unavailable),
  );
  await act(async () => {
    result.current.start();
  });
  expect(result.current.phase).toBe("unavailable");
  expect(unavailable).toHaveBeenCalledOnce();
  expect(getMotionAvailability()).toBe("unavailable");
});
it("stops on its own and reports no sensor when no reading arrives within 1.5 s", async () => {
  const unavailable = vi.fn();
  const { result } = renderHook(() =>
    useStand(undefined, undefined, unavailable),
  );
  await act(async () => {
    result.current.start();
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(result.current.phase).toBe("permission");
  expect(unavailable).not.toHaveBeenCalled();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(600);
  });
  expect(result.current.phase).toBe("unavailable");
  expect(unavailable).toHaveBeenCalledOnce();
  expect(sensor.stop).toHaveBeenCalled();
});
it("does not start the countdown on all-zero readings from a blocked sensor", async () => {
  const unavailable = vi.fn();
  const { result } = renderHook(() =>
    useStand(undefined, undefined, unavailable),
  );
  await act(async () => {
    result.current.start();
  });
  const zero = { x: 0, y: 0, z: 0 };
  const feed = setInterval(
    () =>
      sensor.listener?.({
        t: performance.now() / 1000,
        rotation: zero,
        acceleration: zero,
        gravity: zero,
      }),
    1000 / 60,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1600);
  });
  clearInterval(feed);
  expect(result.current.phase).toBe("unavailable");
  expect(unavailable).toHaveBeenCalledOnce();
});
it("cancels a pending permission response without starting a subscription", async () => {
  let resolve!: (value: string) => void;
  sensor.permission.mockReturnValueOnce(
    new Promise<string>((done) => {
      resolve = done;
    }),
  );
  const { result } = renderHook(() => useStand());
  act(() => result.current.start());
  act(() => result.current.abort());
  await act(async () => resolve("granted"));
  expect(sensor.listener).toBeNull();
  expect(result.current.phase).toBe("intro");
});
it("discards capture when the page is hidden and detaches the sensor", async () => {
  const complete = vi.fn();
  const { result } = renderHook(() => useStand(complete));
  await act(async () => {
    result.current.start();
  });
  const feed = setInterval(emit, 1000 / 60);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(result.current.phase).toBe("running");
  act(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  clearInterval(feed);
  expect(result.current.phase).toBe("error");
  expect(result.current.reading).toBeNull();
  expect(complete).not.toHaveBeenCalled();
  expect(sensor.stop).toHaveBeenCalled();
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
});
