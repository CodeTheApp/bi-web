import type { createIconPlayback } from "./playback";

type Playback = ReturnType<typeof createIconPlayback>;

/** Register from a layout effect so listeners disappear before a focused control's DOM. */
export function bindIconControl(
  target: Element,
  media: MediaQueryList,
  playback: Playback,
) {
  const enter = (event: PointerEvent) => {
    if (event.pointerType !== "touch") playback.start();
  };
  const leave = (event: PointerEvent) => {
    if (event.pointerType !== "touch") playback.stop();
  };
  const focus = (event: FocusEvent) => {
    if (!target.contains(event.relatedTarget as Node | null)) playback.start();
  };
  const blur = (event: FocusEvent) => {
    if (!target.contains(event.relatedTarget as Node | null)) playback.stop();
  };
  const preference = () => {
    if (media.matches) playback.stop();
  };
  target.addEventListener("pointerenter", enter as EventListener);
  target.addEventListener("pointerleave", leave as EventListener);
  target.addEventListener("pointerdown", playback.start);
  target.addEventListener("click", playback.start);
  target.addEventListener("focusin", focus as EventListener);
  target.addEventListener("focusout", blur as EventListener);
  media.addEventListener("change", preference);
  return () => {
    target.removeEventListener("pointerenter", enter as EventListener);
    target.removeEventListener("pointerleave", leave as EventListener);
    target.removeEventListener("pointerdown", playback.start);
    target.removeEventListener("click", playback.start);
    target.removeEventListener("focusin", focus as EventListener);
    target.removeEventListener("focusout", blur as EventListener);
    media.removeEventListener("change", preference);
    // The icon's parent useAnimation may already have unmounted its controls.
    playback.dispose();
  };
}
