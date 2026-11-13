"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/logout.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Variants } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const PATH_VARIANTS: Variants = {
  animate: {
    x: 2,
    translateX: [0, -3, 0],
    transition: {
      duration: 0.4,
    },
  },
};
export const LogOut = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function LogOut(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="log-out">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />

        <motion.polyline
          animate={controls}
          points="16 17 21 12 16 7"
          variants={PATH_VARIANTS}
          initial="normal"
        />

        <motion.line
          animate={controls}
          variants={PATH_VARIANTS}
          x1="21"
          x2="9"
          y1="12"
          y2="12"
          initial="normal"
        />
      </AnimatedSvg>
    );
  },
);
