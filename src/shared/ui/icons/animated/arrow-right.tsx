"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/arrow-right.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Variants } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const PATH_VARIANTS: Variants = {
  normal: { d: "M5 12h14" },
  animate: {
    d: ["M5 12h14", "M5 12h9", "M5 12h14"],
    transition: {
      duration: 0.4,
    },
  },
};
const SECONDARY_PATH_VARIANTS: Variants = {
  normal: { d: "m12 5 7 7-7 7", translateX: 0 },
  animate: {
    d: "m12 5 7 7-7 7",
    translateX: [0, -3, 0],
    transition: {
      duration: 0.4,
    },
  },
};
export const ArrowRight = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function ArrowRight(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="arrow-right">
        <motion.path
          animate={controls}
          d="M5 12h14"
          variants={PATH_VARIANTS}
          initial="normal"
        />

        <motion.path
          animate={controls}
          d="m12 5 7 7-7 7"
          variants={SECONDARY_PATH_VARIANTS}
          initial="normal"
        />
      </AnimatedSvg>
    );
  },
);
