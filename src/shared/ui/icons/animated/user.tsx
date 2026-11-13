"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/user.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Variants } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const PATH_VARIANT: Variants = {
  normal: { pathLength: 1, opacity: 1, pathOffset: 0 },
  animate: {
    pathLength: [0, 1],
    opacity: [0, 1],
    pathOffset: [1, 0],
  },
};
const CIRCLE_VARIANT: Variants = {
  normal: {
    pathLength: 1,
    pathOffset: 0,
    scale: 1,
  },
  animate: {
    pathLength: [0, 1],
    pathOffset: [1, 0],
    scale: [0.5, 1],
  },
};
export const User = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function User(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="user">
        <motion.circle
          animate={controls}
          cx="12"
          cy="8"
          r="5"
          variants={CIRCLE_VARIANT}
          initial="normal"
        />

        <motion.path
          animate={controls}
          d="M20 21a8 8 0 0 0-16 0"
          transition={{
            delay: 0.2,
            duration: 0.4,
          }}
          variants={PATH_VARIANT}
          initial="normal"
        />
      </AnimatedSvg>
    );
  },
);
