import { describe, expect, it, vi } from "vitest";
import { createIconPlayback } from "@/shared/ui/icons/playback";

function fixture(reduced = false, disabled = false) {
  const completions: Array<() => void> = [];
  const controls = {
    start: vi.fn(
      () => new Promise<void>((resolve) => completions.push(resolve)),
    ),
    stop: vi.fn(),
    set: vi.fn(),
  };
  return {
    controls,
    completions,
    playback: createIconPlayback(
      controls,
      () => reduced,
      () => disabled,
    ),
  };
}

describe("animated icon playback", () => {
  it("never sets Motion labels after unmount, including a pending completion", async () => {
    const { controls, playback, completions } = fixture();
    playback.start();
    controls.set.mockClear();
    playback.dispose();
    completions[0]();
    await Promise.resolve();
    playback.start();
    expect(controls.set).not.toHaveBeenCalled();
    expect(controls.start).toHaveBeenCalledTimes(1);
    expect(controls.stop).toHaveBeenCalledTimes(2);
  });

  it("a completed old hover cannot reset a newer interaction", async () => {
    const { controls, playback, completions } = fixture();
    playback.start();
    playback.stop();
    playback.start();
    controls.set.mockClear();
    completions[0]();
    await Promise.resolve();
    expect(controls.set).not.toHaveBeenCalled();
    completions[1]();
    await Promise.resolve();
    expect(controls.set).toHaveBeenCalledExactlyOnceWith("normal");
    playback.dispose();
  });

  it("plays one animation rather than restarting on pointerdown and click", () => {
    const { controls, playback } = fixture();
    playback.start();
    playback.start();
    expect(controls.start).toHaveBeenCalledExactlyOnceWith("animate");
    playback.dispose();
  });

  it.each([
    [true, false],
    [false, true],
  ])(
    "respects reduced motion %s and disabled controls %s",
    (reduced, disabled) => {
      const { controls, playback } = fixture(reduced, disabled);
      playback.start();
      expect(controls.start).not.toHaveBeenCalled();
      playback.dispose();
    },
  );
});
