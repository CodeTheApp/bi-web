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
export const Link2 = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Link2(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="link2">
        <motion.path
          {...{ d: "M9 17H7A5 5 0 0 1 7 7h2" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="8i5ue5"
        />
        <motion.path
          {...{ d: "M15 7h2a5 5 0 1 1 0 10h-2" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1b9ql8"
        />
        <motion.line
          {...{ x1: "8", x2: "16", y1: "12", y2: "12" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1jonct"
        />
      </AnimatedSvg>
    );
  },
);
