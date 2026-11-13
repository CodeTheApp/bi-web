"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/chevron-right.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Transition } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const DEFAULT_TRANSITION: Transition = {
  times: [0, 0.4, 1],
  duration: 0.5,
};
export const ChevronRight = /*#__PURE__*/ forwardRef<
  SVGSVGElement,
  LucideProps
>(function ChevronRight(props, ref) {
  const controls = useAnimation();
  return (
    <AnimatedSvg {...props} ref={ref} controls={controls} name="chevron-right">
      <motion.path
        animate={controls}
        d="m9 18 6-6-6-6"
        transition={DEFAULT_TRANSITION}
        variants={{
          normal: { x: 0 },
          animate: { x: [0, 2, 0] },
        }}
        initial="normal"
      />
    </AnimatedSvg>
  );
});
