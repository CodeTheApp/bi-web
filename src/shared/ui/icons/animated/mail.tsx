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
export const Mail = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Mail(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="mail">
        <motion.path
          {...{ d: "m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="132q7q"
        />
        <motion.rect
          {...{ x: "2", y: "4", width: "20", height: "16", rx: "2" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="izxlao"
        />
      </AnimatedSvg>
    );
  },
);
