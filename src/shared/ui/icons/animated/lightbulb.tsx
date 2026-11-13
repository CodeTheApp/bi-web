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
export const Lightbulb = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Lightbulb(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="lightbulb">
        <motion.path
          {...{
            d: "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",
          }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1gvzjb"
        />
        <motion.path
          {...{ d: "M9 18h6" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="x1upvd"
        />
        <motion.path
          {...{ d: "M10 22h4" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="ceow96"
        />
      </AnimatedSvg>
    );
  },
);
