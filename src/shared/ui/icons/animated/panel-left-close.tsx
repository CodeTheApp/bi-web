"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/panel-left-close.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import {
  motion,
  useAnimation,
  type Variants,
  type Transition,
} from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const DEFAULT_TRANSITION: Transition = {
  times: [0, 0.4, 1],
  duration: 0.5,
};
const PATH_VARIANTS: Variants = {
  normal: { x: 0 },
  animate: { x: [0, -1.5, 0] },
};
export const PanelLeftClose = /*#__PURE__*/ forwardRef<
  SVGSVGElement,
  LucideProps
>(function PanelLeftClose(props, ref) {
  const controls = useAnimation();
  return (
    <AnimatedSvg
      {...props}
      ref={ref}
      controls={controls}
      name="panel-left-close"
    >
      <rect height="18" rx="2" width="18" x="3" y="3" />

      <path d="M9 3v18" />

      <motion.path
        animate={controls}
        d="m16 15-3-3 3-3"
        transition={DEFAULT_TRANSITION}
        variants={PATH_VARIANTS}
        initial="normal"
      />
    </AnimatedSvg>
  );
});
