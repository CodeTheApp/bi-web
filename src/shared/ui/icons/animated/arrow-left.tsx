"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/arrow-left.tsx
 * SVG-only adapter: parent-control interaction and finite animations; original motion variants preserved.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Variants } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
const PATH_VARIANTS: Variants = {
  normal: { d: "m12 19-7-7 7-7", translateX: 0 },
  animate: {
    d: "m12 19-7-7 7-7",
    translateX: [0, 3, 0],
    transition: {
      duration: 0.4,
    },
  },
};
const SECOND_PATH_VARIANTS: Variants = {
  normal: { d: "M19 12H5" },
  animate: {
    d: ["M19 12H5", "M19 12H10", "M19 12H5"],
    transition: {
      duration: 0.4,
    },
  },
};
export const ArrowLeft = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function ArrowLeft(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="arrow-left">
        <motion.path
          animate={controls}
          d="m12 19-7-7 7-7"
          variants={PATH_VARIANTS}
          initial="normal"
        />

        <motion.path
          animate={controls}
          d="M19 12H5"
          variants={SECOND_PATH_VARIANTS}
          initial="normal"
        />
      </AnimatedSvg>
    );
  },
);
