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
export const UserRound = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function UserRound(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="user-round">
        <motion.circle
          {...{ cx: "12", cy: "8", r: "5" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1hypcn"
        />
        <motion.path
          {...{ d: "M20 21a8 8 0 0 0-16 0" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="rfgkzh"
        />
      </AnimatedSvg>
    );
  },
);
