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
export const CirclePlus = /*#__PURE__*/ forwardRef<SVGSVGElement, LucideProps>(
  function CirclePlus(props, ref) {
    const controls = useAnimation();
    return (
      <AnimatedSvg {...props} ref={ref} controls={controls} name="circle-plus">
        <motion.circle
          {...{ cx: "12", cy: "12", r: "10" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1mglay"
        />
        <motion.path
          {...{ d: "M8 12h8" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="1wcyev"
        />
        <motion.path
          {...{ d: "M12 8v8" }}
          animate={controls}
          initial="normal"
          variants={DRAW_VARIANTS}
          key="napkw2"
        />
      </AnimatedSvg>
    );
  },
);
