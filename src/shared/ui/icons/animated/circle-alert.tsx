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
export const CircleAlert = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function CircleAlert(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="circle-alert">
        <motion.circle
          {...{ cx: "12", cy: "12", r: "10" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1mglay"
        />
        <motion.line
          {...{ x1: "12", x2: "12", y1: "8", y2: "12" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1pkeuh"
        />
        <motion.line
          {...{ x1: "12", x2: "12.01", y1: "16", y2: "16" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="4dfq90"
        />
      </AnimatedSvg>
    );
  },
);
