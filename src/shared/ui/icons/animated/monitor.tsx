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
export const Monitor = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Monitor(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="monitor">
        <motion.rect
          {...{ width: "20", height: "14", x: "2", y: "3", rx: "2" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="48i651"
        />
        <motion.line
          {...{ x1: "8", x2: "16", y1: "21", y2: "21" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1svkeh"
        />
        <motion.line
          {...{ x1: "12", x2: "12", y1: "17", y2: "21" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="vw1qmm"
        />
      </AnimatedSvg>
    );
  },
);
