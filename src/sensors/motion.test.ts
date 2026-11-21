import { afterEach, describe, expect, it, vi } from "vitest";
import { ensurePermission, readMotion, subscribe } from "./motion";
afterEach(() => vi.unstubAllGlobals());
describe("motion adapter", () => {
  it("requests iOS permission synchronously in the caller gesture", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    vi.stubGlobal("window", {
      isSecureContext: true,
      DeviceMotionEvent: { requestPermission },
    });
    const pending = ensurePermission();
    expect(requestPermission).toHaveBeenCalledOnce();
    expect(await pending).toBe("granted");
  });
  it("handles Android without a permission prompt and denied/insecure contexts", async () => {
    vi.stubGlobal("window", { isSecureContext: true, DeviceMotionEvent: {} });
    expect(await ensurePermission()).toBe("granted");
    vi.stubGlobal("window", {
      isSecureContext: true,
      DeviceMotionEvent: {
        requestPermission: () => Promise.reject(new Error()),
      },
    });
    expect(await ensurePermission()).toBe("denied");
    vi.stubGlobal("window", { isSecureContext: false });
    expect(await ensurePermission()).toBe("insecure");
  });
  it("rejects null events and preserves zero-valued readings", () => {
    expect(readMotion({} as DeviceMotionEvent, 0)).toBeNull();
    expect(
      readMotion(
        { rotationRate: { alpha: 0, beta: 0, gamma: 0 } } as DeviceMotionEvent,
        1,
      )?.rotation?.x,
    ).toBe(0);
  });
  it("detaches its listener on stop", () => {
    const host = new EventTarget();
    vi.stubGlobal("window", host);
    const onSample = vi.fn(),
      stop = subscribe(onSample);
    const event = new Event("devicemotion");
    Object.assign(event, { rotationRate: { alpha: 0, beta: 1, gamma: 2 } });
    host.dispatchEvent(event);
    expect(onSample).toHaveBeenCalledOnce();
    stop();
    host.dispatchEvent(event);
    expect(onSample).toHaveBeenCalledOnce();
  });
});
