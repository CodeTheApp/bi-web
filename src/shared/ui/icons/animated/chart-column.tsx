"use client";
/**
 * Animated geometry adapted from lucide-animated / pqoqubbw/icons (MIT).
 * Official source: https://github.com/pqoqubbw/icons/blob/main/icons/box.tsx
 * Canonical Lucide geometry: lucide-react (ISC); internal path drawing uses the official Box animation.
 */
import { forwardRef } from "react";
import { motion, useAnimation, type Variants } from "motion/react";
import type { LucideProps } from "lucide-react";
import { AnimatedSvg } from "../AnimatedSvg";
// Path drawing adapted from the official BoxIcon PATH_VARIANTS.
const DRAW_VARIANTS: Variants = {
  normal: {
    opacity: 1,
    pathLength: 1,
    transition: { duration: 0.3, opacity: { duration: 0.1 } },
  },
  animate: {
    opacity: [0, 1],
    pathLength: [0, 1],
    transition: { duration: 0.4, opacity: { duration: 0.1 } },
  },
};
export const ChartColumn = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function ChartColumn(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="chart-column">
        <motion.path
          {...{ d: "M3 3v16a2 2 0 0 0 2 2h16" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="c24i48"
        />
        <motion.path
          {...{ d: "M18 17V9" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="2bz60n"
        />
        <motion.path
          {...{ d: "M13 17V5" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1frdt8"
        />
        <motion.path
          {...{ d: "M8 17v-3" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="17ska0"
        />
      </AnimatedSvg>
    );
  },
);
