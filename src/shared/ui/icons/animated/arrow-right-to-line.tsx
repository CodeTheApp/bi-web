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
export const ArrowRightToLine = /*#__PURE__*/ forwardRef<
  SVGSVGElement,
  LucideProps
>(function ArrowRightToLine(props, ref) {
  const controls = useAnimation();
  return (
    <AnimatedSvg
      {...props}
      ref={ref}
      controls={controls}
      name="arrow-right-to-line"
    >
      <motion.path
        {...{ d: "M17 12H3" }}
        animate={controls}
        initial="normal"
        variants={DRAW_VARIANTS}
        key="8awo09"
      />
      <motion.path
        {...{ d: "m11 18 6-6-6-6" }}
        animate={controls}
        initial="normal"
        variants={DRAW_VARIANTS}
        key="8c2y43"
      />
      <motion.path
        {...{ d: "M21 5v14" }}
        animate={controls}
        initial="normal"
        variants={DRAW_VARIANTS}
        key="nzette"
      />
    </AnimatedSvg>
  );
});
