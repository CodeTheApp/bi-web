"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/history.tsx
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
const ARROW_TRANSITION: Transition = {
  type: "spring",
  stiffness: 250,
  damping: 25,
};
const ARROW_VARIANTS: Variants = {
  normal: {
    rotate: "0deg",
  },
  animate: {
    rotate: "-50deg",
  },
};
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
    rotate: -360,
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
    originY: "0%",
  },
  animate: {
    rotate: -45,
    originX: "0%",
    originY: "0%",
  },
};
export const History = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function History(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="history">
        <motion.g
          animate={controls}
          transition={ARROW_TRANSITION}
          variants={ARROW_VARIANTS}
          initial="normal"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </motion.g>

        <motion.line
          animate={controls}
          initial="normal"
          transition={HAND_TRANSITION}
          variants={HAND_VARIANTS}
          x1="12"
          x2="12"
          y1="12"
          y2="7"
        />

        <motion.line
          animate={controls}
          initial="normal"
          transition={MINUTE_HAND_TRANSITION}
          variants={MINUTE_HAND_VARIANTS}
          x1="12"
          x2="16"
          y1="12"
          y2="14"
        />
      </AnimatedSvg>
    );
  },
);
