"use client";

import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  type Ref,
} from "react";
import type { LucideProps } from "lucide-react";
import type { useAnimation } from "motion/react";
import { createIconPlayback } from "./playback";
import { bindIconControl } from "./bind-control";

export type IconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};
export type AnimatedIconElement = SVGSVGElement & IconHandle;
type Controls = ReturnType<typeof useAnimation>;
const CONTROL =
  "[data-icon-scope],button,a,label,[role=button],[role=tab],[role=menuitem],[role=menuitemradio],[role=menuitemcheckbox]";
function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

/** Shared SVG boundary; motion lives in the individual paths, never a surrounding div. */
export const AnimatedSvg = forwardRef<
  SVGSVGElement,
  LucideProps & { controls: Controls; name: string }
>(function AnimatedSvg(
  {
    controls,
    name,
    size = 24,
    color = "currentColor",
    strokeWidth = 2,
    absoluteStrokeWidth,
    nonScalingStroke,
    className,
    width,
    height,
    children,
    ...props
  },
  forwardedRef,
) {
  const element = useRef<SVGSVGElement | null>(null);
  const attach = useCallback(
    (node: SVGSVGElement | null) => {
      element.current = node;
      assignRef(forwardedRef, node);
    },
    [forwardedRef],
  );
  useLayoutEffect(() => {
    const svg = element.current as AnimatedIconElement | null;
    if (!svg) return;
    const target = svg.closest<HTMLElement>(CONTROL) ?? svg;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const playback = createIconPlayback(
      controls,
      () => media.matches,
      () => Boolean(target.closest(":disabled,[aria-disabled=true]")),
    );
    const play = playback.start;
    const stop = playback.stop;
    svg.startAnimation = play;
    svg.stopAnimation = stop;
    const unbind = bindIconControl(target, media, playback);
    const selected = new MutationObserver(() => {
      if (
        target.getAttribute("aria-selected") === "true" ||
        target.getAttribute("aria-current") === "page" ||
        target.getAttribute("data-selected") === "true"
      )
        play();
    });
    selected.observe(target, {
      attributes: true,
      attributeFilter: ["aria-selected", "aria-current", "data-selected"],
    });
    return () => {
      selected.disconnect();
      unbind();
      delete (svg as Partial<AnimatedIconElement>).startAnimation;
      delete (svg as Partial<AnimatedIconElement>).stopAnimation;
    };
  }, [controls]);
  const scaledStroke = absoluteStrokeWidth
    ? (Number(strokeWidth) * 24) / (Number(size) || 24)
    : strokeWidth;
  const accessible =
    props["aria-label"] || props["aria-labelledby"] || props.role;
  return (
    <svg
      ref={attach}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={width ?? size}
      height={height ?? size}
      fill="none"
      stroke={color}
      strokeWidth={scaledStroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect={nonScalingStroke ? "non-scaling-stroke" : undefined}
      className={`lucide lucide-${name}${className ? ` ${className}` : ""}`}
      aria-hidden={accessible ? undefined : true}
      data-lucide-icon={name}
      {...props}
    >
      {children}
    </svg>
  );
});
