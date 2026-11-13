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
export const Type = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function Type(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="type">
        <motion.path
          {...{ d: "M12 4v16" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1654pz"
        />
        <motion.path
          {...{ d: "M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="e0r10z"
        />
        <motion.path
          {...{ d: "M9 20h6" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="s66wpe"
        />
      </AnimatedSvg>
    );
  },
);
