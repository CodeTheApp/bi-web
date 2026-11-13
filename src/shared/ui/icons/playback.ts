export type IconAnimationControls = {
  start: (definition: "animate") => Promise<unknown>;
  stop: () => void;
  set: (definition: "normal") => void;
};

/** A single mounted SVG owns its playback; async completions cannot revive it. */
export function createIconPlayback(
  controls: IconAnimationControls,
  reduced: () => boolean,
  disabled: () => boolean,
) {
  let alive = true;
  let running = false;
  let generation = 0;
  const stop = () => {
    generation++;
    running = false;
    controls.stop();
    if (alive) controls.set("normal");
  };
  const start = () => {
    if (!alive || reduced() || disabled() || running) return;
    running = true;
    const token = ++generation;
    controls.stop();
    controls.set("normal");
    void controls
      .start("animate")
      .then(() => {
        if (alive && token === generation) {
          running = false;
          controls.set("normal");
        }
      })
      .catch(() => {
        if (alive && token === generation) running = false;
      });
  };
  const dispose = () => {
    alive = false;
    // Motion unregisters its subscribers during unmount. Never set a label here.
    stop();
  };
  return { start, stop, dispose };
}
