"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/clock.tsx
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
const HAND_TRANSITION: Transition = {
  duration: 0.6,
  ease: [0.4, 0, 0.2, 1],
};
const HAND_VARIANTS: Variants = {
  normal: {
    rotate: 0,
    originX: "0%",
    originY: "100%",
  },
  animate: {
    rotate: 360,
    originX: "0%",
    originY: "100%",
  },
};
const MINUTE_HAND_TRANSITION: Transition = {
  duration: 0.5,
  ease: "easeInOut",
};
const MINUTE_HAND_VARIANTS: Variants = {
  normal: {
    rotate: 0,
    originX: "0%",
    originY: "100%",
  },
  animate: {
    rotate: 45,
    originX: "0%",
    originY: "100%",
  },
};
export const Clock = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Clock(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="clock">
        <circle cx="12" cy="12" r="10" />

        <motion.line
          animate={controls}
          initial="normal"
          transition={HAND_TRANSITION}
          variants={HAND_VARIANTS}
          x1="12"
          x2="12"
          y1="12"
          y2="6"
        />

        <motion.line
          animate={controls}
          initial="normal"
          transition={MINUTE_HAND_TRANSITION}
          variants={MINUTE_HAND_VARIANTS}
          x1="12"
          x2="16"
          y1="12"
          y2="12"
        />
      </AnimatedSvg>
    );
  },
);
