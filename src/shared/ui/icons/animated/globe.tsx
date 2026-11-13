"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/earth.tsx
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
const CIRCLE_TRANSITION: Transition = {
  duration: 0.3,
  delay: 0.1,
  opacity: { delay: 0.15 },
};
const CIRCLE_VARIANTS: Variants = {
  normal: {
    pathLength: 1,
    opacity: 1,
  },
  animate: {
    pathLength: [0, 1],
    opacity: [0, 1],
  },
};
export const Globe = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Globe(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="globe">
        <motion.path
          animate={controls}
          d="M21.54 15H17a2 2 0 0 0-2 2v4.54"
          transition={{ duration: 0.7, delay: 0.5, opacity: { delay: 0.5 } }}
          variants={{
            normal: {
              pathLength: 1,
              opacity: 1,
              pathOffset: 0,
            },
            animate: {
              pathLength: [0, 1],
              opacity: [0, 1],
              pathOffset: [1, 0],
            },
          }}
          initial="normal"
        />

        <motion.path
          animate={controls}
          d="M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17"
          transition={{ duration: 0.7, delay: 0.5, opacity: { delay: 0.5 } }}
          variants={{
            normal: {
              pathLength: 1,
              opacity: 1,
              pathOffset: 0,
            },
            animate: {
              pathLength: [0, 1],
              opacity: [0, 1],
              pathOffset: [1, 0],
            },
          }}
          initial="normal"
        />

        <motion.path
          animate={controls}
          d="M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"
          transition={{ duration: 0.7, delay: 0.5, opacity: { delay: 0.5 } }}
          variants={{
            normal: {
              pathLength: 1,
              opacity: 1,
              pathOffset: 0,
            },
            animate: {
              pathLength: [0, 1],
              opacity: [0, 1],
              pathOffset: [1, 0],
            },
          }}
          initial="normal"
        />

        <motion.circle
          animate={controls}
          cx="12"
          cy="12"
          r="10"
          transition={CIRCLE_TRANSITION}
          variants={CIRCLE_VARIANTS}
          initial="normal"
        />
      </AnimatedSvg>
    );
  },
);
