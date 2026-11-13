"use client";
import { useEffect } from "react";
import { markReady } from "@/shared/ui/motion/engine";

/** Start the real section components without the public preloader or navigation. */
export function PreviewFrameBridge() {
  useEffect(() => {
    document.documentElement.classList.remove("no-js");
    markReady();

    // Capture before React handlers: a preview must never submit a real contact
    // form, navigate away, or open a product in place of the selected section.
    const preventNavigation = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest("a"))
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const preventSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    document.addEventListener("click", preventNavigation, true);
    document.addEventListener("auxclick", preventNavigation, true);
    document.addEventListener("submit", preventSubmit, true);
    return () => {
      document.removeEventListener("click", preventNavigation, true);
      document.removeEventListener("auxclick", preventNavigation, true);
      document.removeEventListener("submit", preventSubmit, true);
    };
  }, []);
  return null;
}
