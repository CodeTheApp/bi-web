"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/lock-keyhole.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";

export const LockKeyhole = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function LockKeyhole(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="lock-keyhole">
        <motion.circle
          cx="12"
          cy="16"
          r="1"
          animate={controls}
          variants={{
            normal: {
              rotate: 0,
              scale: 1,
            },
            animate: {
              rotate: [-3, 1, -2, 0],
              scale: [0.95, 1.05, 0.98, 1],
            },
          }}
          transition={{
            duration: 1,
            ease: [0.4, 0, 0.2, 1],
          }}
          initial="normal"
        />

        <motion.rect
          height="12"
          rx="2"
          width="18"
          x="3"
          y="10"
          animate={controls}
          variants={{
            normal: {
              rotate: 0,
              scale: 1,
            },
            animate: {
              rotate: [-3, 1, -2, 0],
              scale: [0.95, 1.05, 0.98, 1],
            },
          }}
          transition={{
            duration: 1,
            ease: [0.4, 0, 0.2, 1],
          }}
          initial="normal"
        />

        <motion.path
          animate={controls}
          d="M7 10V7a5 5 0 0 1 10 0v3"
          initial="normal"
          transition={{
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1],
          }}
          variants={{
            normal: {
              pathLength: 1,
            },
            animate: {
              pathLength: 0.7,
            },
          }}
        />
      </AnimatedSvg>
    );
  },
);
