import { describe, expect, it, vi } from "vitest";
import { bindIconControl } from "@/shared/ui/icons/bind-control";
import { createIconPlayback } from "@/shared/ui/icons/playback";

class Control extends EventTarget {
  contains(target: EventTarget | null) {
    return target === this;
  }
}
class MotionPreference extends EventTarget {
  matches = false;
}
const focusEvent = (
  type: "focusin" | "focusout",
  relatedTarget: EventTarget | null = null,
) => Object.assign(new Event(type), { relatedTarget });

describe("animated icon control lifecycle", () => {
  it("removes the focused control listeners during layout cleanup before DOM removal emits blur", async () => {
    const target = new Control();
    const preference = new MotionPreference();
    let controlsMounted = true;
    let finish: (() => void) | undefined;
    const controls = {
      set: vi.fn(() => {
        if (!controlsMounted) throw new Error("controls.set before mount");
      }),
      stop: vi.fn(),
      start: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      ),
    };
    const playback = createIconPlayback(
      controls,
      () => preference.matches,
      () => false,
    );
    const cleanupLayout = bindIconControl(
      target as unknown as Element,
      preference as unknown as MediaQueryList,
      playback,
    );
    target.dispatchEvent(focusEvent("focusin"));
    expect(controls.start).toHaveBeenCalledTimes(1);
    controls.set.mockClear();

    // Parent useAnimation unmounts first; SVG layout cleanup still precedes DOM detach.
    controlsMounted = false;
    cleanupLayout();
    controls.stop.mockClear();
    target.dispatchEvent(focusEvent("focusout"));
    target.dispatchEvent(new Event("pointerleave"));
    target.dispatchEvent(new Event("click"));
    preference.matches = true;
    preference.dispatchEvent(new Event("change"));
    finish?.();
    await Promise.resolve();
    expect(controls.set).not.toHaveBeenCalled();
    expect(controls.stop).not.toHaveBeenCalled();
    expect(controls.start).toHaveBeenCalledTimes(1);
  });

  it("keeps normal blur behavior while mounted, without replaying on focus movement inside the control", () => {
    const target = new Control();
    const preference = new MotionPreference();
    const playback = { start: vi.fn(), stop: vi.fn(), dispose: vi.fn() };
    const cleanup = bindIconControl(
      target as unknown as Element,
      preference as unknown as MediaQueryList,
      playback,
    );
    target.dispatchEvent(focusEvent("focusin"));
    target.dispatchEvent(focusEvent("focusout", target));
    expect(playback.start).toHaveBeenCalledTimes(1);
    expect(playback.stop).not.toHaveBeenCalled();
    target.dispatchEvent(focusEvent("focusout"));
    expect(playback.stop).toHaveBeenCalledTimes(1);
    cleanup();
    expect(playback.dispose).toHaveBeenCalledTimes(1);
  });
});
