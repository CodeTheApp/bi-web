"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/chevron-down.tsx
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
export const ChevronDown = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function ChevronDown(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="chevron-down">
        <motion.path
          animate={controls}
          d="m6 9 6 6 6-6"
          transition={DEFAULT_TRANSITION}
          variants={{
            normal: { y: 0 },
            animate: { y: [0, 2, 0] },
          }}
          initial="normal"
        />
      </AnimatedSvg>
    );
  },
);
